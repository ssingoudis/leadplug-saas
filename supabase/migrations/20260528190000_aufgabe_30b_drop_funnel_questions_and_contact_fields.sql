-- ============================================================================
-- Aufgabe 30 (Phase B.5) — Migration 2/2: alte Strukturen droppen
--
-- VORAUSSETZUNG: Migration 30a appliziert + App-Code-Deploy live + Smoke-Test
-- bestätigt, dass App ausschließlich pages/fields liest/schreibt.
--
-- Diese Migration ist DESTRUCTIVE. Kein automatisches DOWN möglich
-- (Daten droppen ist final). Rollback nur via tägliche Auto-Backups.
--
-- Was wird entfernt:
--   - funnel_questions (Tabelle mit allen RLS-Policies, Indices, Triggers)
--   - funnels.contact_fields (jsonb-Spalte)
--   - question_type-Enum (wird nirgendwo mehr referenziert)
-- ============================================================================

BEGIN;

-- 1. RLS-Policies droppen (vor Tabelle, idiomatisch)
DROP POLICY IF EXISTS funnel_questions_select ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_insert ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_update ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_delete ON public.funnel_questions;

-- 2. Tabelle droppen (CASCADE räumt Indices + FK-Constraints automatisch)
DROP TABLE IF EXISTS public.funnel_questions;

-- 3. question_type-Enum droppen (nicht mehr referenziert)
DROP TYPE IF EXISTS public.question_type;

-- 4. funnels.contact_fields Spalte droppen
ALTER TABLE public.funnels DROP COLUMN IF EXISTS contact_fields;

COMMIT;
