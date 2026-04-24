-- Funnel Widget Platform – Seed Data
-- Run this in the Supabase SQL editor.
-- Idempotent: safe to re-run without errors.

-- =============================================================================
-- TENANT 1 – Solar-Demo
-- slug: "demo" | industry: "solar" | billing: per_lead @ 3.00 €
-- =============================================================================

INSERT INTO tenants (
  slug, industry, is_active,
  company_name, contact_email,
  primary_color, text_color, background_color, page_background_color,
  font, border_radius, max_width,
  funnel_title, submit_button_label, success_message,
  response_time_text, contact_form_subtitle,
  billing_model, lead_price_base
) VALUES (
  'demo', 'solar', TRUE,
  'Solar-Demo GmbH', 'demo@solar-demo.de',
  '#f59e0b', '#1f2937', '#ffffff', '#f3f4f6',
  'inter', '0.75rem', '720px',
  'Jetzt kostenloses Solarangebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?',
  'per_lead', 3.00
)
ON CONFLICT (slug) DO NOTHING;

-- Questions: delete existing (cascades to options), then re-insert
DELETE FROM funnel_questions
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo');

-- Frage 1 – Gebäudetyp (4 Optionen → testet 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    1, 'gebaeudetyp', 'Was für ein Gebäude haben Sie?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Einfamilienhaus',  'einfamilienhaus',  'House'),
  (2, 'Doppelhaus',       'doppelhaus',       'House'),
  (3, 'Mehrfamilienhaus', 'mehrfamilienhaus',  'House'),
  (4, 'Gewerbe',          'gewerbe',          'Wrench')
) AS s(sort_order, label, value, icon_key);

-- Frage 2 – Dachfläche (3 Optionen → testet 1×3-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    2, 'dachflaeche', 'Wie groß ist Ihre nutzbare Dachfläche?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Klein (< 40 m²)',   'klein',  'SolarPanel'),
  (2, 'Mittel (40–80 m²)', 'mittel', 'SolarPanel'),
  (3, 'Groß (> 80 m²)',    'gross',  'SolarPanel')
) AS s(sort_order, label, value, icon_key);

-- Frage 3 – Stromspeicher (2 Optionen → testet 1×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    3, 'stromspeicher', 'Möchten Sie einen Stromspeicher dazunehmen?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Ja, mit Speicher',   'ja',   'Lightning'),
  (2, 'Nein, ohne Speicher','nein', 'Star')
) AS s(sort_order, label, value, icon_key);


-- =============================================================================
-- TENANT 2 – Wärmepumpe-Demo
-- slug: "demo-waermepumpe" | industry: "waermepumpe" | billing: flat_monthly
-- =============================================================================

INSERT INTO tenants (
  slug, industry, is_active,
  company_name, contact_email,
  primary_color, text_color, background_color, page_background_color,
  font, border_radius, max_width,
  funnel_title, submit_button_label, success_message,
  response_time_text, contact_form_subtitle,
  billing_model, flat_monthly_price, flat_monthly_lead_limit
) VALUES (
  'demo-waermepumpe', 'waermepumpe', TRUE,
  'Wärmepumpe-Demo GmbH', 'demo@waermepumpe-demo.de',
  '#3b82f6', '#1f2937', '#ffffff', '#eff6ff',
  'inter', '0.75rem', '720px',
  'Jetzt kostenloses Wärmepumpen-Angebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?',
  'flat_monthly', 20.00, 10
)
ON CONFLICT (slug) DO NOTHING;

-- Questions: delete existing (cascades to options), then re-insert
DELETE FROM funnel_questions
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-waermepumpe');

-- Frage 1 – Gebäudetyp (4 Optionen → testet 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-waermepumpe'),
    1, 'gebaeudetyp', 'Was für ein Gebäude soll beheizt werden?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Neubau',             'neubau',             'House'),
  (2, 'Altbau (saniert)',   'altbau_saniert',     'House'),
  (3, 'Altbau (unsaniert)', 'altbau_unsaniert',   'Wrench'),
  (4, 'Gewerbe',            'gewerbe',            'Wrench')
) AS s(sort_order, label, value, icon_key);

-- Frage 2 – Beheizte Fläche (3 Optionen → testet 1×3-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-waermepumpe'),
    2, 'beheizteflaeche', 'Wie groß ist die zu beheizende Fläche?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Bis 100 m²',     'bis_100',  'HeatPump'),
  (2, '100 – 200 m²',   '100_200',  'HeatPump'),
  (3, 'Über 200 m²',    'ueber_200','HeatPump')
) AS s(sort_order, label, value, icon_key);

-- Frage 3 – Aktuelle Heizung (2 Optionen → testet 1×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-waermepumpe'),
    3, 'aktuelle_heizung', 'Welche Heizung haben Sie aktuell?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Ölheizung',  'oel',  'Flame'),
  (2, 'Gasheizung', 'gas',  'Flame')
) AS s(sort_order, label, value, icon_key);
