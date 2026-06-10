import type { LogicCondition, LogicRule } from '@/types'

// =============================================================================
// Aufgabe 58 — Logik-Sprünge: geteilte Auswertung.
//
// Pure Functions ohne Dependencies — laufen client-seitig (Widget-Runtime in
// components/funnel.tsx) UND server-seitig (pfad-sensitiver Pflichtfeld-Backstop
// in /api/submit). Beide Seiten MÜSSEN dieselbe Auswertung nutzen, sonst blockt
// der Server Leads, die das Widget legitim durchgelassen hat.
//
// Modell: pro Step (source_page_id) 0..N Regeln, sort_order-geordnet.
//   1. Nicht-Fallback-Regeln in Reihenfolge prüfen — erste matchende gewinnt.
//   2. Sonst die Fallback-Regel („Alle anderen Fälle"), falls vorhanden.
//   3. Sonst null = linear weiter (nächster Schritt).
//
// NUR Vorwärts-Sprünge (User-Entscheid 2026-06-11): Rückwärts-/Unbekannt-Ziele
// degradieren zu „weiter". Damit sind Endlos-Schleifen per Konstruktion
// unmöglich — computePath terminiert garantiert (Index wächst strikt monoton).
// =============================================================================

export type LogicTarget =
  | { type: 'page'; pageId: string }
  | { type: 'end' }
  | null

// Vergleichs-Semantik (Stavros-Befund 2026-06-11: „Stavros" ≠ „stavros" war zu strikt):
//   • Freitext: trim + case-insensitiv — kein Endkunde meint mit Großschreibung etwas anderes.
//   • Zahlen: numerisch, wenn BEIDE Seiten Zahlen sind („50" = „50.0" = „50,0").
//   • Choice-Werte sind kanonische lowercase-Slugs — ci-Vergleich ist dort verlustfrei.
function norm(s: string): string {
  return s.trim().toLowerCase()
}

// Deutsche Dezimal-Kommas tolerieren; '' / Nicht-Zahlen → null.
function toNumber(raw: string): number | null {
  const s = raw.trim()
  if (s === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function valuesEqual(answerRaw: string, ruleValue: string): boolean {
  const na = toNumber(answerRaw)
  const nb = toNumber(ruleValue)
  if (na !== null && nb !== null) return na === nb
  return norm(answerRaw) === norm(ruleValue)
}

// gt/gte/lt/lte: streng numerisch — ist eine Seite keine Zahl, matcht die Bedingung nicht
// (leere Antwort auf „Bewertung ≥ 4" darf nie springen).
function compareNumeric(answerRaw: string, ruleValue: string, op: 'gt' | 'gte' | 'lt' | 'lte'): boolean {
  const a = toNumber(answerRaw)
  const b = toNumber(ruleValue)
  if (a === null || b === null) return false
  switch (op) {
    case 'gt':  return a > b
    case 'gte': return a >= b
    case 'lt':  return a < b
    case 'lte': return a <= b
  }
}

/** Eine Bedingungs-Liste ist UND-verknüpft. Leere Liste matcht NICHT (defensive —
 *  leere Bedingungen sind nur bei Fallback-Regeln legal und laufen nicht hierüber). */
export function evaluateConditions(
  conditions: LogicCondition[],
  answers: Record<string, string>,
): boolean {
  if (conditions.length === 0) return false
  return conditions.every((c) => {
    const raw = answers[c.fieldKey] ?? ''
    switch (c.op) {
      case 'eq':
        return valuesEqual(raw, c.value)
      case 'neq':
        return !valuesEqual(raw, c.value)
      case 'includes':
        // multi_choice speichert comma-separierte Werte
        return raw.split(',').some((entry) => entry.trim() !== '' && valuesEqual(entry, c.value))
      case 'contains':
        // Substring für Freitext (Typeform-„enthält"), case-insensitiv.
        return c.value.trim() !== '' && norm(raw).includes(norm(c.value))
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        return compareNumeric(raw, c.value, c.op)
      default:
        // Unbekannter Operator (z.B. neue App-Version schrieb Regel, alte wertet aus):
        // nicht matchen statt raten.
        return false
    }
  })
}

function ruleToTarget(rule: LogicRule): LogicTarget {
  if (rule.targetType === 'end') return { type: 'end' }
  if (rule.targetPageId) return { type: 'page', pageId: rule.targetPageId }
  // target_page_id SET NULL (Ziel-Page gelöscht) → Regel degradiert zu „weiter".
  return null
}

/** Wertet die Regeln EINES Steps gegen die aktuellen Antworten aus. */
export function resolveNext(
  rulesOfPage: LogicRule[] | undefined,
  answers: Record<string, string>,
): LogicTarget {
  if (!rulesOfPage || rulesOfPage.length === 0) return null
  const ordered = [...rulesOfPage].sort((a, b) => a.sortOrder - b.sortOrder)
  for (const rule of ordered) {
    if (rule.isFallback) continue
    if (evaluateConditions(rule.conditions, answers)) {
      const target = ruleToTarget(rule)
      if (target) return target
    }
  }
  const fallback = ordered.find((r) => r.isFallback)
  return fallback ? ruleToTarget(fallback) : null
}

/** Gruppiert Regeln nach Quell-Page (für O(1)-Lookup in Widget + computePath). */
export function groupRulesBySource(rules: LogicRule[]): Map<string, LogicRule[]> {
  const map = new Map<string, LogicRule[]>()
  for (const rule of rules) {
    const arr = map.get(rule.sourcePageId)
    if (arr) arr.push(rule)
    else map.set(rule.sourcePageId, [rule])
  }
  return map
}

/**
 * Simuliert den Pfad durch den Funnel für gegebene Antworten.
 *
 * Server-Backstop-Anwendung (/api/submit): Pflichtfelder werden nur für
 * BESUCHTE Pages validiert — eine per Sprung übersprungene Pflicht-Karte darf
 * einen echten Lead nicht blocken.
 *
 * `visibleSteps` muss dieselbe Liste sein, die das Widget rendert
 * (questions.filter(q => q.visible), in Reihenfolge).
 */
export function computePath(
  visibleSteps: ReadonlyArray<{ pageId?: string }>,
  rules: LogicRule[],
  answers: Record<string, string>,
): { visitedPageIds: Set<string>; visitedIndices: number[] } {
  const bySource = groupRulesBySource(rules)
  const visitedIndices: number[] = []
  const visitedPageIds = new Set<string>()

  let i = 0
  // Vorwärts-only ⇒ i wächst strikt; der Guard ist reine Defensive.
  let guard = visibleSteps.length + 1
  while (i < visibleSteps.length && guard-- > 0) {
    visitedIndices.push(i)
    const pageId = visibleSteps[i].pageId
    if (pageId) visitedPageIds.add(pageId)

    const target = pageId ? resolveNext(bySource.get(pageId), answers) : null
    if (target?.type === 'end') break
    if (target?.type === 'page') {
      const targetIdx = visibleSteps.findIndex((s, j) => j > i && s.pageId === target.pageId)
      i = targetIdx > i ? targetIdx : i + 1 // Rückwärts/nicht gefunden ⇒ linear weiter
    } else {
      i = i + 1
    }
  }
  return { visitedPageIds, visitedIndices }
}
