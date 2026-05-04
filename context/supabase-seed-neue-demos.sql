-- ============================================================
-- widget-funnel – Seed Data: Neue Demo-Funnels
-- Branchen: Solar, Badsanierung, Fenster & Türen,
--           Dachsanierung, Wallbox / Ladestation, Klimaanlage
-- Idempotent: safe to re-run
-- ============================================================

-- CLEANUP (FK-Reihenfolge: funnels → themes → tenants)
-- Hinweis: solar-demo Tenant + Theme werden NICHT gelöscht,
-- da der bestehende "demo"-Funnel ggf. darauf zeigt.
DELETE FROM funnels WHERE slug IN (
  'demo-solar', 'demo-bad', 'demo-fenster',
  'demo-dach', 'demo-wallbox', 'demo-klima'
);
DELETE FROM themes WHERE name IN (
  'Bad-Demo Theme', 'Fenster-Demo Theme', 'Dach-Demo Theme',
  'Wallbox-Demo Theme', 'Klima-Demo Theme'
);
DELETE FROM tenants WHERE slug IN (
  'bad-demo', 'fenster-demo', 'dach-demo',
  'wallbox-demo', 'klima-demo'
);


-- ============================================================
-- SOLAR  |  demo-solar  |  Farbe: Amber #f59e0b
-- Tenant + Theme: ON CONFLICT DO NOTHING (könnten existieren)
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active)
VALUES ('solar-demo', 'Solar Demo GmbH', 'info@solar-demo.de', 'demo@solar-demo.de', 'per_lead', 3.00, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width)
VALUES ('Solar-Demo Theme', 'solar-demo', '#f59e0b', '#1f2937', '#ffffff', '#fffbeb', 'inter', '0.75rem', '720px')
ON CONFLICT (name) DO NOTHING;

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle)
VALUES (
  'demo-solar', 'solar-demo', 'Solar-Demo Theme', 'solar', TRUE,
  'Jetzt kostenloses Solarangebot anfordern',
  'Angebot anfordern',
  'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
  '24 Stunden',
  'An wen soll das Angebot gesendet werden?'
);

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, question_type, options, config) VALUES

('demo-solar', 1, 'montageflaeche',
  'Worauf soll die Anlage installiert werden?',
  'single_choice',
  '[
    {"label": "Schrägdach",  "value": "schraegdach", "icon_key": "Home"},
    {"label": "Flachdach",   "value": "flachdach",   "icon_key": "Building"},
    {"label": "Freifläche",  "value": "freiflaeche", "icon_key": "Sun"},
    {"label": "Wandmontage", "value": "wand",         "icon_key": "Building2"}
  ]',
  '{}'),

('demo-solar', 2, 'gebaeudetyp',
  'Welcher Gebäudetyp?',
  'single_choice',
  '[
    {"label": "Ein-/Zweifamilienhaus", "value": "efh",       "icon_key": "Home"},
    {"label": "Mehrfamilienhaus",      "value": "mfh",       "icon_key": "Building2"},
    {"label": "Gewerbe",               "value": "gewerbe",   "icon_key": "Factory"},
    {"label": "Sonstiges",             "value": "sonstiges", "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-solar', 3, 'eigentuemer',
  'Sind Sie Eigentümer der Immobilie?',
  'single_choice',
  '[
    {"label": "Ja, Eigentümer",            "value": "eigentuemer", "icon_key": "Check"},
    {"label": "Mieter mit Einverständnis", "value": "mieter_ok",  "icon_key": "Star"},
    {"label": "Nein",                      "value": "nein",        "icon_key": "X"}
  ]',
  '{}'),

('demo-solar', 4, 'stromverbrauch',
  'Wie hoch ist Ihr jährlicher Stromverbrauch?',
  'slider',
  '[]',
  '{"min": 1000, "max": 20000, "step": 500, "unit": "kWh", "default": 4000, "openMax": true}'),

('demo-solar', 5, 'stromspeicher',
  'Möchten Sie einen Stromspeicher?',
  'single_choice',
  '[
    {"label": "Ja",                     "value": "ja",    "icon_key": "Zap"},
    {"label": "Noch nicht entschieden", "value": "offen", "icon_key": "HelpCircle"},
    {"label": "Nein",                   "value": "nein",  "icon_key": "X"}
  ]',
  '{}'),

('demo-solar', 6, 'finanzierung',
  'Wie möchten Sie die Anlage finanzieren?',
  'single_choice',
  '[
    {"label": "Kauf",                   "value": "kauf",   "icon_key": "Euro"},
    {"label": "Miete / Leasing",        "value": "miete",  "icon_key": "FileText"},
    {"label": "Beides interessant",     "value": "beides", "icon_key": "Star"},
    {"label": "Noch nicht entschieden", "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-solar', 7, 'elektrofahrzeug',
  'Haben Sie ein Elektrofahrzeug?',
  'single_choice',
  '[
    {"label": "Ja, vorhanden",    "value": "ja",      "icon_key": "Zap"},
    {"label": "Kauf geplant",     "value": "geplant", "icon_key": "Calendar"},
    {"label": "Eventuell später", "value": "spaeter", "icon_key": "Star"},
    {"label": "Nein",             "value": "nein",    "icon_key": "X"}
  ]',
  '{}'),

('demo-solar', 8, 'zeitraum',
  'Wann soll das Projekt umgesetzt werden?',
  'single_choice',
  '[
    {"label": "So schnell wie möglich", "value": "sofort", "icon_key": "Calendar"},
    {"label": "In 1–3 Monaten",         "value": "1_3",    "icon_key": "Calendar"},
    {"label": "In 3–6 Monaten",         "value": "3_6",    "icon_key": "Calendar"},
    {"label": "Noch nicht festgelegt",  "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}');


-- ============================================================
-- BADSANIERUNG  |  demo-bad  |  Farbe: Teal #14b8a6
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active) VALUES
  ('bad-demo', 'Badsanierung Demo GmbH', 'info@bad-demo.de', 'demo@bad-demo.de', 'per_lead', 3.00, TRUE);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width) VALUES
  ('Bad-Demo Theme', 'bad-demo', '#14b8a6', '#1f2937', '#ffffff', '#f0fdfa', 'inter', '0.75rem', '720px');

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle) VALUES
  ('demo-bad', 'bad-demo', 'Bad-Demo Theme', 'sanitaer', TRUE,
   'Jetzt kostenloses Angebot für Ihre Badsanierung anfordern',
   'Angebot anfordern',
   'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
   '24 Stunden',
   'An wen soll das Angebot gesendet werden?');

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, question_type, options, config) VALUES

('demo-bad', 1, 'massnahme',
  'Welche Maßnahme ist geplant?',
  'single_choice',
  '[
    {"label": "Komplett-Umbau",             "value": "komplett", "icon_key": "Star"},
    {"label": "Teilsanierung",              "value": "teil",     "icon_key": "Wrench"},
    {"label": "Einzelne Elemente ersetzen", "value": "elemente", "icon_key": "Droplets"}
  ]',
  '{}'),

('demo-bad', 2, 'groesse',
  'Wie groß ist das Badezimmer?',
  'slider',
  '[]',
  '{"min": 3, "max": 25, "step": 1, "unit": "m²", "default": 8, "openMax": true}'),

('demo-bad', 3, 'anforderungen',
  'Welche besonderen Anforderungen haben Sie?',
  'multiple_choice',
  '[
    {"label": "Bodenebene Dusche",    "value": "dusche",           "icon_key": "Droplets"},
    {"label": "Badewanne",            "value": "badewanne",        "icon_key": "Snowflake"},
    {"label": "Doppelwaschtisch",     "value": "doppelwaschtisch", "icon_key": "Building2"},
    {"label": "Barrierefreiheit",     "value": "barrierefrei",     "icon_key": "Star"},
    {"label": "Sauna / Dampfbad",     "value": "sauna",            "icon_key": "Thermometer"}
  ]',
  '{}'),

('demo-bad', 4, 'stil',
  'Welchen Stil bevorzugen Sie?',
  'single_choice',
  '[
    {"label": "Modern / Minimalistisch", "value": "modern",     "icon_key": "Star"},
    {"label": "Klassisch / Zeitlos",     "value": "klassisch",  "icon_key": "Building"},
    {"label": "Natürlich / Holz",        "value": "natuerlich", "icon_key": "Home"},
    {"label": "Industrial",              "value": "industrial", "icon_key": "Factory"}
  ]',
  '{}'),

('demo-bad', 5, 'budget',
  'Welchen Budgetrahmen haben Sie?',
  'single_choice',
  '[
    {"label": "Bis 10.000 €",          "value": "bis_10k",   "icon_key": "Euro"},
    {"label": "10.000 – 20.000 €",     "value": "10k_20k",   "icon_key": "FileText"},
    {"label": "20.000 – 40.000 €",     "value": "20k_40k",   "icon_key": "Star"},
    {"label": "Über 40.000 €",         "value": "ueber_40k", "icon_key": "Building"},
    {"label": "Noch nicht festgelegt", "value": "offen",     "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-bad', 6, 'zeitraum',
  'Wann soll die Maßnahme umgesetzt werden?',
  'single_choice',
  '[
    {"label": "So schnell wie möglich", "value": "sofort", "icon_key": "Calendar"},
    {"label": "In 1–3 Monaten",         "value": "1_3",    "icon_key": "Calendar"},
    {"label": "In 3–6 Monaten",         "value": "3_6",    "icon_key": "Calendar"},
    {"label": "Noch nicht festgelegt",  "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}');


-- ============================================================
-- FENSTER & TÜREN  |  demo-fenster  |  Farbe: Slate #475569
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active) VALUES
  ('fenster-demo', 'Fenster & Türen Demo GmbH', 'info@fenster-demo.de', 'demo@fenster-demo.de', 'per_lead', 3.00, TRUE);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width) VALUES
  ('Fenster-Demo Theme', 'fenster-demo', '#475569', '#1f2937', '#ffffff', '#f8fafc', 'inter', '0.75rem', '720px');

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle) VALUES
  ('demo-fenster', 'fenster-demo', 'Fenster-Demo Theme', 'general', TRUE,
   'Jetzt kostenloses Angebot für Ihre neuen Fenster anfordern',
   'Angebot anfordern',
   'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
   '24 Stunden',
   'An wen soll das Angebot gesendet werden?');

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, question_type, options, config) VALUES

('demo-fenster', 1, 'was_erneuern',
  'Was soll erneuert werden?',
  'single_choice',
  '[
    {"label": "Nur Fenster",       "value": "fenster", "icon_key": "Home"},
    {"label": "Nur Türen",         "value": "tueren",  "icon_key": "Building2"},
    {"label": "Fenster und Türen", "value": "beides",  "icon_key": "Building"}
  ]',
  '{}'),

('demo-fenster', 2, 'anzahl',
  'Wie viele Elemente sollen erneuert werden?',
  'single_choice',
  '[
    {"label": "1 – 3 Stück",  "value": "1_3",  "icon_key": "Home"},
    {"label": "4 – 8 Stück",  "value": "4_8",  "icon_key": "Building"},
    {"label": "9 – 15 Stück", "value": "9_15", "icon_key": "Building2"},
    {"label": "Mehr als 15",  "value": "mehr", "icon_key": "Factory"}
  ]',
  '{}'),

('demo-fenster', 3, 'material',
  'Welches Material bevorzugen Sie?',
  'single_choice',
  '[
    {"label": "Kunststoff",         "value": "kunststoff", "icon_key": "Building"},
    {"label": "Holz",               "value": "holz",       "icon_key": "Home"},
    {"label": "Holz-Aluminium",     "value": "holz_alu",   "icon_key": "Star"},
    {"label": "Aluminium",          "value": "alu",        "icon_key": "Building2"},
    {"label": "Beratung gewünscht", "value": "beratung",   "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-fenster', 4, 'grund',
  'Was ist der Hauptgrund für die Erneuerung?',
  'single_choice',
  '[
    {"label": "Wärmedämmung",            "value": "waerme",       "icon_key": "Thermometer"},
    {"label": "Schallschutz",            "value": "schall",       "icon_key": "Wind"},
    {"label": "Einbruchschutz",          "value": "einbruch",     "icon_key": "Wrench"},
    {"label": "Feuchtigkeit / Schimmel", "value": "feuchtigkeit", "icon_key": "Droplets"},
    {"label": "Optik / Modernisierung",  "value": "optik",        "icon_key": "Star"}
  ]',
  '{}'),

('demo-fenster', 5, 'gebaeudetyp',
  'Welcher Gebäudetyp?',
  'single_choice',
  '[
    {"label": "Ein-/Zweifamilienhaus", "value": "efh",     "icon_key": "Home"},
    {"label": "Mehrfamilienhaus",      "value": "mfh",     "icon_key": "Building2"},
    {"label": "Gewerbe",               "value": "gewerbe", "icon_key": "Factory"}
  ]',
  '{}'),

('demo-fenster', 6, 'zeitraum',
  'Wann soll die Maßnahme umgesetzt werden?',
  'single_choice',
  '[
    {"label": "So schnell wie möglich", "value": "sofort", "icon_key": "Calendar"},
    {"label": "In 1–3 Monaten",         "value": "1_3",    "icon_key": "Calendar"},
    {"label": "In 3–6 Monaten",         "value": "3_6",    "icon_key": "Calendar"},
    {"label": "Noch nicht festgelegt",  "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}');


-- ============================================================
-- DACHSANIERUNG  |  demo-dach  |  Farbe: Amber-Braun #b45309
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active) VALUES
  ('dach-demo', 'Dachsanierung Demo GmbH', 'info@dach-demo.de', 'demo@dach-demo.de', 'per_lead', 3.00, TRUE);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width) VALUES
  ('Dach-Demo Theme', 'dach-demo', '#b45309', '#1f2937', '#ffffff', '#fffbeb', 'inter', '0.75rem', '720px');

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle) VALUES
  ('demo-dach', 'dach-demo', 'Dach-Demo Theme', 'general', TRUE,
   'Jetzt kostenloses Angebot für Ihre Dachsanierung anfordern',
   'Angebot anfordern',
   'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
   '24 Stunden',
   'An wen soll das Angebot gesendet werden?');

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, question_type, options, config) VALUES

('demo-dach', 1, 'dachtyp',
  'Welcher Dachtyp?',
  'single_choice',
  '[
    {"label": "Satteldach", "value": "satteldach", "icon_key": "Home"},
    {"label": "Flachdach",  "value": "flachdach",  "icon_key": "Building"},
    {"label": "Walmdach",   "value": "walmdach",   "icon_key": "Building2"},
    {"label": "Pultdach",   "value": "pultdach",   "icon_key": "Factory"}
  ]',
  '{}'),

('demo-dach', 2, 'massnahme',
  'Art der Maßnahme',
  'single_choice',
  '[
    {"label": "Komplettsanierung", "value": "komplett",  "icon_key": "Star"},
    {"label": "Teilerneuerung",    "value": "teil",      "icon_key": "Wrench"},
    {"label": "Dachdämmung",       "value": "daemmung",  "icon_key": "Thermometer"},
    {"label": "Schadensreparatur", "value": "reparatur", "icon_key": "Zap"}
  ]',
  '{}'),

('demo-dach', 3, 'flaeche',
  'Wie groß ist die Dachfläche?',
  'slider',
  '[]',
  '{"min": 50, "max": 500, "step": 10, "unit": "m²", "default": 120, "openMax": true}'),

('demo-dach', 4, 'zustand',
  'Wie ist der aktuelle Zustand des Dachs?',
  'single_choice',
  '[
    {"label": "Gut (vorsorglich)",            "value": "gut",      "icon_key": "Check"},
    {"label": "Mittel (vereinzelte Schäden)", "value": "mittel",   "icon_key": "HelpCircle"},
    {"label": "Schlecht (dringend)",          "value": "schlecht", "icon_key": "Flame"}
  ]',
  '{}'),

('demo-dach', 5, 'solar_geplant',
  'Ist eine Solaranlage geplant?',
  'single_choice',
  '[
    {"label": "Ja, definitiv",  "value": "ja",              "icon_key": "Sun"},
    {"label": "Möglicherweise", "value": "moeglicherweise", "icon_key": "HelpCircle"},
    {"label": "Nein",           "value": "nein",            "icon_key": "X"}
  ]',
  '{}'),

('demo-dach', 6, 'zeitraum',
  'Wann soll die Maßnahme umgesetzt werden?',
  'single_choice',
  '[
    {"label": "So schnell wie möglich", "value": "sofort", "icon_key": "Calendar"},
    {"label": "In 1–3 Monaten",         "value": "1_3",    "icon_key": "Calendar"},
    {"label": "In 3–6 Monaten",         "value": "3_6",    "icon_key": "Calendar"},
    {"label": "Noch nicht festgelegt",  "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}');


-- ============================================================
-- WALLBOX / LADESTATION  |  demo-wallbox  |  Farbe: Sky #0ea5e9
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active) VALUES
  ('wallbox-demo', 'Wallbox Demo GmbH', 'info@wallbox-demo.de', 'demo@wallbox-demo.de', 'per_lead', 3.00, TRUE);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width) VALUES
  ('Wallbox-Demo Theme', 'wallbox-demo', '#0ea5e9', '#1f2937', '#ffffff', '#f0f9ff', 'inter', '0.75rem', '720px');

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle) VALUES
  ('demo-wallbox', 'wallbox-demo', 'Wallbox-Demo Theme', 'elektro', TRUE,
   'Jetzt kostenloses Angebot für Ihre Ladestation anfordern',
   'Angebot anfordern',
   'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
   '24 Stunden',
   'An wen soll das Angebot gesendet werden?');

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, question_type, options, config) VALUES

('demo-wallbox', 1, 'fahrzeug',
  'Welche Fahrzeugsituation trifft zu?',
  'single_choice',
  '[
    {"label": "Elektrofahrzeug vorhanden", "value": "bev",     "icon_key": "Zap"},
    {"label": "Hybridfahrzeug vorhanden",  "value": "phev",    "icon_key": "Flame"},
    {"label": "Anschaffung geplant",       "value": "geplant", "icon_key": "Calendar"},
    {"label": "Noch nicht entschieden",    "value": "offen",   "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-wallbox', 2, 'einbauort',
  'Wo soll die Wallbox installiert werden?',
  'single_choice',
  '[
    {"label": "Garage",          "value": "garage",     "icon_key": "Home"},
    {"label": "Carport",         "value": "carport",    "icon_key": "Sun"},
    {"label": "Außenstellplatz", "value": "aussen",     "icon_key": "Building"},
    {"label": "Tiefgarage",      "value": "tiefgarage", "icon_key": "Building2"}
  ]',
  '{}'),

('demo-wallbox', 3, 'ladeleistung',
  'Welche Ladeleistung wird benötigt?',
  'single_choice',
  '[
    {"label": "3,7 kW (Basis)",     "value": "3_7",      "icon_key": "Thermometer"},
    {"label": "11 kW (Standard)",   "value": "11",       "icon_key": "Zap"},
    {"label": "22 kW (Profi)",      "value": "22",       "icon_key": "Flame"},
    {"label": "Beratung gewünscht", "value": "beratung", "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-wallbox', 4, 'pv_anlage',
  'Ist eine Photovoltaikanlage vorhanden?',
  'single_choice',
  '[
    {"label": "Ja, vorhanden",        "value": "ja",      "icon_key": "Sun"},
    {"label": "Nein",                 "value": "nein",    "icon_key": "X"},
    {"label": "Installation geplant", "value": "geplant", "icon_key": "Calendar"}
  ]',
  '{}'),

('demo-wallbox', 5, 'eigentuemer',
  'Sind Sie Eigentümer der Immobilie?',
  'single_choice',
  '[
    {"label": "Ja, Eigentümer",            "value": "eigentuemer", "icon_key": "Check"},
    {"label": "Mieter mit Einverständnis", "value": "mieter_ok",  "icon_key": "Star"},
    {"label": "Noch nicht geklärt",        "value": "offen",      "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-wallbox', 6, 'zeitraum',
  'Wann soll die Installation erfolgen?',
  'single_choice',
  '[
    {"label": "So schnell wie möglich", "value": "sofort", "icon_key": "Calendar"},
    {"label": "In 1–3 Monaten",         "value": "1_3",    "icon_key": "Calendar"},
    {"label": "In 3–6 Monaten",         "value": "3_6",    "icon_key": "Calendar"},
    {"label": "Noch nicht festgelegt",  "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}');


-- ============================================================
-- KLIMAANLAGE  |  demo-klima  |  Farbe: Cyan #06b6d4
-- ============================================================
INSERT INTO tenants (slug, company_name, public_email, notification_email, billing_model, lead_price_base, is_active) VALUES
  ('klima-demo', 'Klimaanlage Demo GmbH', 'info@klima-demo.de', 'demo@klima-demo.de', 'per_lead', 3.00, TRUE);

INSERT INTO themes (name, tenant_slug, primary_color, text_color, background_color, page_background_color, font, border_radius, max_width) VALUES
  ('Klima-Demo Theme', 'klima-demo', '#06b6d4', '#1f2937', '#ffffff', '#ecfeff', 'inter', '0.75rem', '720px');

INSERT INTO funnels (slug, tenant_slug, theme_name, industry, is_active, funnel_title, submit_button_label, success_message, response_time_text, contact_form_subtitle) VALUES
  ('demo-klima', 'klima-demo', 'Klima-Demo Theme', 'heizung', TRUE,
   'Jetzt kostenloses Angebot für Ihre Klimaanlage anfordern',
   'Angebot anfordern',
   'Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.',
   '24 Stunden',
   'An wen soll das Angebot gesendet werden?');

INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, title, question_type, options, config) VALUES

('demo-klima', 1, 'verwendungszweck',
  'Wofür soll die Anlage genutzt werden?',
  'single_choice',
  '[
    {"label": "Kühlen",                "value": "kuehlen", "icon_key": "Snowflake"},
    {"label": "Kühlen und Heizen",     "value": "beides",  "icon_key": "Thermometer"},
    {"label": "Ausschließlich Heizen", "value": "heizen",  "icon_key": "Flame"}
  ]',
  '{}'),

('demo-klima', 2, 'raumanzahl',
  'Wie viele Räume sollen klimatisiert werden?',
  'single_choice',
  '[
    {"label": "1 Raum",             "value": "1",      "icon_key": "Home"},
    {"label": "2 – 3 Räume",       "value": "2_3",    "icon_key": "Building"},
    {"label": "4 oder mehr Räume", "value": "4_plus", "icon_key": "Building2"}
  ]',
  '{}'),

('demo-klima', 3, 'raumgroesse',
  'Wie groß ist der größte Raum?',
  'slider',
  '[]',
  '{"min": 10, "max": 80, "step": 5, "unit": "m²", "default": 25}'),

('demo-klima', 4, 'wanddurchbruch',
  'Ist ein Wanddurchbruch möglich?',
  'single_choice',
  '[
    {"label": "Ja, Eigentum",               "value": "ja",       "icon_key": "Check"},
    {"label": "Mietobjekt mit Genehmigung", "value": "miete_ok", "icon_key": "Star"},
    {"label": "Noch nicht geklärt",         "value": "offen",    "icon_key": "HelpCircle"}
  ]',
  '{}'),

('demo-klima', 5, 'zeitraum',
  'Wann soll die Anlage installiert werden?',
  'single_choice',
  '[
    {"label": "So schnell wie möglich", "value": "sofort", "icon_key": "Calendar"},
    {"label": "In 1–3 Monaten",         "value": "1_3",    "icon_key": "Calendar"},
    {"label": "In 3–6 Monaten",         "value": "3_6",    "icon_key": "Calendar"},
    {"label": "Noch nicht festgelegt",  "value": "offen",  "icon_key": "HelpCircle"}
  ]',
  '{}');
