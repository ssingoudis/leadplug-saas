import { NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import { logSubmission } from '@/lib/tracking'
import { sendAllEmails } from '@/lib/sendEmails'
import type { ContactData } from '@/types'

export const runtime = 'nodejs'

function isValidPayload(value: unknown): value is {
  tenant: string
  answers: Record<string, string>
  contact: ContactData
  honeypot?: string
  sourceUrl?: string
  userAgent?: string
} {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.tenant !== 'string' || v.tenant.length === 0) return false
  if (!v.answers || typeof v.answers !== 'object') return false
  if (!v.contact || typeof v.contact !== 'object') return false
  const c = v.contact as Record<string, unknown>
  return (
    typeof c.name === 'string' &&
    c.name.length > 0 &&
    typeof c.email === 'string' &&
    c.email.includes('@') &&
    typeof c.telefon === 'string' &&
    typeof c.anrede === 'string'
  )
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 1. Honeypot – sofortiges Ende, kein DB-Eintrag, keine Mail
  const raw = body as Record<string, unknown>
  if (typeof raw?.honeypot === 'string' && raw.honeypot.length > 0) {
    return NextResponse.json({ success: true })
  }

  // 2. Payload-Shape-Check
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { tenant, answers, contact } = body
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl : ''
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : ''

  // 3. Tenant-Config laden
  const tenantConfig = await getTenantConfig(tenant)
  if (!tenantConfig) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // 4. lead_price server-side aus Tenant-Config ableiten – niemals vom Client vertrauen
  const leadPrice =
    tenantConfig.billingModel === 'per_lead' ? tenantConfig.leadPriceBase : 0

  // 5. Submission loggen
  /* alte Datenbank solar-widget
  await logSubmission({
    tenantSlug: tenant,
    tenantId: tenantConfig.id,
    contact,
    answers,
    leadPrice,
    billingModel: tenantConfig.billingModel,
    startedAt,
    sourceUrl,
    userAgent,
  })
  */

  // neue Datenbank widget-funnel
  await logSubmission({
    funnelSlug: tenant,
    tenantSlug: tenantConfig.tenantSlug,
    contact,
    answers,
    leadPrice,
    sourceUrl,
    userAgent,
  })

  // 6. E-Mails senden (Fehler loggen, nicht werfen – Endkunde bekommt immer success:true)
  try {
    await sendAllEmails({
      contact,
      answers,
      tenantConfig,
      submittedAt: new Date(),
    })
  } catch (err) {
    console.error('submit route: email pipeline failed', err)
  }

  return NextResponse.json({ success: true })
}
