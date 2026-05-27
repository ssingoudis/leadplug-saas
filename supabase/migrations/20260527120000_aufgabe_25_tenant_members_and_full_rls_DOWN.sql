-- ============================================================
-- DOWN-Migration: Rollback Aufgabe 25 / Phase B.1
-- ============================================================
-- WICHTIG: nur sicher anwendbar SOLANGE tenants.auth_user_id
-- noch existiert (wird in Phase B.4 evtl. gedroppt). Nach B.4
-- muesste die DOWN-Logik fuer die alten SELECT-Policies ueber
-- tenant_members aufgeloest werden.
-- ============================================================

-- ----- Neue Policies droppen -----
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS tenants_update ON public.tenants;
DROP POLICY IF EXISTS tenants_delete ON public.tenants;

DROP POLICY IF EXISTS tenant_members_select ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_insert ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_update ON public.tenant_members;
DROP POLICY IF EXISTS tenant_members_delete ON public.tenant_members;

DROP POLICY IF EXISTS funnels_select ON public.funnels;
DROP POLICY IF EXISTS funnels_insert ON public.funnels;
DROP POLICY IF EXISTS funnels_update ON public.funnels;
DROP POLICY IF EXISTS funnels_delete ON public.funnels;

DROP POLICY IF EXISTS funnel_questions_select ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_insert ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_update ON public.funnel_questions;
DROP POLICY IF EXISTS funnel_questions_delete ON public.funnel_questions;

DROP POLICY IF EXISTS submissions_select ON public.submissions;
DROP POLICY IF EXISTS submissions_update ON public.submissions;
DROP POLICY IF EXISTS submissions_delete ON public.submissions;

DROP POLICY IF EXISTS funnel_view_logs_select ON public.funnel_view_logs;
DROP POLICY IF EXISTS funnel_view_logs_delete ON public.funnel_view_logs;  -- Hotfix 20260527130000

-- ----- Alte 5 SELECT-Policies wiederherstellen -----
CREATE POLICY tenant_own_record ON public.tenants
  FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY tenant_own_funnels ON public.funnels
  FOR SELECT
  USING (tenant_slug = (
    SELECT slug FROM public.tenants WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_own_funnel_questions ON public.funnel_questions
  FOR SELECT
  USING (funnel_slug IN (
    SELECT slug FROM public.funnels
    WHERE tenant_slug = (SELECT slug FROM public.tenants WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY tenant_own_submissions ON public.submissions
  FOR SELECT
  USING (tenant_slug = (
    SELECT slug FROM public.tenants WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY tenant_own_view_logs ON public.funnel_view_logs
  FOR SELECT
  USING (tenant_slug = (
    SELECT slug FROM public.tenants WHERE auth_user_id = auth.uid()
  ));

-- ----- Helper-Funktionen droppen -----
DROP FUNCTION IF EXISTS public.current_tenant_role(uuid);
DROP FUNCTION IF EXISTS public.current_tenant_ids();

-- ----- Tabelle + Enum droppen (Trigger entfaellt automatisch) -----
DROP TABLE IF EXISTS public.tenant_members;
DROP TYPE IF EXISTS public.tenant_member_role;
