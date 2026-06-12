-- =============================================================================
-- Charge 2 — Schritt 5: Demo-Funnels als Vorlagen veröffentlichen.
--
-- VORAUSSETZUNG: Migration aufgabe_63_snapshot_mails_active ist angewendet
-- (Mails werden dann IMMER aktiv in die Definition geschrieben — die
-- Republish-Falle aus dem Kochbuch entfällt).
--
-- Kategorien: Handwerk + Dienstleistung + Gesundheit sind NEU →
-- CATEGORY_ICONS in components/dashboard/TemplateShowcase.tsx ist im
-- Branch feature/aufgabe-63-vorlagen-charge2 bereits ergänzt
-- (Wrench / Briefcase / HeartPulse). Erst Code deployen, dann veröffentlichen —
-- sonst zeigt die Galerie das Sparkles-Fallback-Icon (kein Fehler, nur unschön).
--
-- sort_order: bestehende Vorlagen enden bei 90 → weiter mit 100–150.
-- =============================================================================

SELECT snapshot_funnel_to_template(
  'demo-badsanierung', 'badsanierung', 'Badsanierung',
  'Qualifiziert Badsanierungs-Anfragen nach Eigentum, Umfang und Zeitrahmen — mit Pflegegrad-Strecke für den barrierefreien Umbau.',
  'Handwerk', 100);

SELECT snapshot_funnel_to_template(
  'demo-treppenlift', 'treppenlift', 'Treppenlift',
  'Qualifiziert Treppenlift-Anfragen nach Treppenform, Etagen und Pflegegrad — dringende Fälle springen direkt zur Kontaktaufnahme.',
  'Handwerk', 110);

SELECT snapshot_funnel_to_template(
  'demo-umzug', 'umzug', 'Umzugsunternehmen',
  'Erfasst Umzugsanfragen mit Route, Wohnfläche, Termin und Zusatzleistungen — Firmenumzüge gehen direkt in die persönliche Planung.',
  'Dienstleistung', 120);

SELECT snapshot_funnel_to_template(
  'demo-pflege-recruiting', 'pflege-recruiting', 'Pflege-Recruiting',
  'Bewerber-Funnel für Pflegekräfte mit Qualifikations- und Schicht-Filter — Quereinsteiger überspringen die Erfahrungs-Frage. Per Du.',
  'Recruiting', 130);

SELECT snapshot_funnel_to_template(
  'demo-bu', 'bu-versicherung', 'BU-Versicherung',
  'Qualifiziert BU-Interessenten nach Beruf, Alter, Raucherstatus und Wunschrente — Vorerkrankungen und Ü50 gehen direkt in die Beratung.',
  'Finanzen', 140);

SELECT snapshot_funnel_to_template(
  'demo-zahnimplantate', 'zahnimplantate', 'Zahnimplantate',
  'Qualifiziert Implantat-Patienten nach Umfang, Bestandsdauer und Versicherung — Komplettversorgungen springen direkt zum Beratungstermin.',
  'Gesundheit', 150);
