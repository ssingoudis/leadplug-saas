-- =============================================================================
-- Charge 4 / Vorlage 25 — KFZ-Versicherungswechsel („AutoTarif24")
--
-- Recherche-Beleg (2026-06-11): Klassischer, saisonal explodierender Lead-
-- Markt — Stichtag 30. November für die ordentliche Kündigung (Frist 4 Wochen,
-- Verbraucherzentrale/AUTO BILD/Cosmos berichten jährlich). Vergleichs-
-- Qualifizierer real: SF-Klasse (wird beim Wechsel übernommen), jährliche
-- Fahrleistung (Pflichtangabe, Beitragsfaktor), Schutzumfang
-- (Haftpflicht/Teilkasko/Vollkasko). Versicherungs-Leads werden über
-- Finanzleads-Portale gehandelt (siehe BU-Recherche, finanzleads.com/preise).
--
-- Logik: (1) Erstes eigenes Fahrzeug → SF-Klassen-Frage überspringen (noch
-- keine SF-Klasse vorhanden). (2) Wohnmobil/Transporter → Sondertarife,
-- direkt persönliche Beratung.
-- Theme: #ca8a04 (Versicherungs-Gelb), system, 0.75rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_fahrzeug uuid := gen_random_uuid();
  p_anlass   uuid := gen_random_uuid();
  p_sf       uuid := gen_random_uuid();
  p_km       uuid := gen_random_uuid();
  p_schutz   uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-kfz-versicherung', v_tenant, 'Demo — KFZ-Versicherung (AutoTarif24)',
    'KFZ-Versicherung — unabhängiger Vergleich',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Versicherungsberater meldet sich innerhalb von 24 Stunden mit Ihrem persönlichen Tarifvergleich.',
    'Unabhängig, kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'autotarif24', '#ca8a04', '#1f2937', '#ffffff',
    'transparent', 'system', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Zahlen Sie zu viel für Ihre KFZ-Versicherung?',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie Ihren unabhängigen Tarifvergleich — kostenlos und unverbindlich.',
      'page_key', 'welcome_kfz', 'button_label', 'Jetzt Tarife vergleichen →', 'visible', true)),
    (p_fahrzeug, v_funnel, 'question', 1, '{}'::jsonb),
    (p_anlass,   v_funnel, 'question', 2, '{}'::jsonb),
    (p_sf,       v_funnel, 'question', 3, '{}'::jsonb),
    (p_km,       v_funnel, 'question', 4, '{}'::jsonb),
    (p_schutz,   v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihren Vergleich senden?',
      'subtitle', 'Ein Versicherungsberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_kfz', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_fahrzeug, 'fahrzeug', 'single_choice', 'Welches Fahrzeug möchten Sie versichern?', NULL, NULL, true, true, 0,
      '[{"label":"PKW","value":"pkw","sort_order":0},
        {"label":"Motorrad","value":"motorrad","sort_order":1},
        {"label":"Wohnmobil / Transporter","value":"wohnmobil_transporter","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_anlass, 'anlass', 'single_choice', 'Was ist der Anlass für den Vergleich?', NULL, NULL, true, true, 0,
      '[{"label":"Wechsel zum Stichtag 30. November","value":"wechsel_stichtag","sort_order":0},
        {"label":"Fahrzeugwechsel / Neukauf","value":"fahrzeugwechsel","sort_order":1},
        {"label":"Erstes eigenes Fahrzeug","value":"erstfahrzeug","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_sf, 'sf_klasse', 'dropdown', 'In welcher Schadenfreiheitsklasse sind Sie aktuell?',
      'Die SF-Klasse wird beim Wechsel in der Regel übernommen.', NULL, true, true, 0,
      '[{"label":"SF 1 bis 5","value":"sf_1_5","sort_order":0},
        {"label":"SF 6 bis 15","value":"sf_6_15","sort_order":1},
        {"label":"SF 16 bis 25","value":"sf_16_25","sort_order":2},
        {"label":"Über SF 25","value":"sf_ueber_25","sort_order":3},
        {"label":"Weiß nicht","value":"weiss_nicht","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_km, 'fahrleistung', 'dropdown', 'Wie viele Kilometer fahren Sie pro Jahr?', NULL, NULL, true, true, 0,
      '[{"label":"Unter 6.000 km","value":"unter_6000","sort_order":0},
        {"label":"6.000 bis 12.000 km","value":"bis_12000","sort_order":1},
        {"label":"12.000 bis 20.000 km","value":"bis_20000","sort_order":2},
        {"label":"Über 20.000 km","value":"ueber_20000","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_schutz, 'schutz', 'single_choice', 'Welchen Schutz wünschen Sie sich?', NULL, NULL, true, true, 0,
      '[{"label":"Haftpflicht","value":"haftpflicht","sort_order":0},
        {"label":"Teilkasko","value":"teilkasko","sort_order":1},
        {"label":"Vollkasko","value":"vollkasko","sort_order":2},
        {"label":"Beratung gewünscht","value":"beratung","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Wohnmobile/Transporter laufen über Sondertarife — persönliche Beratung.
    (v_funnel, v_tenant, p_fahrzeug, 0, false,
     '[{"field_key":"fahrzeug","op":"eq","value":"wohnmobil_transporter"}]'::jsonb, 'page', p_kontakt),
    -- Erstes eigenes Fahrzeug: noch keine SF-Klasse vorhanden — Frage überspringen.
    (v_funnel, v_tenant, p_anlass, 0, false,
     '[{"field_key":"anlass","op":"eq","value":"erstfahrzeug"}]'::jsonb, 'page', p_km);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer KFZ-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den KFZ-Versicherungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihr KFZ-Tarifvergleich bei AutoTarif24</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Versicherungsberater meldet sich innerhalb von 24 Stunden mit Ihrem persönlichen Tarifvergleich bei Ihnen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von AutoTarif24</p>', true);
END $do$;
