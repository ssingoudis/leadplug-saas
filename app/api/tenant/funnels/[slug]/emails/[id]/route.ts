import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Aufgabe 41 — Email-Subscription Detail/Update/Delete (Drip-Modell)
// =============================================================================

export const runtime = 'nodejs'

interface PatchBody {
  name?:            string
  recipient_type?:  'customer' | 'tenant' | 'custom'
  recipient_value?: string | null
  delay_minutes?:   number
  subject?:         string
  body_html?:       string
  from_local?:      string | null
  is_active?:       boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function loadSubscriptionWithFunnelCheck(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  slug: string,
  subId: string,
) {
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return null

  const { data: sub } = await supabase
    .from('email_subscriptions')
    .select('id, funnel_id, tenant_id, name, recipient_type, recipient_value, delay_minutes, subject, body_html, from_local, is_active, created_at, updated_at')
    .eq('id', subId)
    .eq('funnel_id', funnel.id)
    .maybeSingle()
  return sub
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await loadSubscriptionWithFunnelCheck(supabase, slug, id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sub)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await loadSubscriptionWithFunnelCheck(supabase, slug, id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await req.json()) as PatchBody
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {}

  if (typeof body.name === 'string') {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: 'name darf nicht leer sein' }, { status: 400 })
    patch.name = n
  }
  if (typeof body.subject === 'string') {
    const s = body.subject.trim()
    if (!s) return NextResponse.json({ error: 'subject darf nicht leer sein' }, { status: 400 })
    patch.subject = s
  }
  if (typeof body.body_html === 'string') {
    if (!body.body_html.trim()) {
      return NextResponse.json({ error: 'body_html darf nicht leer sein' }, { status: 400 })
    }
    patch.body_html = body.body_html
  }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active

  if (Number.isFinite(body.delay_minutes)) {
    const v = Math.floor(Number(body.delay_minutes))
    if (v < 0) return NextResponse.json({ error: 'delay_minutes muss >= 0 sein' }, { status: 400 })
    patch.delay_minutes = v
  }

  if (Object.prototype.hasOwnProperty.call(body, 'from_local')) {
    patch.from_local = body.from_local && body.from_local.trim() ? body.from_local.trim() : null
  }

  if (body.recipient_type === 'customer' || body.recipient_type === 'tenant' || body.recipient_type === 'custom') {
    patch.recipient_type = body.recipient_type
    if (body.recipient_type !== 'custom') patch.recipient_value = null
  }

  // recipient_value: nur akzeptieren bei custom, Email-Format prüfen
  // (kommagetrennte Liste, max 3 Adressen)
  if (Object.prototype.hasOwnProperty.call(body, 'recipient_value')) {
    const newType = patch.recipient_type ?? sub.recipient_type
    if (newType === 'custom') {
      const raw = (body.recipient_value ?? '').toString()
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
      patch.recipient_value = list.join(', ')
    } else {
      patch.recipient_value = null
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Empty patch' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('email_subscriptions')
    .update(patch)
    .eq('id', id)
    .select('id, name, recipient_type, recipient_value, delay_minutes, subject, body_html, from_local, is_active, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await loadSubscriptionWithFunnelCheck(supabase, slug, id)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('email_subscriptions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
