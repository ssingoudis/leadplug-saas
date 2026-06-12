-- =============================================================================
-- Charge 4 — Schritt 5: Demo-Funnels als Vorlagen veröffentlichen.
-- VORAUSSETZUNG: Migration aufgabe_63_snapshot_mails_active + Code-Deploy
-- (CATEGORY_ICONS enthält Bildung). sort_order: Charge 3 endet bei 210 → 220–270.
-- =============================================================================

SELECT snapshot_funnel_to_template(
  'demo-galabau', 'gartenbau', 'Garten- & Landschaftsbau',
  'Qualifiziert Gartenprojekt-Anfragen nach Leistung, Fläche und Zeitrahmen — Mieter und Pflege-Daueraufträge nehmen Abkürzungen.',
  'Handwerk', 220);

SELECT snapshot_funnel_to_template(
  'demo-mpu', 'mpu-beratung', 'MPU-Beratung',
  'Qualifiziert MPU-Kandidaten nach Anlass, Abstinenz-Status und Termin — Punkte-Fälle überspringen die Abstinenz-Frage, Termindruck geht direkt ins Gespräch.',
  'Dienstleistung', 230);

SELECT snapshot_funnel_to_template(
  'demo-steuerberater', 'steuerberater', 'Steuerberater-Mandantenanfrage',
  'Qualifiziert Mandanten nach Rechtsform, Größe und Leistungsbedarf — Privatpersonen überspringen die Unternehmens-Fragen.',
  'Dienstleistung', 240);

SELECT snapshot_funnel_to_template(
  'demo-kfz-versicherung', 'kfz-versicherung', 'KFZ-Versicherungswechsel',
  'Saisonaler Wechsel-Funnel mit SF-Klasse, Fahrleistung und Schutzumfang — Fahranfänger überspringen die SF-Frage, Sonderfahrzeuge gehen in die Beratung.',
  'Finanzen', 250);

SELECT snapshot_funnel_to_template(
  'demo-personal-training', 'personal-training', 'Personal-Training',
  'Probetraining-Funnel mit Ziel-, Erfahrungs- und Frequenz-Fragen — gesundheitliche Einschränkungen gehen direkt in die persönliche Anamnese. Per Du.',
  'Coaching', 260);

SELECT snapshot_funnel_to_template(
  'demo-nachhilfe', 'nachhilfe', 'Nachhilfe-Institut',
  'Probestunden-Funnel für Eltern mit Fach-, Klassen- und Ziel-Fragen — Prüfungsvorbereitung geht direkt in die telefonische Planung.',
  'Bildung', 270);
