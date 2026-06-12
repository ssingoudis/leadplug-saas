-- =============================================================================
-- Charge 2 — Schritt 5b (Pflicht, NACH dem Veröffentlichen):
-- Demo-Mails deaktivieren — die Vorlagen-Vorschau lädt die Demo-Funnels live,
-- Vorschau-Spieler dürfen keine Mails von fiktiven Firmen bekommen.
-- (Dank Aufgabe-63-Härtung tragen die Template-Snapshots die Mails trotzdem
-- aktiv — Reihenfolge ist nicht mehr kritisch, Hygiene bleibt.)
-- =============================================================================

UPDATE email_subscriptions e SET is_active = false
FROM funnels f
WHERE f.id = e.funnel_id
  AND f.slug IN ('demo-badsanierung', 'demo-treppenlift', 'demo-umzug',
                 'demo-pflege-recruiting', 'demo-bu', 'demo-zahnimplantate');
