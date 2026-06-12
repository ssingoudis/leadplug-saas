-- =============================================================================
-- Charge 6 / Vorlage 35 — Gebäudereinigung B2B („BlitzBlank Gebäudeservice")
--
-- Recherche-Beleg (2026-06-11): Leadsagentur.de verkauft explizit
-- Gebäudereinigungs-Leads (Kampagnen auf Facility-Manager + Eigentümer,
-- Ziel: langfristige Unterhaltsreinigungs-Verträge); Vergleichsportale
-- (primaprofi) + Angebots-Funnels mit 24h-Versprechen (dalli) sind Standard.
-- Reale Qualifizierer: Leistungsart (Unterhalts-/Glas-/Grund-/Treppenhaus-
-- reinigung), Objektart, Fläche, Reinigungsintervall (täglich/wöchentlich/
-- monatlich), Startzeitpunkt.
--
-- Logik: Fläche ≥ 5.000 m² → Großobjekt, direkt persönliche Besichtigung
-- (numerische gte-Regel auf dem number-Feld).
-- Theme: #1e40af (sauberes Blau), inter, 0.5rem, links. Anrede: Sie (B2B).
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_leistung  uuid := gen_random_uuid();
  p_objekt    uuid := gen_random_uuid();
  p_flaeche   uuid := gen_random_uuid();
  p_intervall uuid := gen_random_uuid();
  p_start     uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-gebaeudereinigung', v_tenant, 'Demo — Gebäudereinigung (BlitzBlank)',
    'Gebäudereinigung — Angebot in 24 Stunden',
    'Vielen Dank für Ihre Anfrage!',
    'Wir melden uns innerhalb von 24 Stunden mit Ihrem individuellen Angebot — auf Wunsch nach kostenloser Objektbesichtigung.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'blitzblank', '#1e40af', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Professionelle Gebäudereinigung für Ihr Objekt',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Objekt und erhalten Sie innerhalb von 24 Stunden ein individuelles Angebot.',
      'page_key', 'welcome_reinigung', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_leistung,  v_funnel, 'question', 1, '{}'::jsonb),
    (p_objekt,    v_funnel, 'question', 2, '{}'::jsonb),
    (p_flaeche,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_intervall, v_funnel, 'question', 4, '{}'::jsonb),
    (p_start,     v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_reinigung', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_leistung, 'leistung', 'single_choice', 'Welche Leistung benötigen Sie?', NULL, NULL, true, true, 0,
      '[{"label":"Unterhaltsreinigung (regelmäßig)","value":"unterhaltsreinigung","sort_order":0},
        {"label":"Glas- / Fassadenreinigung","value":"glasreinigung","sort_order":1},
        {"label":"Grundreinigung (einmalig)","value":"grundreinigung","sort_order":2},
        {"label":"Treppenhausreinigung","value":"treppenhaus","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_objekt, 'objekt', 'single_choice', 'Um welches Objekt handelt es sich?', NULL, NULL, true, true, 0,
      '[{"label":"Büro / Praxis","value":"buero","sort_order":0},
        {"label":"Wohnanlage","value":"wohnanlage","sort_order":1},
        {"label":"Einzelhandel / Gewerbe","value":"gewerbe","sort_order":2},
        {"label":"Industrie / Halle","value":"industrie","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_flaeche, 'flaeche', 'number', 'Wie groß ist die zu reinigende Fläche ungefähr?',
      'Eine grobe Schätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":50,"max":20000,"step":50,"required":true,"unit":"m²"}'::jsonb),
    (p_intervall, 'intervall', 'dropdown', 'Wie häufig soll gereinigt werden?', NULL, NULL, true, true, 0,
      '[{"label":"Täglich","value":"taeglich","sort_order":0},
        {"label":"Mehrmals pro Woche","value":"mehrmals_woche","sort_order":1},
        {"label":"Wöchentlich","value":"woechentlich","sort_order":2},
        {"label":"Einmalig","value":"einmalig","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_start, 'start', 'single_choice', 'Wann soll die Reinigung starten?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"Innerhalb von 4 Wochen","value":"vier_wochen","sort_order":1},
        {"label":"Flexibel / Ausschreibung läuft","value":"flexibel","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Großobjekte ab 5.000 m² werden nach persönlicher Besichtigung kalkuliert —
    -- direkt zur Kontaktaufnahme (numerische gte-Regel).
    (v_funnel, v_tenant, p_flaeche, 0, false,
     '[{"field_key":"flaeche","op":"gte","value":"5000"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Reinigungs-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Gebäudereinigungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei BlitzBlank Gebäudeservice</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Wir melden uns innerhalb von 24 Stunden mit Ihrem individuellen Angebot — auf Wunsch vereinbaren wir eine kostenlose Objektbesichtigung.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von BlitzBlank</p>', true);
END $do$;
