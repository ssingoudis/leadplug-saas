-- ============================================================================
-- DOWN für Aufgabe 28a — Phase 1 Rollback.
--
-- ACHTUNG: Backfills lassen sich nicht rückgängig machen ohne Daten-Verlust.
-- Falls Daten-Rollback nötig: aus tägliches Supabase-Auto-Backup restoren.
-- Diese DOWN-Migration stellt nur die Constraints wieder her.
--
-- Voraussetzung für sauberen Rollback: NOT NULL auf tenants.{notification_email,
-- public_email} kann nur wieder gesetzt werden, wenn keine Zeile diese Felder
-- NULL hat. Falls App-Code in der Zwischenzeit Tenants ohne diese Felder
-- angelegt hat, würden die Statements failen — dann erst Backfill nötig.
-- ============================================================================

BEGIN;

-- 1. NOT-NULL auf funnels.notification_email droppen.
ALTER TABLE public.funnels ALTER COLUMN notification_email DROP NOT NULL;

-- 2. NOT-NULL auf tenants.notification_email + public_email wieder setzen.
--    Erstmal mit Backfill aus erstem tenant_members-User (best-effort).
UPDATE public.tenants t
SET notification_email = COALESCE(t.notification_email, (
  SELECT u.email FROM auth.users u
  JOIN public.tenant_members tm ON tm.auth_user_id = u.id
  WHERE tm.tenant_id = t.id ORDER BY tm.created_at LIMIT 1
))
WHERE t.notification_email IS NULL;

UPDATE public.tenants t
SET public_email = COALESCE(t.public_email, (
  SELECT u.email FROM auth.users u
  JOIN public.tenant_members tm ON tm.auth_user_id = u.id
  WHERE tm.tenant_id = t.id ORDER BY tm.created_at LIMIT 1
))
WHERE t.public_email IS NULL;

ALTER TABLE public.tenants ALTER COLUMN notification_email SET NOT NULL;
ALTER TABLE public.tenants ALTER COLUMN public_email SET NOT NULL;

COMMIT;
