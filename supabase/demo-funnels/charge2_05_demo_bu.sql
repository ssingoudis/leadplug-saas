-- =============================================================================
-- Charge 2 / Vorlage 14 — Berufsunfähigkeitsversicherung („Vorsorgekontor")
--
-- Recherche-Beleg (2026-06-11): BU-Leads sind ein klassischer Makler-Lead-Markt
-- (39–44 € netto bei DenkebenE, hochwertig/exklusiv 80–170 €; Finanzleads,
-- Powerleads, Lead-Experten). Preisfaktoren real: Alter, Beruf, Raucherstatus
-- (Raucher = aktiv in den letzten 10 Jahren, Swiss-Life-Definition),
-- Gesundheitszustand, gewünschte BU-Rente (Faustregel 75–80 % vom Netto,
-- empfohlen mind. 1.000 €).
--
-- Logik: (1) Alter ≥ 50 → persönliche Beratung (Abschluss ab 50 komplex/teuer,
-- numerische gte-Regel). (2) Vorerkrankungen = ja → direkt Kontakt (anonyme
-- Risikovoranfrage ist Makler-Handarbeit, keine Standardstrecke).
-- Theme: #115e59 (dunkles Petrol, seriös), inter, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_beruf    uuid := gen_random_uuid();
  p_alter    uuid := gen_random_uuid();
  p_raucher  uuid := gen_random_uuid();
  p_gesund   uuid := gen_random_uuid();
  p_rente    uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-bu', v_tenant, 'Demo — BU-Versicherung (Vorsorgekontor)',
    'BU-Versicherung — unabhängiger Vergleich',
    'Vielen Dank für Ihre Anfrage!',
    'Ein unabhängiger Berater meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Unabhängig, kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'vorsorgekontor', '#115e59', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr unabhängiger BU-Vergleich',
      'subtitle', 'Ermitteln Sie in 2 Minuten die passende Berufsunfähigkeitsversicherung — unabhängig, kostenlos und unverbindlich.',
      'page_key', 'welcome_bu', 'button_label', 'Jetzt BU-Check starten →', 'visible', true)),
    (p_beruf,   v_funnel, 'question', 1, '{}'::jsonb),
    (p_alter,   v_funnel, 'question', 2, '{}'::jsonb),
    (p_raucher, v_funnel, 'question', 3, '{}'::jsonb),
    (p_gesund,  v_funnel, 'question', 4, '{}'::jsonb),
    (p_rente,   v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihren Vergleich senden?',
      'subtitle', 'Ein unabhängiger Berater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_bu', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_beruf, 'berufsgruppe', 'single_choice', 'In welchem Bereich arbeiten Sie?', NULL, NULL, true, true, 0,
      '[{"label":"Büro / kaufmännisch","value":"buero_kaufmaennisch","sort_order":0},
        {"label":"Handwerk / körperliche Arbeit","value":"handwerk_koerperlich","sort_order":1},
        {"label":"Medizin / Soziales","value":"medizin_soziales","sort_order":2},
        {"label":"Öffentlicher Dienst","value":"oeffentlicher_dienst","sort_order":3},
        {"label":"Student/in oder Azubi","value":"student_azubi","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_alter, 'alter', 'number', 'Wie alt sind Sie?',
      'Je früher Sie abschließen, desto günstiger bleibt Ihr Beitrag dauerhaft.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":16,"max":60,"step":1,"required":true,"unit":"Jahre"}'::jsonb),
    (p_raucher, 'raucher', 'single_choice', 'Rauchen Sie oder haben Sie in den letzten 10 Jahren geraucht?', NULL, NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_gesund, 'vorerkrankungen', 'single_choice', 'Gibt es Vorerkrankungen oder laufende Behandlungen?',
      'Auch mit Vorerkrankungen ist BU-Schutz oft möglich — über eine anonyme Risikovoranfrage bei den Versicherern.',
      NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Bin mir unsicher","value":"unsicher","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_rente, 'bu_rente', 'slider', 'Welche monatliche BU-Rente wünschen Sie sich?',
      'Als Faustregel gelten 75 bis 80 % Ihres Nettoeinkommens.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":500,"max":3000,"step":100,"default":1500,"unit":"€"}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Ab 50 ist der BU-Abschluss komplex und teuer — direkt persönliche Beratung.
    (v_funnel, v_tenant, p_alter, 0, false,
     '[{"field_key":"alter","op":"gte","value":"50"}]'::jsonb, 'page', p_kontakt),
    -- Vorerkrankungen: anonyme Risikovoranfrage ist individuelle Makler-Arbeit.
    (v_funnel, v_tenant, p_gesund, 0, false,
     '[{"field_key":"vorerkrankungen","op":"eq","value":"ja"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer BU-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den BU-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihr BU-Vergleich beim Vorsorgekontor</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein unabhängiger Berater meldet sich innerhalb von 24 Stunden bei Ihnen und bespricht mit Ihnen die passenden Tarife.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team vom Vorsorgekontor</p>', true);
END $do$;
