-- =============================================================================
-- Charge 2 / Vorlage 13 — Pflege-Recruiting („Pflegeteam Sonnenhof")
--
-- Recherche-Beleg (2026-06-11): Social-Recruiting für Pflegekräfte ist DAS
-- Perspective-Flaggschiff (Cases: 36 Einstellungen/700 Bewerbungen in 10
-- Wochen; 10 Einstellungen/12 Monate für eine Sozialstation). Branchen-Best-
-- Practice: 3–5 Filterfragen gegen Streu-Bewerbungen — häufigste Auslöser
-- unpassender Bewerbungen sind Schichtdienst + Qualifikation; Erstkontakt
-- innerhalb 24 h entscheidet. Führerschein ist im ambulanten Dienst Pflicht.
--
-- Logik: Quereinsteiger → Berufserfahrungs-Frage überspringen.
-- Anrede: per Du (Branchen-Norm Recruiting/Bewerber, wie demo-recruiting).
-- Theme: #2563eb (Klinik-Blau), poppins, 0.75rem, zentriert.
-- show_answers_overview false (Bewerbung, kein Beratungsprotokoll).
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_quali      uuid := gen_random_uuid();
  p_erfahrung  uuid := gen_random_uuid();
  p_arbeitszeit uuid := gen_random_uuid();
  p_schicht    uuid := gen_random_uuid();
  p_fuehrerschein uuid := gen_random_uuid();
  p_start      uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-pflege-recruiting', v_tenant, 'Demo — Pflege-Recruiting (Pflegeteam Sonnenhof)',
    'Dein neuer Job in der Pflege',
    'Danke für deine Bewerbung!',
    'Wir melden uns innerhalb von 24 Stunden bei dir — versprochen.',
    'Ohne Lebenslauf, ohne Anschreiben.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Bewerbung kontaktiert zu werden.',
    'Deine Angaben im Überblick:', false, true, true, 'center',
    'stavrossingoudis@gmail.com', 'sonnenhof', '#2563eb', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Dein neuer Job in der Pflege',
      'subtitle', 'Das Pflegeteam Sonnenhof sucht Verstärkung. Finde in 2 Minuten heraus, ob wir zusammenpassen — ohne Lebenslauf und ohne Anschreiben.',
      'page_key', 'welcome_pflege', 'button_label', 'Jetzt bewerben →', 'visible', true)),
    (p_quali,         v_funnel, 'question', 1, '{}'::jsonb),
    (p_erfahrung,     v_funnel, 'question', 2, '{}'::jsonb),
    (p_arbeitszeit,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_schicht,       v_funnel, 'question', 4, '{}'::jsonb),
    (p_fuehrerschein, v_funnel, 'question', 5, '{}'::jsonb),
    (p_start,         v_funnel, 'question', 6, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 7, jsonb_build_object(
      'title', 'Fast geschafft — wie erreichen wir dich?',
      'subtitle', 'Wir melden uns innerhalb von 24 Stunden bei dir — versprochen.',
      'page_key', 'kontakt_pflege', 'visible', true)),
    (p_success, v_funnel, 'success', 8, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_quali, 'qualifikation', 'single_choice', 'Welche Qualifikation bringst du mit?', NULL, NULL, true, true, 0,
      '[{"label":"Examinierte Pflegefachkraft","value":"examiniert","sort_order":0},
        {"label":"Pflegehelfer/in","value":"pflegehelfer","sort_order":1},
        {"label":"Quereinsteiger/in","value":"quereinsteiger","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_erfahrung, 'erfahrung', 'dropdown', 'Wie viel Berufserfahrung hast du in der Pflege?', NULL, NULL, true, true, 0,
      '[{"label":"Weniger als 2 Jahre","value":"unter_2_jahre","sort_order":0},
        {"label":"2 bis 5 Jahre","value":"zwei_bis_fuenf_jahre","sort_order":1},
        {"label":"Mehr als 5 Jahre","value":"ueber_5_jahre","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_arbeitszeit, 'arbeitszeit', 'single_choice', 'Wie möchtest du arbeiten?', NULL, NULL, true, true, 0,
      '[{"label":"Vollzeit","value":"vollzeit","sort_order":0},
        {"label":"Teilzeit","value":"teilzeit","sort_order":1},
        {"label":"Minijob","value":"minijob","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_schicht, 'schichtdienst', 'single_choice', 'Bist du bereit, im Schichtdienst zu arbeiten?', NULL, NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Teilweise — nach Absprache","value":"teilweise","sort_order":1},
        {"label":"Nein","value":"nein","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_fuehrerschein, 'fuehrerschein', 'single_choice', 'Hast du einen Führerschein der Klasse B?',
      'Wichtig für Touren im ambulanten Dienst.', NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_start, 'start', 'single_choice', 'Wann könntest du anfangen?', NULL, NULL, true, true, 0,
      '[{"label":"Sofort","value":"sofort","sort_order":0},
        {"label":"In 1 bis 3 Monaten","value":"ein_bis_drei_monate","sort_order":1},
        {"label":"Später","value":"spaeter","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Quereinsteiger haben keine Pflege-Berufserfahrung — Frage überspringen.
    (v_funnel, v_tenant, p_quali, 0, false,
     '[{"field_key":"qualifikation","op":"eq","value":"quereinsteiger"}]'::jsonb, 'page', p_arbeitszeit);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Bewerber-Benachrichtigung', 'tenant', 0,
     '<p>Neue Bewerbung: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neue Bewerbung über den Pflege-Recruiting-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Tipp: Bewerber innerhalb von 24 Stunden anrufen — schnelle Rückmeldung entscheidet.</p>', true),
    (v_funnel, v_tenant, 'Bestätigung an Bewerber', 'customer', 0,
     '<p>Deine Bewerbung beim Pflegeteam Sonnenhof</p>',
     '<p>Hallo <span data-variable="contact.name">{{contact.name}}</span>,</p><p>danke für deine Bewerbung! Wir melden uns innerhalb von 24 Stunden bei dir — versprochen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Bis bald<br>Dein Pflegeteam Sonnenhof</p>', true);
END $do$;
