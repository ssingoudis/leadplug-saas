import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { slug, referrer } = await req.json().catch(() => ({}))
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Admin-Dashboard öffnet den Funnel in einem iframe — nicht mitzählen.
  if (typeof referrer === 'string' && referrer.includes('/admin/')) {
    return NextResponse.json({ ok: true })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !key) return NextResponse.json({ ok: true })

  const supabase = createClient(supabaseUrl, key)

  // Aufgabe 46 (Phase 3): funnel_view_logs ist die einzige Aufruf-Quelle (Zeitstempel
  // → per-Periode aufschlüsselbar). Der frühere total_views-Zähler entfällt.
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id, tenant_id')
    .eq('slug', slug)
    .single()

  if (funnel) {
    await supabase
      .from('funnel_view_logs')
      .insert({ funnel_id: funnel.id, tenant_id: funnel.tenant_id })
      .then(({ error }) => { if (error) console.error('[track-view] log error:', error.message) })
  }

  return NextResponse.json({ ok: true })
}
