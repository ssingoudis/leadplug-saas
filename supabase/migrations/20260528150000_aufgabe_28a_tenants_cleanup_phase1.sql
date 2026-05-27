-- ============================================================================
-- Aufgabe 28 (Phase B.4) — tenants als reine Agentur-Account-Tabelle
-- Phase 1 (ADD/MODIFY only, zero-downtime): Backfills + Constraints.
--
-- Strategie wie Aufgabe 26:
--   Phase 1 (28a, dieses File): Backfill + funnels.notification_email NOT NULL
--                               + tenants.{notification_email,public_email} DROP NOT NULL
--   --> Vercel-Deploy mit refactored Code <--
--   Phase 2 (28b): DROP tenants.{notification_email, public_email, public_phone, address}
--
-- DOWN-Migration: siehe 20260528150000_aufgabe_28a_tenants_cleanup_phase1_DOWN.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Backfill funnels.notification_email aus tenants.notification_email
--    (wo Funnel-Wert leer/NULL ist)
--    Aktuell: 11 von 12 funnels haben leere notification_email; tenants haben sie alle.
-- ----------------------------------------------------------------------------
UPDATE public.funnels f
SET notification_email = t.notification_email
FROM public.tenants t
WHERE f.tenant_id = t.id
  AND (f.notification_email IS NULL OR f.notification_email = '');

-- ----------------------------------------------------------------------------
-- 2. Backfill funnels.footer_company_name aus tenants.company_name
--    (Funnel-Footer-Display soll nach Drop nicht brechen)
-- ----------------------------------------------------------------------------
UPDATE public.funnels f
SET footer_company_name = t.company_name
FROM public.tenants t
WHERE f.tenant_id = t.id
  AND (f.footer_company_name IS NULL OR f.footer_company_name = '')
  AND t.company_name IS NOT NULL
  AND t.company_name <> '';

-- ----------------------------------------------------------------------------
-- 3. Backfill funnels.footer_email aus tenants.public_email
-- ----------------------------------------------------------------------------
UPDATE public.funnels f
SET footer_email = t.public_email
FROM public.tenants t
WHERE f.tenant_id = t.id
  AND (f.footer_email IS NULL OR f.footer_email = '')
  AND t.public_email IS NOT NULL
  AND t.public_email <> '';

-- ----------------------------------------------------------------------------
-- 4. Backfill funnels.footer_phone aus tenants.public_phone
--    (public_phone ist nullable — nur backfillen wenn gesetzt)
-- ----------------------------------------------------------------------------
UPDATE public.funnels f
SET footer_phone = t.public_phone
FROM public.tenants t
WHERE f.tenant_id = t.id
  AND (f.footer_phone IS NULL OR f.footer_phone = '')
  AND t.public_phone IS NOT NULL
  AND t.public_phone <> '';

-- ----------------------------------------------------------------------------
-- 5. Verify: keine NULL/empty notification_email in funnels (bricht Phase 6 sonst).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM public.funnels
  WHERE notification_email IS NULL OR notification_email = '';
  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % funnels still have empty notification_email', missing_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. NOT-NULL Constraint auf funnels.notification_email
--    Bei 12 Zeilen ist der Full-Table-Scan zur Validierung trivial.
-- ----------------------------------------------------------------------------
ALTER TABLE public.funnels ALTER COLUMN notification_email SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. NOT-NULL Constraint auf tenants.notification_email + public_email droppen.
--    Begründung: Neuer App-Code (nach Vercel-Deploy) schreibt diese Spalten
--    nicht mehr. Solange Phase 2 (DROP) noch nicht gelaufen ist, müssen Inserts
--    in tenants (z.B. Auto-Anlage in app/dashboard/layout.tsx) ohne diese
--    Felder funktionieren.
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants ALTER COLUMN notification_email DROP NOT NULL;
ALTER TABLE public.tenants ALTER COLUMN public_email DROP NOT NULL;

COMMIT;
