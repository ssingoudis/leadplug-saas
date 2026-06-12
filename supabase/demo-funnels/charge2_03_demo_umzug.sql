-- =============================================================================
-- Charge 2 / Vorlage 12 — Umzugsunternehmen („UmzugsHelden")
--
-- Recherche-Beleg (2026-06-11): Umzugsanfragen sind ein großer Volumen-Lead-
-- Markt (ImmoScout24, Umzugspreisvergleich >100.000 Anfragen/Jahr, Sirelo,
-- UmzugsBewertungen; ab ~6 € pro Anfrage). Standard-Formularfelder real:
-- PLZ von/nach, Wohnfläche, Etage + Aufzug, Termin, Zusatzleistungen
-- (Einpackservice, Möbelmontage, Halteverbotszone, Entsorgung, Lagerung).
--
-- Logik: Firmenumzug → direkt Kontakt (individuelle Planung durch Projektleiter).
-- Showcase: 2 Multi-Field-Karten (Route, Wohnsituation), date-Feld, checkbox,
-- optionale multi_choice. Theme: #d97706 (Amber), roboto, 0.75rem, links. Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_art       uuid := gen_random_uuid();
  p_route     uuid := gen_random_uuid();
  p_flaeche   uuid := gen_random_uuid();
  p_situation uuid := gen_random_uuid();
  p_termin    uuid := gen_random_uuid();
  p_extras    uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-umzug', v_tenant, 'Demo — Umzug (UmzugsHelden)',
    'Umzug — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Wir melden uns innerhalb von 24 Stunden mit Ihrem persönlichen Angebot.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'umzugshelden', '#d97706', '#1f2937', '#ffffff',
    'transparent', 'roboto', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr Umzug — stressfrei zum fairen Preis',
      'subtitle', 'Beantworten Sie 6 kurze Fragen und erhalten Sie ein unverbindliches Angebot für Ihren Umzug — kostenlos und ohne Verpflichtung.',
      'page_key', 'welcome_umzug', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_art, v_funnel, 'question', 1, '{}'::jsonb),
    (p_route, v_funnel, 'custom', 2, jsonb_build_object(
      'title', 'Woher und wohin geht der Umzug?',
      'subtitle', 'Die Entfernung ist ein zentraler Preisfaktor.',
      'page_key', 'route_umzug', 'visible', true)),
    (p_flaeche, v_funnel, 'question', 3, '{}'::jsonb),
    (p_situation, v_funnel, 'custom', 4, jsonb_build_object(
      'title', 'Wie ist die Wohnsituation am Auszugsort?',
      'subtitle', 'Etage und Aufzug beeinflussen den Aufwand fürs Tragen.',
      'page_key', 'wohnsituation_umzug', 'visible', true)),
    (p_termin, v_funnel, 'question', 5, '{}'::jsonb),
    (p_extras, v_funnel, 'question', 6, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 7, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Wir melden uns innerhalb von 24 Stunden mit Ihrem persönlichen Angebot.',
      'page_key', 'kontakt_umzug', 'visible', true)),
    (p_success, v_funnel, 'success', 8, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_art, 'umzugsart', 'single_choice', 'Welche Art von Umzug planen Sie?', NULL, NULL, true, true, 0,
      '[{"label":"Privatumzug","value":"privat","sort_order":0},
        {"label":"Firmenumzug","value":"firma","sort_order":1},
        {"label":"Seniorenumzug","value":"senioren","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_route, 'von_plz', 'short_text', 'PLZ Auszugsort', NULL, 'z. B. 50667', true, true, 0,
      '[]'::jsonb, '{"placeholder":"z. B. 50667","maxLength":5,"required":true}'::jsonb),
    (p_route, 'nach_plz', 'short_text', 'PLZ Einzugsort', NULL, 'z. B. 80331', true, true, 1,
      '[]'::jsonb, '{"placeholder":"z. B. 80331","maxLength":5,"required":true}'::jsonb),
    (p_flaeche, 'wohnflaeche', 'number', 'Wie groß ist Ihre aktuelle Wohnung?', NULL, NULL, true, true, 0,
      '[]'::jsonb, '{"min":10,"max":400,"step":5,"required":true,"unit":"m²"}'::jsonb),
    (p_situation, 'etage', 'dropdown', 'Etage', NULL, NULL, true, true, 0,
      '[{"label":"Erdgeschoss","value":"erdgeschoss","sort_order":0},
        {"label":"1. bis 2. Obergeschoss","value":"og_1_2","sort_order":1},
        {"label":"3. Obergeschoss oder höher","value":"og_3_plus","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_situation, 'aufzug', 'checkbox', 'Aufzug', NULL, NULL, true, false, 1,
      '[]'::jsonb, '{"label":"Ein Aufzug ist vorhanden","required":false}'::jsonb),
    (p_termin, 'umzugstermin', 'date', 'Wann soll der Umzug stattfinden?', NULL, NULL, true, true, 0,
      '[]'::jsonb, '{"required":true}'::jsonb),
    (p_extras, 'zusatzleistungen', 'multi_choice', 'Welche Zusatzleistungen benötigen Sie?',
      'Mehrfachauswahl möglich — Sie können diesen Schritt auch überspringen.', NULL, true, false, 0,
      '[{"label":"Einpackservice","value":"einpackservice","sort_order":0},
        {"label":"Möbelmontage","value":"moebelmontage","sort_order":1},
        {"label":"Halteverbotszone einrichten","value":"halteverbotszone","sort_order":2},
        {"label":"Entsorgung","value":"entsorgung","sort_order":3},
        {"label":"Zwischenlagerung","value":"zwischenlagerung","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Firmenumzüge werden individuell durch einen Projektleiter geplant —
    -- die Privatwohnungs-Fragen passen dort nicht.
    (v_funnel, v_tenant, p_art, 0, false,
     '[{"field_key":"umzugsart","op":"eq","value":"firma"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Umzugsanfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Umzugs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Umzugsanfrage bei UmzugsHelden</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Wir melden uns innerhalb von 24 Stunden mit Ihrem persönlichen Angebot bei Ihnen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von UmzugsHelden</p>', true);
END $do$;
