-- ============================================================================
-- DOWN für Aufgabe 29 — Webhook-Schema entfernen.
--
-- Sicher anwendbar solange keine Subscriptions/Delivery-Attempts in den Tabellen
-- stehen. Bei vorhandenen Daten: erst DELETE FROM webhook_delivery_attempts;
-- DELETE FROM webhook_subscriptions; — dann diese Migration.
--
-- Reihenfolge: erst delivery_attempts (hat FK auf subscriptions), dann subscriptions.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.webhook_delivery_attempts;
DROP TABLE IF EXISTS public.webhook_subscriptions;

COMMIT;
