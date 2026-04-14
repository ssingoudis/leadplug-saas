import { NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/getTenantConfig'
import { calculateEstimate } from '@/lib/priceCalculator'
import { getMonthlyCount, logSubmission } from '@/lib/tracking'
import { generatePDF } from '@/lib/generatePDF'
import { sendAllEmails } from '@/lib/sendEmails'
import type { ContactData, SubmitPayload } from '@/types'

export const runtime = 'nodejs'

function isValidPayload(value: unknown): value is SubmitPayload {
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
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { tenant, answers, contact } = payload as SubmitPayload & {
    contact: ContactData
  }

  const tenantConfig = await getTenantConfig(tenant)
  if (!tenantConfig) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const estimate = calculateEstimate(answers, tenantConfig.pricing)

  await logSubmission({
    tenantSlug: tenant,
    contact,
    answers,
    estimate,
  })

  const submittedAt = new Date()

  try {
    const [pdfBuffer, monthlyCount] = await Promise.all([
      generatePDF({ contact, answers, estimate, tenantConfig }),
      getMonthlyCount(tenant),
    ])

    await sendAllEmails({
      contact,
      answers,
      estimate,
      tenantConfig,
      pdfBuffer,
      monthlyCount,
      submittedAt,
    })
  } catch (err) {
    console.error('submit route: PDF/email pipeline failed', err)
  }

  return NextResponse.json({ success: true })
}