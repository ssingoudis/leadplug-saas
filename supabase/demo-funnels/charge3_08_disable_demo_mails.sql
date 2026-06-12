-- =============================================================================
-- Charge 3 — Schritt 5b (Pflicht, NACH dem Veröffentlichen):
-- Demo-Mails deaktivieren — Vorschau-Spieler dürfen keine Mails von fiktiven
-- Firmen bekommen. (Snapshots tragen die Mails dank Aufgabe-63-Härtung
-- trotzdem aktiv.)
-- =============================================================================

UPDATE email_subscriptions e SET is_active = false
FROM funnels f
WHERE f.id = e.funnel_id
  AND f.slug IN ('demo-dachsanierung', 'demo-fenster', 'demo-haartransplantation',
                 'demo-hoergeraete', 'demo-betreuung', 'demo-kueche');
