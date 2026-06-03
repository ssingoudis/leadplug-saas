import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Aufgabe 40 — Subscription Detail/Update/Delete
//
// Endpoints:
//   GET    /api/tenant/funnels/[slug]/webhooks/[id]
//   PATCH  /api/tenant/funnels/[slug]/webhooks/[id]  (url, is_active, trigger_*, event_types)
//   DELETE /api/tenant/funnels/[slug]/webhooks/[id]
//
// Secret-Rotation läuft separat über PATCH-Body { rotate_secret: true } —
// returnt das neue Secret 1× im Klartext.
// =============================================================================

interface PatchBody {
  url?: string
  name?: string
  is_active?: boolean
  trigger_type?: 'on_submit' | 'after_page'
  trigger_page_id?: string | null
  event_types?: string[]
  rotate_secret?: boolean
}

const URL_PATTERN = /^https?:\/\/[^\s]{6,}$/i

async function loadSubscriptionWithFunnelCheck(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  slug: string,
  subId: string,
) {
  // RLS lässt uns nur eigene Tenants sehen → schon abgesichert.
  // Wir prüfen zusätzlich dass die Subscription wirklich zum Funnel-Slug aus der
  // URL gehört (verhindert "Tenant kennt sub-id, ruft sie über fremden Slug auf").
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return null

  const { data: sub } = await supabase
    .from('webhook_subscriptions')
    .select('id, funnel_id, tenant_id, name, url, secret, event_types, trigger_type, trigger_page_id, is_active, created_at, updated_at')
    .eq('id', subId)
    .eq('funnel_id', funnel.id)
    .maybeSingle()
  return sub
}

function maskSecret(secret: string): string {
  if (!secret || secret.length <= 12) return '••••••••'
  return `${secret.slice(0, 6)}••••••••${secret.slice(-4)}`
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
  return NextResponse.json({ ...sub, secret: maskSecret(sub.secret) })
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

  if (typeof body.url === 'string') {
    if (!URL_PATTERN.test(body.url.trim())) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    patch.url = body.url.trim()
  }
  if (typeof body.name === 'string' && body.name.trim()) {
    patch.name = body.name.trim()
  }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (Array.isArray(body.event_types)) {
    patch.event_types = body.event_types.filter((s) => typeof s === 'string' && s.length > 0)
  }

  if (body.trigger_type === 'on_submit' || body.trigger_type === 'after_page') {
    patch.trigger_type = body.trigger_type
    if (body.trigger_type === 'on_submit') {
      patch.trigger_page_id = null
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'trigger_page_id')) {
    const newTriggerType = patch.trigger_type ?? sub.trigger_type
    if (newTriggerType === 'after_page') {
      if (typeof body.trigger_page_id !== 'string' || !body.trigger_page_id) {
        return NextResponse.json({ error: 'trigger_page_id required for after_page' }, { status: 400 })
      }
      // Page muss zu diesem Funnel gehören
      const { data: page } = await supabase
        .from('pages')
        .select('id, funnel_id')
        .eq('id', body.trigger_page_id)
        .maybeSingle()
      if (!page || page.funnel_id !== sub.funnel_id) {
        return NextResponse.json({ error: 'trigger_page_id does not belong to this funnel' }, { status: 400 })
      }
      patch.trigger_page_id = body.trigger_page_id
    }
  }

  let revealedSecret: string | null = null
  if (body.rotate_secret === true) {
    const { generateWebhookSecret } = await import('@/lib/webhooks')
    revealedSecret = generateWebhookSecret()
    patch.secret = revealedSecret
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Empty patch' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .update(patch)
    .eq('id', id)
    .select('id, name, url, secret, event_types, trigger_type, trigger_page_id, is_active, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({
    ...data,
    secret: revealedSecret ?? maskSecret(data.secret),
    secret_revealed: revealedSecret !== null,
  })
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
    .from('webhook_subscriptions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
