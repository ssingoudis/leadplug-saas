import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { tenant, funnel, questions } = await req.json()

  const { error: tenantError } = await supabase.from('tenants').insert(tenant)
  if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 400 })

  const { error: funnelError } = await supabase.from('funnels').insert(funnel)
  if (funnelError) return NextResponse.json({ error: funnelError.message }, { status: 400 })

  if (questions?.length > 0) {
    const { error: qError } = await supabase.from('funnel_questions').insert(questions)
    if (qError) return NextResponse.json({ error: qError.message }, { status: 400 })
  }

  return NextResponse.json({ slug: funnel.slug })
}
