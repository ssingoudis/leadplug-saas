import { Resend } from 'resend'
import { CustomerConfirmation } from '@/emails/CustomerConfirmation'
import { TenantLeadNotification } from '@/emails/TenantLeadNotification'
import type { ContactData, TenantConfig } from '@/types'

type SendAllEmailsParams = {
  contact: ContactData
  answers: Record<string, string>
  tenantConfig: TenantConfig
  submittedAt?: Date
}

type EmailResults = {
  customer: boolean
  tenant: boolean
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

export async function sendAllEmails(
  params: SendAllEmailsParams,
): Promise<EmailResults> {
  const resend = getResendClient()
  if (!resend) {
    return { customer: false, tenant: false }
  }

  const {
    contact,
    answers,
    tenantConfig,
    submittedAt = new Date(),
  } = params

  const emailDomain = process.env.EMAIL_DOMAIN
  const senderLocal = tenantConfig.emailSenderLocal
  const from =
    senderLocal && emailDomain
      ? `${senderLocal}@${emailDomain}`
      : (process.env.EMAIL_FROM ?? 'noreply@example.com')

  const customerPromise = resend.emails
    .send({
      from,
      to: contact.email,
      subject: `Ihre Anfrage bei ${tenantConfig.companyName}`,
      react: CustomerConfirmation({ contact, answers, tenantConfig }),
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
      to: tenantConfig.notificationEmail,
      replyTo: contact.email,
      subject: `Neue Anfrage von ${contact.name}`,
      react: TenantLeadNotification({ contact, answers, tenantConfig, submittedAt }),
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

  const [customer, tenant] = await Promise.all([customerPromise, tenantPromise])

  return { customer, tenant }
}
