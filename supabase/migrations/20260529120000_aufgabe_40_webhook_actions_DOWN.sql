-- DOWN-Migration für Aufgabe 40 (Webhook-Actions).
-- Rollt alle additiven Schema-Änderungen zurück. Geht nur sauber wenn:
--   • Keine Code-Pfade mehr aktiv die die neuen Spalten erwarten
--   • Vorzugsweise auch keine produktiven webhook_subscriptions-Rows
--
-- Wird nur im Notfall ausgeführt. Standard-Pfad ist Forward-Migration.

BEGIN;

-- submissions
DROP INDEX IF EXISTS public.idx_submissions_abandoned_pending;
ALTER TABLE public.submissions
  DROP COLUMN IF EXISTS abandoned_webhook_fired_at;

-- webhook_delivery_attempts
DROP INDEX IF EXISTS public.idx_webhook_delivery_retry_due;
ALTER TABLE public.webhook_delivery_attempts
  DROP COLUMN IF EXISTS event_type,
  DROP COLUMN IF EXISTS response_body,
  DROP COLUMN IF EXISTS response_status_code,
  DROP COLUMN IF EXISTS next_retry_at;

-- webhook_subscriptions
DROP INDEX IF EXISTS public.idx_webhook_subscriptions_trigger_page;
DROP INDEX IF EXISTS public.idx_webhook_subscriptions_funnel_id;
ALTER TABLE public.webhook_subscriptions
  DROP CONSTRAINT IF EXISTS webhook_subscriptions_trigger_type_check;
ALTER TABLE public.webhook_subscriptions
  DROP COLUMN IF EXISTS trigger_page_id,
  DROP COLUMN IF EXISTS trigger_type,
  DROP COLUMN IF EXISTS funnel_id;

COMMIT;
