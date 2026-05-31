import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Aufgabe 41 — E-Mail-Subscription-CRUD (Drip-Modell)
// =============================================================================

export const runtime = 'nodejs'

interface CreateBody {
  name:            string
  recipient_type:  'customer' | 'tenant' | 'custom'
  recipient_value?: string | null
  delay_minutes?:  number
  subject:         string
  body_html:       string
  from_local?:     string | null
  is_active?:      boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: subs, error } = await supabase
    .from('email_subscriptions')
    .select('id, name, recipient_type, recipient_value, delay_minutes, subject, body_html, from_local, is_active, created_at, updated_at')
    .eq('funnel_id', funnel.id)
    .order('delay_minutes', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(subs ?? [])
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await supabase
    .from('funnels')
    .select('id, tenant_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const body = (await req.json()) as CreateBody

  const name    = trim(body.name)
  const subject = trim(body.subject)
  const bodyHtml = typeof body.body_html === 'string' ? body.body_html : ''

  if (!name)    return NextResponse.json({ error: 'name erforderlich' }, { status: 400 })
  if (!subject) return NextResponse.json({ error: 'subject erforderlich' }, { status: 400 })
  if (!bodyHtml.trim()) return NextResponse.json({ error: 'body_html erforderlich' }, { status: 400 })

  const recipientType: 'customer' | 'tenant' | 'custom' =
    body.recipient_type === 'tenant' ? 'tenant'
    : body.recipient_type === 'custom' ? 'custom'
    : 'customer'

  let recipientValue: string | null = null
  if (recipientType === 'custom') {
    const raw = typeof body.recipient_value === 'string' ? body.recipient_value : ''
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length === 0) {
      return NextResponse.json({ error: 'recipient_value erforderlich bei recipient_type=custom' }, { status: 400 })
    }
    if (list.length > 3) {
      return NextResponse.json({ error: 'maximal 3 Empfänger-Adressen erlaubt' }, { status: 400 })
    }
    for (const addr of list) {
      if (!EMAIL_RE.test(addr)) {
        return NextResponse.json({ error: `Keine gültige E-Mail-Adresse: ${addr}` }, { status: 400 })
      }
    }
    recipientValue = list.join(', ')
  }

  const delayMinutes = Number.isFinite(body.delay_minutes) && Number(body.delay_minutes) >= 0
    ? Math.floor(Number(body.delay_minutes))
    : 0

  const fromLocal = body.from_local && trim(body.from_local) ? trim(body.from_local) : null

  const { data, error } = await supabase
    .from('email_subscriptions')
    .insert({
      funnel_id:       funnel.id,
      tenant_id:       funnel.tenant_id,
      name,
      recipient_type:  recipientType,
      recipient_value: recipientValue,
      delay_minutes:   delayMinutes,
      subject,
      body_html:       bodyHtml,
      from_local:      fromLocal,
      is_active:       body.is_active !== false,
    })
    .select('id, name, recipient_type, recipient_value, delay_minutes, subject, body_html, from_local, is_active, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }
  return NextResponse.json(data)
}
