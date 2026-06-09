import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import {
  upsertSubmissionProgress,
  isRateLimited,
  logHoneypot,
  deriveContactFromAnswers,
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

  // 2. Struktur-Check
  if (!isValidShape(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { tenant, answers } = body
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl : ''
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : ''
  // sessionId vom Widget — falls keine kommt (legacy clients), generieren wir eine,
  // damit die UPSERT-Spalte session_id NOT NULL erfüllt ist.
  const sessionId =
    typeof body.sessionId === 'string' && UUID_RE.test(body.sessionId)
      ? body.sessionId
      : crypto.randomUUID()

  // 3. Rate Limiting (Aufgabe 54): zählt nur completed Submissions der IP (10/10min),
  // eigene Session ausgenommen — geteilte IPs (Büro-NAT, CGNAT) blocken sich nicht
  // mehr gegenseitig über Partial-Rows. Läuft NACH dem Shape-Check, damit die
  // sessionId für die Ausnahme zur Verfügung steht.
  if (ip && await isRateLimited(ip, sessionId)) {
    return NextResponse.json({ success: true })
  }

  // 4. Tenant-Config laden
  const tenantConfig = await getTenantConfig(tenant)
  if (!tenantConfig || !tenantConfig.id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Aufgabe 52D: Submit-Page/Kontaktformular abgeschafft. contact wird ausschließlich aus den
  // Karten-Antworten abgeleitet (deriveContactFromAnswers extrahiert Name/Email/Telefon aus
  // answers — Question-Pages + Custom-Karten-Felder). Pricing-Logik (contact->>'email') +
  // Mail-Versand funktionieren damit weiter.
  const effectiveContact = deriveContactFromAnswers(answers, tenantConfig)

  // 5. Card-Backstop-Validierung: Pflicht-Felder der Kontaktdaten-Karten serverseitig prüfen —
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

  // 6. lead_price server-side aus Tenant-Config ableiten – niemals vom Client vertrauen
  const leadPrice =
    tenantConfig.billingModel === 'per_lead' ? tenantConfig.leadPrice : 0

  // 7. Submission als COMPLETED loggen (UPSERT — falls schon partielle Session existiert, wird sie ergänzt + completed_at gesetzt)
  const { id: submissionId, alreadyCompleted } = await upsertSubmissionProgress({
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

  // Aufgabe 54 — Idempotenz: War die Session schon completed (Doppelklick,
  // Netzwerk-Retry des Widgets), wurden Webhooks + Mails bereits beim Erst-Submit
  // getriggert. Nicht erneut feuern — sonst doppelte CRM-Events + doppelte Mails.
  if (alreadyCompleted) {
    return NextResponse.json({ success: true })
  }

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
