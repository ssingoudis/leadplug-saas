-- =============================================================================
-- Charge 4 / Vorlage 27 — Nachhilfe-Institut („Lernwerk Nachhilfe")
--
-- Recherche-Beleg (2026-06-11): Das Schülerhilfe-/Studienkreis-Modell ist
-- der Branchen-Standard: Anfrage → Rückruf zur Abstimmung → kostenlose
-- Probestunde(n) (bei beiden Marktführern 2 gratis). Qualifizierer real:
-- Fach, Klassenstufe (Grundschule bis Oberstufe/Studium), Ziel
-- (Noten / Prüfungsvorbereitung / Lücken), Format (vor Ort / online /
-- kombiniert — beide Anbieter bieten flexiblen Wechsel).
--
-- Logik: Prüfungs-/Abiturvorbereitung → direkt Kontakt (zeitkritisch —
-- Vorbereitungsplan wird telefonisch abgestimmt).
-- Anrede: Sie (Zielgruppe sind die Eltern, nicht die Schüler).
-- Theme: #10b981 (frisches Smaragd), poppins, 0.75rem, links. Kategorie: Bildung.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome uuid := gen_random_uuid();
  p_fach    uuid := gen_random_uuid();
  p_klasse  uuid := gen_random_uuid();
  p_ziel    uuid := gen_random_uuid();
  p_format  uuid := gen_random_uuid();
  p_start   uuid := gen_random_uuid();
  p_kontakt uuid := gen_random_uuid();
  p_success uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-nachhilfe', v_tenant, 'Demo — Nachhilfe (Lernwerk)',
    'Nachhilfe — kostenlose Probestunde',
    'Vielen Dank für Ihre Anfrage!',
    'Wir melden uns innerhalb von 24 Stunden bei Ihnen, um die kostenlose Probestunde zu vereinbaren.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'lernwerk', '#10b981', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Bessere Noten — mit der richtigen Nachhilfe',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und sichern Sie Ihrem Kind eine kostenlose Probestunde — unverbindlich und ohne Vertragsbindung.',
      'page_key', 'welcome_nachhilfe', 'button_label', 'Probestunde sichern →', 'visible', true)),
    (p_fach,   v_funnel, 'question', 1, '{}'::jsonb),
    (p_klasse, v_funnel, 'question', 2, '{}'::jsonb),
    (p_ziel,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_format, v_funnel, 'question', 4, '{}'::jsonb),
    (p_start,  v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für die Probestunde?',
      'subtitle', 'Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_nachhilfe', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_fach, 'fach', 'single_choice', 'In welchem Fach wird Unterstützung benötigt?', NULL, NULL, true, true, 0,
      '[{"label":"Mathematik","value":"mathematik","sort_order":0},
        {"label":"Deutsch","value":"deutsch","sort_order":1},
        {"label":"Englisch","value":"englisch","sort_order":2},
        {"label":"Naturwissenschaften","value":"naturwissenschaften","sort_order":3},
        {"label":"Anderes Fach","value":"anderes","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_klasse, 'klassenstufe', 'dropdown', 'In welcher Klassenstufe ist Ihr Kind?', NULL, NULL, true, true, 0,
      '[{"label":"Grundschule (Klasse 1–4)","value":"grundschule","sort_order":0},
        {"label":"Klasse 5 bis 7","value":"klasse_5_7","sort_order":1},
        {"label":"Klasse 8 bis 10","value":"klasse_8_10","sort_order":2},
        {"label":"Oberstufe / Abitur","value":"oberstufe","sort_order":3},
        {"label":"Studium / Ausbildung","value":"studium","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_ziel, 'ziel', 'single_choice', 'Was ist das wichtigste Ziel?', NULL, NULL, true, true, 0,
      '[{"label":"Noten verbessern","value":"noten","sort_order":0},
        {"label":"Prüfungs- / Abiturvorbereitung","value":"pruefung","sort_order":1},
        {"label":"Lücken aufholen","value":"luecken","sort_order":2},
        {"label":"Lernmotivation stärken","value":"motivation","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_format, 'format', 'single_choice', 'Welches Format wünschen Sie sich?', NULL, NULL, true, true, 0,
      '[{"label":"Vor Ort im Lernstudio","value":"vor_ort","sort_order":0},
        {"label":"Online","value":"online","sort_order":1},
        {"label":"Beides ist möglich","value":"beides","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_start, 'start', 'single_choice', 'Wann soll die Nachhilfe starten?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"Zum neuen Halbjahr","value":"halbjahr","sort_order":1},
        {"label":"Erst informieren","value":"nur_info","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Prüfungs-/Abiturvorbereitung ist zeitkritisch — der Vorbereitungsplan
    -- wird direkt telefonisch abgestimmt.
    (v_funnel, v_tenant, p_ziel, 0, false,
     '[{"field_key":"ziel","op":"eq","value":"pruefung"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Nachhilfe-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Nachhilfe-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Probestunde beim Lernwerk</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Wir melden uns innerhalb von 24 Stunden bei Ihnen, um die kostenlose Probestunde zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team vom Lernwerk</p>', true);
END $do$;
