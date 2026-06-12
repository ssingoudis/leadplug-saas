-- =============================================================================
-- Charge 3 / Vorlage 19 — Hörgeräte-Beratung („HörPunkt Akustik")
--
-- Recherche-Beleg (2026-06-11): audibene hat seit 2012 „Leads als harte
-- Währung der Hörakustik" etabliert (Online-Beratung → Akustiker vor Ort;
-- inzwischen sogar TK-Kassenvertrag für Online-Versorgung). Fachlich korrekt:
-- Die HNO-Verordnung ist der Schlüssel zum Festbetrag der gesetzlichen
-- Krankenkasse; Kassenmodelle ohne Zuzahlung existieren. Übliche
-- Vorqualifizierung: für wen, Hörsituationen, Erst- vs. Folgeversorgung,
-- HNO-Status, Versicherung.
--
-- Logik: Bereits Hörgeräte-Träger (Folgeversorgung) → HNO-Frage überspringen
-- (der Weg über Verordnung ist Bestandskunden bekannt).
-- Theme: #65a30d (frisches Lime, Gesundheit), system, 0.75rem, links. Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_fuer_wen uuid := gen_random_uuid();
  p_situationen uuid := gen_random_uuid();
  p_bereits  uuid := gen_random_uuid();
  p_hno      uuid := gen_random_uuid();
  p_versich  uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-hoergeraete', v_tenant, 'Demo — Hörgeräte (HörPunkt Akustik)',
    'Hörgeräte — kostenlose Beratung',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Hörakustiker aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Kostenlos und unverbindlich — inklusive Beratung zum Kassen-Zuschuss.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'hoerpunkt', '#65a30d', '#1f2937', '#ffffff',
    'transparent', 'system', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Wieder gut hören — mit dem passenden Hörgerät',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie eine kostenlose Beratung — inklusive Infos zum Zuschuss Ihrer Krankenkasse.',
      'page_key', 'welcome_hoer', 'button_label', 'Jetzt Beratung anfordern →', 'visible', true)),
    (p_fuer_wen,    v_funnel, 'question', 1, '{}'::jsonb),
    (p_situationen, v_funnel, 'question', 2, '{}'::jsonb),
    (p_bereits,     v_funnel, 'question', 3, '{}'::jsonb),
    (p_hno,         v_funnel, 'question', 4, '{}'::jsonb),
    (p_versich,     v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihre Beratung senden?',
      'subtitle', 'Ein Hörakustiker aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_hoer', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_fuer_wen, 'fuer_wen', 'single_choice', 'Für wen ist die Hörgeräte-Beratung?', NULL, NULL, true, true, 0,
      '[{"label":"Für mich selbst","value":"selbst","sort_order":0},
        {"label":"Für eine angehörige Person","value":"angehoerige","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_situationen, 'situationen', 'multi_choice', 'In welchen Situationen fällt das Hören schwer?',
      'Mehrfachauswahl möglich.', NULL, true, true, 0,
      '[{"label":"Gespräche in Gruppen","value":"gruppen","sort_order":0},
        {"label":"Fernsehen","value":"fernsehen","sort_order":1},
        {"label":"Telefonieren","value":"telefonieren","sort_order":2},
        {"label":"Im Beruf","value":"beruf","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_bereits, 'bereits_hoergeraet', 'single_choice', 'Tragen Sie bereits Hörgeräte?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, ich suche eine Folgeversorgung","value":"ja","sort_order":0},
        {"label":"Nein, es wäre das erste Mal","value":"nein","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_hno, 'hno_status', 'single_choice', 'Waren Sie mit der Hörminderung bereits beim HNO-Arzt?',
      'Die HNO-Verordnung ist der Schlüssel zum Festbetrag der gesetzlichen Krankenkasse.', NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Termin ist geplant","value":"termin_geplant","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_versich, 'versicherung', 'single_choice', 'Wie sind Sie versichert?', NULL, NULL, true, true, 0,
      '[{"label":"Gesetzlich","value":"gesetzlich","sort_order":0},
        {"label":"Privat","value":"privat","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Folgeversorgung: der Weg über die HNO-Verordnung ist Bestandsträgern
    -- bekannt — HNO-Frage überspringen.
    (v_funnel, v_tenant, p_bereits, 0, false,
     '[{"field_key":"bereits_hoergeraet","op":"eq","value":"ja"}]'::jsonb, 'page', p_versich);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Hörgeräte-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Hörgeräte-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Hörgeräte-Beratung bei HörPunkt Akustik</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Hörakustiker aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen — gern beraten wir Sie auch zum Zuschuss Ihrer Krankenkasse.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von HörPunkt Akustik</p>', true);
END $do$;
