-- =============================================================================
-- Charge 5 — Schritt 5b (Pflicht, NACH dem Veröffentlichen): Demo-Mails aus.
-- =============================================================================

UPDATE email_subscriptions e SET is_active = false
FROM funnels f
WHERE f.id = e.funnel_id
  AND f.slug IN ('demo-scheidung', 'demo-webdesign', 'demo-fertighaus',
                 'demo-augenlasern', 'demo-entruempelung', 'demo-alarmanlage');
