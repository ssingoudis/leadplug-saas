-- =============================================================================
-- Charge 2 / Vorlage 11 — Treppenlift („LiftKomfort")
--
-- Recherche-Beleg (2026-06-11): Treppenlift-Leads gehören zu den teuersten
-- Lead-Märkten überhaupt (35–120 € pro Lead; Powerleads, LeadsKaufen24,
-- Leads Navigator >5.000 Leads/Monat, Partnerprogramme bis 120 € pay-per-lead).
-- Preisfaktoren real: Treppenform (gerade ab ~3.800 €, kurvig ab ~8.000 €),
-- Etagen, Einbauort. Pflegekasse zahlt bis 4.180 € pro Person bei Pflegegrad —
-- Antrag muss VOR dem Einbau gestellt werden.
--
-- Logik: „So schnell wie möglich" (z. B. nach Krankenhausaufenthalt) →
-- Fast-Track zur Kontaktkarte, telefonische Schnellberatung statt Formularstrecke.
-- Theme: #be123c (warmes Rot, seriös), system, 0.5rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_fuer_wen   uuid := gen_random_uuid();
  p_zeitpunkt  uuid := gen_random_uuid();
  p_form       uuid := gen_random_uuid();
  p_etagen     uuid := gen_random_uuid();
  p_pflegegrad uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-treppenlift', v_tenant, 'Demo — Treppenlift (LiftKomfort)',
    'Treppenlift — unverbindliches Angebot',
    'Vielen Dank für Ihre Anfrage!',
    'Ein Treppenlift-Berater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch mit kostenlosem Vor-Ort-Termin.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'liftkomfort', '#be123c', '#1f2937', '#ffffff',
    'transparent', 'system', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Sicher über jede Treppe — mit Ihrem Treppenlift',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie ein unverbindliches Angebot — kostenlos, inklusive Beratung zu Pflegekassen-Zuschüssen.',
      'page_key', 'welcome_lift', 'button_label', 'Jetzt Angebot anfordern →', 'visible', true)),
    (p_fuer_wen,   v_funnel, 'question', 1, '{}'::jsonb),
    (p_zeitpunkt,  v_funnel, 'question', 2, '{}'::jsonb),
    (p_form,       v_funnel, 'question', 3, '{}'::jsonb),
    (p_etagen,     v_funnel, 'question', 4, '{}'::jsonb),
    (p_pflegegrad, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wohin dürfen wir Ihr Angebot senden?',
      'subtitle', 'Ein Treppenlift-Berater meldet sich innerhalb von 24 Stunden — auf Wunsch mit kostenlosem Vor-Ort-Termin.',
      'page_key', 'kontakt_lift', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_fuer_wen, 'fuer_wen', 'single_choice', 'Für wen wird der Treppenlift benötigt?', NULL, NULL, true, true, 0,
      '[{"label":"Für mich selbst","value":"selbst","sort_order":0},
        {"label":"Für eine angehörige Person","value":"angehoerige","sort_order":1},
        {"label":"Ich berate jemanden","value":"beratung","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zeitpunkt, 'zeitpunkt', 'single_choice', 'Wie schnell wird der Lift benötigt?', NULL, NULL, true, true, 0,
      '[{"label":"So schnell wie möglich","value":"so_schnell_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Ich informiere mich zunächst","value":"nur_info","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_form, 'treppenform', 'single_choice', 'Wie verläuft die Treppe?',
      'Die Treppenform ist der wichtigste Preisfaktor.', NULL, true, true, 0,
      '[{"label":"Gerade","value":"gerade","sort_order":0},
        {"label":"Kurvig oder mit Wendung","value":"kurvig","sort_order":1},
        {"label":"Außentreppe","value":"aussen","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_etagen, 'etagen', 'dropdown', 'Über wie viele Etagen soll der Lift führen?', NULL, NULL, true, true, 0,
      '[{"label":"Eine Etage","value":"eine","sort_order":0},
        {"label":"Zwei Etagen","value":"zwei","sort_order":1},
        {"label":"Drei oder mehr Etagen","value":"drei_oder_mehr","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_pflegegrad, 'pflegegrad', 'single_choice', 'Liegt ein anerkannter Pflegegrad vor?',
      'Mit Pflegegrad bezuschusst die Pflegekasse den Einbau mit bis zu 4.180 € pro Person — der Antrag muss vor dem Einbau gestellt werden.',
      NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Antrag läuft","value":"beantragt","sort_order":2},
        {"label":"Weiß nicht","value":"weiss_nicht","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Dringende Fälle (z. B. nach Krankenhausaufenthalt): sofortige telefonische
    -- Beratung statt weiterer Formularstrecke.
    (v_funnel, v_tenant, p_zeitpunkt, 0, false,
     '[{"field_key":"zeitpunkt","op":"eq","value":"so_schnell_wie_moeglich"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer Treppenlift-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Treppenlift-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Treppenlift-Anfrage bei LiftKomfort</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Ein Treppenlift-Berater meldet sich innerhalb von 24 Stunden bei Ihnen — auf Wunsch vereinbaren wir einen kostenlosen Vor-Ort-Termin. Gern beraten wir Sie auch zu Zuschüssen der Pflegekasse.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von LiftKomfort</p>', true);
END $do$;
