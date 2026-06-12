-- =============================================================================
-- Charge 3 / Vorlage 21 — Küchenplanung („KüchenAtelier")
--
-- Recherche-Beleg (2026-06-11): Küchen sind ein Kernbereich von Aroundhome
-- (Online-Fragebogen real: Küchenform U/L/Insel/Zeile, Größe, Stil, Budget;
-- telefonische Vorqualifizierung, Mehrfachvergabe an Küchenstudios) plus
-- spezialisierte Agenturen (>1.000 Leads/Monat für Küchenstudios, hntmedia-
-- Fallstudie; Leadfluss-Anbietervergleich „Küchen Leads kaufen").
--
-- Logik: Budget ≥ 35.000 € → Premium-Projekt, direkt zum persönlichen
-- Küchenplaner (numerische gte-Regel auf Slider). Showcase: Budget-Slider.
-- Theme: #44403c (mattes Stein-Grau, moderne Küche), poppins, 0.75rem, links. Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome uuid := gen_random_uuid();
  p_anlass  uuid := gen_random_uuid();
  p_form    uuid := gen_random_uuid();
  p_zeit    uuid := gen_random_uuid();
  p_budget  uuid := gen_random_uuid();
  p_aufmass uuid := gen_random_uuid();
  p_kontakt uuid := gen_random_uuid();
  p_success uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-kueche', v_tenant, 'Demo — Küchenplanung (KüchenAtelier)',
    'Küchenplanung — kostenlose Beratung',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Küchenplaner meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'kuechenatelier', '#44403c', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihre Traumküche — geplant vom Profi',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrer Wunschküche und erhalten Sie eine kostenlose Planungs-Beratung — unverbindlich.',
      'page_key', 'welcome_kueche', 'button_label', 'Jetzt Beratung anfordern →', 'visible', true)),
    (p_anlass,  v_funnel, 'question', 1, '{}'::jsonb),
    (p_form,    v_funnel, 'question', 2, '{}'::jsonb),
    (p_zeit,    v_funnel, 'question', 3, '{}'::jsonb),
    (p_budget,  v_funnel, 'question', 4, '{}'::jsonb),
    (p_aufmass, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihre Beratung senden?',
      'subtitle', 'Ein Küchenplaner meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_kueche', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_anlass, 'anlass', 'single_choice', 'Was ist der Anlass für die neue Küche?', NULL, NULL, true, true, 0,
      '[{"label":"Neubau","value":"neubau","sort_order":0},
        {"label":"Modernisierung / Umbau","value":"modernisierung","sort_order":1},
        {"label":"Austausch der alten Küche","value":"austausch","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_form, 'kuechenform', 'single_choice', 'Welche Küchenform schwebt Ihnen vor?', NULL, NULL, true, true, 0,
      '[{"label":"Küchenzeile","value":"kuechenzeile","sort_order":0},
        {"label":"L-Form","value":"l_form","sort_order":1},
        {"label":"U-Form","value":"u_form","sort_order":2},
        {"label":"Mit Kochinsel","value":"kochinsel","sort_order":3},
        {"label":"Noch offen","value":"offen","sort_order":4}]'::jsonb, '{}'::jsonb),
    (p_zeit, 'zeitpunkt', 'single_choice', 'Wann soll die Küche geliefert werden?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"In 3 bis 6 Monaten","value":"drei_bis_sechs_monate","sort_order":2},
        {"label":"Ich plane noch","value":"plane_noch","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_budget, 'budget', 'slider', 'Welches Budget haben Sie ungefähr eingeplant?',
      'Eine grobe Einschätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":5000,"max":60000,"step":1000,"default":15000,"unit":"€"}'::jsonb),
    (p_aufmass, 'aufmass', 'single_choice', 'Wünschen Sie ein kostenloses Aufmaß bei Ihnen zuhause?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, gern vor Ort","value":"ja","sort_order":0},
        {"label":"Erst Beratung im Studio","value":"studio","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Premium-Projekte ab 35.000 € plant der Küchenarchitekt persönlich —
    -- direkt zur Kontaktaufnahme (numerische gte-Regel auf dem Slider).
    (v_funnel, v_tenant, p_budget, 0, false,
     '[{"field_key":"budget","op":"gte","value":"35000"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Küchen-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Küchen-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Küchen-Beratung beim KüchenAtelier</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Küchenplaner meldet sich innerhalb von 24 Stunden bei Ihnen, um Ihre Wunschküche zu besprechen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team vom KüchenAtelier</p>', true);
END $do$;
