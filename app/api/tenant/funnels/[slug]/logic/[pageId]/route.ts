import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VALID_LOGIC_OPS } from '@/lib/logicRuleMapping'

// =============================================================================
// Aufgabe 58 — Regeln EINES Steps ersetzen (Save-Button im LogicRuleModal).
//
// PUT /api/tenant/funnels/[slug]/logic/[pageId]
// Body: { rules: Array<{ isFallback, conditions: [{fieldKey, op, value}],
//                        targetType: 'page'|'end', targetPageId }> }
//
// Schreibt via RPC replace_page_logic_rules (atomar, SECURITY INVOKER — RLS gilt).
// Server-seitige Härtung:
//   • Limits (≤20 Regeln, ≤5 Bedingungen, Wert-/Key-Längen), Ops-Whitelist
//   • max 1 Fallback, Fallback ohne Bedingungen, Nicht-Fallback braucht ≥1 Bedingung
//   • VORWÄRTS-ONLY: Ziel-Page muss zum Funnel gehören UND nach der Quell-Page
//     liegen (sort_order) — der Editor bietet ohnehin nur spätere Steps an,
//     hier ist das zweite Schloss gegen manipulierte Requests.
// =============================================================================

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_RULES = 20
const MAX_CONDITIONS = 5

interface IncomingCondition {
  fieldKey: string
  op: string
  value: string
}
interface IncomingRule {
  isFallback?: boolean
  conditions?: IncomingCondition[]
  targetType?: string
  targetPageId?: string | null
}

function validationError(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; pageId: string }> },
) {
  const { slug, pageId } = await params
  if (!UUID_RE.test(pageId)) return validationError('Ungültige Page-ID')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  // Pages des Funnels für Zugehörigkeits- + Vorwärts-Check (sort_order).
  const { data: pages, error: pagesErr } = await supabase
    .from('pages')
    .select('id, sort_order')
    .eq('funnel_id', funnel.id)
  if (pagesErr) return NextResponse.json({ error: pagesErr.message }, { status: 500 })

  const sortOrderById = new Map<string, number>((pages ?? []).map((p) => [p.id as string, Number(p.sort_order ?? 0)]))
  const sourceSortOrder = sortOrderById.get(pageId)
  if (sourceSortOrder === undefined) {
    return NextResponse.json({ error: 'Page gehört nicht zu diesem Funnel' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return validationError('Invalid JSON')
  }
  const rawRules = (body as Record<string, unknown>).rules
  if (!Array.isArray(rawRules)) return validationError('rules muss ein Array sein')
  if (rawRules.length > MAX_RULES) return validationError(`Maximal ${MAX_RULES} Regeln pro Schritt`)

  let fallbackCount = 0
  const rpcRules: Array<Record<string, unknown>> = []

  for (const raw of rawRules as IncomingRule[]) {
    if (typeof raw !== 'object' || raw === null) return validationError('Ungültige Regel')
    const isFallback = Boolean(raw.isFallback)
    if (isFallback) fallbackCount++

    // Ziel validieren
    const targetType = raw.targetType === 'end' ? 'end' : 'page'
    let targetPageId: string | null = null
    if (targetType === 'page') {
      if (typeof raw.targetPageId !== 'string' || !UUID_RE.test(raw.targetPageId)) {
        return validationError('Ziel-Schritt fehlt oder ist ungültig')
      }
      const targetSort = sortOrderById.get(raw.targetPageId)
      if (targetSort === undefined) {
        return validationError('Ziel-Schritt gehört nicht zu diesem Funnel')
      }
      if (targetSort <= sourceSortOrder) {
        return validationError('Nur Vorwärts-Sprünge sind erlaubt')
      }
      targetPageId = raw.targetPageId
    }

    // Bedingungen validieren
    const conditions = Array.isArray(raw.conditions) ? raw.conditions : []
    if (isFallback && conditions.length > 0) {
      return validationError('„Alle anderen Fälle" darf keine Bedingungen haben')
    }
    if (!isFallback && conditions.length === 0) {
      return validationError('Eine Regel braucht mindestens eine Bedingung')
    }
    if (conditions.length > MAX_CONDITIONS) {
      return validationError(`Maximal ${MAX_CONDITIONS} Bedingungen pro Regel`)
    }
    const dbConditions: Array<Record<string, string>> = []
    for (const c of conditions) {
      if (typeof c !== 'object' || c === null) return validationError('Ungültige Bedingung')
      if (typeof c.fieldKey !== 'string' || !c.fieldKey.trim() || c.fieldKey.length > 200) {
        return validationError('Bedingungs-Feld fehlt oder ist ungültig')
      }
      if (typeof c.op !== 'string' || !VALID_LOGIC_OPS.has(c.op)) {
        return validationError('Ungültiger Bedingungs-Operator')
      }
      if (typeof c.value !== 'string' || c.value.length > 500) {
        return validationError('Bedingungs-Wert fehlt oder ist zu lang')
      }
      dbConditions.push({ field_key: c.fieldKey.trim(), op: c.op, value: c.value })
    }

    rpcRules.push({
      is_fallback:    isFallback,
      conditions:     dbConditions,
      target_type:    targetType,
      target_page_id: targetPageId,
    })
  }

  if (fallbackCount > 1) return validationError('Maximal eine „Alle anderen Fälle"-Regel pro Schritt')

  // Atomar via RPC (SECURITY INVOKER — RLS-Policies gelten für DELETE + INSERT).
  const { error: rpcErr } = await supabase.rpc('replace_page_logic_rules', {
    p_funnel_id:      funnel.id,
    p_source_page_id: pageId,
    p_rules:          rpcRules,
  })
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })

  return NextResponse.json({ success: true, count: rpcRules.length })
}
