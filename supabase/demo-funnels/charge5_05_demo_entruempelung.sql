-- =============================================================================
-- Charge 5 / Vorlage 32 — Entrümpelung & Haushaltsauflösung („RaumFrei")
--
-- Recherche-Beleg (2026-06-11): Etablierter Anfrage-Markt mit Online-Rechnern
-- als Funnel (rümpelEASY-Kostenrechner, Rümpelhelden-Festpreise, Rümpellos-
-- FAQ, ImmoScout24-/Immowelt-Ratgeber). Reale Preisfaktoren: Objektart,
-- Wohnfläche, Menge des Hausrats, Etage/Aufzug; kleine Wohnung ab ~600 €,
-- großes Haus bis ~5.500 €; Angebot nach Besichtigung oder Fotos;
-- besenreine Übergabe ist der Standard.
--
-- Logik: „So schnell wie möglich" → direkt Kontakt (Express-Räumungen werden
-- telefonisch terminiert — Muster Treppenlift).
-- Theme: #ea580c (Container-Orange), system, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome   uuid := gen_random_uuid();
  p_objekt    uuid := gen_random_uuid();
  p_termin    uuid := gen_random_uuid();
  p_anlass    uuid := gen_random_uuid();
  p_flaeche   uuid := gen_random_uuid();
  p_fuellgrad uuid := gen_random_uuid();
  p_kontakt   uuid := gen_random_uuid();
  p_success   uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-entruempelung', v_tenant, 'Demo — Entrümpelung (RaumFrei)',
    'Entrümpelung — Festpreis-Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Wir melden uns innerhalb von 24 Stunden mit Ihrem Festpreis-Angebot — auf Wunsch nach kostenloser Besichtigung.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'raumfrei', '#ea580c', '#1f2937', '#ffffff',
    'transparent', 'system', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Entrümpelung zum Festpreis — besenrein übergeben',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Objekt und erhalten Sie ein unverbindliches Festpreis-Angebot.',
      'page_key', 'welcome_entruempelung', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_objekt,    v_funnel, 'question', 1, '{}'::jsonb),
    (p_termin,    v_funnel, 'question', 2, '{}'::jsonb),
    (p_anlass,    v_funnel, 'question', 3, '{}'::jsonb),
    (p_flaeche,   v_funnel, 'question', 4, '{}'::jsonb),
    (p_fuellgrad, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_entruempelung', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_objekt, 'objekt', 'single_choice', 'Was soll entrümpelt werden?', NULL, NULL, true, true, 0,
      '[{"label":"Wohnung","value":"wohnung","sort_order":0},
        {"label":"Haus","value":"haus","sort_order":1},
        {"label":"Keller / Dachboden / Garage","value":"keller_dachboden","sort_order":2},
        {"label":"Gewerbeobjekt","value":"gewerbe","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_termin, 'termin', 'single_choice', 'Bis wann muss die Räumung erledigt sein?', NULL, NULL, true, true, 0,
      '[{"label":"So schnell wie möglich","value":"so_schnell_wie_moeglich","sort_order":0},
        {"label":"Innerhalb von 4 Wochen","value":"vier_wochen","sort_order":1},
        {"label":"Ich bin flexibel","value":"flexibel","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_anlass, 'anlass', 'single_choice', 'Was ist der Anlass?', NULL, NULL, true, true, 0,
      '[{"label":"Haushaltsauflösung / Nachlass","value":"nachlass","sort_order":0},
        {"label":"Umzug","value":"umzug","sort_order":1},
        {"label":"Entrümpelung einzelner Räume","value":"teilentruempelung","sort_order":2},
        {"label":"Wohnungsübergabe / Vermietung","value":"vermietung","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_flaeche, 'flaeche', 'number', 'Wie groß ist die zu räumende Fläche ungefähr?',
      'Eine grobe Schätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":5,"max":500,"step":5,"required":true,"unit":"m²"}'::jsonb),
    (p_fuellgrad, 'fuellgrad', 'single_choice', 'Wie voll sind die Räume?', NULL, NULL, true, true, 0,
      '[{"label":"Normal möbliert","value":"normal","sort_order":0},
        {"label":"Stark gefüllt","value":"stark","sort_order":1},
        {"label":"Sehr stark gefüllt / Extremfall","value":"extrem","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Express-Räumungen werden telefonisch terminiert — direkt zur Kontaktkarte.
    (v_funnel, v_tenant, p_termin, 0, false,
     '[{"field_key":"termin","op":"eq","value":"so_schnell_wie_moeglich"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Entrümpelungs-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Entrümpelungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei RaumFrei Entrümpelung</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Wir melden uns innerhalb von 24 Stunden mit Ihrem Festpreis-Angebot — auf Wunsch vereinbaren wir eine kostenlose Besichtigung.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von RaumFrei</p>', true);
END $do$;
