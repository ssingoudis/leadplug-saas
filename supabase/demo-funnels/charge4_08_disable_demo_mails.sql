-- =============================================================================
-- Charge 4 — Schritt 5b (Pflicht, NACH dem Veröffentlichen): Demo-Mails aus.
-- =============================================================================

UPDATE email_subscriptions e SET is_active = false
FROM funnels f
WHERE f.id = e.funnel_id
  AND f.slug IN ('demo-galabau', 'demo-mpu', 'demo-steuerberater',
                 'demo-kfz-versicherung', 'demo-personal-training', 'demo-nachhilfe');
