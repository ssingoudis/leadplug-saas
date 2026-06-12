-- =============================================================================
-- Charge 3 / Vorlage 17 — Fenstertausch („KlarFenster Manufaktur")
--
-- Recherche-Beleg (2026-06-11): Fenster-Leads sind ein eigener Lead-Markt mit
-- spezialisierten Händlern (ATOBU >500 Fenster-Anfragen/Monat, Bau-Leads.com,
-- netsales LeadR, Aroundhome mit telefonischer Vorqualifizierung, TapTapHome
-- listet Fenster als eigenes Lead-Segment). Übliche Qualifizierung: Anzahl,
-- Material (Kunststoff/Holz/Alu), Anlass, Zeitpunkt.
--
-- Logik: (1) Mieter → direkt Kontakt (Fenstertausch ist Eigentümer-Sache).
-- (2) Mehr als 10 Fenster → Großprojekt, direkt in die persönliche Planung.
-- Theme: #475569 (Alu-Grau), inter, 0.75rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_eigentum uuid := gen_random_uuid();
  p_anzahl   uuid := gen_random_uuid();
  p_material uuid := gen_random_uuid();
  p_anlass   uuid := gen_random_uuid();
  p_zeit     uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-fenster', v_tenant, 'Demo — Fenstertausch (KlarFenster)',
    'Neue Fenster — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Fensterbau-Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'klarfenster', '#475569', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Neue Fenster für Ihr Zuhause',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie ein unverbindliches Angebot für Ihre neuen Fenster — kostenlos und ohne Verpflichtung.',
      'page_key', 'welcome_fenster', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_eigentum, v_funnel, 'question', 1, '{}'::jsonb),
    (p_anzahl,   v_funnel, 'question', 2, '{}'::jsonb),
    (p_material, v_funnel, 'question', 3, '{}'::jsonb),
    (p_anlass,   v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeit,     v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Fensterbau-Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_fenster', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_eigentum, 'eigentum', 'single_choice', 'Sind Sie Eigentümer der Immobilie?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, Eigentümer","value":"eigentum","sort_order":0},
        {"label":"Nein, zur Miete","value":"miete","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_anzahl, 'anzahl_fenster', 'dropdown', 'Wie viele Fenster sollen erneuert werden?', NULL, NULL, true, true, 0,
      '[{"label":"1 bis 3 Fenster","value":"eins_bis_drei","sort_order":0},
        {"label":"4 bis 6 Fenster","value":"vier_bis_sechs","sort_order":1},
        {"label":"7 bis 10 Fenster","value":"sieben_bis_zehn","sort_order":2},
        {"label":"Mehr als 10 Fenster","value":"ueber_zehn","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_material, 'material', 'single_choice', 'Welches Material wünschen Sie sich?', NULL, NULL, true, true, 0,
      '[{"label":"Kunststoff","value":"kunststoff","sort_order":0},
        {"label":"Holz","value":"holz","sort_order":1},
        {"label":"Aluminium","value":"aluminium","sort_order":2},
        {"label":"Noch offen — Beratung gewünscht","value":"beratung","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_anlass, 'anlass', 'single_choice', 'Was ist der Anlass für den Fenstertausch?', NULL, NULL, true, true, 0,
      '[{"label":"Modernisierung / Energie sparen","value":"modernisierung","sort_order":0},
        {"label":"Defekte oder undichte Fenster","value":"defekt","sort_order":1},
        {"label":"Neubau","value":"neubau","sort_order":2},
        {"label":"Schall- oder Einbruchschutz","value":"schutz","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_zeit, 'zeitpunkt', 'single_choice', 'Wann soll der Einbau erfolgen?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"In 3 bis 6 Monaten","value":"drei_bis_sechs_monate","sort_order":2},
        {"label":"Ich plane noch","value":"plane_noch","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Fenstertausch ist Eigentümer-Sache — Mieter direkt in die persönliche Beratung.
    (v_funnel, v_tenant, p_eigentum, 0, false,
     '[{"field_key":"eigentum","op":"eq","value":"miete"}]'::jsonb, 'page', p_kontakt),
    -- Mehr als 10 Fenster = Großprojekt → individuelle Planung statt Standardstrecke.
    (v_funnel, v_tenant, p_anzahl, 0, false,
     '[{"field_key":"anzahl_fenster","op":"eq","value":"ueber_zehn"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Fenster-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Fenster-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei KlarFenster</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Fensterbau-Fachberater meldet sich innerhalb von 24 Stunden bei Ihnen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von KlarFenster</p>', true);
END $do$;
