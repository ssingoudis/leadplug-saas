-- =============================================================================
-- Charge 4 / Vorlage 24 — Steuerberater-Mandantenanfrage („Kanzlei Steuerklar")
--
-- Recherche-Beleg (2026-06-11): Mandanten-Onboarding-Qualifizierer sind
-- fachlich dokumentiert (selbststaendig.de, Kanzlei-Stammdatenbögen real):
-- Gewerbe/Freiberuf, Rechtsform, geplanter Umsatz, Mitarbeiter (→ Lohn),
-- Leistungsumfang (Buchhaltung / Jahresabschluss·EÜR / Lohn / Beratung),
-- Voll- vs. Teilmandat. Online-Mandantenanfrage ist Standard moderner
-- Kanzleien (taxtify u. a.).
--
-- Logik: Privatperson (nur Einkommensteuer) → Unternehmens-Fragen
-- (Mitarbeiter, Umsatz) überspringen.
-- Theme: #155e75 (Petrol, Kanzlei-seriös), inter, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome     uuid := gen_random_uuid();
  p_status      uuid := gen_random_uuid();
  p_mitarbeiter uuid := gen_random_uuid();
  p_umsatz      uuid := gen_random_uuid();
  p_leistungen  uuid := gen_random_uuid();
  p_wechsel     uuid := gen_random_uuid();
  p_kontakt     uuid := gen_random_uuid();
  p_success     uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-steuerberater', v_tenant, 'Demo — Steuerberater (Kanzlei Steuerklar)',
    'Steuerberatung — Mandantenanfrage',
    'Vielen Dank für Ihre Anfrage!',
    'Die Kanzlei meldet sich innerhalb von 24 Stunden bei Ihnen für ein unverbindliches Kennenlerngespräch.',
    'Unverbindlich und kostenlos.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'steuerklar', '#155e75', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihre Steuern in guten Händen',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrer Situation und erhalten Sie ein unverbindliches Kennenlerngespräch mit unserer Kanzlei.',
      'page_key', 'welcome_stb', 'button_label', 'Mandantenanfrage stellen →', 'visible', true)),
    (p_status,      v_funnel, 'question', 1, '{}'::jsonb),
    (p_mitarbeiter, v_funnel, 'question', 2, '{}'::jsonb),
    (p_umsatz,      v_funnel, 'question', 3, '{}'::jsonb),
    (p_leistungen,  v_funnel, 'question', 4, '{}'::jsonb),
    (p_wechsel,     v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie?',
      'subtitle', 'Die Kanzlei meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_stb', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_status, 'status', 'single_choice', 'Für wen suchen Sie steuerliche Betreuung?', NULL, NULL, true, true, 0,
      '[{"label":"Einzelunternehmen / Freiberufler","value":"einzelunternehmen","sort_order":0},
        {"label":"GmbH / UG","value":"gmbh_ug","sort_order":1},
        {"label":"GbR / Personengesellschaft","value":"personengesellschaft","sort_order":2},
        {"label":"Privatperson","value":"privatperson","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_mitarbeiter, 'mitarbeiter', 'dropdown', 'Wie viele Mitarbeiter beschäftigen Sie?',
      'Wichtig für die Lohnabrechnung.', NULL, true, true, 0,
      '[{"label":"Keine","value":"keine","sort_order":0},
        {"label":"1 bis 9","value":"eins_bis_neun","sort_order":1},
        {"label":"10 bis 49","value":"zehn_bis_49","sort_order":2},
        {"label":"50 oder mehr","value":"ab_50","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_umsatz, 'umsatz', 'dropdown', 'Wie hoch ist Ihr Jahresumsatz ungefähr?', NULL, NULL, true, true, 0,
      '[{"label":"Unter 100.000 €","value":"unter_100k","sort_order":0},
        {"label":"100.000 bis 500.000 €","value":"bis_500k","sort_order":1},
        {"label":"500.000 € bis 1 Mio. €","value":"bis_1m","sort_order":2},
        {"label":"Über 1 Mio. €","value":"ueber_1m","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_leistungen, 'leistungen', 'multi_choice', 'Welche Leistungen benötigen Sie?',
      'Mehrfachauswahl möglich.', NULL, true, true, 0,
      '[{"label":"Laufende Buchhaltung","value":"buchhaltung","sort_order":0},
        {"label":"Jahresabschluss / EÜR","value":"jahresabschluss","sort_order":1},
        {"label":"Lohnabrechnung","value":"lohn","sort_order":2},
        {"label":"Steuererklärung","value":"steuererklaerung","sort_order":3},
        {"label":"Steuerliche Beratung","value":"beratung","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_wechsel, 'wechsel', 'single_choice', 'Haben Sie aktuell einen Steuerberater?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, ich möchte wechseln","value":"wechsel","sort_order":0},
        {"label":"Nein, Neugründung","value":"neugruendung","sort_order":1},
        {"label":"Nein, bisher selbst gemacht","value":"selbst","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Privatpersonen (Einkommensteuer) überspringen die Unternehmens-Fragen.
    (v_funnel, v_tenant, p_status, 0, false,
     '[{"field_key":"status","op":"eq","value":"privatperson"}]'::jsonb, 'page', p_leistungen);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Mandantenanfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neue Mandantenanfrage über den Steuerberater-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Mandantenanfrage bei Kanzlei Steuerklar</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Die Kanzlei meldet sich innerhalb von 24 Stunden bei Ihnen, um ein unverbindliches Kennenlerngespräch zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihre Kanzlei Steuerklar</p>', true);
END $do$;
