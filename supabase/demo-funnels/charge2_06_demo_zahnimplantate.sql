-- =============================================================================
-- Charge 2 / Vorlage 15 — Zahnimplantate („City Dental Zahnzentrum")
--
-- Recherche-Beleg (2026-06-11): Implantologie ist ein großer Paid-Patient-
-- Markt (CPA 50–150 € pro qualifiziertem Lead je nach Standort/Behandlung;
-- Patient-CLV ~3.500 €). Fachlich relevant für die Vorqualifizierung:
-- Anzahl der zu ersetzenden Zähne (Einzelimplantat bis All-on-4), Bestands-
-- dauer der Lücke (Knochenrückbildung beeinflusst die Planung),
-- Versicherungsstatus (GKV zahlt nur Festzuschuss auf die Krone, kein
-- Implantat/Knochenaufbau; Zahnzusatz/PKV ändern das Bild).
--
-- Logik: Ganzer Kiefer → direkt Beratungstermin (komplexe Komplettversorgung,
-- keine Standardstrecke). Theme: #db2777 (Dental-Pink), poppins, 0.75rem,
-- zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_anzahl    uuid := gen_random_uuid();
  p_seit_wann uuid := gen_random_uuid();
  p_versich   uuid := gen_random_uuid();
  p_zeitpunkt uuid := gen_random_uuid();
  p_anliegen  uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-zahnimplantate', v_tenant, 'Demo — Zahnimplantate (City Dental)',
    'Zahnimplantate — Beratungstermin anfragen',
    'Vielen Dank für Ihre Anfrage!',
    'Unser Praxisteam meldet sich innerhalb von 24 Stunden bei Ihnen für die Terminvereinbarung.',
    'Unverbindlich und kostenlos.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'citydental', '#db2777', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Feste Zähne mit Implantaten',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und fordern Sie Ihren persönlichen Beratungstermin an — unverbindlich und kostenlos.',
      'page_key', 'welcome_zahn', 'button_label', 'Beratungstermin anfragen →', 'visible', true)),
    (p_anzahl,    v_funnel, 'question', 1, '{}'::jsonb),
    (p_seit_wann, v_funnel, 'question', 2, '{}'::jsonb),
    (p_versich,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_zeitpunkt, v_funnel, 'question', 4, '{}'::jsonb),
    (p_anliegen,  v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für die Terminvereinbarung?',
      'subtitle', 'Unser Praxisteam meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_zahn', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_anzahl, 'anzahl_zaehne', 'single_choice', 'Wie viele Zähne sollen ersetzt werden?', NULL, NULL, true, true, 0,
      '[{"label":"Ein einzelner Zahn","value":"einzelner_zahn","sort_order":0},
        {"label":"2 bis 3 Zähne","value":"zwei_bis_drei","sort_order":1},
        {"label":"Mehrere Zähne","value":"mehrere","sort_order":2},
        {"label":"Ein ganzer Kiefer","value":"ganzer_kiefer","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_seit_wann, 'seit_wann', 'single_choice', 'Seit wann fehlen die Zähne?',
      'Bei länger bestehenden Lücken kann sich der Kieferknochen zurückbilden — das beeinflusst die Behandlungsplanung.',
      NULL, true, true, 0,
      '[{"label":"Der Zahn ist noch nicht entfernt","value":"noch_nicht_entfernt","sort_order":0},
        {"label":"Weniger als 1 Jahr","value":"unter_1_jahr","sort_order":1},
        {"label":"1 bis 3 Jahre","value":"ein_bis_drei_jahre","sort_order":2},
        {"label":"Länger als 3 Jahre","value":"ueber_3_jahre","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_versich, 'versicherung', 'single_choice', 'Wie sind Sie versichert?', NULL, NULL, true, true, 0,
      '[{"label":"Gesetzlich","value":"gesetzlich","sort_order":0},
        {"label":"Gesetzlich mit Zahnzusatzversicherung","value":"gesetzlich_mit_zusatz","sort_order":1},
        {"label":"Privat","value":"privat","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zeitpunkt, 'zeitpunkt', 'single_choice', 'Wann möchten Sie mit der Behandlung beginnen?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Ich informiere mich zunächst","value":"nur_info","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_anliegen, 'anliegen', 'long_text', 'Möchten Sie uns vorab etwas mitteilen?', NULL,
      'z. B. bestehende Prothese, Vorbehandlungen, Ängste …', true, false, 0,
      '[]'::jsonb, '{"placeholder":"z. B. bestehende Prothese, Vorbehandlungen, Ängste …","required":false}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Komplette Kiefer-Versorgung (z. B. feste dritte Zähne): umfassende
    -- persönliche Beratung statt Standard-Fragenstrecke.
    (v_funnel, v_tenant, p_anzahl, 0, false,
     '[{"field_key":"anzahl_zaehne","op":"eq","value":"ganzer_kiefer"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Implantat-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Implantat-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage beim City Dental Zahnzentrum</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Unser Praxisteam meldet sich innerhalb von 24 Stunden bei Ihnen, um Ihren persönlichen Beratungstermin zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team vom City Dental Zahnzentrum</p>', true);
END $do$;
