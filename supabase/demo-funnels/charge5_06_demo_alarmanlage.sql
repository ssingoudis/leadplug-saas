-- =============================================================================
-- Charge 5 / Vorlage 33 — Alarmanlagen & Sicherheitstechnik („SafeHome")
--
-- Recherche-Beleg (2026-06-11): Sicherheitstechnik ist eine eigene Aroundhome-
-- Vermittlungs-Kategorie; Fachfirmen (NEDA, Kalveram, Sievers) akquirieren
-- über Beratungs-Anfragen für Privat (EFH ab ~3.000 € Profi-Anlage) und
-- Gewerbe. Reale Qualifizierer: Objektart, Schutzziel (Einbruch / Video /
-- Brand / Smart Home), Anlass (Vorsorge vs. nach Einbruch), Eigentum
-- (Funk- vs. verkabelte Anlage), Zeitpunkt.
--
-- Logik: Es gab bereits einen Einbruch → akuter Fall, direkt Kontakt
-- (schnelle Absicherung wird telefonisch geplant).
-- Theme: #334155 (Stahlgrau, Security), inter, 0.75rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_objekt     uuid := gen_random_uuid();
  p_schutzziel uuid := gen_random_uuid();
  p_anlass     uuid := gen_random_uuid();
  p_eigentum   uuid := gen_random_uuid();
  p_zeitpunkt  uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-alarmanlage', v_tenant, 'Demo — Alarmanlage (SafeHome)',
    'Alarmanlage — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Sicherheitsberater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch mit kostenlosem Sicherheits-Check vor Ort.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'safehome', '#334155', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr Zuhause — professionell gesichert',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Objekt und erhalten Sie ein unverbindliches Angebot für Ihre Sicherheitstechnik.',
      'page_key', 'welcome_alarm', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_objekt,     v_funnel, 'question', 1, '{}'::jsonb),
    (p_schutzziel, v_funnel, 'question', 2, '{}'::jsonb),
    (p_anlass,     v_funnel, 'question', 3, '{}'::jsonb),
    (p_eigentum,   v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitpunkt,  v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Sicherheitsberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_alarm', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_objekt, 'objekt', 'single_choice', 'Welches Objekt soll gesichert werden?', NULL, NULL, true, true, 0,
      '[{"label":"Einfamilienhaus","value":"einfamilienhaus","sort_order":0},
        {"label":"Wohnung","value":"wohnung","sort_order":1},
        {"label":"Gewerbe / Büro","value":"gewerbe","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_schutzziel, 'schutzziel', 'multi_choice', 'Wovor möchten Sie sich schützen?',
      'Mehrfachauswahl möglich.', NULL, true, true, 0,
      '[{"label":"Einbruch","value":"einbruch","sort_order":0},
        {"label":"Videoüberwachung","value":"video","sort_order":1},
        {"label":"Brand / Rauch","value":"brand","sort_order":2},
        {"label":"Smart-Home-Anbindung","value":"smart_home","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_anlass, 'anlass', 'single_choice', 'Was ist der Anlass für Ihre Anfrage?', NULL, NULL, true, true, 0,
      '[{"label":"Vorsorge","value":"vorsorge","sort_order":0},
        {"label":"Es gab bereits einen Einbruch","value":"einbruch_passiert","sort_order":1},
        {"label":"Neubau / Renovierung","value":"neubau","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_eigentum, 'eigentum', 'single_choice', 'Wohnen Sie im Eigentum oder zur Miete?',
      'Wichtig für die Wahl zwischen Funk- und verkabelter Anlage.', NULL, true, true, 0,
      '[{"label":"Im Eigentum","value":"eigentum","sort_order":0},
        {"label":"Zur Miete","value":"miete","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_zeitpunkt, 'zeitpunkt', 'single_choice', 'Wann soll die Anlage installiert werden?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Ich plane noch","value":"plane_noch","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Nach einem Einbruch zählt Geschwindigkeit — die Absicherung wird
    -- telefonisch geplant, direkt zur Kontaktkarte.
    (v_funnel, v_tenant, p_anlass, 0, false,
     '[{"field_key":"anlass","op":"eq","value":"einbruch_passiert"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Sicherheitstechnik-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Alarmanlagen-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei SafeHome Sicherheitstechnik</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Sicherheitsberater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch mit kostenlosem Sicherheits-Check vor Ort.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von SafeHome</p>', true);
END $do$;
