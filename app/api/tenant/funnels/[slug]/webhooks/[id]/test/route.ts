import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestPayload } from '@/lib/webhooks'

// POST /api/tenant/funnels/[slug]/webhooks/[id]/test
// Triggert einen Test-Webhook mit Mock-Daten. Resultat landet als regulärer
// delivery_attempts-Eintrag (event_type='webhook.test') — Tenant sieht's im
// Logs-Drawer.

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Subscription-Lookup mit Funnel-Cross-Check (verhindert ID-Guessing fremder Tenants)
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: sub } = await supabase
    .from('webhook_subscriptions')
    .select('id')
    .eq('id', id)
    .eq('funnel_id', funnel.id)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  // sendTestPayload macht den Lookup + Mock + POST + Logging selbst (admin-Client).
  // Wir geben Sub-ID rein — die DB-Schreibrechte sind innerhalb des Service-Keys.
  const result = await sendTestPayload(sub.id)
  return NextResponse.json(result)
}
