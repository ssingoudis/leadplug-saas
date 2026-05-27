-- =============================================================================
-- DOWN für Aufgabe 26 — Migration 2/2 (DROP-only)
-- =============================================================================
-- Stellt den Phase-1-Zustand wieder her.
-- WICHTIG: Da tenants.slug + auth_user_id gedroppt wurden, müssen sie
-- rekonstruiert werden. Slugs aus company_name approximiert, auth_user_id
-- aus tenant_members (owner-Rolle) abgeleitet.
--
-- Bei kritischen Daten: Backup einspielen statt DOWN-Migration laufen lassen.

BEGIN;

-- ===========================================================================
-- 1) tenants.slug + auth_user_id wiederherstellen
-- ===========================================================================

ALTER TABLE public.tenants ADD COLUMN slug text;
ALTER TABLE public.tenants ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);

UPDATE public.tenants
SET slug = lower(regexp_replace(
  translate(coalesce(company_name, id::text), 'äöüÄÖÜß', 'aouAOUs'),
  '[^a-z0-9]+', '-', 'g'
));

UPDATE public.tenants t
SET auth_user_id = tm.auth_user_id
FROM public.tenant_members tm
WHERE tm.tenant_id = t.id AND tm.role = 'owner';

ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
CREATE INDEX idx_tenants_slug ON public.tenants(slug) WHERE (is_active = true);
CREATE UNIQUE INDEX tenants_auth_user_id_idx ON public.tenants(auth_user_id);

-- ===========================================================================
-- 2) Slug-Spalten auf funnels/funnel_questions/funnel_view_logs wiederherstellen
-- ===========================================================================

ALTER TABLE public.funnels ADD COLUMN tenant_slug text;
UPDATE public.funnels f SET tenant_slug = t.slug FROM public.tenants t WHERE f.tenant_id = t.id;
ALTER TABLE public.funnels ALTER COLUMN tenant_slug SET NOT NULL;
ALTER TABLE public.funnels
  ADD CONSTRAINT funnels_tenant_slug_fkey FOREIGN KEY (tenant_slug) REFERENCES public.tenants(slug);
CREATE INDEX idx_funnels_tenant ON public.funnels(tenant_slug);

ALTER TABLE public.funnel_questions ADD COLUMN funnel_slug text;
UPDATE public.funnel_questions q SET funnel_slug = f.slug FROM public.funnels f WHERE q.funnel_id = f.id;
ALTER TABLE public.funnel_questions ALTER COLUMN funnel_slug SET NOT NULL;
ALTER TABLE public.funnel_questions
  ADD CONSTRAINT funnel_questions_funnel_slug_fkey FOREIGN KEY (funnel_slug) REFERENCES public.funnels(slug);
CREATE INDEX idx_funnel_questions_funnel ON public.funnel_questions(funnel_slug, sort_order);
CREATE UNIQUE INDEX funnel_questions_funnel_slug_question_key_key
  ON public.funnel_questions(funnel_slug, question_key);

ALTER TABLE public.funnel_view_logs ADD COLUMN funnel_slug text;
ALTER TABLE public.funnel_view_logs ADD COLUMN tenant_slug text;
UPDATE public.funnel_view_logs l
SET funnel_slug = f.slug,
    tenant_slug = (SELECT slug FROM public.tenants WHERE id = l.tenant_id)
FROM public.funnels f WHERE l.funnel_id = f.id;
ALTER TABLE public.funnel_view_logs ALTER COLUMN funnel_slug SET NOT NULL;
ALTER TABLE public.funnel_view_logs ALTER COLUMN tenant_slug SET NOT NULL;
ALTER TABLE public.funnel_view_logs
  ADD CONSTRAINT funnel_view_logs_funnel_slug_fkey FOREIGN KEY (funnel_slug) REFERENCES public.funnels(slug);
CREATE INDEX funnel_view_logs_tenant_month ON public.funnel_view_logs(tenant_slug, viewed_at);

-- ===========================================================================
-- 3) v1-Policies wiederherstellen, v2-Policies zurück-umbenennen
-- ===========================================================================

ALTER POLICY funnels_select          ON public.funnels          RENAME TO funnels_v2_select;
ALTER POLICY funnels_insert          ON public.funnels          RENAME TO funnels_v2_insert;
ALTER POLICY funnels_update          ON public.funnels          RENAME TO funnels_v2_update;
ALTER POLICY funnels_delete          ON public.funnels          RENAME TO funnels_v2_delete;
ALTER POLICY funnel_questions_select ON public.funnel_questions RENAME TO funnel_questions_v2_select;
ALTER POLICY funnel_questions_insert ON public.funnel_questions RENAME TO funnel_questions_v2_insert;
ALTER POLICY funnel_questions_update ON public.funnel_questions RENAME TO funnel_questions_v2_update;
ALTER POLICY funnel_questions_delete ON public.funnel_questions RENAME TO funnel_questions_v2_delete;
ALTER POLICY funnel_view_logs_select ON public.funnel_view_logs RENAME TO funnel_view_logs_v2_select;
ALTER POLICY funnel_view_logs_delete ON public.funnel_view_logs RENAME TO funnel_view_logs_v2_delete;
ALTER POLICY submissions_select      ON public.submissions      RENAME TO submissions_v2_select;
ALTER POLICY submissions_update      ON public.submissions      RENAME TO submissions_v2_update;
ALTER POLICY submissions_delete      ON public.submissions      RENAME TO submissions_v2_delete;

-- v1-Policies (slug-walk) neu erstellen
CREATE POLICY funnels_select ON public.funnels FOR SELECT TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnels_insert ON public.funnels FOR INSERT TO authenticated
  WITH CHECK (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnels_update ON public.funnels FOR UPDATE TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())))
  WITH CHECK (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnels_delete ON public.funnels FOR DELETE TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));

CREATE POLICY funnel_questions_select ON public.funnel_questions FOR SELECT TO authenticated
  USING (funnel_slug IN (SELECT f.slug FROM public.funnels f JOIN public.tenants t ON t.slug = f.tenant_slug WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnel_questions_insert ON public.funnel_questions FOR INSERT TO authenticated
  WITH CHECK (funnel_slug IN (SELECT f.slug FROM public.funnels f JOIN public.tenants t ON t.slug = f.tenant_slug WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnel_questions_update ON public.funnel_questions FOR UPDATE TO authenticated
  USING (funnel_slug IN (SELECT f.slug FROM public.funnels f JOIN public.tenants t ON t.slug = f.tenant_slug WHERE t.id IN (SELECT public.current_tenant_ids())))
  WITH CHECK (funnel_slug IN (SELECT f.slug FROM public.funnels f JOIN public.tenants t ON t.slug = f.tenant_slug WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnel_questions_delete ON public.funnel_questions FOR DELETE TO authenticated
  USING (funnel_slug IN (SELECT f.slug FROM public.funnels f JOIN public.tenants t ON t.slug = f.tenant_slug WHERE t.id IN (SELECT public.current_tenant_ids())));

CREATE POLICY funnel_view_logs_select ON public.funnel_view_logs FOR SELECT TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY funnel_view_logs_delete ON public.funnel_view_logs FOR DELETE TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));

CREATE POLICY submissions_select ON public.submissions FOR SELECT TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY submissions_update ON public.submissions FOR UPDATE TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())))
  WITH CHECK (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));
CREATE POLICY submissions_delete ON public.submissions FOR DELETE TO authenticated
  USING (tenant_slug IN (SELECT t.slug FROM public.tenants t WHERE t.id IN (SELECT public.current_tenant_ids())));

-- ===========================================================================
-- 4) Sync-Trigger wiederherstellen (für Phase-1-Konsistenz)
-- ===========================================================================
-- Siehe Migration 26a für Trigger-Definitionen — hier identisch wieder anlegen:

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
CREATE TRIGGER sync_funnels_tenant_id_trg BEFORE INSERT OR UPDATE ON public.funnels
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
CREATE TRIGGER sync_funnel_questions_funnel_id_trg BEFORE INSERT OR UPDATE ON public.funnel_questions
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
CREATE TRIGGER sync_funnel_view_logs_ids_trg BEFORE INSERT OR UPDATE ON public.funnel_view_logs
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
CREATE TRIGGER sync_submissions_tenant_id_trg BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_submissions_tenant_id();

COMMIT;
