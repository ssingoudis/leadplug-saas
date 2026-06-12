-- =============================================================================
-- Charge 5 / Vorlage 30 — Fertighaus („HausWerk Fertigbau")
--
-- Recherche-Beleg (2026-06-11): Bauinteressenten-Leads sind ein etablierter
-- Markt — Musterhaus.net verkauft explizit „Baufirmenanfragen" und
-- „Angebotsanfragen" an Hersteller, Fertighaus-QualityGuide vermittelt Leads
-- gefiltert nach Haustyp und Kapital, massivhaus.de bündelt Kataloganfragen
-- von 300+ Anbietern, SchwörerHaus betreibt professionelles Lead-Nurturing.
-- Klassische Qualifizierer: Grundstück vorhanden (DER Filter der Hersteller),
-- Haustyp, Wohnfläche, Gesamtbudget, Zeitpunkt.
--
-- Logik: „Später / erst informieren" → direkt zur Kontaktkarte
-- (Kataloganfrage light — Detail-Fragen zu Fläche/Budget entfallen,
-- der Katalog geht trotzdem raus). Theme: #78350f (warmes Holzbraun),
-- roboto, 0.75rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome     uuid := gen_random_uuid();
  p_grundstueck uuid := gen_random_uuid();
  p_haustyp     uuid := gen_random_uuid();
  p_zeitpunkt   uuid := gen_random_uuid();
  p_flaeche     uuid := gen_random_uuid();
  p_budget      uuid := gen_random_uuid();
  p_kontakt     uuid := gen_random_uuid();
  p_success     uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-fertighaus', v_tenant, 'Demo — Fertighaus (HausWerk)',
    'Fertighaus — Katalog & Beratung',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Bauberater meldet sich innerhalb von 24 Stunden bei Ihnen — Ihren Hauskatalog erhalten Sie direkt per E-Mail.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'hauswerk', '#78350f', '#1f2937', '#ffffff',
    'transparent', 'roboto', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr Traumhaus — schlüsselfertig gebaut',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Bauvorhaben und erhalten Sie Katalog und persönliche Bauberatung — kostenlos und unverbindlich.',
      'page_key', 'welcome_haus', 'button_label', 'Katalog & Beratung anfordern →', 'visible', true)),
    (p_grundstueck, v_funnel, 'question', 1, '{}'::jsonb),
    (p_haustyp,     v_funnel, 'question', 2, '{}'::jsonb),
    (p_zeitpunkt,   v_funnel, 'question', 3, '{}'::jsonb),
    (p_flaeche,     v_funnel, 'question', 4, '{}'::jsonb),
    (p_budget,      v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Katalog und Beratung senden?',
      'subtitle', 'Ein Bauberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_haus', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_grundstueck, 'grundstueck', 'single_choice', 'Haben Sie bereits ein Grundstück?', NULL, NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Grundstück ist in Aussicht","value":"in_aussicht","sort_order":1},
        {"label":"Nein, wir suchen noch","value":"suche","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_haustyp, 'haustyp', 'single_choice', 'Welcher Haustyp gefällt Ihnen?', NULL, NULL, true, true, 0,
      '[{"label":"Einfamilienhaus","value":"einfamilienhaus","sort_order":0},
        {"label":"Bungalow","value":"bungalow","sort_order":1},
        {"label":"Stadtvilla","value":"stadtvilla","sort_order":2},
        {"label":"Doppelhaus","value":"doppelhaus","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_zeitpunkt, 'zeitpunkt', 'single_choice', 'Wann möchten Sie bauen?', NULL, NULL, true, true, 0,
      '[{"label":"Innerhalb der nächsten 12 Monate","value":"innerhalb_12","sort_order":0},
        {"label":"In 1 bis 2 Jahren","value":"ein_bis_zwei_jahre","sort_order":1},
        {"label":"Später — ich informiere mich erst","value":"spaeter","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_flaeche, 'wohnflaeche', 'number', 'Wie viel Wohnfläche wünschen Sie sich?', NULL, NULL, true, true, 0,
      '[]'::jsonb, '{"min":80,"max":400,"step":10,"required":true,"unit":"m²"}'::jsonb),
    (p_budget, 'budget', 'slider', 'Welches Gesamtbudget planen Sie (inklusive Grundstück)?',
      'Eine grobe Einschätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":200000,"max":800000,"step":25000,"default":400000,"unit":"€"}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- „Erst informieren" = Kataloganfrage light: Detail-Fragen zu Fläche und
    -- Budget entfallen, der Katalog geht trotzdem raus.
    (v_funnel, v_tenant, p_zeitpunkt, 0, false,
     '[{"field_key":"zeitpunkt","op":"eq","value":"spaeter"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Bauinteressent: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Fertighaus-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihr Hauskatalog von HausWerk Fertigbau</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihr Interesse! Ein Bauberater meldet sich innerhalb von 24 Stunden bei Ihnen — Ihren Hauskatalog senden wir Ihnen vorab per E-Mail zu.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von HausWerk Fertigbau</p>', true);
END $do$;
