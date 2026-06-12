-- =============================================================================
-- Charge 4 / Vorlage 26 — Personal-Training („Coach Mio Training")
--
-- Recherche-Beleg (2026-06-11): Das kostenlose Probetraining nach Formular-
-- Anfrage ist DAS Standard-Akquise-Modell der Branche (Anfrage → Trainer
-- meldet sich → Probetermin). Erstgespräch klärt real: Ziele (Abnehmen /
-- Muskelaufbau / Beschwerden / Beweglichkeit), gesundheitliche Einschränkungen
-- (Anamnese!), Trainingsfrequenz, Trainingsort.
--
-- Logik: Gesundheitliche Einschränkungen → direkt Kontakt (Anamnese gehört
-- ins persönliche Gespräch, nicht in die Standardstrecke).
-- Anrede: per Du (Branchen-Norm Fitness/Coaching, wie demo-coaching —
-- Begründung: Fitness-Studios und Trainer kommunizieren durchgängig per Du).
-- Theme: #f43f5e (energetisches Rot-Rosa), poppins, 0.75rem, zentriert.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_ziel       uuid := gen_random_uuid();
  p_gesundheit uuid := gen_random_uuid();
  p_erfahrung  uuid := gen_random_uuid();
  p_haeufigkeit uuid := gen_random_uuid();
  p_ort        uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-personal-training', v_tenant, 'Demo — Personal-Training (Coach Mio)',
    'Personal-Training — kostenloses Probetraining',
    'Danke für deine Anfrage!',
    'Ich melde mich innerhalb von 24 Stunden bei dir, um dein kostenloses Probetraining zu vereinbaren.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Deine Angaben im Überblick:', false, true, true, 'center',
    'stavrossingoudis@gmail.com', 'coachmio', '#f43f5e', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Dein Ziel. Dein Training. Dein Coach.',
      'subtitle', 'Beantworte 5 kurze Fragen und sichere dir dein kostenloses Probetraining — unverbindlich und ohne Vertragsbindung.',
      'page_key', 'welcome_pt', 'button_label', 'Probetraining sichern →', 'visible', true)),
    (p_ziel,        v_funnel, 'question', 1, '{}'::jsonb),
    (p_gesundheit,  v_funnel, 'question', 2, '{}'::jsonb),
    (p_erfahrung,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_haeufigkeit, v_funnel, 'question', 4, '{}'::jsonb),
    (p_ort,         v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Fast geschafft — wie erreiche ich dich?',
      'subtitle', 'Ich melde mich innerhalb von 24 Stunden für dein Probetraining.',
      'page_key', 'kontakt_pt', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_ziel, 'ziel', 'single_choice', 'Was ist dein wichtigstes Ziel?', NULL, NULL, true, true, 0,
      '[{"label":"Abnehmen","value":"abnehmen","sort_order":0},
        {"label":"Muskelaufbau","value":"muskelaufbau","sort_order":1},
        {"label":"Fitter und beweglicher werden","value":"fitness","sort_order":2},
        {"label":"Rücken stärken / Beschwerden loswerden","value":"beschwerden","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_gesundheit, 'gesundheit', 'single_choice', 'Gibt es gesundheitliche Einschränkungen oder Verletzungen?', NULL, NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_erfahrung, 'erfahrung', 'single_choice', 'Wie viel Trainingserfahrung bringst du mit?', NULL, NULL, true, true, 0,
      '[{"label":"Ich starte neu","value":"neu","sort_order":0},
        {"label":"Ich trainiere gelegentlich","value":"gelegentlich","sort_order":1},
        {"label":"Ich trainiere regelmäßig","value":"regelmaessig","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_haeufigkeit, 'haeufigkeit', 'single_choice', 'Wie oft pro Woche möchtest du trainieren?', NULL, NULL, true, true, 0,
      '[{"label":"Einmal pro Woche","value":"einmal","sort_order":0},
        {"label":"Zweimal pro Woche","value":"zweimal","sort_order":1},
        {"label":"Dreimal oder öfter","value":"dreimal_plus","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_ort, 'trainingsort', 'single_choice', 'Wo möchtest du am liebsten trainieren?', NULL, NULL, true, true, 0,
      '[{"label":"Im Studio","value":"studio","sort_order":0},
        {"label":"Bei mir zuhause","value":"zuhause","sort_order":1},
        {"label":"Draußen / im Park","value":"draussen","sort_order":2},
        {"label":"Online","value":"online","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true,  0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true,  1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, false, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Gesundheitliche Einschränkungen: die Anamnese gehört ins persönliche
    -- Gespräch — direkt zur Kontaktaufnahme.
    (v_funnel, v_tenant, p_gesundheit, 0, false,
     '[{"field_key":"gesundheit","op":"eq","value":"ja"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Probetraining-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Personal-Training-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Dein Probetraining bei Coach Mio</p>',
     '<p>Hallo <span data-variable="contact.name">{{contact.name}}</span>,</p><p>danke für deine Anfrage! Ich melde mich innerhalb von 24 Stunden bei dir, um dein kostenloses Probetraining zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Bis bald<br>Dein Coach Mio</p>', true);
END $do$;
