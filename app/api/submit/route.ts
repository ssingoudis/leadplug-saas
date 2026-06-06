import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import {
  upsertSubmissionProgress,
  isRateLimited,
  logHoneypot,
  deriveContactFromAnswers,
  enrichContact,
} from '@/lib/tracking'
import { validateContactField } from '@/lib/validateContactField'
import { triggerOnSubmit, type SubmissionSnapshot } from '@/lib/webhooks'
import { triggerEmailsOnSubmit, aggregateEmailStatusForSubmission } from '@/lib/emails'

function getIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')
}

export const runtime = 'nodejs'

// UUID-v4-Form-Check (sessionId vom Widget — falls fehlt, generieren wir eine).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Grundcheck: body hat die erwartete Struktur (kein Typ-Prüfung der Felder — das macht
// die dynamische Feldvalidierung nach dem Laden der tenantConfig).
function isValidShape(value: unknown): value is {
  tenant: string
  answers: Record<string, string>
  contact: Record<string, string>
  sessionId?: string
  honeypot?: string
  sourceUrl?: string
  userAgent?: string
} {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.tenant !== 'string' || v.tenant.length === 0) return false
  if (!v.answers || typeof v.answers !== 'object') return false
  if (!v.contact || typeof v.contact !== 'object') return false
  return true
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ip = getIp(req)

  // 1. Honeypot – loggen + sofortiges Ende, keine Mail
  const raw = body as Record<string, unknown>
  if (typeof raw?.honeypot === 'string' && raw.honeypot.length > 0) {
    await logHoneypot({
      funnelSlug: typeof raw.tenant === 'string' ? raw.tenant : undefined,
      ipAddress:  ip ?? undefined,
    })
    return NextResponse.json({ success: true })
  }

  // 2. Rate Limiting – max. 3 Submissions pro IP in 10 Minuten
  if (ip && await isRateLimited(ip)) {
    return NextResponse.json({ success: true })
  }

  // 3. Struktur-Check
  if (!isValidShape(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { tenant, answers, contact } = body
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl : ''
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : ''
  // sessionId vom Widget — falls keine kommt (legacy clients), generieren wir eine,
  // damit die UPSERT-Spalte session_id NOT NULL erfüllt ist.
  const sessionId =
    typeof body.sessionId === 'string' && UUID_RE.test(body.sessionId)
      ? body.sessionId
      : crypto.randomUUID()

  // 4. Tenant-Config laden
  const tenantConfig = await getTenantConfig(tenant)
  if (!tenantConfig || !tenantConfig.id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Aufgabe 35: Skip-Mode → keine Submit-Page-Validation (Submit-Page wird vom Widget gar nicht gerendert).
  // Stattdessen contact aus answers synthetisieren (Pattern-Match auf Email/Telefon/Name), damit
  // Pricing-Logik (contact->>'email') + Mail-Versand weiter funktionieren.
  // Aufgabe 40 Polish: contact-Anreicherung läuft IMMER über beide Wege.
  // deriveContactFromAnswers extrahiert Name/Email/Telefon aus answers
  // (= Question-Pages + Custom-Karten-Felder).
  // enrichContact extrahiert dieselben aus dem Submit-Page-contact.
  // Submit-Mode wie Skip-Mode profitieren so von Custom-Karte mit Name-Fields.
  const skipMode = tenantConfig.skipSubmitStep ?? false
  const fromAnswers = deriveContactFromAnswers(answers, tenantConfig)
  const fromContact = enrichContact(contact, tenantConfig)
  const effectiveContact = { ...fromAnswers, ...fromContact }

  // 5. Dynamische Feldvalidierung
  if (!skipMode) {
    // Submit-Page-Modus (Alt-Funnels): Pflicht-Felder der Submit-Page prüfen.
    const visibleRequired = tenantConfig.contactFields.filter((f) => f.visible && f.required)
    for (const field of visibleRequired) {
      const err = validateContactField(field, effectiveContact[field.key] ?? '')
      if (err) {
        return NextResponse.json({ error: `Validation failed: ${field.key}` }, { status: 400 })
      }
    }
  } else {
    // Aufgabe 51 Backstop: im skip-mode (kein Kontaktformular) kommen die Lead-Daten aus den
    // Card-Feldern (answers, keyed by field_key). Pflicht-Card-Felder serverseitig prüfen —
    // zweites Schloss gegen Direct-POST. Das Widget erzwingt dieselben Regeln, echte Leads
    // passieren also immer (kein Geld-Verlust).
    for (const q of tenantConfig.questions) {
      if (q.kind !== 'custom' || !q.customFields) continue
      for (const field of q.customFields) {
        if (!field.visible || !field.required) continue
        const err = validateContactField(field, answers[field.key] ?? '')
        if (err) {
          return NextResponse.json({ error: `Validation failed: ${field.key}` }, { status: 400 })
        }
      }
    }
  }

  // 6. lead_price server-side aus Tenant-Config ableiten – niemals vom Client vertrauen
  const leadPrice =
    tenantConfig.billingModel === 'per_lead' ? tenantConfig.leadPrice : 0

  // 7. Submission als COMPLETED loggen (UPSERT — falls schon partielle Session existiert, wird sie ergänzt + completed_at gesetzt)
  const submissionId = await upsertSubmissionProgress({
    sessionId,
    funnelSlug: tenant,
    tenantId:   tenantConfig.id,
    contact:    effectiveContact,
    answers,
    leadPrice,
    sourceUrl,
    userAgent,
    ipAddress:  ip ?? undefined,
    completed:  true,
  })

  // 8. Webhooks + E-Mails (Aufgabe 40 / 41 — Action-Element-Modell)
  //
  // Fire-and-forget via next/server `after()`: die Response geht sofort raus, der
  // Webhook- und Mail-Versand läuft asynchron weiter. Failures landen als
  // delivery_attempts mit status='retrying' + next_retry_at — der Cron holt sie.
  //
  // E-Mails ersetzen den hartkodierten sendAllEmails-Pfad. Bestehende Funnels haben
  // durch den Migration-Backfill aus Aufgabe 41 zwei Default-Subscriptions
  // (Customer-Confirmation + Tenant-Notification), das alte Verhalten bleibt 1:1.
  if (submissionId && tenantConfig.funnelId) {
    const snapshot: SubmissionSnapshot = {
      id:           submissionId,
      session_id:   sessionId,
      funnel_slug:  tenant,
      tenant_id:    tenantConfig.id ?? null,
      contact:      effectiveContact,
      answers,
      source_url:   sourceUrl || null,
      created_at:   new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }
    after(
      triggerOnSubmit(tenantConfig.funnelId, 'submission.completed', snapshot, tenantConfig)
        .catch((err) => console.error('submit route: webhook trigger failed', err))
    )
    after(
      triggerEmailsOnSubmit(tenantConfig.funnelId, snapshot, tenantConfig)
        .then(() => aggregateEmailStatusForSubmission(submissionId))
        .catch((err) => console.error('submit route: email trigger failed', err))
    )
  }

  return NextResponse.json({ success: true })
}
