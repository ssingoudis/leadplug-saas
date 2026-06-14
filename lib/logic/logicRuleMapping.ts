import type { LogicCondition, LogicOp, LogicRule } from '@/types'

// =============================================================================
// Aufgabe 58 — DB-Row (funnel_logic_rules) → LogicRule (camelCase).
//
// Eine Quelle für alle Leser (getTenantConfig fürs Widget, GET /logic für den
// Editor): conditions werden defensiv sanitisiert — kaputte/unbekannte Einträge
// fallen still raus statt die Auswertung zu vergiften.
// =============================================================================

export const VALID_LOGIC_OPS: ReadonlySet<string> = new Set([
  'eq', 'neq', 'includes', 'contains',
  // numerisch (Slider/Zahl/Bewertung/Skala)
  'gt', 'gte', 'lt', 'lte',
])

export function sanitizeConditions(raw: unknown): LogicCondition[] {
  if (!Array.isArray(raw)) return []
  const out: LogicCondition[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as Record<string, unknown>
    if (typeof e.field_key !== 'string' || !e.field_key) continue
    if (typeof e.op !== 'string' || !VALID_LOGIC_OPS.has(e.op)) continue
    if (typeof e.value !== 'string') continue
    out.push({ fieldKey: e.field_key, op: e.op as LogicOp, value: e.value })
  }
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapLogicRuleRow(r: Record<string, any>): LogicRule {
  return {
    id:           r.id as string,
    sourcePageId: r.source_page_id as string,
    sortOrder:    Number(r.sort_order ?? 0),
    isFallback:   Boolean(r.is_fallback),
    conditions:   sanitizeConditions(r.conditions),
    targetType:   r.target_type === 'end' ? 'end' : 'page',
    targetPageId: (r.target_page_id as string | null) ?? null,
  }
}
