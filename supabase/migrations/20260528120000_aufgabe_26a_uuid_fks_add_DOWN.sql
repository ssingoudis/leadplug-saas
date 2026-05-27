-- =============================================================================
-- DOWN für Aufgabe 26 — Migration 1/2 (ADD-only)
-- =============================================================================
-- Macht Phase-1-Migration komplett rückgängig.
-- Da nichts gedroppt wurde, ist der Rollback verlustfrei.

BEGIN;

-- 1) Neue Policies droppen
DROP POLICY IF EXISTS funnels_v2_select          ON public.funnels;
DROP POLICY IF EXISTS funnels_v2_insert          ON public.funnels;
DROP POLICY IF EXISTS funnels_v2_update          ON public.funnels;
DROP POLICY IF EXISTS funnels_v2_delete          ON public.funnels;
DROP POLICY IF EXISTS funnel_questions_v2_select ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_v2_insert ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_v2_update ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_v2_delete ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_view_logs_v2_select ON public.funnel_view_logs;
DROP POLICY IF EXISTS funnel_view_logs_v2_delete ON public.funnel_view_logs;
DROP POLICY IF EXISTS submissions_v2_select      ON public.submissions;
DROP POLICY IF EXISTS submissions_v2_update      ON public.submissions;
DROP POLICY IF EXISTS submissions_v2_delete      ON public.submissions;

-- 2) Triggers droppen
DROP TRIGGER IF EXISTS sync_funnels_tenant_id_trg          ON public.funnels;
DROP TRIGGER IF EXISTS sync_funnel_questions_funnel_id_trg ON public.funnel_questions;
DROP TRIGGER IF EXISTS sync_funnel_view_logs_ids_trg       ON public.funnel_view_logs;
DROP TRIGGER IF EXISTS sync_submissions_tenant_id_trg      ON public.submissions;

DROP FUNCTION IF EXISTS public.sync_funnels_tenant_id();
DROP FUNCTION IF EXISTS public.sync_funnel_questions_funnel_id();
DROP FUNCTION IF EXISTS public.sync_funnel_view_logs_ids();
DROP FUNCTION IF EXISTS public.sync_submissions_tenant_id();

-- 3) Neue Indices droppen
DROP INDEX IF EXISTS public.idx_funnels_tenant_id;
DROP INDEX IF EXISTS public.idx_funnel_questions_funnel_id;
DROP INDEX IF EXISTS public.idx_funnel_view_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_funnel_view_logs_funnel_id;
DROP INDEX IF EXISTS public.idx_submissions_tenant_id;
DROP INDEX IF EXISTS public.funnel_questions_funnel_id_question_key_key;

-- 4) NOT NULL auf Slug-Spalten wiederherstellen
--    (geht nur wenn keine NULL-Werte vorhanden — neue Inserts seit Phase 1
--    sind via Trigger befüllt UND App schreibt noch Slugs, also alles OK)
ALTER TABLE public.funnels          ALTER COLUMN tenant_slug SET NOT NULL;
ALTER TABLE public.funnel_questions ALTER COLUMN funnel_slug SET NOT NULL;
ALTER TABLE public.funnel_view_logs ALTER COLUMN funnel_slug SET NOT NULL,
                                     ALTER COLUMN tenant_slug SET NOT NULL;
ALTER TABLE public.tenants          ALTER COLUMN slug SET NOT NULL;

-- 5) Neue UUID-Spalten droppen
ALTER TABLE public.funnels          DROP COLUMN tenant_id;
ALTER TABLE public.funnel_questions DROP COLUMN funnel_id;
ALTER TABLE public.funnel_view_logs DROP COLUMN funnel_id, DROP COLUMN tenant_id;
ALTER TABLE public.submissions      DROP COLUMN tenant_id;

COMMIT;
