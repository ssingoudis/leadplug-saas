-- ============================================================================
-- DOWN-Migration für Aufgabe 41 — email_subscriptions + email_delivery_attempts
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS public.email_delivery_attempts CASCADE;
DROP TABLE IF EXISTS public.email_subscriptions CASCADE;

COMMIT;
