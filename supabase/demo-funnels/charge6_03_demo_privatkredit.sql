-- =============================================================================
-- Charge 6 / Vorlage 36 — Privatkredit & Umschuldung („KreditNavi")
--
-- Recherche-Beleg (2026-06-11): Kredit-Leads sind ein klassischer Lead-Markt
-- (Powerleads + kredit-leads.net handeln sie explizit; Steuerung nach
-- Kreditart/Umschuldung, Region, Zielgruppe Angestellte/Selbstständige).
-- Real abgefragt werden: Verwendungszweck, Kreditsumme, Laufzeit,
-- Beschäftigungsverhältnis, Bonität. Selbstständige sind der dokumentierte
-- Sonderfall (erschwerter Bankzugang, auxmoney/Sparkassen-Ratgeber) —
-- Vermittler-Gespräch statt Standardstrecke.
--
-- Logik: (1) Selbstständig → direkt Kontakt (individuelle Prüfung).
-- (2) Negative Schufa-Einträge → direkt Kontakt (Sonderfall-Beratung,
-- überspringt die Laufzeit-Frage). Theme: #0f766e (Vertrauens-Petrol),
-- system, 0.75rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_verwendung uuid := gen_random_uuid();
  p_summe      uuid := gen_random_uuid();
  p_beruf      uuid := gen_random_uuid();
  p_schufa     uuid := gen_random_uuid();
  p_laufzeit   uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-privatkredit', v_tenant, 'Demo — Privatkredit (KreditNavi)',
    'Kreditvergleich — kostenlos und Schufa-neutral',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Finanzierungsberater meldet sich innerhalb von 24 Stunden mit Ihrem persönlichen Angebot.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'kreditnavi', '#0f766e', '#1f2937', '#ffffff',
    'transparent', 'system', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr Wunschkredit — fair verglichen',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie Ihr unverbindliches Kreditangebot — kostenlos und ohne Auswirkung auf Ihre Schufa.',
      'page_key', 'welcome_kredit', 'button_label', 'Jetzt Kredit vergleichen →', 'visible', true)),
    (p_verwendung, v_funnel, 'question', 1, '{}'::jsonb),
    (p_summe,      v_funnel, 'question', 2, '{}'::jsonb),
    (p_beruf,      v_funnel, 'question', 3, '{}'::jsonb),
    (p_schufa,     v_funnel, 'question', 4, '{}'::jsonb),
    (p_laufzeit,   v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Finanzierungsberater meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_kredit', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_verwendung, 'verwendung', 'single_choice', 'Wofür benötigen Sie den Kredit?', NULL, NULL, true, true, 0,
      '[{"label":"Umschuldung bestehender Kredite","value":"umschuldung","sort_order":0},
        {"label":"Auto / Fahrzeug","value":"auto","sort_order":1},
        {"label":"Renovierung / Möbel","value":"renovierung","sort_order":2},
        {"label":"Freie Verwendung","value":"frei","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_summe, 'kreditsumme', 'slider', 'Welche Kreditsumme benötigen Sie?', NULL, NULL, true, true, 0,
      '[]'::jsonb, '{"min":1000,"max":100000,"step":1000,"default":15000,"unit":"€"}'::jsonb),
    (p_beruf, 'beschaeftigung', 'single_choice', 'In welchem Beschäftigungsverhältnis sind Sie?', NULL, NULL, true, true, 0,
      '[{"label":"Angestellt","value":"angestellt","sort_order":0},
        {"label":"Verbeamtet","value":"beamter","sort_order":1},
        {"label":"Selbstständig / freiberuflich","value":"selbststaendig","sort_order":2},
        {"label":"In Rente","value":"rentner","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_schufa, 'schufa', 'single_choice', 'Gab es in den letzten 3 Jahren negative Schufa-Einträge?',
      'Auch in Sonderfällen finden wir oft eine Lösung — die Anfrage bleibt Schufa-neutral.', NULL, true, true, 0,
      '[{"label":"Nein","value":"nein","sort_order":0},
        {"label":"Ja","value":"ja","sort_order":1},
        {"label":"Weiß nicht","value":"weiss_nicht","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_laufzeit, 'laufzeit', 'dropdown', 'Welche Laufzeit wünschen Sie sich?', NULL, NULL, true, true, 0,
      '[{"label":"12 bis 24 Monate","value":"12_bis_24","sort_order":0},
        {"label":"36 bis 60 Monate","value":"36_bis_60","sort_order":1},
        {"label":"72 bis 120 Monate","value":"72_bis_120","sort_order":2},
        {"label":"Beratung gewünscht","value":"beratung","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Selbstständige: erschwerter Bankzugang — individuelle Vermittler-Prüfung
    -- statt Standardstrecke.
    (v_funnel, v_tenant, p_beruf, 0, false,
     '[{"field_key":"beschaeftigung","op":"eq","value":"selbststaendig"}]'::jsonb, 'page', p_kontakt),
    -- Negative Schufa: Sonderfall-Beratung, Laufzeit-Frage entfällt.
    (v_funnel, v_tenant, p_schufa, 0, false,
     '[{"field_key":"schufa","op":"eq","value":"ja"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Kredit-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Kredit-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Kreditanfrage bei KreditNavi</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Finanzierungsberater meldet sich innerhalb von 24 Stunden mit Ihrem persönlichen Angebot — Ihre Anfrage bleibt dabei Schufa-neutral.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von KreditNavi</p>', true);
END $do$;
