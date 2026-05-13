import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { slug } = await req.json().catch(() => ({}))
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !key) return NextResponse.json({ ok: true })

  const supabase = createClient(supabaseUrl, key)
  await supabase.rpc('increment_funnel_views', { funnel_slug: slug })

  return NextResponse.json({ ok: true })
}
