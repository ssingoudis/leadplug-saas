import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapLogicRuleRow } from '@/lib/logic/logicRuleMapping'

// =============================================================================
// Aufgabe 58 — Logik-Regeln eines Funnels (lesend).
//
// GET /api/tenant/funnels/[slug]/logic → LogicRule[] (camelCase, sortiert)
//   Konsumenten: EditorShell (StepList-Badges, Panel-Kurzfassung, Test-Modus-
//   Runtime im Canvas). Schreiben läuft über PUT /logic/[pageId] (RPC, atomar).
//
// User-Client + RLS (tenant-scoped SELECT-Policy auf funnel_logic_rules).
// =============================================================================

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Funnel via RLS (filtert automatisch auf eigene Tenants)
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: rules, error } = await supabase
    .from('funnel_logic_rules')
    .select('id, source_page_id, sort_order, is_fallback, conditions, target_type, target_page_id')
    .eq('funnel_id', funnel.id)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((rules ?? []).map(mapLogicRuleRow))
}
