import { NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import { upsertSubmissionProgress, isRateLimited, updateEmailStatus, logHoneypot } from '@/lib/tracking'
import { sendAllEmails } from '@/lib/sendEmails'
import { validateContactField } from '@/lib/validateContactField'

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

  // 5. Dynamische Feldvalidierung gegen contactFields (aus submit-Page-Fields via getTenantConfig)
  const visibleRequired = tenantConfig.contactFields.filter((f) => f.visible && f.required)
  for (const field of visibleRequired) {
    const err = validateContactField(field, contact[field.key] ?? '')
    if (err) {
      return NextResponse.json({ error: `Validation failed: ${field.key}` }, { status: 400 })
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
    contact,
    answers,
    leadPrice,
    sourceUrl,
    userAgent,
    ipAddress:  ip ?? undefined,
    completed:  true,
  })

  // 8. E-Mails senden (Fehler loggen, nicht werfen – Endkunde bekommt immer success:true)
  let emailResults = { customer: false, tenant: false }
  try {
    emailResults = await sendAllEmails({
      contact,
      answers,
      tenantConfig,
      submittedAt: new Date(),
    })
  } catch (err) {
    console.error('submit route: email pipeline failed', err)
  }

  // 9. Email-Status in DB schreiben
  if (submissionId) {
    await updateEmailStatus(submissionId, emailResults.customer, emailResults.tenant)
  }

  return NextResponse.json({ success: true })
}
