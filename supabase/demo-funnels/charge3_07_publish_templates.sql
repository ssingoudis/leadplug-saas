-- =============================================================================
-- Charge 3 — Schritt 5: Demo-Funnels als Vorlagen veröffentlichen.
--
-- VORAUSSETZUNG: Migration aufgabe_63_snapshot_mails_active angewendet +
-- Branch feature/aufgabe-63-vorlagen-charge2 deployed (CATEGORY_ICONS enthält
-- Handwerk/Dienstleistung/Gesundheit/Pflege).
-- sort_order: Charge 2 endet bei 150 → weiter mit 160–210.
-- =============================================================================

SELECT snapshot_funnel_to_template(
  'demo-dachsanierung', 'dachsanierung', 'Dachsanierung',
  'Qualifiziert Dachsanierungs-Anfragen nach Leistung, Dachform und Fläche — Mieter und kleine Reparaturen nehmen Abkürzungen.',
  'Handwerk', 160);

SELECT snapshot_funnel_to_template(
  'demo-fenster', 'fenster', 'Fenstertausch',
  'Qualifiziert Fenster-Anfragen nach Anzahl, Material und Anlass — Großprojekte ab 10 Fenstern gehen direkt in die persönliche Planung.',
  'Handwerk', 170);

SELECT snapshot_funnel_to_template(
  'demo-haartransplantation', 'haartransplantation', 'Haartransplantation',
  'Qualifiziert Interessenten nach Bereich, Verlauf und Alter — unter 25 geht es direkt in die ärztliche Beratung.',
  'Gesundheit', 180);

SELECT snapshot_funnel_to_template(
  'demo-hoergeraete', 'hoergeraete', 'Hörgeräte-Beratung',
  'Qualifiziert Hörgeräte-Interessenten nach Hörsituationen, HNO-Status und Versicherung — Folgeversorgungen überspringen die HNO-Strecke.',
  'Gesundheit', 190);

SELECT snapshot_funnel_to_template(
  'demo-betreuung', '24h-betreuung', '24-Stunden-Betreuung',
  'Beratungs-Funnel für Angehörige mit Umfang-, Zimmer- und Pflegegrad-Frage — dringende Fälle springen direkt zur Kontaktaufnahme.',
  'Pflege', 200);

SELECT snapshot_funnel_to_template(
  'demo-kueche', 'kuechenplanung', 'Küchenplanung',
  'Qualifiziert Küchen-Interessenten nach Anlass, Form und Budget — Premium-Projekte gehen direkt zum persönlichen Planer.',
  'Handwerk', 210);
