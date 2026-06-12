-- =============================================================================
-- Charge 5 / Vorlage 31 — Augenlasern („VisuMed Augenzentrum")
--
-- Recherche-Beleg (2026-06-11): Der kostenlose Eignungs-Check ist DAS
-- Akquise-Modell der Branche (Optical Express, CARE Vision ab ~1.200 €/Auge,
-- EuroEyes-Eignungsprüfung, Lasermed Femto-LASIK ab 1.590 €/Auge). Fachlich
-- korrekt: mind. 18 Jahre + seit mindestens einem Jahr stabile Sehstärke sind
-- Voraussetzung; ideales Alter 25–45 (ab ~50 kommen eher Linsenverfahren in
-- Frage); ~84 % der Interessenten sind grundsätzlich geeignet.
--
-- Logik: (1) Alter ≥ 50 → persönliche Beratung (Linsenverfahren statt Laser
-- möglich — gte-Regel). (2) Sehstärke nicht stabil → persönliche ärztliche
-- Abklärung statt Standardstrecke.
-- Theme: #14b8a6 (klares Türkis), poppins, 0.75rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_sehfehler uuid := gen_random_uuid();
  p_sehhilfe  uuid := gen_random_uuid();
  p_alter     uuid := gen_random_uuid();
  p_stabil    uuid := gen_random_uuid();
  p_zeitpunkt uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-augenlasern', v_tenant, 'Demo — Augenlasern (VisuMed)',
    'Augenlasern — kostenloser Eignungs-Check',
    'Vielen Dank für Ihre Anfrage!',
    'Unser Patientenberater meldet sich innerhalb von 24 Stunden bei Ihnen, um Ihren Eignungs-Check zu vereinbaren.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'visumed', '#14b8a6', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Leben ohne Brille — ist Augenlasern etwas für Sie?',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und sichern Sie sich Ihren kostenlosen Eignungs-Check — unverbindlich und ohne Wartezeit.',
      'page_key', 'welcome_augen', 'button_label', 'Eignungs-Check sichern →', 'visible', true)),
    (p_sehfehler, v_funnel, 'question', 1, '{}'::jsonb),
    (p_sehhilfe,  v_funnel, 'question', 2, '{}'::jsonb),
    (p_alter,     v_funnel, 'question', 3, '{}'::jsonb),
    (p_stabil,    v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitpunkt, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für den Eignungs-Check?',
      'subtitle', 'Unser Patientenberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_augen', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_sehfehler, 'fehlsichtigkeit', 'single_choice', 'Welche Fehlsichtigkeit haben Sie?', NULL, NULL, true, true, 0,
      '[{"label":"Kurzsichtigkeit","value":"kurzsichtig","sort_order":0},
        {"label":"Weitsichtigkeit","value":"weitsichtig","sort_order":1},
        {"label":"Hornhautverkrümmung","value":"hornhautverkruemmung","sort_order":2},
        {"label":"Kombination / weiß nicht genau","value":"unsicher","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_sehhilfe, 'sehhilfe', 'single_choice', 'Was tragen Sie aktuell?', NULL, NULL, true, true, 0,
      '[{"label":"Brille","value":"brille","sort_order":0},
        {"label":"Kontaktlinsen","value":"kontaktlinsen","sort_order":1},
        {"label":"Beides","value":"beides","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_alter, 'alter', 'number', 'Wie alt sind Sie?',
      'Augenlasern ist ab 18 Jahren möglich — das ideale Alter liegt zwischen 25 und 45.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":18,"max":75,"step":1,"required":true,"unit":"Jahre"}'::jsonb),
    (p_stabil, 'sehstaerke_stabil', 'single_choice', 'Ist Ihre Sehstärke seit mindestens einem Jahr stabil?',
      'Eine stabile Sehstärke ist Voraussetzung für die Behandlung.', NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Weiß nicht","value":"weiss_nicht","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zeitpunkt, 'zeitpunkt', 'single_choice', 'Wann möchten Sie die Behandlung durchführen lassen?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Ich informiere mich zunächst","value":"nur_info","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Ab 50 kommen oft Linsenverfahren statt Laser in Frage — persönliche Beratung.
    (v_funnel, v_tenant, p_alter, 0, false,
     '[{"field_key":"alter","op":"gte","value":"50"}]'::jsonb, 'page', p_kontakt),
    -- Instabile Sehstärke: erst ärztliche Abklärung statt Standardstrecke.
    (v_funnel, v_tenant, p_stabil, 0, false,
     '[{"field_key":"sehstaerke_stabil","op":"eq","value":"nein"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Eignungs-Check-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Augenlasern-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihr Eignungs-Check bei VisuMed</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Unser Patientenberater meldet sich innerhalb von 24 Stunden bei Ihnen, um Ihren kostenlosen Eignungs-Check zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team vom VisuMed Augenzentrum</p>', true);
END $do$;
