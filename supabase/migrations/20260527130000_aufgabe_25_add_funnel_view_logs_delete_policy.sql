-- ============================================================
-- Aufgabe 25 Hotfix
-- DELETE-Policy fuer funnel_view_logs (vergessen in 20260527120000)
-- ============================================================
-- Wird beim Cascade-Cleanup in DELETE /api/tenant/funnels/[slug]
-- gebraucht. INSERT/UPDATE bleiben weiterhin gesperrt
-- (writes laufen anonym via admin-Client durch /api/track-view).

CREATE POLICY funnel_view_logs_delete ON public.funnel_view_logs
  FOR DELETE TO authenticated
  USING (tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  ));

-- DOWN:
-- DROP POLICY IF EXISTS funnel_view_logs_delete ON public.funnel_view_logs;
