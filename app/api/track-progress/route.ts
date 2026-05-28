import { NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import { upsertSubmissionProgress, logHoneypot, deriveContactFromAnswers } from '@/lib/tracking'

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

  const { sessionId, tenant, answers, contact } = body
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl : ''
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : ''

  const tenantConfig = await getTenantConfig(tenant)
  if (!tenantConfig || !tenantConfig.id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const leadPrice =
    tenantConfig.billingModel === 'per_lead' ? tenantConfig.leadPrice : 0

  // Aufgabe 35: im Skip-Mode (kein Submit-Schritt) bleibt contact aus dem Widget leer.
  // Damit Pricing-Logik (contact->>'email') auch für Abbrecher trifft, synthetisieren
  // wir contact aus den answers per Pattern-Match.
  const skipMode = tenantConfig.skipSubmitStep ?? false
  const effectiveContact = skipMode
    ? { ...deriveContactFromAnswers(answers), ...contact }
    : contact

  await upsertSubmissionProgress({
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

  return NextResponse.json({ success: true })
}
