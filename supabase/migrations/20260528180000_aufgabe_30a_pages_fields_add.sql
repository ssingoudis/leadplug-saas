-- ============================================================================
-- Aufgabe 30 (Phase B.5) — Migration 1/2: pages + fields anlegen + Daten füllen
--
-- Foundation für Multi-Field-Pages und neue Feldtypen (Phase C.3 + C.4).
-- Diese Migration ist ADDITIV: alte Tabelle funnel_questions + alte Spalte
-- funnels.contact_fields bleiben unberührt. Phase 2 (DROP) folgt nach
-- erfolgreichem Vercel-Deploy mit refactortem App-Code.
--
-- WICHTIG: Solange der App-Code in production noch auf funnel_questions +
-- contact_fields zugreift, sind die NEUEN pages/fields-Tabellen nicht
-- live im Lese-/Schreibpfad. Nach dem Code-Deploy schreibt die App nur
-- noch in pages/fields. Editier-Lücke (Stavros darf während des Deploy-
-- Übergangs nicht parallel editieren) ist gewollt — Single-User-Risiko.
--
-- Field-Type-Mapping aus Bestand:
--   funnel_questions.question_type='multiple_choice' → field_type='multi_choice'
--   funnel_questions.question_type='single_choice'   → field_type='single_choice'
--   funnel_questions.question_type='short_text'      → field_type='short_text'
--   funnel_questions.question_type='long_text'       → field_type='long_text'
--   funnel_questions.question_type='slider'          → field_type='slider'
--   contact_fields[].type='text'                     → field_type='short_text'
--   contact_fields[].type='radio'                    → field_type='radio'
--   contact_fields[].type='email'                    → field_type='email'
--   contact_fields[].type='tel'                      → field_type='tel'
--   contact_fields[].type='plz'                      → field_type='plz'
--
-- Page-Struktur pro Funnel:
--   N × question-Pages (eine je funnel_questions-Zeile, mit 1 Field)
--   1 × submit-Page (mit allen contact_fields als Fields)
--   1 × success-Page (leer, nur Marker)
--   sort_order: question-Pages 0..N-1, submit-Page = N, success-Page = N+1
--
-- Verifikations-Assertions am Ende — Migration bricht mit RAISE EXCEPTION
-- ab falls Counts nicht stimmen.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

CREATE TYPE public.page_type AS ENUM (
  'question',
  'submit',
  'success'
);

-- field_type-Enum: vollständige Roadmap-Liste + radio + plz für Bestandsdaten.
-- "radio" und "plz" als eigene Enum-Werte (statt single_choice/short_text-Aliase),
-- weil das Widget sie heute spezifisch rendert (radio = kleine Buttons,
-- plz = 5-stellige Numerik-Validierung). Konsolidierung optional in Phase C.3.
CREATE TYPE public.field_type AS ENUM (
  'single_choice',
  'multi_choice',
  'short_text',
  'long_text',
  'email',
  'tel',
  'number',
  'date',
  'dropdown',
  'checkbox',
  'slider',
  'radio',
  'plz'
);

-- ----------------------------------------------------------------------------
-- 2. Tabellen
-- ----------------------------------------------------------------------------

CREATE TABLE public.pages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id   uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  page_type   public.page_type NOT NULL,
  sort_order  integer NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pages_sort_order_nonneg CHECK (sort_order >= 0)
);

COMMENT ON TABLE  public.pages IS 'Page-Hierarchie pro Funnel. Question-Pages (N), Submit-Page (1), Success-Page (1). sort_order steuert Reihenfolge im Widget.';
COMMENT ON COLUMN public.pages.page_type IS 'question = Frage(n)-Page; submit = Kontaktformular-Page; success = Erfolgs-Page.';
COMMENT ON COLUMN public.pages.config IS 'Page-spezifische Config (jsonb, future-use). In B.5 leer — Texte wie contact_form_title, success_message bleiben auf funnels-Tabelle.';

CREATE TABLE public.fields (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  field_key   text NOT NULL,
  field_type  public.field_type NOT NULL,
  label       text NOT NULL,
  subtitle    text,
  placeholder text,
  visible     boolean NOT NULL DEFAULT true,
  required    boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fields_page_field_key_unique UNIQUE (page_id, field_key),
  CONSTRAINT fields_sort_order_nonneg CHECK (sort_order >= 0)
);

COMMENT ON TABLE  public.fields IS 'Felder pro Page. Question-Page hat heute 1 Field; Submit-Page hat alle Kontaktfelder (name, email, tel, …); Success-Page hat 0 Fields.';
COMMENT ON COLUMN public.fields.field_key IS 'Stabiler Key (= altes funnel_questions.question_key / contact_fields[].key). Referenz in submissions.answers + submissions.contact.';
COMMENT ON COLUMN public.fields.options IS 'Antwortoptionen. Choice-Types: Object-Array {label,value,icon_key,icon_url,sort_order}. Radio (Anrede): String-Array ["Herr","Frau"].';
COMMENT ON COLUMN public.fields.config IS 'Typspezifische Config. Slider: {min,max,step,default,unit}. Text/Long-Text: {maxLength}.';

-- ----------------------------------------------------------------------------
-- 3. Indices
-- ----------------------------------------------------------------------------

CREATE INDEX idx_pages_funnel_id ON public.pages(funnel_id, sort_order);
CREATE INDEX idx_fields_page_id  ON public.fields(page_id, sort_order);

-- ----------------------------------------------------------------------------
-- 4. Trigger updated_at
-- ----------------------------------------------------------------------------

CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER fields_updated_at
  BEFORE UPDATE ON public.fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- 5. RLS-Policies (Defense-in-Depth, analog zu funnel_questions)
-- ----------------------------------------------------------------------------
-- ENABLE RLS passiert automatisch via Event-Trigger rls_auto_enable.

-- pages
CREATE POLICY pages_select ON public.pages
  FOR SELECT TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY pages_insert ON public.pages
  FOR INSERT TO authenticated
  WITH CHECK (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

CREATE POLICY pages_update ON public.pages
  FOR UPDATE TO authenticated
  USING      (funnel_id IN (SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())))
  WITH CHECK (funnel_id IN (SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())));

CREATE POLICY pages_delete ON public.pages
  FOR DELETE TO authenticated
  USING (funnel_id IN (
    SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
  ));

-- fields (via page → funnel → tenant)
CREATE POLICY fields_select ON public.fields
  FOR SELECT TO authenticated
  USING (page_id IN (
    SELECT id FROM public.pages WHERE funnel_id IN (
      SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  ));

CREATE POLICY fields_insert ON public.fields
  FOR INSERT TO authenticated
  WITH CHECK (page_id IN (
    SELECT id FROM public.pages WHERE funnel_id IN (
      SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  ));

CREATE POLICY fields_update ON public.fields
  FOR UPDATE TO authenticated
  USING (page_id IN (
    SELECT id FROM public.pages WHERE funnel_id IN (
      SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  ))
  WITH CHECK (page_id IN (
    SELECT id FROM public.pages WHERE funnel_id IN (
      SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  ));

CREATE POLICY fields_delete ON public.fields
  FOR DELETE TO authenticated
  USING (page_id IN (
    SELECT id FROM public.pages WHERE funnel_id IN (
      SELECT id FROM public.funnels WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  ));

-- ----------------------------------------------------------------------------
-- 6. Daten-Migration: funnel_questions → question-Pages + Fields
-- ----------------------------------------------------------------------------
-- Stable Sort: PARTITION BY funnel_id, ORDER BY sort_order, question_key
-- → bei sort_order-Duplikaten oder Gaps wird question_key als Tiebreaker
--   verwendet (deterministisch).
-- ----------------------------------------------------------------------------

-- 6a. TEMP TABLE mit pre-allocated UUIDs + neuem sort_order
CREATE TEMP TABLE _mig30_q_pages ON COMMIT DROP AS
SELECT
  q.id              AS q_id,
  q.funnel_id,
  q.question_key,
  q.question_type,
  q.title,
  q.subtitle,
  q.visible,
  q.options,
  q.config,
  gen_random_uuid() AS page_id,
  (row_number() OVER (PARTITION BY q.funnel_id ORDER BY q.sort_order, q.question_key) - 1)::int AS new_sort
FROM public.funnel_questions q;

-- 6b. Question-Pages anlegen
INSERT INTO public.pages (id, funnel_id, page_type, sort_order, config)
SELECT page_id, funnel_id, 'question'::public.page_type, new_sort, '{}'::jsonb
FROM _mig30_q_pages;

-- 6c. Question-Fields anlegen (1 Field je Page; field_key = altes question_key)
INSERT INTO public.fields (
  page_id, field_key, field_type, label, subtitle, placeholder, visible, required, sort_order, options, config
)
SELECT
  page_id,
  question_key,
  CASE question_type::text
    WHEN 'multiple_choice' THEN 'multi_choice'::public.field_type
    ELSE question_type::text::public.field_type
  END,
  COALESCE(title, ''),  -- defensive: in Bestand sind alle titles gesetzt
  subtitle,
  -- placeholder nur für text-types relevant (in config gespeichert)
  CASE WHEN question_type::text IN ('short_text', 'long_text') THEN config->>'placeholder' ELSE NULL END,
  COALESCE(visible, true),
  -- required: text-types haben es in config (default true); choice/slider sind implizit required
  CASE
    WHEN question_type::text IN ('short_text', 'long_text')
      THEN COALESCE((config->>'required')::boolean, true)
    ELSE true
  END,
  0,
  options,
  config
FROM _mig30_q_pages;

-- ----------------------------------------------------------------------------
-- 7. Daten-Migration: funnels.contact_fields jsonb → submit-Pages + Fields
-- ----------------------------------------------------------------------------

-- 7a. Submit-Page pro Funnel (sort_order = max question-sort + 1, oder 0 wenn keine Fragen)
CREATE TEMP TABLE _mig30_submit_pages ON COMMIT DROP AS
SELECT
  f.id              AS funnel_id,
  gen_random_uuid() AS page_id,
  COALESCE((
    SELECT MAX(p.sort_order) + 1
    FROM public.pages p
    WHERE p.funnel_id = f.id AND p.page_type = 'question'
  ), 0) AS new_sort
FROM public.funnels f;

INSERT INTO public.pages (id, funnel_id, page_type, sort_order, config)
SELECT page_id, funnel_id, 'submit'::public.page_type, new_sort, '{}'::jsonb
FROM _mig30_submit_pages;

-- 7b. Contact-Fields aus jsonb-Array als Fields auf Submit-Page anlegen
INSERT INTO public.fields (
  page_id, field_key, field_type, label, subtitle, placeholder, visible, required, sort_order, options, config
)
SELECT
  sp.page_id,
  COALESCE(cf.value->>'key', ''),
  CASE cf.value->>'type'
    WHEN 'text'  THEN 'short_text'::public.field_type
    WHEN 'radio' THEN 'radio'::public.field_type
    WHEN 'email' THEN 'email'::public.field_type
    WHEN 'tel'   THEN 'tel'::public.field_type
    WHEN 'plz'   THEN 'plz'::public.field_type
    -- Fallback: bei unbekanntem type bricht der CAST (geplant — bessere Diagnose als Stille)
  END,
  COALESCE(cf.value->>'label', ''),
  NULL,
  cf.value->>'placeholder',
  COALESCE((cf.value->>'visible')::boolean, true),
  COALESCE((cf.value->>'required')::boolean, false),
  COALESCE((cf.value->>'sort_order')::int, 0),
  COALESCE(cf.value->'options', '[]'::jsonb),
  '{}'::jsonb
FROM public.funnels f
JOIN _mig30_submit_pages sp ON sp.funnel_id = f.id
CROSS JOIN LATERAL jsonb_array_elements(f.contact_fields) AS cf;

-- ----------------------------------------------------------------------------
-- 8. Daten-Migration: success-Pages (leer, nur Marker)
-- ----------------------------------------------------------------------------

INSERT INTO public.pages (id, funnel_id, page_type, sort_order, config)
SELECT
  gen_random_uuid(),
  f.id,
  'success'::public.page_type,
  COALESCE((
    SELECT MAX(p.sort_order) + 1
    FROM public.pages p
    WHERE p.funnel_id = f.id
  ), 0),
  '{}'::jsonb
FROM public.funnels f;

-- ----------------------------------------------------------------------------
-- 9. Verifikations-Assertions
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_funnels_count      int;
  v_questions_count    int;
  v_contact_fields_total int;
  v_pages_count        int;
  v_fields_count       int;
  v_expected_pages     int;
  v_expected_fields    int;
  v_submit_pages       int;
  v_success_pages      int;
  v_question_pages     int;
BEGIN
  SELECT COUNT(*) INTO v_funnels_count   FROM public.funnels;
  SELECT COUNT(*) INTO v_questions_count FROM public.funnel_questions;
  SELECT COALESCE(SUM(jsonb_array_length(contact_fields)), 0) INTO v_contact_fields_total
    FROM public.funnels;

  SELECT COUNT(*) INTO v_pages_count    FROM public.pages;
  SELECT COUNT(*) INTO v_fields_count   FROM public.fields;

  SELECT COUNT(*) INTO v_question_pages FROM public.pages WHERE page_type = 'question';
  SELECT COUNT(*) INTO v_submit_pages   FROM public.pages WHERE page_type = 'submit';
  SELECT COUNT(*) INTO v_success_pages  FROM public.pages WHERE page_type = 'success';

  v_expected_pages  := v_questions_count + 2 * v_funnels_count;
  v_expected_fields := v_questions_count + v_contact_fields_total;

  IF v_pages_count <> v_expected_pages THEN
    RAISE EXCEPTION 'Migration B.5: pages count mismatch — expected %, got %', v_expected_pages, v_pages_count;
  END IF;

  IF v_fields_count <> v_expected_fields THEN
    RAISE EXCEPTION 'Migration B.5: fields count mismatch — expected %, got %', v_expected_fields, v_fields_count;
  END IF;

  IF v_question_pages <> v_questions_count THEN
    RAISE EXCEPTION 'Migration B.5: question-pages count mismatch — expected %, got %', v_questions_count, v_question_pages;
  END IF;

  IF v_submit_pages <> v_funnels_count THEN
    RAISE EXCEPTION 'Migration B.5: submit-pages count mismatch — expected %, got %', v_funnels_count, v_submit_pages;
  END IF;

  IF v_success_pages <> v_funnels_count THEN
    RAISE EXCEPTION 'Migration B.5: success-pages count mismatch — expected %, got %', v_funnels_count, v_success_pages;
  END IF;

  -- Sanity: jedes alte question_key existiert als field_key
  IF EXISTS (
    SELECT 1 FROM public.funnel_questions q
    WHERE NOT EXISTS (
      SELECT 1 FROM public.fields fld
      JOIN public.pages p ON p.id = fld.page_id
      WHERE p.funnel_id = q.funnel_id
        AND p.page_type = 'question'
        AND fld.field_key = q.question_key
    )
  ) THEN
    RAISE EXCEPTION 'Migration B.5: at least one funnel_questions.question_key has no matching field';
  END IF;

  RAISE NOTICE 'Migration B.5 verified: % pages (% question + % submit + % success), % fields',
    v_pages_count, v_question_pages, v_submit_pages, v_success_pages, v_fields_count;
END $$;

COMMIT;
