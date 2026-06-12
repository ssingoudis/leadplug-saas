-- =============================================================================
-- Charge 2 / Vorlage 10 — Badsanierung („BadWerk Sanitär")
--
-- Recherche-Beleg (2026-06-11): Badsanierungs-Leads werden real gehandelt
-- (Aroundhome, Check24, Interlead; 29–120 € pro Anfrage, teils ab 6 €).
-- Qualifizierung: Eigentum/Miete, Umfang (Komplett/Teil/barrierefrei),
-- Badgröße, Zeitrahmen. Pflegekasse bezuschusst barrierefreien Umbau mit
-- bis zu 4.180 € bei anerkanntem Pflegegrad.
--
-- Logik: (1) Mieter → direkt Kontakt (Vermieter-Zustimmung nötig, bewährtes
-- Solar-Muster). (2) Umfang ≠ barrierefrei → Pflegegrad-Frage überspringen.
-- Theme: #0284c7 (Sanitär-Blau), inter, 0.75rem, links. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_eigentum   uuid := gen_random_uuid();
  p_umfang     uuid := gen_random_uuid();
  p_pflegegrad uuid := gen_random_uuid();
  p_groesse    uuid := gen_random_uuid();
  p_zeitraum   uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-badsanierung', v_tenant, 'Demo — Badsanierung (BadWerk Sanitär)',
    'Badsanierung — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Badplaner aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'badwerk', '#0284c7', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihr neues Bad vom Meisterbetrieb',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Badprojekt und erhalten Sie ein unverbindliches Angebot — kostenlos und ohne Verpflichtung.',
      'page_key', 'welcome_bad', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_eigentum,   v_funnel, 'question', 1, '{}'::jsonb),
    (p_umfang,     v_funnel, 'question', 2, '{}'::jsonb),
    (p_pflegegrad, v_funnel, 'question', 3, '{}'::jsonb),
    (p_groesse,    v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitraum,   v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Badplaner aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_bad', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_eigentum, 'eigentum', 'single_choice', 'Wohnen Sie im Eigentum oder zur Miete?', NULL, NULL, true, true, 0,
      '[{"label":"Im Eigentum","value":"eigentum","sort_order":0},
        {"label":"Zur Miete","value":"miete","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_umfang, 'umfang', 'single_choice', 'Was soll saniert werden?', NULL, NULL, true, true, 0,
      '[{"label":"Komplettsanierung","value":"komplettsanierung","sort_order":0},
        {"label":"Teilsanierung — z. B. Dusche oder Fliesen","value":"teilsanierung","sort_order":1},
        {"label":"Barrierefreier Umbau","value":"barrierefrei","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_pflegegrad, 'pflegegrad', 'single_choice', 'Liegt bei der nutzenden Person ein Pflegegrad vor?',
      'Mit anerkanntem Pflegegrad bezuschusst die Pflegekasse den barrierefreien Umbau mit bis zu 4.180 €.',
      NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Antrag läuft","value":"beantragt","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_groesse, 'badgroesse', 'number', 'Wie groß ist Ihr Bad?', NULL, NULL, true, true, 0,
      '[]'::jsonb, '{"min":2,"max":40,"step":1,"required":true,"unit":"m²"}'::jsonb),
    (p_zeitraum, 'zeitraum', 'single_choice', 'Wann soll die Sanierung starten?', NULL, NULL, true, true, 0,
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
    -- Mieter: Sanierung braucht Vermieter-Zustimmung → direkt zur persönlichen Beratung.
    (v_funnel, v_tenant, p_eigentum, 0, false,
     '[{"field_key":"eigentum","op":"eq","value":"miete"}]'::jsonb, 'page', p_kontakt),
    -- Pflegegrad-Frage ist nur beim barrierefreien Umbau relevant (Zuschuss-Strecke).
    (v_funnel, v_tenant, p_umfang, 0, false,
     '[{"field_key":"umfang","op":"neq","value":"barrierefrei"}]'::jsonb, 'page', p_groesse);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Badsanierungs-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Badsanierungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei BadWerk Sanitär</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Badplaner aus Ihrer Region meldet sich innerhalb von 24 Stunden bei Ihnen, um die nächsten Schritte zu besprechen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von BadWerk Sanitär</p>', true);
END $do$;
