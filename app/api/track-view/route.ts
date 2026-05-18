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

  const [, { data: funnel }] = await Promise.all([
    supabase.rpc('increment_funnel_views', { funnel_slug: slug }),
    supabase.from('funnels').select('tenant_slug').eq('slug', slug).single(),
  ])

  if (funnel) {
    await supabase
      .from('funnel_view_logs')
      .insert({ funnel_slug: slug, tenant_slug: funnel.tenant_slug })
      .then(({ error }) => { if (error) console.error('[track-view] log error:', error.message) })
  }

  return NextResponse.json({ ok: true })
}
