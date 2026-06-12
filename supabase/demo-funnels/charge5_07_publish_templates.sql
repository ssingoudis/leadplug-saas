-- =============================================================================
-- Charge 5 — Schritt 5: Demo-Funnels als Vorlagen veröffentlichen.
-- VORAUSSETZUNG: Migration aufgabe_63_snapshot_mails_active + Code-Deploy.
-- sort_order: Charge 4 endet bei 270 → 280–330.
-- =============================================================================

SELECT snapshot_funnel_to_template(
  'demo-scheidung', 'scheidung-familienrecht', 'Scheidung & Familienrecht',
  'Erstberatungs-Funnel mit Einvernehmlichkeits-, Trennungsjahr- und Kinder-Fragen — bereits eingereichte Scheidungen gehen sofort in die Vertretung.',
  'Recht', 280);

SELECT snapshot_funnel_to_template(
  'demo-webdesign', 'webdesign', 'Webdesign-Erstgespräch',
  'Projektanfrage-Funnel mit Projektart, Zweck, Umfang und Budget-Slider — Großprojekte gehen direkt ins Konzeptgespräch.',
  'Dienstleistung', 290);

SELECT snapshot_funnel_to_template(
  'demo-fertighaus', 'fertighaus', 'Fertighaus & Hausbau',
  'Bauinteressenten-Funnel mit Grundstücks-, Haustyp- und Budget-Fragen — „erst informieren" wird zur schlanken Kataloganfrage.',
  'Handwerk', 300);

SELECT snapshot_funnel_to_template(
  'demo-augenlasern', 'augenlasern', 'Augenlasern',
  'Eignungs-Check-Funnel mit Fehlsichtigkeits-, Alters- und Stabilitäts-Fragen — Ü50 und instabile Sehstärke gehen in die ärztliche Beratung.',
  'Gesundheit', 310);

SELECT snapshot_funnel_to_template(
  'demo-entruempelung', 'entruempelung', 'Entrümpelung & Haushaltsauflösung',
  'Festpreis-Angebots-Funnel mit Objekt-, Flächen- und Füllgrad-Fragen — Express-Räumungen springen direkt zur Kontaktaufnahme.',
  'Dienstleistung', 320);

SELECT snapshot_funnel_to_template(
  'demo-alarmanlage', 'alarmanlage', 'Alarmanlagen & Sicherheitstechnik',
  'Sicherheits-Funnel mit Objekt-, Schutzziel- und Anlass-Fragen — nach einem Einbruch geht es sofort zur Kontaktaufnahme.',
  'Handwerk', 330);
