-- =============================================================================
-- Aufgabe 26 — Phase B.2 — Migration 2/2 (DROP-only)
-- =============================================================================
-- VORAUSSETZUNG: Migration 1/2 ist appliziert UND der App-Code-Refactor ist
-- deployed + verifiziert (Smoke-Test grün). Erst dann diese Migration anwenden.
--
-- Diese Migration räumt auf:
--   - Alte slug-basierte RLS-Policies droppen
--   - Sync-Trigger droppen (App schreibt UUIDs direkt)
--   - Alte FK-Constraints + Slug-Indices droppen
--   - Alte Slug-Spalten droppen (außer submissions — Snapshot bleibt)
--   - tenants.slug + tenants.auth_user_id droppen
--
-- Nach dieser Migration ist B.2 vollständig.

BEGIN;

-- ===========================================================================
-- 1) Alte (v1) RLS-Policies droppen — v2-Policies bleiben aktiv
-- ===========================================================================

DROP POLICY IF EXISTS funnels_select          ON public.funnels;
DROP POLICY IF EXISTS funnels_insert          ON public.funnels;
DROP POLICY IF EXISTS funnels_update          ON public.funnels;
DROP POLICY IF EXISTS funnels_delete          ON public.funnels;

DROP POLICY IF EXISTS funnel_questions_select ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_insert ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_update ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_delete ON public.funnel_questions;

DROP POLICY IF EXISTS funnel_view_logs_select ON public.funnel_view_logs;
DROP POLICY IF EXISTS funnel_view_logs_delete ON public.funnel_view_logs;

DROP POLICY IF EXISTS submissions_select ON public.submissions;
DROP POLICY IF EXISTS submissions_update ON public.submissions;
DROP POLICY IF EXISTS submissions_delete ON public.submissions;

-- v2-Policies umbenennen auf endgültige Namen (ohne _v2-Suffix)
ALTER POLICY funnels_v2_select          ON public.funnels          RENAME TO funnels_select;
ALTER POLICY funnels_v2_insert          ON public.funnels          RENAME TO funnels_insert;
ALTER POLICY funnels_v2_update          ON public.funnels          RENAME TO funnels_update;
ALTER POLICY funnels_v2_delete          ON public.funnels          RENAME TO funnels_delete;
ALTER POLICY funnel_questions_v2_select ON public.funnel_questions RENAME TO funnel_questions_select;
ALTER POLICY funnel_questions_v2_insert ON public.funnel_questions RENAME TO funnel_questions_insert;
ALTER POLICY funnel_questions_v2_update ON public.funnel_questions RENAME TO funnel_questions_update;
ALTER POLICY funnel_questions_v2_delete ON public.funnel_questions RENAME TO funnel_questions_delete;
ALTER POLICY funnel_view_logs_v2_select ON public.funnel_view_logs RENAME TO funnel_view_logs_select;
ALTER POLICY funnel_view_logs_v2_delete ON public.funnel_view_logs RENAME TO funnel_view_logs_delete;
ALTER POLICY submissions_v2_select      ON public.submissions      RENAME TO submissions_select;
ALTER POLICY submissions_v2_update      ON public.submissions      RENAME TO submissions_update;
ALTER POLICY submissions_v2_delete      ON public.submissions      RENAME TO submissions_delete;

-- ===========================================================================
-- 2) Sync-Trigger droppen (App schreibt UUIDs direkt)
-- ===========================================================================

DROP TRIGGER IF EXISTS sync_funnels_tenant_id_trg          ON public.funnels;
DROP TRIGGER IF EXISTS sync_funnel_questions_funnel_id_trg ON public.funnel_questions;
DROP TRIGGER IF EXISTS sync_funnel_view_logs_ids_trg       ON public.funnel_view_logs;
DROP TRIGGER IF EXISTS sync_submissions_tenant_id_trg      ON public.submissions;

DROP FUNCTION IF EXISTS public.sync_funnels_tenant_id();
DROP FUNCTION IF EXISTS public.sync_funnel_questions_funnel_id();
DROP FUNCTION IF EXISTS public.sync_funnel_view_logs_ids();
DROP FUNCTION IF EXISTS public.sync_submissions_tenant_id();

-- ===========================================================================
-- 3) Alte FK-Constraints + Slug-Indices droppen
-- ===========================================================================

ALTER TABLE public.funnels          DROP CONSTRAINT IF EXISTS funnels_tenant_slug_fkey;
ALTER TABLE public.funnel_questions DROP CONSTRAINT IF EXISTS funnel_questions_funnel_slug_fkey;
ALTER TABLE public.funnel_view_logs DROP CONSTRAINT IF EXISTS funnel_view_logs_funnel_slug_fkey;

DROP INDEX IF EXISTS public.idx_funnels_tenant;
DROP INDEX IF EXISTS public.idx_funnel_questions_funnel;
DROP INDEX IF EXISTS public.funnel_questions_funnel_slug_question_key_key;
DROP INDEX IF EXISTS public.funnel_view_logs_tenant_month;

-- ===========================================================================
-- 4) Alte Slug-Spalten droppen (außer submissions — Snapshot)
-- ===========================================================================

ALTER TABLE public.funnels          DROP COLUMN tenant_slug;
ALTER TABLE public.funnel_questions DROP COLUMN funnel_slug;
ALTER TABLE public.funnel_view_logs DROP COLUMN funnel_slug, DROP COLUMN tenant_slug;

-- submissions.funnel_slug + tenant_slug BLEIBEN (Snapshot für Display)

-- ===========================================================================
-- 5) tenants aufräumen: slug + auth_user_id droppen
-- ===========================================================================

ALTER TABLE public.tenants DROP COLUMN auth_user_id;
ALTER TABLE public.tenants DROP COLUMN slug;

COMMIT;
