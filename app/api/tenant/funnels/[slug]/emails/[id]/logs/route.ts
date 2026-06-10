import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/tenant/funnels/[slug]/emails/[id]/logs?limit=50
// Letzte N delivery_attempts. RLS via subscription → tenant.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const url = new URL(req.url)
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50')))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: sub } = await supabase
    .from('email_subscriptions')
    .select('id')
    .eq('id', id)
    .eq('funnel_id', funnel.id)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  const { data: attempts, error } = await supabase
    .from('email_delivery_attempts')
    .select('id, scheduled_at, attempt_count, status, last_error, resend_message_id, recipient_address, delivered_at, next_retry_at, created_at, is_test')
    .eq('subscription_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(attempts ?? [])
}
