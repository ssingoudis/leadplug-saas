-- =============================================================================
-- Charge 6 — Schritt 5: Demo-Funnels als Vorlagen veröffentlichen.
-- VORAUSSETZUNG: Migration aufgabe_63_snapshot_mails_active + Code-Deploy.
-- sort_order: Charge 5 endet bei 330 → 340–380. Keine neuen Kategorien.
-- =============================================================================

SELECT snapshot_funnel_to_template(
  'demo-wintergarten', 'wintergarten', 'Wintergarten & Terrassendach',
  'Qualifiziert Anbau-Projekte nach Bauart, Größe und Fundament — Mieter und Beratungs-Fälle springen direkt zur Kontaktaufnahme.',
  'Handwerk', 340);

SELECT snapshot_funnel_to_template(
  'demo-gebaeudereinigung', 'gebaeudereinigung', 'Gebäudereinigung (B2B)',
  'B2B-Angebots-Funnel mit Leistungs-, Objekt- und Intervall-Fragen — Großobjekte ab 5.000 m² gehen direkt in die Besichtigung.',
  'Dienstleistung', 350);

SELECT snapshot_funnel_to_template(
  'demo-privatkredit', 'privatkredit', 'Privatkredit & Umschuldung',
  'Kreditanfrage-Funnel mit Verwendungszweck, Summen-Slider und Bonitäts-Fragen — Selbstständige und Sonderfälle gehen in die persönliche Beratung.',
  'Finanzen', 360);

SELECT snapshot_funnel_to_template(
  'demo-bestattungsvorsorge', 'bestattungsvorsorge', 'Bestattungsvorsorge',
  'Würdevoller Vorsorge-Funnel mit Bestattungsart- und Treuhand-Fragen — akute Trauerfälle gehen sofort in die persönliche Begleitung.',
  'Dienstleistung', 370);

SELECT snapshot_funnel_to_template(
  'demo-schaedlingsbekaempfung', 'schaedlingsbekaempfung', 'Schädlingsbekämpfung',
  'Soforthilfe-Funnel mit Schädlings-, Objekt- und Dringlichkeits-Fragen — Notfälle und HACCP-Betriebe springen direkt zur Kontaktaufnahme.',
  'Dienstleistung', 380);
