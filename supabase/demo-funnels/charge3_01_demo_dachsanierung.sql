-- =============================================================================
-- Charge 3 / Vorlage 16 — Dachsanierung („MeisterDach Bedachungen")
--
-- Recherche-Beleg (2026-06-11): Dachdecker-Leads kosten auf großen Portalen
-- 50–100 € pro Stück (MyHammer, MoreAtHome, TapTapHome/DAA, Anfragenmarkt;
-- monatliche Kontingente üblich). Sanierungsrechner führen real durch einen
-- kurzen Fragebogen: Leistung, Dachform, Dachfläche, Zeitrahmen.
--
-- Logik: (1) Mieter → direkt Kontakt (Sanierung ist Eigentümer-Sache).
-- (2) Reparatur → Dachform/Fläche überspringen (kleiner Schaden wird vor Ort
-- befundet, keine Flächenkalkulation nötig).
-- Theme: #991b1b (Ziegelrot), roboto, 0.5rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_eigentum uuid := gen_random_uuid();
  p_leistung uuid := gen_random_uuid();
  p_form     uuid := gen_random_uuid();
  p_flaeche  uuid := gen_random_uuid();
  p_zeitraum uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-dachsanierung', v_tenant, 'Demo — Dachsanierung (MeisterDach)',
    'Dachsanierung — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Dachdeckermeister aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'meisterdach', '#991b1b', '#1f2937', '#ffffff',
    'transparent', 'roboto', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr Dach in Meisterhand',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Dachprojekt und erhalten Sie ein unverbindliches Angebot — kostenlos und ohne Verpflichtung.',
      'page_key', 'welcome_dach', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_eigentum, v_funnel, 'question', 1, '{}'::jsonb),
    (p_leistung, v_funnel, 'question', 2, '{}'::jsonb),
    (p_form,     v_funnel, 'question', 3, '{}'::jsonb),
    (p_flaeche,  v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitraum, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Dachdeckermeister aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_dach', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_eigentum, 'eigentum', 'single_choice', 'Sind Sie Eigentümer der Immobilie?', NULL, NULL, true, true, 0,
      '[{"label":"Ja, Eigentümer","value":"eigentum","sort_order":0},
        {"label":"Nein, zur Miete","value":"miete","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_leistung, 'leistung', 'single_choice', 'Welche Leistung wird benötigt?', NULL, NULL, true, true, 0,
      '[{"label":"Komplettsanierung","value":"komplettsanierung","sort_order":0},
        {"label":"Neueindeckung","value":"neueindeckung","sort_order":1},
        {"label":"Dachdämmung","value":"daemmung","sort_order":2},
        {"label":"Reparatur","value":"reparatur","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_form, 'dachform', 'single_choice', 'Welche Dachform hat Ihr Haus?', NULL, NULL, true, true, 0,
      '[{"label":"Satteldach","value":"satteldach","sort_order":0},
        {"label":"Flachdach","value":"flachdach","sort_order":1},
        {"label":"Walmdach","value":"walmdach","sort_order":2},
        {"label":"Andere Form","value":"andere","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_flaeche, 'dachflaeche', 'number', 'Wie groß ist die Dachfläche ungefähr?',
      'Eine grobe Schätzung genügt.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":20,"max":600,"step":10,"required":true,"unit":"m²"}'::jsonb),
    (p_zeitraum, 'zeitraum', 'single_choice', 'Wann soll die Arbeit ausgeführt werden?', NULL, NULL, true, true, 0,
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
    -- Dachsanierung ist Eigentümer-Sache — Mieter direkt in die persönliche Beratung.
    (v_funnel, v_tenant, p_eigentum, 0, false,
     '[{"field_key":"eigentum","op":"eq","value":"miete"}]'::jsonb, 'page', p_kontakt),
    -- Reparaturen werden vor Ort befundet — Dachform/Fläche sind dafür unnötig.
    (v_funnel, v_tenant, p_leistung, 0, false,
     '[{"field_key":"leistung","op":"eq","value":"reparatur"}]'::jsonb, 'page', p_zeitraum);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Dachsanierungs-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Dachsanierungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei MeisterDach Bedachungen</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Dachdeckermeister aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von MeisterDach Bedachungen</p>', true);
END $do$;
