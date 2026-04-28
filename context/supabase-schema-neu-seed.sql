-- ============================================================
-- widget-funnel – Seed Data (neu)
-- Analog zu supabase-schema-neu.sql
-- Idempotent: safe to re-run
-- ============================================================

-- ============================================================
-- CLEANUP (Reihenfolge: FK-Constraints beachten)
-- funnels CASCADE → funnel_questions
-- ============================================================
DELETE FROM funnels WHERE slug IN ('demo', 'demo-waermepumpe');
DELETE FROM themes  WHERE name IN ('Solar-Demo Theme', 'Wärmepumpe-Demo Theme');
DELETE FROM tenants WHERE slug IN ('solar-demo', 'waermepumpe-demo');

-- ============================================================
-- TENANT 1 – Solar-Demo GmbH
-- billing: per_lead @ 3.00 €
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active)
VALUES (
  'solar-demo',
  'Solar-Demo GmbH',
  'info@solar-demo.de',
  'demo@solar-demo.de',
  'per_lead', 3.00, TRUE
);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width)
VALUES (
  'Solar-Demo Theme',
  'solar-demo',
  '#f59e0b', '#1f2937', '#ffffff', '#f3f4f6',
  'inter', '0.75rem', '720px'
);

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle)
VALUES (
  'demo',
  'solar-demo',
  'Solar-Demo Theme',
  'solar', TRUE,
  'Jetzt kostenloses Solarangebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?'
);

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, options) VALUES

('demo', 1, 'gebaeudetyp',
  'Worauf soll die Solaranlage installiert werden?',
  '[
    {"label": "Einfamilien- oder Zweifamilienhaus", "value": "efh",       "icon_key": "House"},
    {"label": "Mehrfamilienhaus",                   "value": "mfh",       "icon_key": "Apartment"},
    {"label": "Firmengebäude",                      "value": "firma",     "icon_key": "Factory"},
    {"label": "Sonstiges",                          "value": "sonstiges", "icon_key": "Question"}
  ]'),

('demo', 2, 'flaeche',
  'Wie groß ist die geplante Anlage?',
  '[
    {"label": "Bis 20 m²",      "value": "bis-20",    "icon_key": "SolarPanel"},
    {"label": "21 bis 100 m²",  "value": "21-100",    "icon_key": "SolarPanel"},
    {"label": "101 bis 200 m²", "value": "101-200",   "icon_key": "SolarPanel"},
    {"label": "Über 200 m²",    "value": "ueber-200", "icon_key": "SolarPanel"}
  ]'),

('demo', 3, 'ausrichtung',
  'Haben Sie eine südlich ausgerichtete Dachfläche?',
  '[
    {"label": "Ja",               "value": "ja",        "icon_key": "Check"},
    {"label": "Nein",             "value": "nein",      "icon_key": "Cross"},
    {"label": "Teilweise",        "value": "teilweise", "icon_key": "HousePartial"},
    {"label": "Bin nicht sicher", "value": "unsicher",  "icon_key": "Question"}
  ]'),

('demo', 4, 'stromspeicher',
  'Sind Sie an einem Stromspeicher interessiert?',
  '[
    {"label": "Ja",         "value": "ja",       "icon_key": "Check"},
    {"label": "Nein",       "value": "nein",     "icon_key": "Cross"},
    {"label": "Weiß nicht", "value": "unsicher", "icon_key": "Question"}
  ]'),

('demo', 5, 'kaufmiete',
  'Möchten Sie einen Angebotsvergleich zu Kauf und Miete?',
  '[
    {"label": "Ja, beides interessant",      "value": "beides",   "icon_key": "Check"},
    {"label": "Kaufen",                      "value": "kaufen",   "icon_key": "Euro"},
    {"label": "Mieten",                      "value": "mieten",   "icon_key": "Document"},
    {"label": "Weiß nicht / bitte Beratung", "value": "unsicher", "icon_key": "Question"}
  ]'),

('demo', 6, 'zeitraum',
  'Wann soll das Projekt umgesetzt werden?',
  '[
    {"label": "Umgehend",           "value": "umgehend", "icon_key": "Calendar"},
    {"label": "In 1 bis 3 Monaten", "value": "1-3",      "icon_key": "Calendar"},
    {"label": "In 3 bis 6 Monaten", "value": "3-6",      "icon_key": "Calendar"},
    {"label": "Weiß nicht",         "value": "unsicher", "icon_key": "Question"}
  ]');

-- ============================================================
-- TENANT 2 – Wärmepumpe-Demo GmbH
-- billing: flat_monthly @ 20 € / 10 Leads
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, flat_monthly_price, flat_monthly_lead_limit, is_active)
VALUES (
  'waermepumpe-demo',
  'Wärmepumpe-Demo GmbH',
  'info@waermepumpe-demo.de',
  'demo@waermepumpe-demo.de',
  'flat_monthly', 20.00, 10, TRUE
);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width)
VALUES (
  'Wärmepumpe-Demo Theme',
  'waermepumpe-demo',
  '#3b82f6', '#1f2937', '#ffffff', '#eff6ff',
  'inter', '0.75rem', '720px'
);

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle)
VALUES (
  'demo-waermepumpe',
  'waermepumpe-demo',
  'Wärmepumpe-Demo Theme',
  'waermepumpe', TRUE,
  'Jetzt kostenloses Wärmepumpen-Angebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?'
);

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, options) VALUES

('demo-waermepumpe', 1, 'gebaeudetyp',
  'Was für ein Gebäude soll beheizt werden?',
  '[
    {"label": "Neubau",             "value": "neubau",           "icon_key": "House"},
    {"label": "Altbau (saniert)",   "value": "altbau_saniert",   "icon_key": "House"},
    {"label": "Altbau (unsaniert)", "value": "altbau_unsaniert", "icon_key": "Wrench"},
    {"label": "Gewerbe",            "value": "gewerbe",          "icon_key": "Factory"}
  ]'),

('demo-waermepumpe', 2, 'beheizteflaeche',
  'Wie groß ist die zu beheizende Fläche?',
  '[
    {"label": "Bis 100 m²",   "value": "bis_100",   "icon_key": "HeatPump"},
    {"label": "100 – 200 m²", "value": "100_200",   "icon_key": "HeatPump"},
    {"label": "Über 200 m²",  "value": "ueber_200", "icon_key": "HeatPump"}
  ]'),

('demo-waermepumpe', 3, 'aktuelle_heizung',
  'Welche Heizung haben Sie aktuell?',
  '[
    {"label": "Ölheizung",     "value": "oel",           "icon_key": "Flame"},
    {"label": "Gasheizung",    "value": "gas",           "icon_key": "Flame"},
    {"label": "Nachtspeicher", "value": "nachtspeicher", "icon_key": "Lightning"},
    {"label": "Sonstiges",     "value": "sonstiges",     "icon_key": "Question"}
  ]'),

('demo-waermepumpe', 4, 'zeitraum',
  'Wann soll die Wärmepumpe installiert werden?',
  '[
    {"label": "So schnell wie möglich", "value": "umgehend", "icon_key": "Calendar"},
    {"label": "In 1 bis 3 Monaten",    "value": "1-3",      "icon_key": "Calendar"},
    {"label": "In 3 bis 6 Monaten",    "value": "3-6",      "icon_key": "Calendar"},
    {"label": "Weiß noch nicht",       "value": "unsicher", "icon_key": "Question"}
  ]');
