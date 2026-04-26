-- ============================================================
-- widget-funnel – Seed Data v2
-- Analog zu supabase-schema-v2.sql
-- Idempotent: safe to re-run
-- ============================================================

-- ============================================================
-- CLEANUP (Reihenfolge: FK-Constraints beachten)
-- funnels CASCADE → funnel_questions → funnel_options
-- ============================================================
DELETE FROM funnels  WHERE slug IN ('demo', 'demo-waermepumpe');
DELETE FROM themes   WHERE id IN (
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002'
);
DELETE FROM tenants  WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- TENANT 1 – Solar-Demo GmbH
-- billing: per_lead @ 3.00 €
-- ============================================================
INSERT INTO tenants (id, company_name, contact_email, billing_model, lead_price_base, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Solar-Demo GmbH',
  'demo@solar-demo.de',
  'per_lead', 3.00, TRUE
);

INSERT INTO themes (
  id, tenant_id, name,
  primary_color, text_color, background_color, page_background_color,
  font, border_radius, max_width
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Solar-Demo Theme',
  '#f59e0b', '#1f2937', '#ffffff', '#f3f4f6',
  'inter', '0.75rem', '720px'
);

INSERT INTO funnels (
  id, slug, tenant_id, theme_id, industry, is_active,
  funnel_title, submit_button_label, success_message,
  response_time_text, contact_form_subtitle
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  'demo',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'solar', TRUE,
  'Jetzt kostenloses Solarangebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?'
);

-- Solar Frage 1 – Gebäudetyp (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('10000000-0000-0000-0000-000000000003', 1, 'gebaeudetyp',
    'Worauf soll die Solaranlage installiert werden?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Einfamilien- oder Zweifamilienhaus', 'efh',       'House'),
  (2, 'Mehrfamilienhaus',                   'mfh',       'Apartment'),
  (3, 'Firmengebäude',                      'firma',     'Factory'),
  (4, 'Sonstiges',                          'sonstiges', 'Question')
) AS s(sort_order, label, value, icon_key);

-- Solar Frage 2 – Fläche (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('10000000-0000-0000-0000-000000000003', 2, 'flaeche',
    'Wie groß ist die geplante Anlage?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Bis 20 m²',      'bis-20',    'SolarPanel'),
  (2, '21 bis 100 m²',  '21-100',    'SolarPanel'),
  (3, '101 bis 200 m²', '101-200',   'SolarPanel'),
  (4, 'Über 200 m²',    'ueber-200', 'SolarPanel')
) AS s(sort_order, label, value, icon_key);

-- Solar Frage 3 – Ausrichtung (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('10000000-0000-0000-0000-000000000003', 3, 'ausrichtung',
    'Haben Sie eine südlich ausgerichtete Dachfläche?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Ja',               'ja',        'Check'),
  (2, 'Nein',             'nein',      'Cross'),
  (3, 'Teilweise',        'teilweise', 'HousePartial'),
  (4, 'Bin nicht sicher', 'unsicher',  'Question')
) AS s(sort_order, label, value, icon_key);

-- Solar Frage 4 – Stromspeicher (3 Optionen → 1×3-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('10000000-0000-0000-0000-000000000003', 4, 'stromspeicher',
    'Sind Sie an einem Stromspeicher interessiert?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Ja',         'ja',       'Check'),
  (2, 'Nein',       'nein',     'Cross'),
  (3, 'Weiß nicht', 'unsicher', 'Question')
) AS s(sort_order, label, value, icon_key);

-- Solar Frage 5 – Kauf/Miete (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('10000000-0000-0000-0000-000000000003', 5, 'kaufmiete',
    'Möchten Sie einen Angebotsvergleich zu Kauf und Miete?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Ja, beides interessant',      'beides',   'Check'),
  (2, 'Kaufen',                      'kaufen',   'Euro'),
  (3, 'Mieten',                      'mieten',   'Document'),
  (4, 'Weiß nicht / bitte Beratung', 'unsicher', 'Question')
) AS s(sort_order, label, value, icon_key);

-- Solar Frage 6 – Zeitraum (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('10000000-0000-0000-0000-000000000003', 6, 'zeitraum',
    'Wann soll das Projekt umgesetzt werden?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Umgehend',           'umgehend', 'Calendar'),
  (2, 'In 1 bis 3 Monaten', '1-3',      'Calendar'),
  (3, 'In 3 bis 6 Monaten', '3-6',      'Calendar'),
  (4, 'Weiß nicht',         'unsicher', 'Question')
) AS s(sort_order, label, value, icon_key);

-- ============================================================
-- TENANT 2 – Wärmepumpe-Demo GmbH
-- billing: flat_monthly @ 20 € / 10 Leads
-- ============================================================
INSERT INTO tenants (
  id, company_name, contact_email,
  billing_model, flat_monthly_price, flat_monthly_lead_limit, is_active
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Wärmepumpe-Demo GmbH',
  'demo@waermepumpe-demo.de',
  'flat_monthly', 20.00, 10, TRUE
);

INSERT INTO themes (
  id, tenant_id, name,
  primary_color, text_color, background_color, page_background_color,
  font, border_radius, max_width
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'Wärmepumpe-Demo Theme',
  '#3b82f6', '#1f2937', '#ffffff', '#eff6ff',
  'inter', '0.75rem', '720px'
);

INSERT INTO funnels (
  id, slug, tenant_id, theme_id, industry, is_active,
  funnel_title, submit_button_label, success_message,
  response_time_text, contact_form_subtitle
) VALUES (
  '20000000-0000-0000-0000-000000000003',
  'demo-waermepumpe',
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'waermepumpe', TRUE,
  'Jetzt kostenloses Wärmepumpen-Angebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?'
);

-- WP Frage 1 – Gebäudetyp (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('20000000-0000-0000-0000-000000000003', 1, 'gebaeudetyp',
    'Was für ein Gebäude soll beheizt werden?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Neubau',             'neubau',           'House'),
  (2, 'Altbau (saniert)',   'altbau_saniert',   'House'),
  (3, 'Altbau (unsaniert)', 'altbau_unsaniert', 'Wrench'),
  (4, 'Gewerbe',            'gewerbe',          'Factory')
) AS s(sort_order, label, value, icon_key);

-- WP Frage 2 – Beheizte Fläche (3 Optionen → 1×3-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('20000000-0000-0000-0000-000000000003', 2, 'beheizteflaeche',
    'Wie groß ist die zu beheizende Fläche?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Bis 100 m²',   'bis_100',   'HeatPump'),
  (2, '100 – 200 m²', '100_200',   'HeatPump'),
  (3, 'Über 200 m²',  'ueber_200', 'HeatPump')
) AS s(sort_order, label, value, icon_key);

-- WP Frage 3 – Aktuelle Heizung (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('20000000-0000-0000-0000-000000000003', 3, 'aktuelle_heizung',
    'Welche Heizung haben Sie aktuell?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Ölheizung',      'oel',          'Flame'),
  (2, 'Gasheizung',     'gas',          'Flame'),
  (3, 'Nachtspeicher',  'nachtspeicher','Lightning'),
  (4, 'Sonstiges',      'sonstiges',    'Question')
) AS s(sort_order, label, value, icon_key);

-- WP Frage 4 – Zeitraum (4 Optionen → 2×2-Grid)
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES ('20000000-0000-0000-0000-000000000003', 4, 'zeitraum',
    'Wann soll die Wärmepumpe installiert werden?')
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'So schnell wie möglich', 'umgehend', 'Calendar'),
  (2, 'In 1 bis 3 Monaten',    '1-3',      'Calendar'),
  (3, 'In 3 bis 6 Monaten',    '3-6',      'Calendar'),
  (4, 'Weiß noch nicht',       'unsicher', 'Question')
) AS s(sort_order, label, value, icon_key);
