import { Resend } from 'resend'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { renderEmail, RECIPIENT_ME, type TemplateContext } from '@/lib/emailTemplates'
import { DynamicEmail } from '@/emails/DynamicEmail'
import type { TenantConfig } from '@/types'
import type { SubmissionSnapshot } from '@/lib/webhooks'

// =============================================================================
// Aufgabe 41 — E-Mail-Drip-Sender
//
// Architektur (siehe Memory strategy_action_modell):
//
//   1. /api/submit ruft triggerEmailsOnSubmit auf
//      → für jede aktive Subscription wird ein email_delivery_attempts-Row
//        mit status='pending', scheduled_at = completed_at + delay_minutes,
//        attempt_count=0 angelegt.
//      → Mails mit delay=0 (= scheduled_at <= NOW()) werden via after()
//        sofort versendet (sendPendingForSubmission).
//
//   2. Cron alle 5 Min läuft 2 Schleifen:
//      a) due pending Mails: status='pending' AND scheduled_at <= NOW()
//         → versende (= delayed-Drip-Mails kommen aus dieser Schleife)
//      b) Retries: status='retrying' AND next_retry_at <= NOW()
//
//   3. Versand: HTML-Body kommt aus subscription.body_html (TipTap-Output),
//      renderEmail() expandiert die Magic-Sections + Variablen mit den
//      Submission-Daten.
//
//   4. Recipient: 'customer' = contact.email aus submission, 'tenant' = funnels.notification_email
// =============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RETRY_BACKOFF_MS: readonly number[] = [
  1  * 60 * 1000,
  5  * 60 * 1000,
  30 * 60 * 1000,
  2  * 60 * 60 * 1000,
  6  * 60 * 60 * 1000,
] as const

const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length + 1

export function nextRetryDelayMs(attemptCount: number): number | null {
  return RETRY_BACKOFF_MS[attemptCount - 1] ?? null
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

let cachedSupabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('emails: SUPABASE_URL / SUPABASE_SERVICE_KEY missing — sender disabled')
    return null
  }
  cachedSupabase = createClient(url, key, { auth: { persistSession: false } })
  return cachedSupabase
}

let cachedResend: Resend | null = null
function getResend(): Resend | null {
  if (cachedResend) return cachedResend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('emails: RESEND_API_KEY missing — sender disabled')
    return null
  }
  cachedResend = new Resend(apiKey)
  return cachedResend
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscriptionRow {
  id:              string
  funnel_id:       string
  tenant_id:       string
  name:            string
  recipient_type:  'customer' | 'tenant' | 'custom'
  recipient_value: string | null
  delay_minutes:   number
  subject:         string
  body_html:       string
  from_local:      string | null
  is_active:       boolean
}

interface AttemptRow {
  id:                string
  subscription_id:   string
  submission_id:     string | null
  scheduled_at:      string
  attempt_count:     number
  status:            'pending' | 'retrying' | 'success' | 'failed'
  recipient_address: string | null
}

// ---------------------------------------------------------------------------
// Recipient / From Resolution
// ---------------------------------------------------------------------------

/**
 * Löst den/die Empfänger einer Subscription auf. Returnt eine Liste, weil
 * recipient_type='custom' bis zu 3 kommagetrennte Adressen haben kann.
 * customer/tenant haben immer genau 1 Adresse (oder leer → reason gesetzt).
 */
function resolveRecipient(
  sub: SubscriptionRow,
  tenantConfig: TenantConfig,
  contact: Record<string, string>,
): { addresses: string[]; reason: string | null } {
  if (sub.recipient_type === 'customer') {
    const email = contact.email?.trim()
    if (!email) return { addresses: [], reason: 'Lead hat keine E-Mail' }
    return { addresses: [email], reason: null }
  }
  if (sub.recipient_type === 'tenant') {
    const email = tenantConfig.notificationEmail?.trim()
    if (!email) return { addresses: [], reason: 'Funnel hat keine notification_email' }
    return { addresses: [email], reason: null }
  }
  // custom — recipient_value ist kommagetrennt. Aufgabe 53: der Marker '@me' löst auf die
  // Funnel-Benachrichtigungs-Adresse auf (folgt der Account-Adresse), der Rest sind feste Adressen.
  const raw = (sub.recipient_value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  let inboxMissing = false
  for (const entry of raw) {
    if (entry === RECIPIENT_ME) {
      const inbox = tenantConfig.notificationEmail?.trim()
      if (inbox) { if (!out.includes(inbox)) out.push(inbox) }
      else inboxMissing = true
    } else if (!out.includes(entry)) {
      out.push(entry)
    }
  }
  if (out.length === 0) {
    return { addresses: [], reason: inboxMissing ? 'Funnel hat keine notification_email (für „Mein Postfach")' : 'Custom-Empfänger leer' }
  }
  return { addresses: out, reason: null }
}

// Aufgabe 53: „intern" = geht (auch) an dein eigenes Postfach → reply-to = Lead + Platform-Absender.
// Trifft auf recipient_type='tenant' (legacy) und custom-Listen mit dem '@me'-Marker zu.
function isInternalRecipient(sub: SubscriptionRow): boolean {
  if (sub.recipient_type === 'tenant') return true
  if (sub.recipient_type === 'custom') {
    return (sub.recipient_value ?? '').split(',').map((s) => s.trim()).includes(RECIPIENT_ME)
  }
  return false
}

function buildFromAddress(sub: SubscriptionRow, tenantConfig: TenantConfig): string {
  const emailDomain         = process.env.EMAIL_DOMAIN
  const emailDomainPlatform = process.env.EMAIL_DOMAIN_PLATFORM

  if (isInternalRecipient(sub) && emailDomainPlatform) {
    return `LeadPlug <anfrage@${emailDomainPlatform}>`
  }
  const local = sub.from_local?.trim() || tenantConfig.emailSenderLocal?.trim()
  if (local && emailDomain) {
    return `${tenantConfig.companyName} <${local}@${emailDomain}>`
  }
  const fallback = process.env.EMAIL_FROM ?? 'noreply@example.com'
  return `${tenantConfig.companyName} <${fallback}>`
}

// ---------------------------------------------------------------------------
// Send (Resend HTTP call, no DB writes)
// ---------------------------------------------------------------------------

interface SendResult {
  ok:               boolean
  resendMessageId:  string | null
  errorMessage:     string | null
  isPermanent:      boolean
}

async function sendOne(
  to: string | string[],
  from: string,
  subject: string,
  bodyHtml: string,
  preheader: string,
  primaryColor: string,
  companyName: string,
  replyTo: string | null,
): Promise<SendResult> {
  const resend = getResend()
  if (!resend) {
    return { ok: false, resendMessageId: null, errorMessage: 'Resend nicht konfiguriert', isPermanent: true }
  }
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      ...(replyTo ? { replyTo } : {}),
      react: DynamicEmail({ primaryColor, companyName, bodyHtml, preheader }),
    })
    if (error) {
      const name = (error.name ?? '').toString()
      const permanent =
        name === 'validation_error' ||
        name.startsWith('invalid_') ||
        name === 'missing_required_field'
      return {
        ok: false,
        resendMessageId: null,
        errorMessage: `${name || 'unknown'}: ${error.message ?? ''}`.trim(),
        isPermanent: permanent,
      }
    }
    return { ok: true, resendMessageId: data?.id ?? null, errorMessage: null, isPermanent: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, resendMessageId: null, errorMessage: message, isPermanent: false }
  }
}

// ---------------------------------------------------------------------------
// Render + Send + Persist (für ein pending attempt)
// ---------------------------------------------------------------------------

/**
 * Versendet einen einzelnen pending email_delivery_attempt: rendert Subject + Body
 * aus der Subscription + Submission, schickt via Resend, schreibt das Result
 * zurück in die attempt-Row.
 *
 * Wirft NICHT — Fehler landen als status='retrying' (mit next_retry_at) oder 'failed'.
 *
 * Hinweis: erwartet, dass attempt.recipient_address bereits gesetzt ist (wird beim
 * initialen INSERT in scheduleAttemptsForSubmission gesetzt).
 */
async function processAttempt(
  attemptId: string,
  supabase: SupabaseClient,
): Promise<void> {
  // 1. Laden mit Subscription-Join
  const { data: attempt, error: attErr } = await supabase
    .from('email_delivery_attempts')
    .select(`
      id, subscription_id, submission_id, attempt_count, recipient_address,
      email_subscriptions!email_delivery_attempts_subscription_id_fkey (
        id, funnel_id, tenant_id, name, recipient_type, recipient_value, delay_minutes,
        subject, body_html, from_local, is_active
      )
    `)
    .eq('id', attemptId)
    .maybeSingle()
  if (attErr || !attempt || !attempt.email_subscriptions) {
    console.error('emails/processAttempt: attempt or subscription not found', attErr, attemptId)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = attempt.email_subscriptions as any as SubscriptionRow

  if (!sub.is_active) {
    await supabase.from('email_delivery_attempts')
      .update({ status: 'failed', last_error: 'Subscription deactivated', next_retry_at: null })
      .eq('id', attemptId)
    return
  }
  if (!attempt.submission_id) {
    await supabase.from('email_delivery_attempts')
      .update({ status: 'failed', last_error: 'Submission no longer exists', next_retry_at: null })
      .eq('id', attemptId)
    return
  }
  if (!attempt.recipient_address) {
    await supabase.from('email_delivery_attempts')
      .update({ status: 'failed', last_error: 'Recipient address missing', next_retry_at: null })
      .eq('id', attemptId)
    return
  }

  // 2. Submission + TenantConfig laden
  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('id, session_id, funnel_slug, tenant_id, contact, answers, source_url, created_at, completed_at')
    .eq('id', attempt.submission_id)
    .maybeSingle()
  if (subErr || !submission) {
    await supabase.from('email_delivery_attempts')
      .update({ status: 'failed', last_error: 'Submission load failed', next_retry_at: null })
      .eq('id', attemptId)
    return
  }

  const { getTenantConfig } = await import('@/lib/getTenantConfig')
  const tenantConfig = await getTenantConfig(submission.funnel_slug as string)
  if (!tenantConfig) {
    await supabase.from('email_delivery_attempts')
      .update({ status: 'failed', last_error: 'TenantConfig load failed', next_retry_at: null })
      .eq('id', attemptId)
    return
  }

  // 3. Rendern
  const ctx: TemplateContext = {
    contact:      (submission.contact as Record<string, string>) ?? {},
    answers:      (submission.answers as Record<string, string>) ?? {},
    tenantConfig,
    submission: {
      id:           submission.id as string,
      session_id:   submission.session_id as string,
      created_at:   submission.created_at as string,
      completed_at: submission.completed_at as string | null,
      source_url:   (submission.source_url as string | null) ?? null,
    },
    submittedAt: submission.completed_at ? new Date(submission.completed_at as string) : new Date(),
  }
  const { subject, bodyHtml } = renderEmail(sub.subject, sub.body_html, ctx)
  const from    = buildFromAddress(sub, tenantConfig)
  const replyTo = isInternalRecipient(sub) && ctx.contact.email ? ctx.contact.email : null

  // 4. Senden. recipient_address kann bei custom-recipient comma-separated sein
  // (1-3 Adressen) — wir splitten + passen Resend ein Array. Bei customer/tenant
  // ist es eine einzelne Adresse → wird auch als 1-Element-Array übergeben.
  const recipients = (attempt.recipient_address as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const result = await sendOne(
    recipients.length === 1 ? recipients[0] : recipients,
    from, subject, bodyHtml, subject,
    tenantConfig.theme.primaryColor, tenantConfig.companyName, replyTo,
  )

  // 5. attempt-Row updaten
  const newAttemptCount = (attempt.attempt_count ?? 0) + 1
  const nowIso = new Date().toISOString()
  const nextRetry =
    result.ok || result.isPermanent ? null : nextRetryDelayMs(newAttemptCount)
  const finalStatus =
    result.ok ? 'success'
    : (result.isPermanent || newAttemptCount >= MAX_ATTEMPTS || nextRetry == null ? 'failed' : 'retrying')

  await supabase.from('email_delivery_attempts')
    .update({
      attempt_count:     newAttemptCount,
      status:            finalStatus,
      last_error:        result.errorMessage,
      resend_message_id: result.resendMessageId,
      delivered_at:      result.ok ? nowIso : null,
      next_retry_at:     nextRetry == null ? null : new Date(Date.now() + nextRetry).toISOString(),
    })
    .eq('id', attemptId)
}

// ---------------------------------------------------------------------------
// Schedule attempts on submit (called from /api/submit)
// ---------------------------------------------------------------------------

/**
 * Beim Submit: legt für jede aktive Subscription des Funnels eine email_delivery_attempts-
 * Row mit status='pending', scheduled_at = completed_at + delay_minutes an.
 *
 * Recipient-Adresse wird VORHER ermittelt und gespeichert — falls die Submission gelöscht
 * wird (DSGVO-Delete etc.) können wir trotzdem zustellen ODER konsistent als "Submission
 * weg" failen.
 *
 * Gibt die Liste der eingefügten Attempt-IDs zurück (für sendPendingForSubmission).
 */
async function scheduleAttemptsForSubmission(
  funnelId: string,
  submission: SubmissionSnapshot,
  tenantConfig: TenantConfig,
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data: subs, error } = await supabase
    .from('email_subscriptions')
    .select('id, funnel_id, tenant_id, name, recipient_type, recipient_value, delay_minutes, subject, body_html, from_local, is_active')
    .eq('funnel_id', funnelId)
    .eq('is_active', true)

  if (error) {
    console.error('emails/schedule: subscriptions query failed', error)
    return []
  }
  if (!subs || subs.length === 0) return []

  const baseTime = submission.completed_at
    ? new Date(submission.completed_at).getTime()
    : Date.now()

  // Pre-resolve recipient pro Subscription. Wenn fehlt → trotzdem Row anlegen mit
  // status='failed' damit's im Audit erscheint und nicht durchrutscht.
  // Bei custom-recipient mit mehreren Adressen: speichere joined string als
  // recipient_address (für Audit-Display); Resend bekommt beim Send die Liste.
  const rows = (subs as SubscriptionRow[]).map((sub) => {
    const { addresses, reason } = resolveRecipient(sub, tenantConfig, submission.contact ?? {})
    const scheduledAt = new Date(baseTime + sub.delay_minutes * 60 * 1000).toISOString()
    if (addresses.length === 0) {
      return {
        subscription_id:   sub.id,
        submission_id:     submission.id,
        scheduled_at:      scheduledAt,
        attempt_count:     0,
        status:            'failed' as const,
        last_error:        reason,
        recipient_address: null,
        delivered_at:      null,
        next_retry_at:     null,
      }
    }
    return {
      subscription_id:   sub.id,
      submission_id:     submission.id,
      scheduled_at:      scheduledAt,
      attempt_count:     0,
      status:            'pending' as const,
      recipient_address: addresses.join(', '),
    }
  })

  const { data: inserted, error: insErr } = await supabase
    .from('email_delivery_attempts')
    .insert(rows)
    .select('id, status, scheduled_at')

  if (insErr || !inserted) {
    console.error('emails/schedule: insert failed', insErr)
    return []
  }

  // Return IDs nur für die pending-Rows die JETZT due sind (delay=0 + scheduled_at <= NOW())
  const nowMs = Date.now()
  return inserted
    .filter((r) => r.status === 'pending' && new Date(r.scheduled_at).getTime() <= nowMs)
    .map((r) => r.id as string)
}

// ---------------------------------------------------------------------------
// Public Entry Points
// ---------------------------------------------------------------------------

/**
 * Wird aus /api/submit gerufen.
 *
 * Schritte:
 *   1. Schedule alle Subscriptions als email_delivery_attempts-Rows.
 *   2. Sende sofort (within after()) alle delay=0-Mails.
 *
 * Verzögerte Mails (delay > 0) bleiben pending — der Cron pickt sie wenn ihre Zeit kommt.
 */
export async function triggerEmailsOnSubmit(
  funnelId: string,
  submission: SubmissionSnapshot,
  tenantConfig: TenantConfig,
  supabaseInjected?: SupabaseClient,
): Promise<number> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return 0

  const dueAttemptIds = await scheduleAttemptsForSubmission(funnelId, submission, tenantConfig, supabase)
  if (dueAttemptIds.length === 0) return 0

  // Sofort versenden (parallel)
  await Promise.all(dueAttemptIds.map((id) => processAttempt(id, supabase)))
  return dueAttemptIds.length
}

/**
 * Wird vom Cron aufgerufen für ein einzelnes due pending-Attempt.
 * Ist im Prinzip identisch zu retryEmailDelivery — beide rufen processAttempt.
 */
export async function processPendingDelivery(attemptId: string, supabaseInjected?: SupabaseClient): Promise<void> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return
  await processAttempt(attemptId, supabase)
}

/**
 * Wird vom Cron aufgerufen für retry. Gleich wie processPendingDelivery — wir behalten
 * separaten Export für Lesbarkeit im Cron-Code (sprachlich: "retry" vs "process pending").
 */
export async function retryEmailDelivery(attemptId: string, supabaseInjected?: SupabaseClient): Promise<void> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return
  await processAttempt(attemptId, supabase)
}

/**
 * Aggregiert nach einem Send-Pass die customer/tenant-Mail-Status aus den
 * delivery_attempts und schreibt sie als customer_email_sent / tenant_email_sent
 * in submissions. Dashboard-Lead-Row-Badges lesen die.
 */
export async function aggregateEmailStatusForSubmission(
  submissionId: string,
  supabaseInjected?: SupabaseClient,
): Promise<void> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return

  const { data, error } = await supabase
    .from('email_delivery_attempts')
    .select(`
      status,
      email_subscriptions!email_delivery_attempts_subscription_id_fkey ( recipient_type, recipient_value )
    `)
    .eq('submission_id', submissionId)

  if (error) {
    console.error('emails: aggregate status query failed', error)
    return
  }

  let customerOk = false
  let tenantOk = false
  for (const row of data ?? []) {
    if (row.status !== 'success') continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const es = (row as any).email_subscriptions
    const rt = es?.recipient_type
    if (rt === 'customer') customerOk = true
    // Aufgabe 53: 'tenant' (legacy) ODER custom-Liste mit '@me' = „du wurdest benachrichtigt".
    if (rt === 'tenant') tenantOk = true
    else if (rt === 'custom' && (es?.recipient_value ?? '').split(',').map((s: string) => s.trim()).includes(RECIPIENT_ME)) tenantOk = true
  }

  await supabase.from('submissions')
    .update({ customer_email_sent: customerOk, tenant_email_sent: tenantOk })
    .eq('id', submissionId)
}

// ---------------------------------------------------------------------------
// Test Send
// ---------------------------------------------------------------------------

/**
 * Sendet die Mail-Konfiguration mit Mock-Submission-Daten an einen Empfänger.
 * Default-Empfänger: der konfigurierte recipient_type. Override via customRecipient.
 *
 * Legt KEINE delivery_attempts-Row an (Test-Mails sind nicht Teil der Drip-Queue).
 * Stattdessen: gibt das Send-Result direkt zurück für UI-Feedback.
 */
/**
 * Versendet eine Mock-Mail mit Beispiel-Daten.
 *
 * Override-Optionen:
 *   • customRecipient — verschickt an diese Adresse statt an die konfigurierte
 *   • draftSubject / draftBodyHtml — nimmt die aktuellen (ungesicherten) Werte
 *     aus dem Editor statt der gespeicherten Subscription-Werte. So kann der
 *     Tenant Edits testen, ohne erst speichern zu müssen.
 */
export async function sendTestEmail(
  subscriptionId: string,
  options: {
    customRecipient?: string | null
    draftSubject?: string
    draftBodyHtml?: string
    draftRecipientType?: 'customer' | 'tenant' | 'custom'
    draftRecipientValue?: string | null
  } = {},
  supabaseInjected?: SupabaseClient,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return { ok: false, error: 'Server config error' }

  const { data: sub, error: subErr } = await supabase
    .from('email_subscriptions')
    .select(`
      id, funnel_id, tenant_id, name, recipient_type, recipient_value, delay_minutes,
      subject, body_html, from_local, is_active,
      funnels!email_subscriptions_funnel_id_fkey ( slug )
    `)
    .eq('id', subscriptionId)
    .maybeSingle()
  if (subErr || !sub) return { ok: false, error: 'Subscription not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnelSlug = (sub.funnels as any)?.slug
  if (!funnelSlug) return { ok: false, error: 'Funnel not found' }

  const { getTenantConfig } = await import('@/lib/getTenantConfig')
  const tenantConfig = await getTenantConfig(funnelSlug)
  if (!tenantConfig) return { ok: false, error: 'TenantConfig load failed' }

  const mockContact = {
    name:    'Max Mustermann',
    email:   options.customRecipient ?? 'test@example.com',
    telefon: '+49 170 1234567',
    anrede:  'Herr',
  }
  const mockAnswers = buildMockAnswers(tenantConfig)
  const subRow = sub as unknown as SubscriptionRow

  // Draft-Override: nimm die aktuellen (ungesicherten) Editor-Werte wenn vorhanden,
  // sonst die gespeicherten aus der DB.
  const effectiveSubject  = options.draftSubject  ?? subRow.subject
  const effectiveBody     = options.draftBodyHtml ?? subRow.body_html
  const effectiveRecType  = options.draftRecipientType ?? subRow.recipient_type
  const effectiveRecValue =
    options.draftRecipientValue !== undefined ? options.draftRecipientValue : subRow.recipient_value
  const effectiveSub: SubscriptionRow = {
    ...subRow,
    subject:         effectiveSubject,
    body_html:       effectiveBody,
    recipient_type:  effectiveRecType,
    recipient_value: effectiveRecValue,
  }

  // Recipient-Override für Test. Bei custom: comma-separated splitten → Array.
  let targetAddress: string | string[]
  if (options.customRecipient) {
    targetAddress = options.customRecipient
  } else {
    // Aufgabe 53: dieselbe Auflösung wie der echte Versand (inkl. '@me' → notification_email).
    const { addresses, reason } = resolveRecipient(effectiveSub, tenantConfig, mockContact)
    if (addresses.length === 0) {
      return { ok: false, error: reason ?? 'Empfänger-Adresse fehlt' }
    }
    targetAddress = addresses.length === 1 ? addresses[0] : addresses
  }

  const ctx: TemplateContext = {
    contact:      mockContact,
    answers:      mockAnswers,
    tenantConfig,
    submission: {
      id:           '00000000-0000-0000-0000-000000000000',
      session_id:   '00000000-0000-0000-0000-000000000001',
      created_at:   new Date(Date.now() - 60_000).toISOString(),
      completed_at: new Date().toISOString(),
      source_url:   'https://example.com/test',
    },
    submittedAt: new Date(),
  }
  const { subject, bodyHtml } = renderEmail(effectiveSubject, effectiveBody, ctx)
  const from    = buildFromAddress(effectiveSub, tenantConfig)
  const replyTo = isInternalRecipient(effectiveSub) ? mockContact.email : null

  const result = await sendOne(
    targetAddress, from, subject, bodyHtml, subject,
    tenantConfig.theme.primaryColor, tenantConfig.companyName, replyTo,
  )
  return { ok: result.ok, error: result.errorMessage }
}

// ---------------------------------------------------------------------------
// Mock-Helpers
// ---------------------------------------------------------------------------

function buildMockAnswers(config: TenantConfig): Record<string, string> {
  const out: Record<string, string> = {}
  for (const q of config.questions) {
    if (q.kind === 'welcome' || q.questionType === 'statement') continue
    if (q.kind === 'custom' && q.customFields) {
      for (const f of q.customFields) out[f.key] = 'Beispiel'
      continue
    }
    if (q.options.length > 0) out[q.id] = q.options[0].value
    else if (q.questionType === 'checkbox') out[q.id] = 'true'
    else if (q.questionType === 'rating') out[q.id] = '4'
    else if (q.questionType === 'scale') out[q.id] = '8'
    else if (q.questionType === 'number' || q.questionType === 'slider') out[q.id] = '42'
    else if (q.questionType === 'date') out[q.id] = new Date().toISOString().slice(0, 10)
    else out[q.id] = 'Beispiel'
  }
  return out
}
