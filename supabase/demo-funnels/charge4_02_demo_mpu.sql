-- =============================================================================
-- Charge 4 / Vorlage 23 — MPU-Beratung („MPU Kompass")
--
-- Recherche-Beleg (2026-06-11): MPU-Vorbereitung ist ein Markt mit sehr hoher
-- Zahlungsbereitschaft (Gesamtkosten real 1.500–4.000 €; Vorbereitung allein
-- 949–3.500 €; Anbieter wie MPV GmbH, MPU-Zentrale „24/7", mpuwolff). Das
-- kostenlose Erstgespräch ist DER Branchen-Standard-Einstieg. Fachlich korrekt:
-- Anlässe Alkohol/Drogen/Punkte/Straftat; Abstinenznachweise je nach Anlass
-- über 6–15 Monate (Haaranalyse ~200–300 €, Urinscreening 70–100 €/Termin);
-- Punkte-MPU braucht i. d. R. keine Abstinenznachweise.
--
-- Logik: (1) Anlass „Punkte" → Abstinenz-Frage überspringen (Bedingung auf
-- früherem Feld, Quelle = Folgestep). (2) MPU-Termin steht bereits →
-- direkt Kontakt (Zeitdruck, Crash-Vorbereitung wird telefonisch geplant).
-- Theme: #1e3a8a (Navy, seriös), inter, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_anlass    uuid := gen_random_uuid();
  p_seit_wann uuid := gen_random_uuid();
  p_abstinenz uuid := gen_random_uuid();
  p_termin    uuid := gen_random_uuid();
  p_situation uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-mpu', v_tenant, 'Demo — MPU-Beratung (MPU Kompass)',
    'MPU-Vorbereitung — kostenloses Erstgespräch',
    'Vielen Dank für Ihre Anfrage!',
    'Ein MPU-Berater meldet sich innerhalb von 24 Stunden diskret bei Ihnen für Ihr kostenloses Erstgespräch.',
    'Diskret, kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'mpukompass', '#1e3a8a', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Zurück zum Führerschein — mit klarem Plan',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und sichern Sie sich Ihr kostenloses Erstgespräch zur MPU-Vorbereitung — diskret und unverbindlich.',
      'page_key', 'welcome_mpu', 'button_label', 'Kostenloses Erstgespräch sichern →', 'visible', true)),
    (p_anlass,    v_funnel, 'question', 1, '{}'::jsonb),
    (p_seit_wann, v_funnel, 'question', 2, '{}'::jsonb),
    (p_abstinenz, v_funnel, 'question', 3, '{}'::jsonb),
    (p_termin,    v_funnel, 'question', 4, '{}'::jsonb),
    (p_situation, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für das Erstgespräch?',
      'subtitle', 'Ein MPU-Berater meldet sich innerhalb von 24 Stunden diskret bei Ihnen.',
      'page_key', 'kontakt_mpu', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_anlass, 'anlass', 'single_choice', 'Was ist der Anlass für Ihre MPU?', NULL, NULL, true, true, 0,
      '[{"label":"Alkohol am Steuer","value":"alkohol","sort_order":0},
        {"label":"Drogen / Cannabis","value":"drogen","sort_order":1},
        {"label":"Punkte in Flensburg","value":"punkte","sort_order":2},
        {"label":"Anderes Delikt","value":"anderes","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_seit_wann, 'fuehrerschein_weg', 'dropdown', 'Seit wann ist der Führerschein weg?', NULL, NULL, true, true, 0,
      '[{"label":"Weniger als 6 Monate","value":"unter_6_monate","sort_order":0},
        {"label":"6 bis 12 Monate","value":"sechs_bis_zwoelf","sort_order":1},
        {"label":"Länger als 1 Jahr","value":"ueber_1_jahr","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_abstinenz, 'abstinenz', 'single_choice', 'Haben Sie bereits mit Abstinenznachweisen begonnen?',
      'Bei Alkohol- oder Drogen-MPU verlangen Begutachtungsstellen meist Nachweise über 6 bis 15 Monate.',
      NULL, true, true, 0,
      '[{"label":"Ja, läuft bereits","value":"laeuft","sort_order":0},
        {"label":"Nein, noch nicht","value":"nein","sort_order":1},
        {"label":"Unsicher, ob ich sie brauche","value":"unsicher","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_termin, 'mpu_termin', 'single_choice', 'Gibt es schon einen MPU-Termin?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, der Termin steht","value":"termin_steht","sort_order":0},
        {"label":"Aufforderung erhalten, noch kein Termin","value":"aufforderung","sort_order":1},
        {"label":"Noch keine Aufforderung","value":"keine","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_situation, 'situation', 'long_text', 'Möchten Sie Ihre Situation kurz schildern?', NULL,
      'z. B. Promillewert, einmaliger Vorfall, bisherige Vorbereitung …', true, false, 0,
      '[]'::jsonb, '{"placeholder":"z. B. Promillewert, einmaliger Vorfall, bisherige Vorbereitung …","required":false}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Punkte-MPU braucht i. d. R. keine Abstinenznachweise — Frage überspringen.
    -- (Bedingung auf dem früheren anlass-Feld, ausgewertet am seit_wann-Step.)
    (v_funnel, v_tenant, p_seit_wann, 0, false,
     '[{"field_key":"anlass","op":"eq","value":"punkte"}]'::jsonb, 'page', p_termin),
    -- MPU-Termin steht: Zeitdruck — Crash-Vorbereitung wird telefonisch geplant.
    (v_funnel, v_tenant, p_termin, 0, false,
     '[{"field_key":"mpu_termin","op":"eq","value":"termin_steht"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer MPU-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den MPU-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihr kostenloses MPU-Erstgespräch bei MPU Kompass</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihr Vertrauen! Ein MPU-Berater meldet sich innerhalb von 24 Stunden diskret bei Ihnen, um Ihr kostenloses Erstgespräch zu vereinbaren und die nächsten Schritte zu klären.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von MPU Kompass</p>', true);
END $do$;
