-- ============================================================================
-- Aufgabe 58 (2026-06-11): Logik-Sprünge Stufe 1 (Logic Jumps, C.4)
--
-- Regel-Modell (Typeform-inspiriert, Chat-Konsens 2026-06-10/11):
--   • Pro Step (source_page_id) 0..N Regeln, sort_order-geordnet — erste
--     matchende Regel gewinnt.
--   • conditions: jsonb-Array [{field_key, op, value}], UND-verknüpft.
--     Ops v1: 'eq' | 'neq' | 'includes' (includes = comma-Liste bei multi_choice).
--     field_key statt implizitem "Antwort dieses Steps" → erweiterbar auf
--     Cross-Step-Bedingungen + Scoring ohne Schema-Bruch.
--   • is_fallback: „Alle anderen Fälle gehen zu …" (max 1 pro Step, leere
--     conditions). Ohne Fallback: Default = nächster Schritt.
--   • target: 'page' (target_page_id) oder 'end' (= sofort absenden/Erfolgsseite).
--     target_page_id FK ON DELETE SET NULL → Regel degradiert zu „weiter",
--     Editor zeigt Warnung.
--   • NUR VorwärTS-Sprünge (User-Entscheid): app-seitig erzwungen (Editor bietet
--     nur spätere Steps an; Runtime ignoriert Rückwärts-Ziele). Kein DB-CHECK
--     möglich (sort_order lebt in pages). Vorwärts-only ⇒ Zyklen unmöglich.
--
-- Regeln überleben das Funnel-Speichern: replace_funnel_content (Aufgabe 54)
-- upsertet Pages mit stabilen UUIDs.
--
-- DOWN-Migration: 20260611120000_aufgabe_58_funnel_logic_rules_DOWN.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Tabelle
-- ============================================================================

CREATE TABLE public.funnel_logic_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id       uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  -- tenant_id denormalisiert für billige RLS-Policies (Muster email_subscriptions, Aufgabe 41)
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_page_id  uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  sort_order      integer NOT NULL DEFAULT 0,
  is_fallback     boolean NOT NULL DEFAULT false,
  conditions      jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_type     text NOT NULL DEFAULT 'page',
  target_page_id  uuid NULL REFERENCES public.pages(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT funnel_logic_rules_target_type_check
    CHECK (target_type IN ('page', 'end')),
  -- Fallback-Regeln („alle anderen Fälle") tragen keine Bedingungen.
  CONSTRAINT funnel_logic_rules_fallback_no_conditions
    CHECK (is_fallback = false OR conditions = '[]'::jsonb),
  -- conditions muss ein Array sein (Inhalt wird app-seitig validiert).
  CONSTRAINT funnel_logic_rules_conditions_is_array
    CHECK (jsonb_typeof(conditions) = 'array')
);

COMMENT ON TABLE public.funnel_logic_rules IS
  'Aufgabe 58: Logik-Sprünge pro Step (erste matchende Regel gewinnt; is_fallback = Else-Zweig). Nur Vorwärts-Sprünge (app-seitig erzwungen).';
COMMENT ON COLUMN public.funnel_logic_rules.conditions IS
  'Array [{field_key, op (eq|neq|includes), value}], UND-verknüpft. Leer nur bei is_fallback.';
COMMENT ON COLUMN public.funnel_logic_rules.target_page_id IS
  'NULL (nach Page-Löschung via SET NULL oder target_type=end) ⇒ Runtime-Fallback „nächster Schritt".';

CREATE INDEX idx_funnel_logic_rules_funnel
  ON public.funnel_logic_rules(funnel_id);
CREATE INDEX idx_funnel_logic_rules_source
  ON public.funnel_logic_rules(source_page_id, sort_order);
-- Max 1 Fallback-Regel pro Step.
CREATE UNIQUE INDEX idx_funnel_logic_rules_one_fallback
  ON public.funnel_logic_rules(source_page_id)
  WHERE is_fallback;

CREATE TRIGGER funnel_logic_rules_updated_at
  BEFORE UPDATE ON public.funnel_logic_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 2) RLS (Muster Aufgabe 41 — tenant-scoped CRUD)
-- ============================================================================

ALTER TABLE public.funnel_logic_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY funnel_logic_rules_select ON public.funnel_logic_rules
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.current_tenant_ids()));

CREATE POLICY funnel_logic_rules_insert ON public.funnel_logic_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY funnel_logic_rules_update ON public.funnel_logic_rules
  FOR UPDATE TO authenticated
  USING (public.current_tenant_role(tenant_id) IN ('owner', 'admin'))
  WITH CHECK (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

CREATE POLICY funnel_logic_rules_delete ON public.funnel_logic_rules
  FOR DELETE TO authenticated
  USING (public.current_tenant_role(tenant_id) IN ('owner', 'admin'));

-- ============================================================================
-- 3) RPC — atomares Ersetzen der Regeln EINES Steps (Muster Aufgabe 54)
--
-- SECURITY INVOKER: läuft mit den Rechten des eingeloggten Users, RLS gilt
-- vollständig (funnels-Lookup ist RLS-gefiltert; INSERT/DELETE laufen gegen
-- die Policies oben). Eine Transaktion ⇒ kein Regel-Verlust bei Teilfehlern.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.replace_page_logic_rules(
  p_funnel_id      uuid,
  p_source_page_id uuid,
  p_rules          jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- RLS-gefilterter Lookup: fremde Funnels sind unsichtbar → Exception.
  SELECT tenant_id INTO v_tenant_id FROM public.funnels WHERE id = p_funnel_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'funnel not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pages WHERE id = p_source_page_id AND funnel_id = p_funnel_id
  ) THEN
    RAISE EXCEPTION 'page not in funnel';
  END IF;

  IF jsonb_typeof(p_rules) <> 'array' THEN
    RAISE EXCEPTION 'rules must be an array';
  END IF;

  DELETE FROM public.funnel_logic_rules WHERE source_page_id = p_source_page_id;

  INSERT INTO public.funnel_logic_rules
    (funnel_id, tenant_id, source_page_id, sort_order, is_fallback, conditions, target_type, target_page_id)
  SELECT
    p_funnel_id,
    v_tenant_id,
    p_source_page_id,
    (t.ord - 1)::integer,
    COALESCE((t.r ->> 'is_fallback')::boolean, false),
    COALESCE(t.r -> 'conditions', '[]'::jsonb),
    COALESCE(t.r ->> 'target_type', 'page'),
    NULLIF(t.r ->> 'target_page_id', '')::uuid
  FROM jsonb_array_elements(p_rules) WITH ORDINALITY AS t(r, ord);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_page_logic_rules(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_page_logic_rules(uuid, uuid, jsonb) TO authenticated;

COMMIT;
