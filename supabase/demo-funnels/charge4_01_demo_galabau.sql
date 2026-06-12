-- =============================================================================
-- Charge 4 / Vorlage 22 — Garten- & Landschaftsbau („GrünWerk Gartenbau")
--
-- Recherche-Beleg (2026-06-11): GaLaBau hat eigene Lead-Dienste (Anbieter mit
-- 55+ Anfragen/Monat und Ø-Projektvolumen ~22.000 €; Handwerksmagnet-Branche;
-- Portale Gartenbau.org mit 57.000 Betrieben, 11880-gartenbau.com mit 32.000+
-- Profis und Angebots-Vergleich). Pflasterarbeiten real 20–135 €/m²,
-- Gartengestaltung 10–100 €/m² — Fläche und Leistung sind die Preis-Qualifier.
--
-- Logik: (1) Mieter → direkt Kontakt (Außenanlagen sind Eigentümer-Sache).
-- (2) Gartenpflege → Flächen-Frage überspringen (Dauerauftrag, Pauschale
-- wird vor Ort kalkuliert). Theme: #3f6212 (sattes Grün), roboto, 0.75rem,
-- links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_eigentum uuid := gen_random_uuid();
  p_leistung uuid := gen_random_uuid();
  p_flaeche  uuid := gen_random_uuid();
  p_zeitraum uuid := gen_random_uuid();
  p_wunsch   uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-galabau', v_tenant, 'Demo — Gartenbau (GrünWerk)',
    'Gartengestaltung — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Gartenbau-Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'gruenwerk', '#3f6212', '#1f2937', '#ffffff',
    'transparent', 'roboto', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr Traumgarten vom Fachbetrieb',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Gartenprojekt und erhalten Sie ein unverbindliches Angebot — kostenlos und ohne Verpflichtung.',
      'page_key', 'welcome_galabau', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_eigentum, v_funnel, 'question', 1, '{}'::jsonb),
    (p_leistung, v_funnel, 'question', 2, '{}'::jsonb),
    (p_flaeche,  v_funnel, 'question', 3, '{}'::jsonb),
    (p_zeitraum, v_funnel, 'question', 4, '{}'::jsonb),
    (p_wunsch,   v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Gartenbau-Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_galabau', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_eigentum, 'eigentum', 'single_choice', 'Sind Sie Eigentümer des Grundstücks?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, Eigentümer","value":"eigentum","sort_order":0},
        {"label":"Nein, zur Miete","value":"miete","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_leistung, 'leistung', 'single_choice', 'Welche Leistung wird benötigt?', NULL, NULL, true, true, 0,
      '[{"label":"Komplette Gartenneugestaltung","value":"neugestaltung","sort_order":0},
        {"label":"Pflasterarbeiten / Wege & Einfahrt","value":"pflaster","sort_order":1},
        {"label":"Terrasse","value":"terrasse","sort_order":2},
        {"label":"Zaun / Sichtschutz","value":"zaun","sort_order":3},
        {"label":"Regelmäßige Gartenpflege","value":"pflege","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_flaeche, 'flaeche', 'number', 'Wie groß ist die betroffene Fläche ungefähr?',
      'Eine grobe Schätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":10,"max":5000,"step":10,"required":true,"unit":"m²"}'::jsonb),
    (p_zeitraum, 'zeitraum', 'single_choice', 'Wann soll das Projekt starten?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Zur nächsten Saison","value":"naechste_saison","sort_order":2},
        {"label":"Ich plane noch","value":"plane_noch","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_wunsch, 'projektbeschreibung', 'long_text', 'Möchten Sie Ihr Projekt kurz beschreiben?', NULL,
      'z. B. Hanggrundstück, alter Baumbestand, Wunsch-Materialien …', true, false, 0,
      '[]'::jsonb, '{"placeholder":"z. B. Hanggrundstück, alter Baumbestand, Wunsch-Materialien …","required":false}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Außenanlagen sind Eigentümer-Sache — Mieter direkt in die persönliche Beratung.
    (v_funnel, v_tenant, p_eigentum, 0, false,
     '[{"field_key":"eigentum","op":"eq","value":"miete"}]'::jsonb, 'page', p_kontakt),
    -- Gartenpflege ist ein Dauerauftrag — die Flächen-Frage entfällt,
    -- die Pauschale wird vor Ort kalkuliert.
    (v_funnel, v_tenant, p_leistung, 0, false,
     '[{"field_key":"leistung","op":"eq","value":"pflege"}]'::jsonb, 'page', p_zeitraum);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Gartenbau-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Gartenbau-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei GrünWerk Gartenbau</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Gartenbau-Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch mit kostenlosem Vor-Ort-Termin.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von GrünWerk Gartenbau</p>', true);
END $do$;
