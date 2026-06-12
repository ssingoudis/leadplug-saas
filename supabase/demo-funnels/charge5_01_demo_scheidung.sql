-- =============================================================================
-- Charge 5 / Vorlage 28 — Scheidung/Familienrecht („Kanzlei Brandt")
--
-- Recherche-Beleg (2026-06-11): Familienrechts-Kanzleien akquirieren real über
-- (teils kostenlose) Erstberatungen (anwalt.de-Ratgeber, Fachkanzleien wie
-- rosepartner, WBS, Gansel). Fachlich korrekt: Trennungsjahr ist Regel-
-- Voraussetzung der Scheidung; einvernehmlich = schneller + günstiger (nur ein
-- Anwalt nötig); bei Kindern müssen Sorge/Umgang/Unterhalt geregelt werden;
-- Zugewinn/Immobilie sind Standard-Regelungsthemen.
--
-- Logik: Scheidung wurde vom Partner bereits eingereicht → direkt Kontakt
-- (Fristen laufen — sofortige anwaltliche Vertretung statt Fragenstrecke).
-- Abgrenzung: demo-anwalt ist Arbeitsrecht — eigene Branche.
-- Theme: #581c87 (würdevolles Dunkelviolett), inter, 0.5rem, links. Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_situation uuid := gen_random_uuid();
  p_einig     uuid := gen_random_uuid();
  p_trennung  uuid := gen_random_uuid();
  p_kinder    uuid := gen_random_uuid();
  p_themen    uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-scheidung', v_tenant, 'Demo — Scheidung (Kanzlei Brandt)',
    'Scheidung — anwaltliche Erstberatung',
    'Vielen Dank für Ihre Anfrage!',
    'Die Kanzlei meldet sich innerhalb von 24 Stunden diskret bei Ihnen für Ihre Erstberatung.',
    'Diskret und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'kanzleibrandt', '#581c87', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Trennung oder Scheidung? Wir begleiten Sie.',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrer Situation und erhalten Sie eine anwaltliche Erstberatung — diskret und unverbindlich.',
      'page_key', 'welcome_scheidung', 'button_label', 'Erstberatung anfragen →', 'visible', true)),
    (p_situation, v_funnel, 'question', 1, '{}'::jsonb),
    (p_einig,     v_funnel, 'question', 2, '{}'::jsonb),
    (p_trennung,  v_funnel, 'question', 3, '{}'::jsonb),
    (p_kinder,    v_funnel, 'question', 4, '{}'::jsonb),
    (p_themen,    v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für die Erstberatung?',
      'subtitle', 'Die Kanzlei meldet sich innerhalb von 24 Stunden diskret bei Ihnen.',
      'page_key', 'kontakt_scheidung', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_situation, 'situation', 'single_choice', 'Wo stehen Sie aktuell?', NULL, NULL, true, true, 0,
      '[{"label":"Wir leben bereits getrennt","value":"getrennt","sort_order":0},
        {"label":"Die Trennung ist geplant","value":"geplant","sort_order":1},
        {"label":"Die Scheidung wurde vom Partner eingereicht","value":"eingereicht","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_einig, 'einvernehmlich', 'single_choice', 'Sind Sie sich mit Ihrem Partner einig?',
      'Eine einvernehmliche Scheidung ist deutlich schneller und günstiger — es genügt ein Anwalt.',
      NULL, true, true, 0,
      '[{"label":"Ja, wir sind uns einig","value":"einig","sort_order":0},
        {"label":"Teilweise","value":"teilweise","sort_order":1},
        {"label":"Nein, es ist strittig","value":"strittig","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_trennung, 'trennungsjahr', 'single_choice', 'Leben Sie bereits länger als ein Jahr getrennt?',
      'Das vollendete Trennungsjahr ist in der Regel Voraussetzung für die Scheidung.', NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein, kürzer","value":"nein","sort_order":1},
        {"label":"Wir leben noch zusammen","value":"zusammen","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kinder, 'kinder', 'single_choice', 'Gibt es gemeinsame Kinder?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, minderjährige Kinder","value":"minderjaehrig","sort_order":0},
        {"label":"Ja, bereits volljährig","value":"volljaehrig","sort_order":1},
        {"label":"Nein","value":"nein","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_themen, 'themen', 'multi_choice', 'Welche Themen müssen geregelt werden?',
      'Mehrfachauswahl möglich — Sie können diesen Schritt auch überspringen.', NULL, true, false, 0,
      '[{"label":"Unterhalt","value":"unterhalt","sort_order":0},
        {"label":"Sorgerecht / Umgang","value":"sorgerecht","sort_order":1},
        {"label":"Zugewinn / Vermögen","value":"zugewinn","sort_order":2},
        {"label":"Gemeinsame Immobilie","value":"immobilie","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Scheidung wurde bereits eingereicht: Fristen laufen — sofortige
    -- anwaltliche Vertretung statt weiterer Fragenstrecke.
    (v_funnel, v_tenant, p_situation, 0, false,
     '[{"field_key":"situation","op":"eq","value":"eingereicht"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Familienrecht-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Scheidungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Erstberatung bei Kanzlei Brandt</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihr Vertrauen. Die Kanzlei meldet sich innerhalb von 24 Stunden diskret bei Ihnen, um Ihre Erstberatung zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihre Kanzlei Brandt</p>', true);
END $do$;
