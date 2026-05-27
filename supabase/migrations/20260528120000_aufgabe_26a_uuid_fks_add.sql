-- =============================================================================
-- Aufgabe 26 — Phase B.2 — Migration 1/2 (ADD-only, zero-downtime)
-- =============================================================================
-- Bereitet die UUID-FK-Umstellung vor, ohne alte Strukturen zu droppen.
--
-- Nach dieser Migration:
--   - Neue UUID-Spalten existieren und sind backfilled
--   - Trigger füllen UUIDs automatisch aus den vorhandenen Slugs
--     (= alte App-Code-Inserts/Updates schreiben weiter Slugs, Trigger leitet
--      tenant_id/funnel_id davon ab)
--   - Neue UUID-basierte RLS-Policies sind aktiv ZUSÄTZLICH zu den alten
--     (RLS kombiniert OR — beide erlauben Zugriff)
--   - Alte Slug-Spalten sind NULLABLE — neuer Code kann sie ungeschrieben lassen
--
-- App-Code kann danach in Ruhe auf UUIDs umgestellt + deployed werden.
-- Migration 2/2 (DROP-only) folgt nach erfolgreicher Verifikation.

BEGIN;

-- ===========================================================================
-- 1) Neue UUID-Spalten anlegen (nullable + FK)
-- ===========================================================================

ALTER TABLE public.funnels
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.funnel_questions
  ADD COLUMN funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE;

ALTER TABLE public.funnel_view_logs
  ADD COLUMN funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE,
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.submissions
  ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- ===========================================================================
-- 2) Backfill aus Slug-Spalten
-- ===========================================================================

UPDATE public.funnels f
SET tenant_id = t.id
FROM public.tenants t
WHERE f.tenant_slug = t.slug;

UPDATE public.funnel_questions q
SET funnel_id = f.id
FROM public.funnels f
WHERE q.funnel_slug = f.slug;

UPDATE public.funnel_view_logs l
SET funnel_id = f.id,
    tenant_id = f.tenant_id
FROM public.funnels f
WHERE l.funnel_slug = f.slug;

UPDATE public.submissions s
SET tenant_id = t.id
FROM public.tenants t
WHERE s.tenant_slug = t.slug;

-- ===========================================================================
-- 3) Trigger: UUID-Spalten aus Slug-Spalten automatisch ableiten (Transition)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.sync_funnels_tenant_id() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.tenant_slug IS NOT NULL THEN
    SELECT id INTO NEW.tenant_id FROM public.tenants WHERE slug = NEW.tenant_slug;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.sync_funnels_tenant_id() SET search_path = '';

CREATE TRIGGER sync_funnels_tenant_id_trg
  BEFORE INSERT OR UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.sync_funnels_tenant_id();

CREATE OR REPLACE FUNCTION public.sync_funnel_questions_funnel_id() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.funnel_id IS NULL AND NEW.funnel_slug IS NOT NULL THEN
    SELECT id INTO NEW.funnel_id FROM public.funnels WHERE slug = NEW.funnel_slug;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.sync_funnel_questions_funnel_id() SET search_path = '';

CREATE TRIGGER sync_funnel_questions_funnel_id_trg
  BEFORE INSERT OR UPDATE ON public.funnel_questions
  FOR EACH ROW EXECUTE FUNCTION public.sync_funnel_questions_funnel_id();

CREATE OR REPLACE FUNCTION public.sync_funnel_view_logs_ids() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.funnel_id IS NULL AND NEW.funnel_slug IS NOT NULL THEN
    SELECT id, tenant_id INTO NEW.funnel_id, NEW.tenant_id
    FROM public.funnels WHERE slug = NEW.funnel_slug;
  END IF;
  IF NEW.tenant_id IS NULL AND NEW.tenant_slug IS NOT NULL THEN
    SELECT id INTO NEW.tenant_id FROM public.tenants WHERE slug = NEW.tenant_slug;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.sync_funnel_view_logs_ids() SET search_path = '';

CREATE TRIGGER sync_funnel_view_logs_ids_trg
  BEFORE INSERT OR UPDATE ON public.funnel_view_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_funnel_view_logs_ids();

CREATE OR REPLACE FUNCTION public.sync_submissions_tenant_id() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.tenant_slug IS NOT NULL THEN
    SELECT id INTO NEW.tenant_id FROM public.tenants WHERE slug = NEW.tenant_slug;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.sync_submissions_tenant_id() SET search_path = '';

CREATE TRIGGER sync_submissions_tenant_id_trg
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_submissions_tenant_id();

-- ===========================================================================
-- 4) NOT NULL setzen (Trigger garantiert Befüllung — ausgenommen submissions)
-- ===========================================================================

ALTER TABLE public.funnels          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.funnel_questions ALTER COLUMN funnel_id SET NOT NULL;
ALTER TABLE public.funnel_view_logs ALTER COLUMN funnel_id SET NOT NULL;
ALTER TABLE public.funnel_view_logs ALTER COLUMN tenant_id SET NOT NULL;
-- submissions.tenant_id bleibt NULLABLE (ON DELETE SET NULL)

-- ===========================================================================
-- 5) Indices auf neue UUID-Spalten
-- ===========================================================================

CREATE INDEX idx_funnels_tenant_id          ON public.funnels(tenant_id);
CREATE INDEX idx_funnel_questions_funnel_id ON public.funnel_questions(funnel_id, sort_order);
CREATE INDEX idx_funnel_view_logs_tenant_id ON public.funnel_view_logs(tenant_id, viewed_at);
CREATE INDEX idx_funnel_view_logs_funnel_id ON public.funnel_view_logs(funnel_id);
CREATE INDEX idx_submissions_tenant_id      ON public.submissions(tenant_id, created_at);
CREATE UNIQUE INDEX funnel_questions_funnel_id_question_key_key
  ON public.funnel_questions(funnel_id, question_key);

-- ===========================================================================
-- 6) Neue UUID-basierte RLS-Policies (ZUSÄTZLICH zu den alten, OR-kombiniert)
-- ===========================================================================
-- Namens-Konvention: *_v2_select / *_v2_insert etc., damit alte Policies
-- unangetastet bleiben und in Phase 2 sauber gedroppt werden können.

-- funnels
CREATE POLICY funnels_v2_select ON public.funnels
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY funnels_v2_insert ON public.funnels
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY funnels_v2_update ON public.funnels
  FOR UPDATE TO authenticated
  USING      (tenant_id IN (SELECT public.current_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY funnels_v2_delete ON public.funnels
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

-- funnel_questions
CREATE POLICY funnel_questions_v2_select ON public.funnel_questions
  FOR SELECT TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_v2_insert ON public.funnel_questions
  FOR INSERT TO authenticated
  WITH CHECK (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_v2_update ON public.funnel_questions
  FOR UPDATE TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ))
  WITH CHECK (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_v2_delete ON public.funnel_questions
  FOR DELETE TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

-- funnel_view_logs
CREATE POLICY funnel_view_logs_v2_select ON public.funnel_view_logs
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY funnel_view_logs_v2_delete ON public.funnel_view_logs
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

-- submissions
CREATE POLICY submissions_v2_select ON public.submissions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY submissions_v2_update ON public.submissions
  FOR UPDATE TO authenticated
  USING      (tenant_id IN (SELECT public.current_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY submissions_v2_delete ON public.submissions
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

-- ===========================================================================
-- 7) Alte Slug-Spalten NULLABLE machen (neuer Code soll sie weglassen können)
-- ===========================================================================

ALTER TABLE public.funnels          ALTER COLUMN tenant_slug DROP NOT NULL;
ALTER TABLE public.funnel_questions ALTER COLUMN funnel_slug DROP NOT NULL;
ALTER TABLE public.funnel_view_logs ALTER COLUMN funnel_slug DROP NOT NULL,
                                     ALTER COLUMN tenant_slug DROP NOT NULL;
ALTER TABLE public.tenants          ALTER COLUMN slug DROP NOT NULL;
-- submissions.funnel_slug + tenant_slug bleiben als Snapshot — App füllt sie weiter

COMMIT;
