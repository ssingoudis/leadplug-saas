import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import {
  upsertSubmissionProgress,
  logHoneypot,
  deriveContactFromAnswers,
} from '@/lib/tracking'
import { triggerOnPageAdvance, type SubmissionSnapshot } from '@/lib/webhooks'

function getIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')
}

export const runtime = 'nodejs'

// UUID-Form-Check ohne externe Lib (RFC 4122 v4-ähnlich).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidShape(value: unknown): value is {
  sessionId: string
  tenant: string
  answers: Record<string, string>
  contact: Record<string, string>
  honeypot?: string
  sourceUrl?: string
  userAgent?: string
} {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.sessionId !== 'string' || !UUID_RE.test(v.sessionId)) return false
  if (typeof v.tenant !== 'string' || v.tenant.length === 0) return false
  if (!v.answers || typeof v.answers !== 'object') return false
  if (!v.contact || typeof v.contact !== 'object') return false
  return true
}

/**
 * Partial-Submissions-Endpoint (Aufgabe 34).
 * Wird vom Widget bei jeder Antwort-Änderung gefeuert (debounced clientseitig).
 * UPSERT auf submissions.session_id. completed_at bleibt NULL — finaler Submit-Endpoint
 * /api/submit setzt completed_at + triggert Mails.
 *
 * Bewusste Verzichte für Performance:
 * - Kein Rate-Limit-Check (sonst landet ein Tipp-User mit 30 Keystrokes im Rate-Limit)
 * - Keine Validation der Kontakt-Felder (das passiert beim finalen Submit)
 * - Honeypot-Check JA, weil Bots damit gefiltert werden bevor sie überhaupt persistieren
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ip = getIp(req)

  // Honeypot — Bot-Filter, kein Persist
  const raw = body as Record<string, unknown>
  if (typeof raw?.honeypot === 'string' && raw.honeypot.length > 0) {
    await logHoneypot({
      funnelSlug: typeof raw.tenant === 'string' ? raw.tenant : undefined,
      ipAddress:  ip ?? undefined,
    })
    return NextResponse.json({ success: true })
  }

  if (!isValidShape(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { sessionId, tenant, answers } = body
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl : ''
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : ''
  // Aufgabe 40 Polish: optionaler Page-Advance-Trigger.
  // Vom Widget gesetzt wenn user über eine Page advancet → triggert after_page-Webhooks
  // (mit server-side Dedup via webhook_delivery_attempts).
  const advancedPageId =
    typeof (body as Record<string, unknown>).advancedPageId === 'string' &&
    UUID_RE.test((body as Record<string, unknown>).advancedPageId as string)
      ? ((body as Record<string, unknown>).advancedPageId as string)
      : null

  const tenantConfig = await getTenantConfig(tenant)
  if (!tenantConfig || !tenantConfig.id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const leadPrice =
    tenantConfig.billingModel === 'per_lead' ? tenantConfig.leadPrice : 0

  // Aufgabe 52D: contact wird aus den Karten-Antworten abgeleitet (Submit-Page abgeschafft).
  // Damit trifft die Pricing-Logik (contact->>'email') auch für Abbrecher.
  const effectiveContact = deriveContactFromAnswers(answers, tenantConfig)

  const { id: submissionId } = await upsertSubmissionProgress({
    sessionId,
    funnelSlug: tenant,
    tenantId:   tenantConfig.id,
    contact:    effectiveContact,
    answers,
    leadPrice,
    sourceUrl,
    userAgent,
    ipAddress: ip ?? undefined,
    completed: false,
  })

  // Aufgabe 40 Polish: after_page-Webhook-Trigger.
  // Fire-and-forget via after() — Response geht sofort raus, Webhook läuft im Hintergrund.
  // server-side Dedup in triggerOnPageAdvance verhindert Doppel-Trigger pro Page+Submission.
  if (advancedPageId && submissionId && tenantConfig.funnelId) {
    const snapshot: SubmissionSnapshot = {
      id:           submissionId,
      session_id:   sessionId,
      funnel_slug:  tenant,
      tenant_id:    tenantConfig.id ?? null,
      contact:      effectiveContact,
      answers,
      source_url:   sourceUrl || null,
      created_at:   new Date().toISOString(),
      completed_at: null,
    }
    after(
      triggerOnPageAdvance(tenantConfig.funnelId, advancedPageId, snapshot, tenantConfig)
        .catch((err) => console.error('track-progress route: after_page trigger failed', err))
    )
  }

  return NextResponse.json({ success: true })
}
