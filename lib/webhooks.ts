import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { deriveContactFromAnswers } from '@/lib/tracking'
import type { TenantConfig, QuestionConfig, ContactFieldConfig } from '@/types'

// =============================================================================
// Aufgabe 40 — Webhook-Sender (Action-Element-Modell)
//
// Architektur-Kern (siehe Memory strategy_action_modell):
//   • Webhooks sind funnel-scoped: pro Funnel N Subscriptions mit eigenem Trigger
//   • trigger_type='on_submit'  → feuert bei completed/abandoned in /api/submit + Cron
//   • trigger_type='after_page' → feuert bei Step-Advance über die konfigurierte Page
//   • Bei /api/submit nutzen wir waitUntil — Submit-Response geht sofort raus,
//     Webhook-Delivery läuft im Hintergrund.
//   • Bei Failure: Backoff-Cron retried (1m / 5m / 30m / 2h / 6h, dann failed).
//
// Public API:
//   • triggerOnSubmit(funnelId, eventType, submission, tenantConfig, supabase?)
//   • triggerOnPageAdvance(funnelId, pageId, submission, tenantConfig, supabase?)
//   • retryDelivery(attemptId, supabase?)  ← vom Cron aufgerufen
//   • sendTestPayload(subscriptionId, supabase?)  ← vom "Test senden"-Button
//
// Alle DB-Operationen über admin/service-key. Der Sender läuft nur server-side
// (in /api/submit, /api/cron/*, /api/tenant/.../test) — nie aus Browser-Code.
// =============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stripe-Backoff: 1m / 5m / 30m / 2h / 6h, danach failed. */
const RETRY_BACKOFF_MS: readonly number[] = [
  1  * 60 * 1000,
  5  * 60 * 1000,
  30 * 60 * 1000,
  2  * 60 * 60 * 1000,
  6  * 60 * 60 * 1000,
] as const

/** Maximale Versuche bevor wir auf 'failed' setzen. = RETRY_BACKOFF_MS.length + 1 (erster Versuch + N Retries). */
const MAX_ATTEMPTS = RETRY_BACKOFF_MS.length + 1

/** HTTP-Timeout pro Versuch. */
const HTTP_TIMEOUT_MS = 10_000

/** Response-Body wird auf diese Länge truncated bevor wir's in DB schreiben. */
const RESPONSE_BODY_MAX_CHARS = 4_000

/** Aufgabe 40 Polish: 4xx-Responses sind "Tenant-Endpoint-Config-Bugs" (URL falsch,
 *  Auth missing, validation failed) — Retries machen es nicht besser, nur Spam.
 *  Stripe-Pattern: 4xx → sofort failed. 5xx + Timeouts → retry mit Backoff. */
function isClientError(statusCode: number | null): boolean {
  return statusCode != null && statusCode >= 400 && statusCode < 500
}

// ---------------------------------------------------------------------------
// Supabase admin client (Service-Key, RLS-bypass)
// ---------------------------------------------------------------------------

let cachedClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    console.error('webhooks: SUPABASE_URL / SUPABASE_SERVICE_KEY missing — sender disabled')
    return null
  }
  cachedClient = createClient(url, key, { auth: { persistSession: false } })
  return cachedClient
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | 'submission.completed'
  | 'submission.abandoned'
  | 'step.advanced'
  | 'webhook.test'

interface SubscriptionRow {
  id: string
  funnel_id: string
  tenant_id: string
  url: string
  secret: string
  event_types: string[]
  trigger_type: 'on_submit' | 'after_page'
  trigger_page_id: string | null
  is_active: boolean
}

/** Minimaler Submission-Snapshot für den Payload — was wir aus submissions brauchen.
 *  Hinweis: lead_price ist bewusst NICHT enthalten — Pricing-Modell ist seit
 *  2026-05-29 Konsens Abo-only (per_month). Wenn per_lead wieder reaktiviert wird,
 *  kann das Feld in 1 Zeile zurück (DB-Spalte bleibt). */
export interface SubmissionSnapshot {
  id: string
  session_id: string
  funnel_slug: string
  tenant_id: string | null
  contact: Record<string, string> | null
  answers: Record<string, string> | null
  source_url: string | null
  created_at: string
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// Backoff helper
// ---------------------------------------------------------------------------

/**
 * Gibt die nächste Retry-Verzögerung in ms zurück, oder null wenn keine Retries
 * mehr übrig sind (→ Caller setzt status='failed').
 *
 * @param attemptCount Aktueller Versuch — 1 = gerade fehlgeschlagener Erst-Versuch.
 */
export function nextRetryDelayMs(attemptCount: number): number | null {
  // attemptCount=1 → wir wollen die delay-Position 0 (= 1 Min)
  return RETRY_BACKOFF_MS[attemptCount - 1] ?? null
}

// ---------------------------------------------------------------------------
// HMAC signing — Stripe-Style "t=<ts>,v1=<hex>"
// ---------------------------------------------------------------------------

/**
 * Berechnet Signatur-Header für eine Payload. Format kompatibel zu Stripe
 * — Tenants die schon Stripe-Webhooks integriert haben kennen das Pattern.
 *
 *   X-LeadPlug-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>
 *
 * Der HMAC wird über "<t>.<bodyJson>" berechnet — das Timestamp im Signing-String
 * verhindert Replay-Attacken (Tenant kann optional die Zeit-Differenz prüfen).
 */
export function buildSignatureHeader(bodyJson: string, secret: string, now = Date.now()): string {
  const t = Math.floor(now / 1000)
  const v1 = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${bodyJson}`)
    .digest('hex')
  return `t=${t},v1=${v1}`
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

/**
 * Wandelt die rohen submission-answers in die self-describing Array-Form um
 * + flache Convenience-Map mit Label-statt-Value-Wörtern.
 *
 * Beispiel:
 *   answers = { problem: "zu_wenig", betriebsart: "vertrieb" }
 *   options = [{ value: "zu_wenig", label: "Zu wenig Leads" }, ...]
 *
 * → answers_array:
 *     [{ key: "problem", label: "Was ist dein Problem?", type: "single_choice",
 *        value: "zu_wenig", value_label: "Zu wenig Leads" }, ...]
 * → answers_flat:
 *     { problem: "Zu wenig Leads", betriebsart: "Vertrieb" }
 */
function resolveAnswerEntries(
  rawAnswers: Record<string, string>,
  questions: QuestionConfig[],
): {
  array: Array<{
    key: string
    label: string
    type: string
    value: string | string[]
    value_label?: string | string[]
  }>
  flat: Record<string, string>
} {
  const array: ReturnType<typeof resolveAnswerEntries>['array'] = []
  const flat: Record<string, string> = {}

  // Helper: Choice-Option-Label nachschlagen
  const lookupOptionLabel = (options: Array<{ label: string; value: string }>, value: string): string =>
    options.find((o) => o.value === value)?.label ?? value

  // Iteriere die Question-Definitionen — gibt uns Ordnung + Labels.
  for (const q of questions) {
    if (q.kind === 'welcome' || q.questionType === 'statement') continue  // keine Antwort gespeichert

    // Custom-Pages haben N customFields — jedes ist ein eigenes answers-Entry
    if (q.kind === 'custom' && q.customFields) {
      for (const f of q.customFields) {
        const raw = rawAnswers[f.key]
        if (raw === undefined || raw === '') continue
        pushContactFieldEntry(f, raw, array, flat)
      }
      continue
    }

    // Standard-Question (1 Field pro Step, key = question.id)
    const raw = rawAnswers[q.id]
    if (raw === undefined || raw === '') continue

    if (q.questionType === 'single_choice' || q.questionType === 'dropdown') {
      const label = lookupOptionLabel(q.options, raw)
      array.push({ key: q.id, label: q.title, type: q.questionType, value: raw, value_label: label })
      flat[q.id] = label
    } else if (q.questionType === 'multi_choice') {
      const values = raw.split(',').filter(Boolean)
      const labels = values.map((v) => lookupOptionLabel(q.options, v))
      array.push({ key: q.id, label: q.title, type: q.questionType, value: values, value_label: labels })
      flat[q.id] = labels.join(', ')
    } else if (q.questionType === 'checkbox') {
      const human = raw === 'true' ? 'Ja' : 'Nein'
      array.push({ key: q.id, label: q.title, type: q.questionType, value: raw, value_label: human })
      flat[q.id] = human
    } else {
      // text / long_text / number / date / slider / rating / scale
      array.push({ key: q.id, label: q.title, type: q.questionType, value: raw })
      flat[q.id] = raw
    }
  }

  // Aufgabe 52D: Submit-Page-contactFields-Loop entfernt (Kontaktformular abgeschafft).
  // Die Lead-Felder kommen aus den Karten-Antworten (Custom-Pages, oben via
  // pushContactFieldEntry). pushContactFieldEntry bleibt — Karten nutzen es.

  return { array, flat }
}

/** ContactField-Variante — kennt mehr type-Werte als QuestionType. */
function pushContactFieldEntry(
  f: ContactFieldConfig,
  raw: string,
  array: ReturnType<typeof resolveAnswerEntries>['array'],
  flat: Record<string, string>,
): void {
  if (f.type === 'radio' || f.type === 'dropdown') {
    array.push({ key: f.key, label: f.label, type: f.type, value: raw, value_label: raw })
    flat[f.key] = raw
  } else if (f.type === 'multi_choice') {
    const values = raw.split(',').filter(Boolean)
    array.push({ key: f.key, label: f.label, type: f.type, value: values, value_label: values })
    flat[f.key] = values.join(', ')
  } else if (f.type === 'checkbox') {
    const human = raw === 'true' ? 'Ja' : 'Nein'
    array.push({ key: f.key, label: f.label, type: f.type, value: raw, value_label: human })
    flat[f.key] = human
  } else {
    // text / email / tel / plz / long_text / number / date / slider / rating / scale
    // + Aufgabe 40 Polish: first_name / last_name / full_name (werden wie text behandelt)
    array.push({ key: f.key, label: f.label, type: f.type, value: raw })
    flat[f.key] = raw
  }
}

/**
 * Baut die finale JSON-Nachricht die wir an den Tenant-Endpoint schicken.
 *
 * Format-Entscheidung (siehe Konsens-Runde 2026-05-29):
 *   • answers[] = self-describing Array mit Label + Type + value_label für Choices
 *   • answers_flat = simples "key → label-statt-value"-Map für Zapier-Direct-Mapping
 *   • contact = effective contact (= rohem contact ∪ deriveContactFromAnswers)
 *   • available_channels = Marker welche Kontakt-Wege vorhanden sind (für Tenant-Filter)
 */
export function buildPayload(
  eventType: WebhookEventType,
  submission: SubmissionSnapshot,
  tenantConfig: TenantConfig,
  deliveryId: string,
): Record<string, unknown> {
  const rawContact = submission.contact ?? {}
  const rawAnswers = submission.answers ?? {}
  const effectiveContact = { ...deriveContactFromAnswers(rawAnswers), ...rawContact }
  const { array, flat } = resolveAnswerEntries(rawAnswers, tenantConfig.questions)

  return {
    event: eventType,
    delivery_id: deliveryId,
    delivered_at: new Date().toISOString(),
    tenant_id: submission.tenant_id,
    funnel: {
      id: tenantConfig.funnelId ?? null,
      slug: tenantConfig.slug,
      name: tenantConfig.companyName,
    },
    submission: {
      id: submission.id,
      session_id: submission.session_id,
      created_at: submission.created_at,
      completed_at: submission.completed_at,
      source_url: submission.source_url,
    },
    available_channels: {
      email: Boolean(effectiveContact.email),
      telefon: Boolean(effectiveContact.telefon),
      name: Boolean(effectiveContact.name),
    },
    contact: effectiveContact,
    answers: array,
    answers_flat: flat,
  }
}

// ---------------------------------------------------------------------------
// HTTP delivery
// ---------------------------------------------------------------------------

interface DeliveryResult {
  ok: boolean
  statusCode: number | null
  responseBody: string | null
  errorMessage: string | null
}

/** Führt einen einzelnen HTTP-POST aus mit Timeout. Wirft NICHT — gibt Result zurück. */
async function postWithTimeout(
  url: string,
  bodyJson: string,
  signatureHeader: string,
): Promise<DeliveryResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LeadPlug-Webhook/1.0',
        'X-LeadPlug-Signature': signatureHeader,
      },
      body: bodyJson,
      signal: controller.signal,
    })
    const text = await res.text().catch(() => '')
    const truncated = text.length > RESPONSE_BODY_MAX_CHARS
      ? text.slice(0, RESPONSE_BODY_MAX_CHARS) + '…[truncated]'
      : text
    return {
      ok: res.ok,
      statusCode: res.status,
      responseBody: truncated || null,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    }
  } catch (err) {
    const message = err instanceof Error
      ? (err.name === 'AbortError' ? 'Timeout (10s)' : err.message)
      : 'Unknown error'
    return { ok: false, statusCode: null, responseBody: null, errorMessage: message }
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Delivery + retry logic
// ---------------------------------------------------------------------------

/**
 * Sendet einen Webhook und schreibt das Ergebnis als delivery_attempts-Row.
 * Verwendet für: Erst-Zustellung. Retries laufen über `retryDelivery(attemptId)`.
 */
async function deliverNewAttempt(
  subscription: SubscriptionRow,
  eventType: WebhookEventType,
  submission: SubmissionSnapshot,
  tenantConfig: TenantConfig,
  supabase: SupabaseClient,
): Promise<void> {
  // Generiere die delivery_id vorab — sie wird Teil des Payloads.
  const deliveryId = crypto.randomUUID()
  const payload = buildPayload(eventType, submission, tenantConfig, deliveryId)
  const bodyJson = JSON.stringify(payload)
  const signature = buildSignatureHeader(bodyJson, subscription.secret)

  const result = await postWithTimeout(subscription.url, bodyJson, signature)

  // Aufgabe 40 Polish: 4xx → sofort failed (kein Spam-Retry gegen Tenant-Bug-URL).
  // 5xx + Timeouts → retry mit Backoff.
  const nowIso = new Date().toISOString()
  const clientError = !result.ok && isClientError(result.statusCode)
  const nextRetry = !result.ok && !clientError ? nextRetryDelayMs(1) : null
  const status = result.ok
    ? 'success'
    : (clientError || nextRetry == null ? 'failed' : 'retrying')
  const row = {
    id:                   deliveryId,
    subscription_id:      subscription.id,
    submission_id:        submission.id,
    event_type:           eventType,
    attempt_count:        1,
    status,
    last_error:           result.errorMessage,
    response_status_code: result.statusCode,
    response_body:        result.responseBody,
    delivered_at:         result.ok ? nowIso : null,
    next_retry_at:        nextRetry == null ? null : new Date(Date.now() + nextRetry).toISOString(),
  }

  const { error } = await supabase.from('webhook_delivery_attempts').insert(row)
  if (error) {
    console.error('webhooks: failed to insert delivery_attempt', error, { subscription: subscription.id })
  }
}

/**
 * Cron-Pfad: holt einen pending/retrying-Eintrag und versucht's nochmal.
 * Lädt subscription + submission frisch, baut Payload neu (delivery_id bleibt).
 */
export async function retryDelivery(attemptId: string, supabaseInjected?: SupabaseClient): Promise<void> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return

  // 1. Attempt + Subscription + Submission laden (Submission optional — kann SET NULL sein)
  const { data: attempt, error: attemptErr } = await supabase
    .from('webhook_delivery_attempts')
    .select(`
      id, subscription_id, submission_id, event_type, attempt_count, status,
      webhook_subscriptions!webhook_delivery_attempts_subscription_id_fkey (
        id, funnel_id, tenant_id, url, secret, event_types, trigger_type, trigger_page_id, is_active
      )
    `)
    .eq('id', attemptId)
    .maybeSingle()

  if (attemptErr || !attempt || !attempt.webhook_subscriptions) {
    console.error('webhooks/retry: attempt or subscription not found', attemptErr, attemptId)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = attempt.webhook_subscriptions as any as SubscriptionRow
  if (!subscription.is_active) {
    // Tenant hat den Webhook deaktiviert — als failed markieren, kein Spam.
    await supabase.from('webhook_delivery_attempts')
      .update({ status: 'failed', last_error: 'Subscription deactivated', next_retry_at: null })
      .eq('id', attemptId)
    return
  }

  // 2. Submission + TenantConfig laden für frischen Payload
  if (!attempt.submission_id) {
    // Submission wurde gelöscht (ON DELETE SET NULL) — geben auf, audit bleibt.
    await supabase.from('webhook_delivery_attempts')
      .update({ status: 'failed', last_error: 'Submission no longer exists', next_retry_at: null })
      .eq('id', attemptId)
    return
  }
  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('id, session_id, funnel_slug, tenant_id, contact, answers, source_url, created_at, completed_at')
    .eq('id', attempt.submission_id)
    .maybeSingle()
  if (subErr || !submission) {
    await supabase.from('webhook_delivery_attempts')
      .update({ status: 'failed', last_error: 'Submission load failed', next_retry_at: null })
      .eq('id', attemptId)
    return
  }

  // TenantConfig via getTenantConfig laden (lazy import — vermeidet Circular).
  const { getTenantConfig } = await import('@/lib/getTenantConfig')
  const tenantConfig = await getTenantConfig(submission.funnel_slug as string)
  if (!tenantConfig) {
    await supabase.from('webhook_delivery_attempts')
      .update({ status: 'failed', last_error: 'TenantConfig load failed', next_retry_at: null })
      .eq('id', attemptId)
    return
  }

  // 3. Senden — verwende die existierende delivery_id für Idempotency.
  const payload = buildPayload(
    attempt.event_type as WebhookEventType,
    submission as SubmissionSnapshot,
    tenantConfig,
    attempt.id,
  )
  const bodyJson = JSON.stringify(payload)
  const signature = buildSignatureHeader(bodyJson, subscription.secret)
  const result = await postWithTimeout(subscription.url, bodyJson, signature)

  // 4. Update attempt-Row
  // Aufgabe 40 Polish: 4xx → sofort failed, kein Backoff-Retry mehr. 5xx/Timeout → Backoff.
  const newAttemptCount = (attempt.attempt_count ?? 1) + 1
  const nowIso = new Date().toISOString()
  const clientError = !result.ok && isClientError(result.statusCode)
  const nextRetry = !result.ok && !clientError ? nextRetryDelayMs(newAttemptCount) : null
  const finalStatus = result.ok
    ? 'success'
    : (clientError || newAttemptCount >= MAX_ATTEMPTS || nextRetry == null ? 'failed' : 'retrying')

  await supabase.from('webhook_delivery_attempts')
    .update({
      attempt_count:        newAttemptCount,
      status:               finalStatus,
      last_error:           result.errorMessage,
      response_status_code: result.statusCode,
      response_body:        result.responseBody,
      delivered_at:         result.ok ? nowIso : null,
      next_retry_at:        nextRetry == null ? null : new Date(Date.now() + nextRetry).toISOString(),
    })
    .eq('id', attemptId)
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Triggert alle on_submit-Webhooks eines Funnels für einen completed/abandoned-Event.
 * Wird aus /api/submit (waitUntil) und aus /api/cron/webhook-retry (Abbrecher-Pfad) aufgerufen.
 *
 * Fire-and-forget: schickt parallel, wartet auf alle, gibt Anzahl deliveries zurück.
 * Wirft NICHT — Fehler werden als delivery_attempts mit status='retrying' persisitert.
 */
export async function triggerOnSubmit(
  funnelId: string,
  eventType: 'submission.completed' | 'submission.abandoned',
  submission: SubmissionSnapshot,
  tenantConfig: TenantConfig,
  supabaseInjected?: SupabaseClient,
): Promise<number> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return 0

  const { data: subs, error } = await supabase
    .from('webhook_subscriptions')
    .select('id, funnel_id, tenant_id, url, secret, event_types, trigger_type, trigger_page_id, is_active')
    .eq('funnel_id', funnelId)
    .eq('is_active', true)
    .eq('trigger_type', 'on_submit')

  if (error) {
    console.error('webhooks/triggerOnSubmit: subscription query failed', error)
    return 0
  }
  if (!subs || subs.length === 0) return 0

  // Filter app-side auf event_types — Postgres-array-contains in SDK ist umständlich.
  const matched = (subs as SubscriptionRow[]).filter((s) =>
    s.event_types.length === 0 || s.event_types.includes(eventType)
  )

  await Promise.all(matched.map((sub) =>
    deliverNewAttempt(sub, eventType, submission, tenantConfig, supabase)
  ))
  return matched.length
}

/**
 * Triggert alle after_page-Webhooks für eine bestimmte Page (Step-Advance-Event).
 * Wird aus /api/track-progress aufgerufen.
 *
 * Server-side Dedup (Aufgabe 40 Polish):
 * Pro (subscription_id, submission_id, event_type='step.advanced') wird MAX 1 Versuch
 * angelegt. Verhindert Doppel-Trigger wenn der User dieselbe Page zweimal advancet
 * (z.B. nach Zurück-Klick), oder wenn der Widget-Call sich race-bedingt wiederholt.
 */
export async function triggerOnPageAdvance(
  funnelId: string,
  pageId: string,
  submission: SubmissionSnapshot,
  tenantConfig: TenantConfig,
  supabaseInjected?: SupabaseClient,
): Promise<number> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return 0

  const { data: subs, error } = await supabase
    .from('webhook_subscriptions')
    .select('id, funnel_id, tenant_id, url, secret, event_types, trigger_type, trigger_page_id, is_active')
    .eq('funnel_id', funnelId)
    .eq('is_active', true)
    .eq('trigger_type', 'after_page')
    .eq('trigger_page_id', pageId)

  if (error) {
    console.error('webhooks/triggerOnPageAdvance: subscription query failed', error)
    return 0
  }
  if (!subs || subs.length === 0) return 0

  // Server-side Dedup: existing delivery_attempts pro (subscription, submission, step.advanced)
  // pre-fetchen. Wenn schon vorhanden → skip diese subscription.
  const subIds = (subs as SubscriptionRow[]).map((s) => s.id)
  const { data: existingAttempts } = await supabase
    .from('webhook_delivery_attempts')
    .select('subscription_id')
    .eq('submission_id', submission.id)
    .eq('event_type', 'step.advanced')
    .in('subscription_id', subIds)
  const alreadyTriggered = new Set((existingAttempts ?? []).map((a) => a.subscription_id))

  const todo = (subs as SubscriptionRow[]).filter((s) => !alreadyTriggered.has(s.id))
  if (todo.length === 0) return 0

  await Promise.all(todo.map((sub) =>
    deliverNewAttempt(sub, 'step.advanced', submission, tenantConfig, supabase)
  ))
  return todo.length
}

/**
 * Schickt einen Test-Payload an die konfigurierte URL einer Subscription.
 * Verwendet einen Mock-Submission-Snapshot. Wird vom "Test senden"-Button im
 * Webhooks-Tab aufgerufen.
 *
 * Wichtig: ergibt einen echten Eintrag in delivery_attempts (mit event='webhook.test'),
 * damit der Tenant das Ergebnis im Logs-Drawer sehen kann.
 */
export async function sendTestPayload(
  subscriptionId: string,
  supabaseInjected?: SupabaseClient,
): Promise<{ ok: boolean; statusCode: number | null; error: string | null }> {
  const supabase = supabaseInjected ?? getSupabase()
  if (!supabase) return { ok: false, statusCode: null, error: 'Server config error' }

  const { data: sub, error: subErr } = await supabase
    .from('webhook_subscriptions')
    .select(`
      id, funnel_id, tenant_id, url, secret, event_types, trigger_type, trigger_page_id, is_active,
      funnels!webhook_subscriptions_funnel_id_fkey ( slug )
    `)
    .eq('id', subscriptionId)
    .maybeSingle()
  if (subErr || !sub) return { ok: false, statusCode: null, error: 'Subscription not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnelSlug = (sub.funnels as any)?.slug
  if (!funnelSlug) return { ok: false, statusCode: null, error: 'Funnel not found' }

  const { getTenantConfig } = await import('@/lib/getTenantConfig')
  const tenantConfig = await getTenantConfig(funnelSlug)
  if (!tenantConfig) return { ok: false, statusCode: null, error: 'TenantConfig load failed' }

  // Mock-Submission mit Beispiel-Daten — der Tenant sieht im Test wie ein echter Lead aussieht.
  const mockSubmission: SubmissionSnapshot = {
    id:           '00000000-0000-0000-0000-000000000000',
    session_id:   '00000000-0000-0000-0000-000000000001',
    funnel_slug:  funnelSlug,
    tenant_id:    sub.tenant_id,
    contact: {
      name:    'Max Mustermann',
      email:   'test@example.com',
      telefon: '+49 170 1234567',
      anrede:  'Herr',
    },
    answers:      buildMockAnswersFromConfig(tenantConfig),
    source_url:   'https://example.com/test',
    created_at:   new Date(Date.now() - 60_000).toISOString(),
    completed_at: new Date().toISOString(),
  }

  const deliveryId = crypto.randomUUID()
  const payload = buildPayload('webhook.test', mockSubmission, tenantConfig, deliveryId)
  const bodyJson = JSON.stringify(payload)
  const signature = buildSignatureHeader(bodyJson, sub.secret)
  const result = await postWithTimeout(sub.url, bodyJson, signature)

  // Test-Delivery wird auch geloggt — aber mit event_type='webhook.test' damit der Tenant
  // im Logs-Drawer "Test" von echten Leads unterscheiden kann.
  await supabase.from('webhook_delivery_attempts').insert({
    id:                   deliveryId,
    subscription_id:      sub.id,
    submission_id:        null,  // kein echtes submission
    event_type:           'webhook.test',
    attempt_count:        1,
    status:               result.ok ? 'success' : 'failed',
    last_error:           result.errorMessage,
    response_status_code: result.statusCode,
    response_body:        result.responseBody,
    delivered_at:         result.ok ? new Date().toISOString() : null,
    next_retry_at:        null,  // Tests werden nicht retried
  })

  return { ok: result.ok, statusCode: result.statusCode, error: result.errorMessage }
}

/**
 * Generiert plausible Mock-Antworten für jeden Question + ContactField.
 * Nur für sendTestPayload — damit der Tenant im Zapier-Test sieht wie seine
 * eigenen Felder im Payload aussehen.
 */
function buildMockAnswersFromConfig(config: TenantConfig): Record<string, string> {
  const out: Record<string, string> = {}
  for (const q of config.questions) {
    if (q.kind === 'welcome' || q.questionType === 'statement') continue
    if (q.kind === 'custom' && q.customFields) {
      for (const f of q.customFields) out[f.key] = mockValueForContactField(f)
      continue
    }
    out[q.id] = mockValueForQuestion(q)
  }
  return out
}

function mockValueForQuestion(q: QuestionConfig): string {
  switch (q.questionType) {
    case 'single_choice':
    case 'dropdown':
      return q.options[0]?.value ?? 'option_1'
    case 'multi_choice':
      return q.options.slice(0, 2).map((o) => o.value).join(',') || 'option_1,option_2'
    case 'checkbox':
      return 'true'
    case 'rating':
      return '4'
    case 'scale':
      return '8'
    case 'slider': {
      const s = q.config as { min?: number; max?: number; default?: number }
      return String(s.default ?? s.min ?? 50)
    }
    case 'date':
      return new Date().toISOString().slice(0, 10)
    case 'number':
      return '42'
    case 'long_text':
      return 'Das ist ein Beispiel-Antworttext aus dem Test-Webhook.'
    default:  // short_text + Default
      return 'Beispiel'
  }
}

function mockValueForContactField(f: ContactFieldConfig): string {
  switch (f.type) {
    case 'email':  return 'test@example.com'
    case 'tel':    return '+49 170 1234567'
    case 'plz':    return '10115'
    case 'radio':
    case 'dropdown':
      return f.options?.[0] ?? 'Option 1'
    case 'multi_choice':
      return (f.options ?? []).slice(0, 2).join(',') || 'Option 1,Option 2'
    case 'checkbox':
      return 'true'
    case 'number':
      return '42'
    case 'date':
      return new Date().toISOString().slice(0, 10)
    case 'slider':
      return String(f.sliderDefault ?? f.sliderMin ?? 50)
    case 'rating':
      return '4'
    case 'scale':
      return '8'
    case 'long_text':
      return 'Beispiel-Langtext.'
    default:  // text
      return 'Beispiel'
  }
}

/**
 * Härtung (Aufgabe 54b): Webhook-Ziele müssen öffentliche HTTPS-Endpoints sein.
 * Blockt http://, localhost, private/link-local IP-Ranges und interne Hostnamen.
 * Grund: der Sender läuft server-side und der Response-Body wird dem Tenant im
 * Logs-Drawer angezeigt — ohne diese Prüfung wäre der "Test senden"-Button ein
 * SSRF-Orakel gegen interne Dienste. Hostname-basiert = Best-Effort (DNS-Rebinding
 * bleibt theoretisch möglich), hebt die Hürde aber deutlich.
 *
 * Greift nur bei Anlage/Änderung — bestehende Subscriptions sind unberührt
 * (Prod-Check 2026-06-10: alle bestehenden URLs sind https).
 *
 * @returns null wenn ok, sonst deutsche Fehlermeldung für die UI.
 */
export function validateWebhookUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return 'Ungültige URL.'
  }
  if (url.protocol !== 'https:') {
    return 'Nur https://-URLs sind erlaubt.'
  }
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return 'Interne Hostnamen sind nicht erlaubt.'
  }
  // IPv6-Literale pauschal ablehnen — echte Webhook-Endpoints haben Hostnamen.
  if (host.includes(':') || host.startsWith('[')) {
    return 'IP-Literale sind nicht erlaubt — bitte einen Hostnamen verwenden.'
  }
  // Rein numerische Hosts (z.B. Decimal-encoded IPv4 wie 2130706433) ablehnen.
  if (/^\d+$/.test(host)) {
    return 'IP-Literale sind nicht erlaubt — bitte einen Hostnamen verwenden.'
  }
  // IPv4-Literale: private / loopback / link-local / CGNAT-Ranges blocken.
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (v4) {
    const a = Number(v4[1])
    const b = Number(v4[2])
    if (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return 'Private IP-Adressen sind nicht erlaubt.'
    }
  }
  return null
}

/**
 * Generiert ein neues Secret beim Anlegen einer Subscription.
 * 32 Bytes = 64 Hex-Chars — passt zum Check `length(secret) >= 16` und ist
 * konsistent mit Stripe's whsec_-Format-Länge (32 Bytes Entropie).
 *
 * Format `whsec_<hex>` — Stripe-kompatibles Naming damit Tenants die schon
 * Stripe-Webhooks kennen das Pattern wiederfinden.
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`
}
