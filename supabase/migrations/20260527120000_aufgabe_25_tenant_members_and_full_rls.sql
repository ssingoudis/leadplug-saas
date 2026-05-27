-- ============================================================
-- Aufgabe 25 / Phase B.1
-- Junction-Table tenant_members + komplette RLS-Refactor
-- ============================================================
-- Hintergrund: bisheriges Modell ist 1:1 (tenants.auth_user_id),
-- alle RLS-Policies sind nur SELECT. Diese Migration fuehrt das
-- N:M-Modell ein und ergaenzt INSERT/UPDATE/DELETE-Policies auf
-- allen relevanten Tabellen. App-Code-Refactor folgt separat.
-- ============================================================

-- ----- Enum + Tabelle -----
CREATE TYPE public.tenant_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, auth_user_id)
);

COMMENT ON TABLE public.tenant_members IS
  'N:M-Junction zwischen tenants und auth.users mit Rollen (owner/admin/member).';

CREATE INDEX tenant_members_tenant_id_idx ON public.tenant_members (tenant_id);
CREATE INDEX tenant_members_auth_user_id_idx ON public.tenant_members (auth_user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----- Daten-Backfill -----
-- Jeder bestehende Tenant mit auth_user_id bekommt einen Owner-Membership.
INSERT INTO public.tenant_members (tenant_id, auth_user_id, role)
SELECT id, auth_user_id, 'owner'::public.tenant_member_role
FROM public.tenants
WHERE auth_user_id IS NOT NULL
ON CONFLICT (tenant_id, auth_user_id) DO NOTHING;

-- ----- Helper-Funktionen (SECURITY DEFINER, STABLE) -----
CREATE OR REPLACE FUNCTION public.current_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE auth_user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_tenant_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_tenant_role(p_tenant_id uuid)
RETURNS public.tenant_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.tenant_members
  WHERE tenant_id = p_tenant_id AND auth_user_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_tenant_role(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_tenant_role(uuid) TO authenticated;

-- ============================================================
-- RLS-Refactor: alte SELECT-only Policies droppen,
-- neue SELECT/INSERT/UPDATE/DELETE-Policies pro Tabelle.
-- ============================================================

-- ----- tenants -----
DROP POLICY IF EXISTS tenant_own_record ON public.tenants;

CREATE POLICY tenants_select ON public.tenants
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.current_tenant_ids()));

CREATE POLICY tenants_update ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.current_tenant_role(id) IN ('owner', 'admin'))
  WITH CHECK (public.current_tenant_role(id) IN ('owner', 'admin'));

CREATE POLICY tenants_delete ON public.tenants
  FOR DELETE TO authenticated
  USING (public.current_tenant_role(id) = 'owner');

-- Kein INSERT-Policy: Tenant-Anlage laeuft ueber Signup-Flow + admin-Client.

-- ----- tenant_members -----
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_members_select ON public.tenant_members
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY tenant_members_insert ON public.tenant_members
  FOR INSERT TO authenticated
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY tenant_members_update ON public.tenant_members
  FOR UPDATE TO authenticated
  USING (public.current_tenant_role(tenant_id) IN ('owner', 'admin'))
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

-- DELETE: owner/admin koennen alle entfernen, jeder darf sich selbst entfernen.
CREATE POLICY tenant_members_delete ON public.tenant_members
  FOR DELETE TO authenticated
  USING (
    public.current_tenant_role(tenant_id) IN ('owner', 'admin')
    OR auth_user_id = auth.uid()
  );

-- ----- funnels -----
DROP POLICY IF EXISTS tenant_own_funnels ON public.funnels;

CREATE POLICY funnels_select ON public.funnels
  FOR SELECT TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnels_insert ON public.funnels
  FOR INSERT TO authenticated
  WITH CHECK (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnels_update ON public.funnels
  FOR UPDATE TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ))
  WITH CHECK (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnels_delete ON public.funnels
  FOR DELETE TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

-- ----- funnel_questions -----
DROP POLICY IF EXISTS tenant_own_funnel_questions ON public.funnel_questions;

CREATE POLICY funnel_questions_select ON public.funnel_questions
  FOR SELECT TO authenticated
  USING (funnel_slug IN (
    SELECT f.slug FROM public.funnels f
    JOIN public.tenants t ON t.slug = f.tenant_slug
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_insert ON public.funnel_questions
  FOR INSERT TO authenticated
  WITH CHECK (funnel_slug IN (
    SELECT f.slug FROM public.funnels f
    JOIN public.tenants t ON t.slug = f.tenant_slug
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_update ON public.funnel_questions
  FOR UPDATE TO authenticated
  USING (funnel_slug IN (
    SELECT f.slug FROM public.funnels f
    JOIN public.tenants t ON t.slug = f.tenant_slug
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ))
  WITH CHECK (funnel_slug IN (
    SELECT f.slug FROM public.funnels f
    JOIN public.tenants t ON t.slug = f.tenant_slug
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_delete ON public.funnel_questions
  FOR DELETE TO authenticated
  USING (funnel_slug IN (
    SELECT f.slug FROM public.funnels f
    JOIN public.tenants t ON t.slug = f.tenant_slug
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

-- ----- submissions -----
DROP POLICY IF EXISTS tenant_own_submissions ON public.submissions;

CREATE POLICY submissions_select ON public.submissions
  FOR SELECT TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

-- Kein INSERT-Policy: submissions kommen ueber anonymes /api/submit via admin-Client.

CREATE POLICY submissions_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ))
  WITH CHECK (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY submissions_delete ON public.submissions
  FOR DELETE TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

-- ----- funnel_view_logs -----
DROP POLICY IF EXISTS tenant_own_view_logs ON public.funnel_view_logs;

CREATE POLICY funnel_view_logs_select ON public.funnel_view_logs
  FOR SELECT TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

-- Kein INSERT/UPDATE/DELETE: writes kommen ueber anonymes /api/track-view via admin-Client.

-- ----- honeypot_triggers -----
-- Bleibt wie es ist: RLS aktiv, keine Policies. Admin-Client schreibt
-- ueber anonymes /api/submit-Honeypot. Linter-Hinweis "rls_enabled_no_policy"
-- ist hier ein bewusst akzeptierter False-Positive.
