import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWebhookSecret, validateWebhookUrl } from '@/lib/webhooks'

// =============================================================================
// Aufgabe 40 — Subscription-CRUD (funnel-scoped Webhooks)
//
// RLS:
//   • SELECT/INSERT/UPDATE/DELETE auf webhook_subscriptions ist tenant-restricted
//     (Policies aus B.6 + Aufgabe 25).
//   • Funnel-Zugehörigkeit prüfen wir hier explizit: funnel.tenant_id muss
//     im current_tenant_ids() liegen, weil sonst ein Member von Tenant A
//     einen Funnel von Tenant B per slug-Guessing aufrufen könnte.
//
// Endpoints:
//   GET  /api/tenant/funnels/[slug]/webhooks       → Liste der Subscriptions
//   POST /api/tenant/funnels/[slug]/webhooks       → neue Subscription anlegen
// =============================================================================

interface CreateBody {
  url: string
  name?: string
  trigger_type?: 'on_submit' | 'after_page'
  trigger_page_id?: string | null
  event_types?: string[]
  is_active?: boolean
}

// Aufgabe 50: Default-Name aus dem URL-Host ableiten (z.B. "webhook.site"), wenn der
// Tenant keinen eigenen Namen angibt. So ist ein Webhook nie namenlos.
function deriveWebhookName(url: string): string {
  try {
    const host = new URL(url).hostname
    return host || 'Webhook'
  } catch {
    return 'Webhook'
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Funnel laden via RLS (filtert automatisch auf eigene Tenants)
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: subs, error } = await supabase
    .from('webhook_subscriptions')
    .select('id, name, url, secret, event_types, trigger_type, trigger_page_id, is_active, created_at, updated_at')
    .eq('funnel_id', funnel.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Secret nur als maskierten Hint zurückgeben (vollständig zeigen wir nur 1x
  // direkt nach dem Create — siehe POST unten).
  const masked = (subs ?? []).map((s) => ({
    ...s,
    secret: maskSecret(s.secret),
  }))
  return NextResponse.json(masked)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // tenant_id vom Funnel ableiten — RLS filtert bereits auf eigene Tenants.
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id, tenant_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as CreateBody | null
  if (!body?.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }
  // Aufgabe 54b: gehärtete Validierung (nur https, keine privaten/internen Ziele — SSRF-Schutz)
  const urlError = validateWebhookUrl(body.url.trim())
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400 })
  }

  const triggerType = body.trigger_type === 'after_page' ? 'after_page' : 'on_submit'
  const triggerPageId = triggerType === 'after_page'
    ? (typeof body.trigger_page_id === 'string' && body.trigger_page_id ? body.trigger_page_id : null)
    : null
  if (triggerType === 'after_page' && !triggerPageId) {
    return NextResponse.json({ error: 'trigger_page_id required when trigger_type=after_page' }, { status: 400 })
  }

  // Validierung für after_page: page muss zu diesem Funnel gehören
  if (triggerPageId) {
    const { data: page } = await supabase
      .from('pages')
      .select('id, funnel_id')
      .eq('id', triggerPageId)
      .maybeSingle()
    if (!page || page.funnel_id !== funnel.id) {
      return NextResponse.json({ error: 'trigger_page_id does not belong to this funnel' }, { status: 400 })
    }
  }

  const eventTypes = Array.isArray(body.event_types)
    ? body.event_types.filter((s) => typeof s === 'string' && s.length > 0)
    : (triggerType === 'on_submit' ? ['submission.completed'] : ['step.advanced'])

  const secret = generateWebhookSecret()
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .insert({
      funnel_id:       funnel.id,
      tenant_id:       funnel.tenant_id,
      name:            (typeof body.name === 'string' && body.name.trim()) ? body.name.trim() : deriveWebhookName(body.url.trim()),
      url:             body.url.trim(),
      secret,
      event_types:     eventTypes,
      trigger_type:    triggerType,
      trigger_page_id: triggerPageId,
      is_active:       body.is_active !== false,
    })
    .select('id, name, url, secret, event_types, trigger_type, trigger_page_id, is_active, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Erste + einzige Antwort die das volle Secret zurückgibt — UI zeigt's
  // 1× an mit Copy-Button, danach nur maskiert.
  return NextResponse.json({ ...data, secret_revealed: true })
}

// ---------------------------------------------------------------------------

function maskSecret(secret: string): string {
  if (!secret) return ''
  if (secret.length <= 12) return '••••••••'
  // Stripe-Style: "whsec_••••••••<last4>"
  const last4 = secret.slice(-4)
  return `${secret.slice(0, 6)}••••••••${last4}`
}
