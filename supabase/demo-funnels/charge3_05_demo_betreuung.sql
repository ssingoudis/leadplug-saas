-- =============================================================================
-- Charge 3 / Vorlage 20 — 24-Stunden-Betreuung („PflegeNah Vermittlung")
--
-- Recherche-Beleg (2026-06-11): Etablierter Vermittlungs-Markt (Pflegehelden,
-- VILENA, Sofiapflege, HomeCare24, pflege.de-Ratgeber; Verbraucherzentrale
-- führt eigene Checkliste für seriöse Agenturen). Fachlich korrekt: die
-- Betreuungskraft braucht ein eigenes Zimmer im Haushalt; ein Pflegegrad ist
-- KEINE Voraussetzung, Pflegekassen-Leistungen können aber mitfinanzieren;
-- Vermittlung dauert üblich nur wenige Tage; Erstberatung läuft telefonisch.
--
-- Logik: (1) Umfang ≠ 24h-Betreuung → Zimmer-Frage überspringen (nur für
-- einziehende Betreuungskräfte relevant). (2) Beginn „so schnell wie möglich"
-- → direkt Kontakt (Notfall-Vermittlung läuft telefonisch in wenigen Tagen).
-- Theme: #0c4a6e (ruhiges Dunkelblau, Vertrauen), inter, 0.5rem, links. Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome  uuid := gen_random_uuid();
  p_fuer_wen uuid := gen_random_uuid();
  p_umfang   uuid := gen_random_uuid();
  p_zimmer   uuid := gen_random_uuid();
  p_beginn   uuid := gen_random_uuid();
  p_pflegegrad uuid := gen_random_uuid();
  p_kontakt  uuid := gen_random_uuid();
  p_success  uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-betreuung', v_tenant, 'Demo — 24h-Betreuung (PflegeNah)',
    '24-Stunden-Betreuung — kostenlose Beratung',
    'Vielen Dank für Ihre Anfrage!',
    'Eine Pflegeberaterin meldet sich innerhalb von 24 Stunden bei Ihnen — einfühlsam und unverbindlich.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'pflegenah', '#0c4a6e', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.5rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Liebevolle Betreuung zuhause',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie eine kostenlose Beratung zur häuslichen Betreuung — unverbindlich und einfühlsam.',
      'page_key', 'welcome_betreuung', 'button_label', 'Jetzt Beratung anfordern →', 'visible', true)),
    (p_fuer_wen,   v_funnel, 'question', 1, '{}'::jsonb),
    (p_umfang,     v_funnel, 'question', 2, '{}'::jsonb),
    (p_zimmer,     v_funnel, 'question', 3, '{}'::jsonb),
    (p_beginn,     v_funnel, 'question', 4, '{}'::jsonb),
    (p_pflegegrad, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für die Beratung?',
      'subtitle', 'Eine Pflegeberaterin meldet sich innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_betreuung', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_fuer_wen, 'fuer_wen', 'single_choice', 'Für wen suchen Sie Betreuung?', NULL, NULL, true, true, 0,
      '[{"label":"Für ein Elternteil","value":"elternteil","sort_order":0},
        {"label":"Für meinen Partner / meine Partnerin","value":"partner","sort_order":1},
        {"label":"Für mich selbst","value":"selbst","sort_order":2},
        {"label":"Für eine andere Person","value":"andere","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_umfang, 'umfang', 'single_choice', 'Welche Form der Betreuung wird benötigt?', NULL, NULL, true, true, 0,
      '[{"label":"24-Stunden-Betreuung zuhause","value":"betreuung_24h","sort_order":0},
        {"label":"Stundenweise Unterstützung","value":"stundenweise","sort_order":1},
        {"label":"Noch unklar — Beratung gewünscht","value":"beratung","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zimmer, 'zimmer', 'single_choice', 'Steht ein eigenes Zimmer für die Betreuungskraft zur Verfügung?',
      'Bei der 24-Stunden-Betreuung wohnt die Betreuungskraft im Haushalt und braucht ein eigenes Zimmer.',
      NULL, true, true, 0,
      '[{"label":"Ja","value":"ja","sort_order":0},
        {"label":"Nein","value":"nein","sort_order":1},
        {"label":"Noch unklar","value":"unklar","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_beginn, 'beginn', 'single_choice', 'Wann soll die Betreuung beginnen?', NULL, NULL, true, true, 0,
      '[{"label":"So schnell wie möglich","value":"so_schnell_wie_moeglich","sort_order":0},
        {"label":"Innerhalb von 4 Wochen","value":"vier_wochen","sort_order":1},
        {"label":"Später / vorsorglich","value":"spaeter","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_pflegegrad, 'pflegegrad', 'dropdown', 'Liegt ein Pflegegrad vor?',
      'Ein Pflegegrad ist keine Voraussetzung — Leistungen der Pflegekasse können die Betreuung aber mitfinanzieren.',
      NULL, true, true, 0,
      '[{"label":"Pflegegrad 1","value":"pg1","sort_order":0},
        {"label":"Pflegegrad 2","value":"pg2","sort_order":1},
        {"label":"Pflegegrad 3","value":"pg3","sort_order":2},
        {"label":"Pflegegrad 4 oder 5","value":"pg4_5","sort_order":3},
        {"label":"Antrag läuft","value":"beantragt","sort_order":4},
        {"label":"Noch keiner","value":"keiner","sort_order":5}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Zimmer-Frage betrifft nur einziehende 24h-Betreuungskräfte.
    (v_funnel, v_tenant, p_umfang, 0, false,
     '[{"field_key":"umfang","op":"neq","value":"betreuung_24h"}]'::jsonb, 'page', p_beginn),
    -- Dringende Fälle: Vermittlung läuft telefonisch in wenigen Tagen —
    -- direkt zur Kontaktaufnahme.
    (v_funnel, v_tenant, p_beginn, 0, false,
     '[{"field_key":"beginn","op":"eq","value":"so_schnell_wie_moeglich"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Betreuungs-Anfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Betreuungs-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Anfrage bei PflegeNah</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihr Vertrauen! Eine Pflegeberaterin meldet sich innerhalb von 24 Stunden bei Ihnen, um Ihre Situation in Ruhe zu besprechen — kostenlos und unverbindlich.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von PflegeNah</p>', true);
END $do$;
