-- =============================================================================
-- Charge 6 / Vorlage 37 — Bestattungsvorsorge („Lebenswerk Vorsorge")
--
-- Recherche-Beleg (2026-06-11): Online-Bestatter wie mymoria und November
-- akquirieren genau über solche Funnels (kostenfreies Vorsorgeportal,
-- Vorsorgevertrag + Treuhandkonto z. B. bei der Rödl Treuhand Hamburg);
-- bestatter.de (Bundesverband) dokumentiert den Vorsorgevertrag als
-- Standard-Instrument. Reale Qualifizierer: für wen (Vorsorge vs. akuter
-- Trauerfall!), Bestattungsart, Kostenabsicherung (Treuhand/Vertrag),
-- Zeithorizont, persönliche Wünsche.
--
-- Logik: Akuter Trauerfall → SOFORT Kontakt (Bestatter begleiten Trauerfälle
-- rund um die Uhr — keine Fragenstrecke in dieser Situation).
-- Ton: würdevoll, ruhig, keine Werbesprache.
-- Theme: #57534e (dezentes Stein-Grau), inter, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_fuer_wen uuid := gen_random_uuid();
  p_art      uuid := gen_random_uuid();
  p_kosten   uuid := gen_random_uuid();
  p_zeit     uuid := gen_random_uuid();
  p_wuensche uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-bestattungsvorsorge', v_tenant, 'Demo — Bestattungsvorsorge (Lebenswerk)',
    'Bestattungsvorsorge — Beratung in Ruhe',
    'Vielen Dank für Ihr Vertrauen.',
    'Eine Vorsorgeberaterin meldet sich innerhalb von 24 Stunden behutsam bei Ihnen.',
    'Vertraulich und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'lebenswerk', '#57534e', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'In Ruhe vorsorgen — für sich und Ihre Familie',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie eine vertrauliche Beratung zur Bestattungsvorsorge — unverbindlich und in Ihrem Tempo.',
      'page_key', 'welcome_vorsorge', 'button_label', 'Beratung anfordern →', 'visible', true)),
    (p_fuer_wen, v_funnel, 'question', 1, '{}'::jsonb),
    (p_art,      v_funnel, 'question', 2, '{}'::jsonb),
    (p_kosten,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_zeit,     v_funnel, 'question', 4, '{}'::jsonb),
    (p_wuensche, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie dürfen wir Sie erreichen?',
      'subtitle', 'Eine Vorsorgeberaterin meldet sich innerhalb von 24 Stunden behutsam bei Ihnen.',
      'page_key', 'kontakt_vorsorge', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_fuer_wen, 'fuer_wen', 'single_choice', 'Worum geht es bei Ihrer Anfrage?', NULL, NULL, true, true, 0,
      '[{"label":"Vorsorge für mich selbst","value":"selbst","sort_order":0},
        {"label":"Vorsorge für eine angehörige Person","value":"angehoerige","sort_order":1},
        {"label":"Ein akuter Trauerfall","value":"trauerfall","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_art, 'bestattungsart', 'single_choice', 'Welche Bestattungsart kommt für Sie in Frage?', NULL, NULL, true, true, 0,
      '[{"label":"Erdbestattung","value":"erdbestattung","sort_order":0},
        {"label":"Feuerbestattung","value":"feuerbestattung","sort_order":1},
        {"label":"See- oder Naturbestattung","value":"naturbestattung","sort_order":2},
        {"label":"Noch offen","value":"offen","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kosten, 'kostenabsicherung', 'single_choice', 'Möchten Sie auch die Kosten im Voraus absichern?',
      'Über einen Vorsorgevertrag mit Treuhandkonto ist das eingezahlte Geld zweckgebunden und insolvenzsicher angelegt.',
      NULL, true, true, 0,
      '[{"label":"Ja, mit Vorsorgevertrag und Treuhandkonto","value":"vorsorgevertrag","sort_order":0},
        {"label":"Zunächst nur Wünsche festlegen","value":"wuensche","sort_order":1},
        {"label":"Beratung gewünscht","value":"beratung","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zeit, 'zeithorizont', 'single_choice', 'Wie möchten Sie vorgehen?', NULL, NULL, true, true, 0,
      '[{"label":"In Ruhe planen","value":"in_ruhe","sort_order":0},
        {"label":"Zeitnah klären","value":"zeitnah","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_wuensche, 'wuensche', 'long_text', 'Gibt es Wünsche, die wir kennen sollten?', NULL,
      'z. B. Ort der Beisetzung, Gestaltung der Trauerfeier, Musik …', true, false, 0,
      '[]'::jsonb, '{"placeholder":"z. B. Ort der Beisetzung, Gestaltung der Trauerfeier, Musik …","required":false}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Akuter Trauerfall: sofortige persönliche Begleitung — keine Fragenstrecke.
    (v_funnel, v_tenant, p_fuer_wen, 0, false,
     '[{"field_key":"fuer_wen","op":"eq","value":"trauerfall"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Vorsorge-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Bestattungsvorsorge-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Hinweis: Bei „akuter Trauerfall" bitte mit Vorrang zurückrufen.</p>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei Lebenswerk Vorsorge</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihr Vertrauen. Eine Vorsorgeberaterin meldet sich innerhalb von 24 Stunden behutsam bei Ihnen — Sie bestimmen das Tempo.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Mit freundlichen Grüßen<br>Ihr Team von Lebenswerk Vorsorge</p>', true);
END $do$;
