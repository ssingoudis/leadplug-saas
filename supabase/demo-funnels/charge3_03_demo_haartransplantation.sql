-- =============================================================================
-- Charge 3 / Vorlage 18 — Haartransplantation („HairMedic Klinik")
--
-- Recherche-Beleg (2026-06-11): Großer Paid-Patient-Markt mit eigenen
-- Vermittlungs-/Vergleichsportalen (Medabroad „Geprüfte Angebote erhalten",
-- Bookimed-Klinik-Rankings, haartransplantation.de) und spezialisierten
-- Gesundheits-Lead-Agenturen für ästhetische Behandlungen. Kliniken werben
-- mit unverbindlicher Erstberatung (z. B. KÖ-HAIR deutschlandweit).
-- Übliche Vorqualifizierung: Geschlecht, betroffener Bereich, Verlauf, Alter.
--
-- Logik: Alter unter 25 → direkt ärztliche Beratung (Haarausfall ist in dem
-- Alter oft noch nicht stabil — seriöse Kliniken raten zur Abklärung statt
-- Sofort-OP). Numerische lt-Regel.
-- Theme: #a21caf (Fuchsia, Ästhetik), poppins, 0.75rem, zentriert. Anrede: Sie.
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_geschlecht uuid := gen_random_uuid();
  p_alter      uuid := gen_random_uuid();
  p_bereich    uuid := gen_random_uuid();
  p_seit_wann  uuid := gen_random_uuid();
  p_zeitpunkt  uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-haartransplantation', v_tenant, 'Demo — Haartransplantation (HairMedic)',
    'Haartransplantation — kostenlose Erstberatung',
    'Vielen Dank für Ihre Anfrage!',
    'Unser Beratungsteam meldet sich innerhalb von 24 Stunden diskret bei Ihnen.',
    'Diskret, unverbindlich und kostenlos.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'center',
    'stavrossingoudis@gmail.com', 'hairmedic', '#a21caf', '#1f2937', '#ffffff',
    'transparent', 'poppins', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Volles Haar — mit modernen Methoden',
      'subtitle', 'Beantworten Sie 5 kurze Fragen und erhalten Sie Ihre kostenlose Erstberatung — diskret und unverbindlich.',
      'page_key', 'welcome_haar', 'button_label', 'Kostenlose Beratung anfragen →', 'visible', true)),
    (p_geschlecht, v_funnel, 'question', 1, '{}'::jsonb),
    (p_alter,      v_funnel, 'question', 2, '{}'::jsonb),
    (p_bereich,    v_funnel, 'question', 3, '{}'::jsonb),
    (p_seit_wann,  v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitpunkt,  v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für die Beratung?',
      'subtitle', 'Unser Beratungsteam meldet sich innerhalb von 24 Stunden diskret bei Ihnen.',
      'page_key', 'kontakt_haar', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_geschlecht, 'geschlecht', 'single_choice', 'Für wen ist die Behandlung?', NULL, NULL, true, true, 0,
      '[{"label":"Mann","value":"mann","sort_order":0},
        {"label":"Frau","value":"frau","sort_order":1}]'::jsonb, '{}'::jsonb),
    (p_alter, 'alter', 'number', 'Wie alt sind Sie?', NULL, NULL, true, true, 0,
      '[]'::jsonb, '{"min":18,"max":75,"step":1,"required":true,"unit":"Jahre"}'::jsonb),
    (p_bereich, 'bereich', 'single_choice', 'Welcher Bereich ist betroffen?', NULL, NULL, true, true, 0,
      '[{"label":"Geheimratsecken","value":"geheimratsecken","sort_order":0},
        {"label":"Tonsur / Hinterkopf","value":"tonsur","sort_order":1},
        {"label":"Gesamter Oberkopf","value":"oberkopf","sort_order":2},
        {"label":"Augenbrauen oder Bart","value":"augenbrauen_bart","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_seit_wann, 'seit_wann', 'single_choice', 'Seit wann besteht der Haarausfall?',
      'Der Verlauf hilft uns einzuschätzen, ob der Haarausfall bereits stabil ist.', NULL, true, true, 0,
      '[{"label":"Weniger als 1 Jahr","value":"unter_1_jahr","sort_order":0},
        {"label":"1 bis 3 Jahre","value":"ein_bis_drei_jahre","sort_order":1},
        {"label":"Länger als 3 Jahre","value":"ueber_3_jahre","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_zeitpunkt, 'zeitpunkt', 'single_choice', 'Wann möchten Sie mit der Behandlung beginnen?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Ich informiere mich zunächst","value":"nur_info","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Unter 25 ist der Haarausfall oft noch nicht stabil — ärztliche Abklärung
    -- statt Standardstrecke (seriöse Kliniken raten in dem Alter zur Beratung).
    (v_funnel, v_tenant, p_alter, 0, false,
     '[{"field_key":"alter","op":"lt","value":"25"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Beratungsanfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Haartransplantations-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Beratungsanfrage bei der HairMedic Klinik</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihr Vertrauen! Unser Beratungsteam meldet sich innerhalb von 24 Stunden diskret bei Ihnen, um Ihre Fragen zu besprechen und einen Beratungstermin zu vereinbaren.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team der HairMedic Klinik</p>', true);
END $do$;
