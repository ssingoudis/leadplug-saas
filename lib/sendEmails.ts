import { Resend } from 'resend'
import { CustomerConfirmation } from '@/emails/CustomerConfirmation'
import { TenantLeadNotification } from '@/emails/TenantLeadNotification'
import { PlatformTracking } from '@/emails/PlatformTracking'
import type { ContactData, TenantConfig } from '@/types'

type PriceEstimate = { min: number; max: number; currency: string }

type SendAllEmailsParams = {
  contact: ContactData
  answers: Record<string, string>
  estimate: PriceEstimate
  tenantConfig: TenantConfig
  pdfBuffer: Buffer
  monthlyCount: number
  submittedAt?: Date
}

type EmailResults = {
  customer: boolean
  tenant: boolean
  platform: boolean
}

let cachedClient: Resend | null = null

function getResendClient(): Resend | null {
  if (cachedClient) return cachedClient
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('sendEmails: RESEND_API_KEY not set – skipping email send')
    return null
  }
  cachedClient = new Resend(apiKey)
  return cachedClient
}

const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export async function sendAllEmails(
  params: SendAllEmailsParams,
): Promise<EmailResults> {
  const resend = getResendClient()
  if (!resend) {
    return { customer: false, tenant: false, platform: false }
  }

  const {
    contact,
    answers,
    estimate,
    tenantConfig,
    pdfBuffer,
    monthlyCount,
    submittedAt = new Date(),
  } = params

  const from = process.env.EMAIL_FROM ?? 'noreply@solar-funnel.de'
  const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL

  const pdfFilename = `solar-angebot-${tenantConfig.slug}-${submittedAt
    .toISOString()
    .slice(0, 10)}.pdf`

  const customerPromise = resend.emails
    .send({
      from,
      to: contact.email,
      subject: `Ihre Solar-Preisschätzung von ${tenantConfig.companyName}`,
      react: CustomerConfirmation({
        contact,
        answers,
        estimate,
        tenantConfig,
      }),
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
    })
    .then(({ error }) => {
      if (error) {
        console.error('sendEmails: customer mail failed', error)
        return false
      }
      return true
    })
    .catch((err) => {
      console.error('sendEmails: customer mail threw', err)
      return false
    })

  const tenantPromise = resend.emails
    .send({
      from,
      to: tenantConfig.contactEmail,
      replyTo: contact.email,
      subject: `🔔 Neue Solar-Anfrage von ${contact.name}`,
      react: TenantLeadNotification({
        contact,
        answers,
        estimate,
        tenantConfig,
        submittedAt,
      }),
    })
    .then(({ error }) => {
      if (error) {
        console.error('sendEmails: tenant mail failed', error)
        return false
      }
      return true
    })
    .catch((err) => {
      console.error('sendEmails: tenant mail threw', err)
      return false
    })

  const platformPromise: Promise<boolean> = platformOwnerEmail
    ? resend.emails
        .send({
          from,
          to: platformOwnerEmail,
          subject: `[TRACKING] Submission – ${tenantConfig.slug} – ${dateFormat.format(
            submittedAt,
          )}`,
          react: PlatformTracking({
            tenantSlug: tenantConfig.slug,
            companyName: tenantConfig.companyName,
            contact,
            submittedAt,
            monthlyCount,
          }),
        })
        .then(({ error }) => {
          if (error) {
            console.error('sendEmails: platform mail failed', error)
            return false
          }
          return true
        })
        .catch((err) => {
          console.error('sendEmails: platform mail threw', err)
          return false
        })
    : Promise.resolve(false).then((v) => {
        console.error('sendEmails: PLATFORM_OWNER_EMAIL not set – skipping tracking mail')
        return v
      })

  const [customer, tenant, platform] = await Promise.all([
    customerPromise,
    tenantPromise,
    platformPromise,
  ])

  return { customer, tenant, platform }
}