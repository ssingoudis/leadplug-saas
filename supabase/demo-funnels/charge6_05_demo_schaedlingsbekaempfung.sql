-- =============================================================================
-- Charge 6 / Vorlage 38 — Schädlingsbekämpfung („ProTect Schädlingsschutz")
--
-- Recherche-Beleg (2026-06-11): Etablierter Anfrage-Markt mit IHK-zertifizierten
-- Betrieben, 24h-Notdienst (Zuschlag real 50–100 %) und festen Preisstrukturen
-- pro Schädling (Wespen ab ~110 €, Ratten ab ~195 €, Bettwanzen ab ~250 €,
-- Schaben ab ~280 €). Für Gastronomie/Lebensmittelbetriebe sind HACCP-konforme
-- Monitoring-Verträge mit Dokumentation Standard.
--
-- Logik: (1) Gastronomie/Lebensmittelbetrieb → direkt Kontakt (HACCP-
-- Monitoring-Vertrag = individuelle Beratung). (2) Akuter Befall / Notfall →
-- direkt Kontakt (Notdienst wird telefonisch disponiert).
-- Theme: #b91c1c (Warn-Rot), system, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome      uuid := gen_random_uuid();
  p_schaedling   uuid := gen_random_uuid();
  p_objekt       uuid := gen_random_uuid();
  p_dringlichkeit uuid := gen_random_uuid();
  p_bereich      uuid := gen_random_uuid();
  p_beschreibung uuid := gen_random_uuid();
  p_kontakt      uuid := gen_random_uuid();
  p_success      uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-schaedlingsbekaempfung', v_tenant, 'Demo — Schädlingsbekämpfung (ProTect)',
    'Schädlingsbekämpfung — schnelle Hilfe vom Profi',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Schädlingsbekämpfer meldet sich innerhalb von 24 Stunden bei Ihnen — in dringenden Fällen deutlich schneller.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'protect', '#b91c1c', '#1f2937', '#ffffff',
    'transparent', 'system', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Schädlinge? Wir kümmern uns — diskret und gründlich.',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Befall und erhalten Sie schnelle, professionelle Hilfe — IHK-geprüft und diskret.',
      'page_key', 'welcome_schaedling', 'button_label', 'Jetzt Hilfe anfordern →', 'visible', true)),
    (p_schaedling,    v_funnel, 'question', 1, '{}'::jsonb),
    (p_objekt,        v_funnel, 'question', 2, '{}'::jsonb),
    (p_dringlichkeit, v_funnel, 'question', 3, '{}'::jsonb),
    (p_bereich,       v_funnel, 'question', 4, '{}'::jsonb),
    (p_beschreibung,  v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie?',
      'subtitle', 'Ein Schädlingsbekämpfer meldet sich schnellstmöglich bei Ihnen.',
      'page_key', 'kontakt_schaedling', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_schaedling, 'schaedling', 'single_choice', 'Um welche Schädlinge geht es?', NULL, NULL, true, true, 0,
      '[{"label":"Wespen / Hornissen","value":"wespen","sort_order":0},
        {"label":"Ratten / Mäuse","value":"nagetiere","sort_order":1},
        {"label":"Bettwanzen","value":"bettwanzen","sort_order":2},
        {"label":"Ameisen / Schaben","value":"insekten","sort_order":3},
        {"label":"Andere / unbekannt","value":"andere","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_objekt, 'objekt', 'single_choice', 'Um welches Objekt handelt es sich?', NULL, NULL, true, true, 0,
      '[{"label":"Privathaushalt","value":"privat","sort_order":0},
        {"label":"Gastronomie / Lebensmittelbetrieb","value":"gastro","sort_order":1},
        {"label":"Büro / Gewerbe","value":"gewerbe","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_dringlichkeit, 'dringlichkeit', 'single_choice', 'Wie dringend ist die Lage?', NULL, NULL, true, true, 0,
      '[{"label":"Akuter Befall — Notfall","value":"notfall","sort_order":0},
        {"label":"Befall besteht seit längerem","value":"laenger","sort_order":1},
        {"label":"Vorbeugung / Monitoring","value":"vorbeugung","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_bereich, 'bereich', 'single_choice', 'Wo tritt der Befall auf?', NULL, NULL, true, true, 0,
      '[{"label":"In Innenräumen","value":"innen","sort_order":0},
        {"label":"Im Außenbereich / Garten","value":"aussen","sort_order":1},
        {"label":"Innen und außen","value":"beides","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_beschreibung, 'beschreibung', 'long_text', 'Möchten Sie den Befall kurz beschreiben?', NULL,
      'z. B. seit wann, wie häufig, welche Räume …', true, false, 0,
      '[]'::jsonb, '{"placeholder":"z. B. seit wann, wie häufig, welche Räume …","required":false}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Gastronomie/Lebensmittelbetriebe brauchen HACCP-konformes Monitoring
    -- mit Dokumentation — individuelles Vertragsgespräch statt Standardstrecke.
    (v_funnel, v_tenant, p_objekt, 0, false,
     '[{"field_key":"objekt","op":"eq","value":"gastro"}]'::jsonb, 'page', p_kontakt),
    -- Notfall: der Notdienst wird telefonisch disponiert — direkt Kontakt.
    (v_funnel, v_tenant, p_dringlichkeit, 0, false,
     '[{"field_key":"dringlichkeit","op":"eq","value":"notfall"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Schädlings-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Schädlingsbekämpfungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Hinweis: Bei „Notfall" bitte sofort zurückrufen.</p>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei ProTect Schädlingsschutz</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Schädlingsbekämpfer meldet sich innerhalb von 24 Stunden bei Ihnen — in dringenden Fällen deutlich schneller.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von ProTect Schädlingsschutz</p>', true);
END $do$;
