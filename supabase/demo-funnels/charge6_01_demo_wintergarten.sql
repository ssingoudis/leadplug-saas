-- =============================================================================
-- Charge 6 / Vorlage 34 — Wintergarten & Terrassendach („SonnenRaum")
--
-- Recherche-Beleg (2026-06-11): Eigene Aroundhome-Kategorie (Terrassen-
-- überdachung/Wintergarten) + Vergleichs-/Konfigurator-Portale
-- (wintergarten-preise.info, traum-terrassendach.de). Der wichtigste
-- Preis-Qualifizierer ist die Bauart: Kaltwintergarten ~15.000–35.000 €,
-- Wohnwintergarten (gedämmt, ganzjährig) ~50.000–90.000 € für 20 m²;
-- Wohnwintergärten brauchen i. d. R. eine Baugenehmigung.
--
-- Logik: (1) Mieter → direkt Kontakt (Anbau ist Eigentümer-Sache).
-- (2) „Unsicher — Beratung gewünscht" bei der Bauart → direkt Kontakt
-- (Bauart-Entscheidung ist das Kern-Beratungsthema).
-- Theme: #15803d (Garten-Grün), roboto, 0.75rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_eigentum  uuid := gen_random_uuid();
  p_bauart    uuid := gen_random_uuid();
  p_groesse   uuid := gen_random_uuid();
  p_fundament uuid := gen_random_uuid();
  p_zeitraum  uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-wintergarten', v_tenant, 'Demo — Wintergarten (SonnenRaum)',
    'Wintergarten — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch mit kostenlosem Aufmaß vor Ort.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'sonnenraum', '#15803d', '#1f2937', '#ffffff',
    'transparent', 'roboto', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Mehr Wohngefühl — mit Ihrem Wintergarten',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Projekt und erhalten Sie ein unverbindliches Angebot für Wintergarten oder Terrassendach.',
      'page_key', 'welcome_wintergarten', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_eigentum,  v_funnel, 'question', 1, '{}'::jsonb),
    (p_bauart,    v_funnel, 'question', 2, '{}'::jsonb),
    (p_groesse,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_fundament, v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitraum,  v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_wintergarten', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_eigentum, 'eigentum', 'single_choice', 'Sind Sie Eigentümer der Immobilie?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, Eigentümer","value":"eigentum","sort_order":0},
        {"label":"Nein, zur Miete","value":"miete","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_bauart, 'bauart', 'single_choice', 'Welche Bauart schwebt Ihnen vor?',
      'Die Bauart ist der wichtigste Preisfaktor.', NULL, true, true, 0,
      '[{"label":"Wohnwintergarten (gedämmt, ganzjährig nutzbar)","value":"wohnwintergarten","sort_order":0},
        {"label":"Kaltwintergarten / Sommergarten","value":"kaltwintergarten","sort_order":1},
        {"label":"Terrassenüberdachung","value":"terrassendach","sort_order":2},
        {"label":"Unsicher — Beratung gewünscht","value":"beratung","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_groesse, 'groesse', 'number', 'Wie groß soll die Fläche werden?',
      'Eine grobe Schätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":5,"max":100,"step":1,"required":true,"unit":"m²"}'::jsonb),
    (p_fundament, 'fundament', 'single_choice', 'Gibt es bereits ein Fundament oder eine Terrasse?', NULL, NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Unsicher","value":"unsicher","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zeitraum, 'zeitraum', 'single_choice', 'Wann soll gebaut werden?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Zur nächsten Saison","value":"naechste_saison","sort_order":2},
        {"label":"Ich plane noch","value":"plane_noch","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Anbauten sind Eigentümer-Sache — Mieter direkt in die persönliche Beratung.
    (v_funnel, v_tenant, p_eigentum, 0, false,
     '[{"field_key":"eigentum","op":"eq","value":"miete"}]'::jsonb, 'page', p_kontakt),
    -- Bauart unklar: genau das ist das Kern-Beratungsthema — direkt Kontakt.
    (v_funnel, v_tenant, p_bauart, 0, false,
     '[{"field_key":"bauart","op":"eq","value":"beratung"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Wintergarten-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Wintergarten-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei SonnenRaum</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch mit kostenlosem Aufmaß vor Ort.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von SonnenRaum</p>', true);
END $do$;
