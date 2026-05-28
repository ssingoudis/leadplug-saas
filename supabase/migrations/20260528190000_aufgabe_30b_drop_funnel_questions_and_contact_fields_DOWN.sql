-- ============================================================================
-- DOWN für Aufgabe 30 Migration 2/2 — Strukturen wiederherstellen.
--
-- ⚠️ ACHTUNG: Stellt nur die SCHEMA-STRUKTUR wieder her, NICHT die Daten.
-- Die gelöschten funnel_questions-Zeilen und contact_fields-jsonb-Werte
-- sind nach dem UP unwiderruflich weg — Recovery nur via Supabase-Backup.
--
-- Nach diesem DOWN sind funnel_questions + funnels.contact_fields leer/NULL,
-- aber die alte App-Code-Version würde wieder funktionieren (mit leeren Funnels).
--
-- Realistischer Recovery-Pfad bei Phase-2-Fehler:
--   1. DOWN dieser Migration anwenden (Schema wiederherstellen)
--   2. Daten aus Supabase-Auto-Backup einspielen
--   3. App-Code auf alte Version zurückrollen
-- ============================================================================

BEGIN;

-- 1. question_type-Enum wiederherstellen
CREATE TYPE public.question_type AS ENUM (
  'single_choice',
  'multiple_choice',
  'short_text',
  'long_text',
  'slider'
);

-- 2. funnel_questions-Tabelle wiederherstellen (Struktur 1:1 wie vor 30b)
CREATE TABLE public.funnel_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id    uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  title        text NOT NULL,
  subtitle     text,
  question_type public.question_type NOT NULL DEFAULT 'single_choice',
  options      jsonb NOT NULL DEFAULT '[]'::jsonb,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order   integer NOT NULL DEFAULT 0,
  visible      boolean DEFAULT true,
  CONSTRAINT funnel_questions_funnel_id_question_key_key UNIQUE (funnel_id, question_key)
);

CREATE INDEX idx_funnel_questions_funnel_id ON public.funnel_questions(funnel_id, sort_order);

-- 3. RLS-Policies wiederherstellen (UUID-basiert, Stand nach B.2)
CREATE POLICY funnel_questions_select ON public.funnel_questions
  FOR SELECT TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_insert ON public.funnel_questions
  FOR INSERT TO authenticated
  WITH CHECK (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_update ON public.funnel_questions
  FOR UPDATE TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ))
  WITH CHECK (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY funnel_questions_delete ON public.funnel_questions
  FOR DELETE TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

-- 4. funnels.contact_fields Spalte wiederherstellen (nullable, wie ursprünglich)
ALTER TABLE public.funnels ADD COLUMN contact_fields jsonb;

COMMIT;
