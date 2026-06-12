-- =============================================================================
-- Charge 5 / Vorlage 29 — Webdesign-Erstgespräch („Studio Nordpixel")
--
-- Recherche-Beleg (2026-06-11): Projektanfrage-Formulare zur Vorqualifizierung
-- sind Branchen-Standard von Webdesign-Agenturen (Rankingmax „Webdesign-
-- Anfrage → kostenloses Erstgespräch", jonasarleth, 717media-Checklisten,
-- fertige Formularvorlagen bei leadgenapp). Real abgefragt: Projektart
-- (neue Website / Redesign / Shop / Landingpage), Zweck (Leads / Verkauf /
-- Präsentation), Umfang, Budget (offen kommunizieren), Zeitrahmen.
--
-- Logik: Budget ≥ 15.000 € → Großprojekt, direkt ins Konzeptgespräch mit der
-- Geschäftsführung (numerische gte-Regel auf dem Budget-Slider).
-- Eigennutz-Bonus: Diese Vorlage passt auch für LeadPlugs eigene Zielgruppe
-- (Agenturen). Theme: #0ea5e9 (frisches Sky), inter, 0.75rem, links. Sie (B2B).
-- =============================================================================

DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome    uuid := gen_random_uuid();
  p_projektart uuid := gen_random_uuid();
  p_zweck      uuid := gen_random_uuid();
  p_umfang     uuid := gen_random_uuid();
  p_budget     uuid := gen_random_uuid();
  p_zeitrahmen uuid := gen_random_uuid();
  p_kontakt    uuid := gen_random_uuid();
  p_success    uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-webdesign', v_tenant, 'Demo — Webdesign (Studio Nordpixel)',
    'Website-Projekt — kostenloses Erstgespräch',
    'Vielen Dank für Ihre Anfrage!',
    'Wir melden uns innerhalb von 24 Stunden für Ihr kostenloses Erstgespräch.',
    'Kostenlos und unverbindlich.',
    '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', 'nordpixel', '#0ea5e9', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object(
      'title', 'Ihre neue Website — geplant mit System',
      'subtitle', 'Beantworten Sie 5 kurze Fragen zu Ihrem Projekt und erhalten Sie ein kostenloses Erstgespräch mit konkreter Einschätzung.',
      'page_key', 'welcome_web', 'button_label', 'Projekt anfragen →', 'visible', true)),
    (p_projektart, v_funnel, 'question', 1, '{}'::jsonb),
    (p_zweck,      v_funnel, 'question', 2, '{}'::jsonb),
    (p_umfang,     v_funnel, 'question', 3, '{}'::jsonb),
    (p_budget,     v_funnel, 'question', 4, '{}'::jsonb),
    (p_zeitrahmen, v_funnel, 'question', 5, '{}'::jsonb),
    (p_kontakt, v_funnel, 'custom', 6, jsonb_build_object(
      'title', 'Wie erreichen wir Sie für das Erstgespräch?',
      'subtitle', 'Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
      'page_key', 'kontakt_web', 'visible', true)),
    (p_success, v_funnel, 'success', 7, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    (p_projektart, 'projektart', 'single_choice', 'Um welches Projekt geht es?', NULL, NULL, true, true, 0,
      '[{"label":"Neue Website","value":"neue_website","sort_order":0},
        {"label":"Redesign der bestehenden Website","value":"redesign","sort_order":1},
        {"label":"Onlineshop","value":"onlineshop","sort_order":2},
        {"label":"Landingpage / Funnel","value":"landingpage","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_zweck, 'zweck', 'single_choice', 'Was soll die Website vor allem leisten?', NULL, NULL, true, true, 0,
      '[{"label":"Anfragen und Leads gewinnen","value":"leads","sort_order":0},
        {"label":"Online verkaufen","value":"verkauf","sort_order":1},
        {"label":"Unternehmen professionell präsentieren","value":"praesentation","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_umfang, 'umfang', 'dropdown', 'Wie viele Seiten schätzen Sie?', NULL, NULL, true, true, 0,
      '[{"label":"1 bis 5 Seiten","value":"eins_bis_fuenf","sort_order":0},
        {"label":"6 bis 15 Seiten","value":"sechs_bis_fuenfzehn","sort_order":1},
        {"label":"Mehr als 15 Seiten","value":"ueber_fuenfzehn","sort_order":2},
        {"label":"Noch unsicher","value":"unsicher","sort_order":3}]'::jsonb, '{}'::jsonb),
    (p_budget, 'budget', 'slider', 'Welches Budget haben Sie eingeplant?',
      'Eine offene Budget-Angabe hilft uns, den passenden Lösungsweg vorzuschlagen.', NULL, true, true, 0,
      '[]'::jsonb, '{"min":1000,"max":25000,"step":500,"default":5000,"unit":"€"}'::jsonb),
    (p_zeitrahmen, 'zeitrahmen', 'single_choice', 'Wann soll das Projekt starten?', NULL, NULL, true, true, 0,
      '[{"label":"So bald wie möglich","value":"so_bald_wie_moeglich","sort_order":0},
        {"label":"In den nächsten 3 Monaten","value":"drei_monate","sort_order":1},
        {"label":"Flexibel","value":"flexibel","sort_order":2}]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true, 0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true, 1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true, 2, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    -- Großprojekte ab 15.000 €: direkt ins Konzeptgespräch mit der
    -- Geschäftsführung (numerische gte-Regel auf dem Budget-Slider).
    (v_funnel, v_tenant, p_budget, 0, false,
     '[{"field_key":"budget","op":"gte","value":"15000"}]'::jsonb, 'page', p_kontakt);

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neue Projektanfrage: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den Webdesign-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p>Ihre Projektanfrage bei Studio Nordpixel</p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! Wir melden uns innerhalb von 24 Stunden bei Ihnen für Ihr kostenloses Erstgespräch — inklusive einer ersten Einschätzung zu Aufwand und Vorgehen.</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Studio Nordpixel</p>', true);
END $do$;
