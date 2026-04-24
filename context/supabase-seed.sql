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
    1, 'gebaeudetyp', 'Worauf soll die Solaranlage installiert werden?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Einfamilien- oder Zweifamilienhaus', 'efh',       'House'),
  (2, 'Mehrfamilienhaus',                   'mfh',       'Apartment'),
  (3, 'Firmengebäude',                      'firma',     'Factory'),
  (4, 'Sonstiges',                          'sonstiges', 'Question')
) AS s(sort_order, label, value, icon_key);

-- Frage 2 – Fläche (4 Optionen → testet 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    2, 'flaeche', 'Wie groß ist die Fläche bzw. die geplante Anlage?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Bis 20 qm',       'bis-20',    'SolarPanel'),
  (2, '21 bis 100 qm',   '21-100',    'SolarPanel'),
  (3, '101 bis 200 qm',  '101-200',   'SolarPanel'),
  (4, 'Über 200 qm',     'ueber-200', 'SolarPanel')
) AS s(sort_order, label, value, icon_key);

-- Frage 3 – Ausrichtung (4 Optionen → testet 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    3, 'ausrichtung', 'Haben Sie eine südlich ausgerichtete Dachfläche?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Ja',              'ja',        'Check'),
  (2, 'Nein',            'nein',      'Cross'),
  (3, 'Teilweise',       'teilweise', 'HousePartial'),
  (4, 'Bin nicht sicher','unsicher',  'Question')
) AS s(sort_order, label, value, icon_key);

-- Frage 4 – Stromspeicher (3 Optionen → testet 1×3-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    4, 'stromspeicher', 'Sind Sie an einem Stromspeicher interessiert?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Ja',        'ja',       'Check'),
  (2, 'Nein',      'nein',     'Cross'),
  (3, 'Weiß nicht','unsicher', 'Question')
) AS s(sort_order, label, value, icon_key);

-- Frage 5 – Kauf/Miete (4 Optionen → testet 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    5, 'kaufmiete', 'Möchten Sie einen Angebotsvergleich zu Kauf und Miete?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Ja, beides interessant',    'beides',   'Check'),
  (2, 'Kaufen',                    'kaufen',   'Euro'),
  (3, 'Mieten',                    'mieten',   'Document'),
  (4, 'Weiß nicht / bitte Beratung','unsicher','Question')
) AS s(sort_order, label, value, icon_key);

-- Frage 6 – Zeitraum (4 Optionen → testet 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo'),
    6, 'zeitraum', 'Wann soll das Projekt umgesetzt werden?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Umgehend',          'umgehend', 'Calendar'),
  (2, 'In 1 bis 3 Monaten','1-3',      'Calendar'),
  (3, 'In 3 bis 6 Monaten','3-6',      'Calendar'),
  (4, 'Weiß nicht',        'unsicher', 'Question')
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
