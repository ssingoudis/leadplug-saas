import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { retryDelivery, triggerOnSubmit, type SubmissionSnapshot } from '@/lib/webhooks'
import { processPendingDelivery, retryEmailDelivery, aggregateEmailStatusForSubmission } from '@/lib/email/emails'
import { getTenantConfig } from '@/lib/getTenantConfig'
import { deriveContactFromAnswers } from '@/lib/tracking'

// =============================================================================
// Aufgabe 40 — Webhook-Cron (alle 5 Min via Vercel-Cron / vercel.json)
//
// Tut zwei Dinge:
//
//   1. Retries: Holt webhook_delivery_attempts mit status IN ('pending','retrying')
//      AND next_retry_at <= NOW() — retried sie via lib/webhooks/retryDelivery().
//
//   2. Abbrecher-Trigger: Holt submissions mit completed_at IS NULL AND
//      abandoned_webhook_fired_at IS NULL AND created_at < NOW() - 10 min —
//      prüft effectiveContact für email|telefon, triggert dann
//      submission.abandoned-Webhook.
//
// Schutz: Vercel-Cron sendet `Authorization: Bearer <CRON_SECRET>`. Wir prüfen
// das gegen process.env.CRON_SECRET. Ohne Match → 401.
//
// Limits: max 50 Retries + 50 Abbrecher pro Run damit wir nicht ins
// Function-Timeout laufen.
// =============================================================================

export const runtime = 'nodejs'
// Vercel Pro Function-Timeout default 60s. Wir geben uns Luft für 50+50 HTTP-POSTs.
export const maxDuration = 60

const MAX_RETRIES_PER_RUN  = 50
const MAX_ABANDONED_PER_RUN = 50
const ABANDONED_COOLDOWN_MS = 10 * 60 * 1000  // 10 Min — Konsens 2026-05-29

// Aufgabe 54b: Zeitbudget. Worst-Case wären 200 HTTP-Posts × 10s Timeout — weit
// über maxDuration (60s), die Function würde mitten im Run gekilled. Stattdessen:
// jede Loop prüft das Budget und bricht sauber ab; Liegengebliebenes pickt der
// nächste Run (alle 5 Min) über dieselben Queues wieder auf.
const TIME_BUDGET_MS = 45_000

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(req: Request) {
  // Auth: Vercel-Cron sendet Bearer-Token = CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const expected   = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const startedAt = Date.now()
  let retryCount = 0
  let retrySuccess = 0
  let abandonedCount = 0
  let abandonedTriggered = 0
  let budgetExhausted = false
  const overBudget = () => {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      budgetExhausted = true
      return true
    }
    return false
  }

  // ----------------------------------------------------------------------
  // 1. Retries
  // ----------------------------------------------------------------------
  try {
    const { data: dueAttempts, error } = await supabase
      .from('webhook_delivery_attempts')
      .select('id, attempt_count, status, next_retry_at')
      .in('status', ['pending', 'retrying'])
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(MAX_RETRIES_PER_RUN)

    if (error) {
      console.error('cron/webhook-retry: due-attempts query failed', error)
    } else if (dueAttempts && dueAttempts.length > 0) {
      retryCount = dueAttempts.length
      // Sequenziell statt parallel — vermeidet Verbindungslimit-Spitzen am
      // Supabase-Pool wenn 50 gleichzeitig laufen.
      for (const att of dueAttempts) {
        if (overBudget()) break
        try {
          await retryDelivery(att.id, supabase)
          retrySuccess++
        } catch (err) {
          console.error('cron/webhook-retry: retryDelivery threw', err, att.id)
        }
      }
    }
  } catch (err) {
    console.error('cron/webhook-retry: retry-block exception', err)
  }

  // ----------------------------------------------------------------------
  // 2. Abbrecher-Trigger
  // ----------------------------------------------------------------------
  try {
    const cooldownISO = new Date(Date.now() - ABANDONED_COOLDOWN_MS).toISOString()
    const { data: pendingAbandoned, error } = await supabase
      .from('submissions')
      .select('id, session_id, funnel_slug, tenant_id, contact, answers, source_url, created_at, completed_at')
      .is('completed_at', null)
      .is('abandoned_webhook_fired_at', null)
      .lt('created_at', cooldownISO)
      .not('funnel_slug', 'is', null)
      .order('created_at', { ascending: true })
      .limit(MAX_ABANDONED_PER_RUN)

    if (error) {
      console.error('cron/webhook-retry: abandoned query failed', error)
    } else if (pendingAbandoned && pendingAbandoned.length > 0) {
      abandonedCount = pendingAbandoned.length

      // Für jede candidate-Submission:
      //   a) CLAIM: abandoned_webhook_fired_at = NOW() — VOR dem Trigger (Aufgabe 54b)
      //   b) tenantConfig laden (cache via Map damit gleicher Funnel nicht 50x lädt)
      //   c) effectiveContact bauen, Skip wenn email + telefon fehlen (= Trash-Lead)
      //   d) triggerOnSubmit('submission.abandoned', ...)
      //
      // Claim-first (Aufgabe 54b): Vorher stand der Marker NACH dem Trigger — stirbt
      // die Function dazwischen (Timeout/Kill), feuert der nächste Run denselben
      // Abbrecher noch einmal → doppelte CRM-Events beim Tenant. At-most-once ist
      // hier richtiger als at-least-once: im seltenen Kill-Fall geht ein einzelner
      // Abandoned-Webhook verloren statt Duplikate zu erzeugen. Der `.is(NULL)`-Guard
      // macht den Claim zusätzlich race-sicher gegen parallel laufende Runs.
      const configCache = new Map<string, Awaited<ReturnType<typeof getTenantConfig>>>()

      for (const sub of pendingAbandoned) {
        if (overBudget()) break

        const { error: claimErr } = await supabase.from('submissions')
          .update({ abandoned_webhook_fired_at: new Date().toISOString() })
          .eq('id', sub.id)
          .is('abandoned_webhook_fired_at', null)
        if (claimErr) {
          console.error('cron/webhook-retry: abandoned claim failed', claimErr, sub.id)
          continue
        }

        const rawAnswers = (sub.answers as Record<string, string> | null) ?? {}
        const rawContact = (sub.contact as Record<string, string> | null) ?? {}

        // tenantConfig laden BEFORE deriveContactFromAnswers — die Field-Type-aware-Variante
        // braucht die Funnel-Config für robustes Email/Telefon/Name-Mapping (Aufgabe 40 Polish).
        let tenantConfig = configCache.get(sub.funnel_slug as string)
        if (tenantConfig === undefined) {
          tenantConfig = await getTenantConfig(sub.funnel_slug as string)
          configCache.set(sub.funnel_slug as string, tenantConfig)
        }
        if (!tenantConfig || !tenantConfig.funnelId) {
          // Funnel gelöscht / inaktiv — geclaimt, kein Trigger nötig
          continue
        }

        const effective = { ...deriveContactFromAnswers(rawAnswers, tenantConfig), ...rawContact }
        const hasReachableChannel = Boolean(effective.email) || Boolean(effective.telefon)
        if (!hasReachableChannel) {
          // Trash-Lead ohne Kontaktkanal — geclaimt, kein Trigger
          continue
        }

        const snapshot: SubmissionSnapshot = {
          id:           sub.id,
          session_id:   sub.session_id,
          funnel_slug:  sub.funnel_slug,
          tenant_id:    sub.tenant_id,
          contact:      effective,
          answers:      rawAnswers,
          source_url:   sub.source_url,
          created_at:   sub.created_at,
          completed_at: null,
        }

        try {
          const fired = await triggerOnSubmit(
            tenantConfig.funnelId,
            'submission.abandoned',
            snapshot,
            tenantConfig,
            supabase,
          )
          if (fired > 0) abandonedTriggered++
        } catch (err) {
          console.error('cron/webhook-retry: triggerOnSubmit threw', err, sub.id)
        }
      }
    }
  } catch (err) {
    console.error('cron/webhook-retry: abandoned-block exception', err)
  }

  // ----------------------------------------------------------------------
  // 3. E-Mail-Queue (Aufgabe 41 — Drip-Modell)
  //
  // Ein Lauf macht zwei Dinge:
  //   a) DUE PENDING:  status='pending'  AND scheduled_at <= NOW()
  //      → Erstversand für Drip-Mails deren Zeit gekommen ist
  //   b) DUE RETRYING: status='retrying' AND next_retry_at <= NOW()
  //      → Backoff-Retry für temporäre Fehler
  //
  // Beide Pfade rufen processAttempt — identische Send-Logik, nur unterschiedliche
  // Pick-Bedingungen.
  // ----------------------------------------------------------------------
  let emailDueCount = 0
  let emailDueProcessed = 0
  let emailRetryCount = 0
  let emailRetryProcessed = 0
  const touchedSubmissions = new Set<string>()

  try {
    const nowIso = new Date().toISOString()

    // a) due pending — Drip-Erstversand
    const { data: duePending, error: dpErr } = await supabase
      .from('email_delivery_attempts')
      .select('id, submission_id')
      .eq('status', 'pending')
      .lte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(MAX_RETRIES_PER_RUN)

    if (dpErr) {
      console.error('cron: due-pending email query failed', dpErr)
    } else if (duePending && duePending.length > 0) {
      emailDueCount = duePending.length
      for (const att of duePending) {
        if (overBudget()) break
        try {
          await processPendingDelivery(att.id, supabase)
          emailDueProcessed++
          if (att.submission_id) touchedSubmissions.add(att.submission_id as string)
        } catch (err) {
          console.error('cron: processPendingDelivery threw', err, att.id)
        }
      }
    }

    // b) due retrying — Backoff-Retry
    const { data: dueRetry, error: drErr } = await supabase
      .from('email_delivery_attempts')
      .select('id, submission_id')
      .eq('status', 'retrying')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', nowIso)
      .order('next_retry_at', { ascending: true })
      .limit(MAX_RETRIES_PER_RUN)

    if (drErr) {
      console.error('cron: due-retry email query failed', drErr)
    } else if (dueRetry && dueRetry.length > 0) {
      emailRetryCount = dueRetry.length
      for (const att of dueRetry) {
        if (overBudget()) break
        try {
          await retryEmailDelivery(att.id, supabase)
          emailRetryProcessed++
          if (att.submission_id) touchedSubmissions.add(att.submission_id as string)
        } catch (err) {
          console.error('cron: retryEmailDelivery threw', err, att.id)
        }
      }
    }
  } catch (err) {
    console.error('cron: email-queue block exception', err)
  }

  // Lead-Row-Badges (customer_email_sent / tenant_email_sent) aktualisieren
  // für alle Submissions, deren Mail-Status sich in diesem Run geändert haben kann.
  for (const sid of touchedSubmissions) {
    await aggregateEmailStatusForSubmission(sid, supabase).catch((err) =>
      console.error('cron: aggregate-email-status failed', err, sid),
    )
  }

  // ----------------------------------------------------------------------
  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - startedAt,
    budget_exhausted: budgetExhausted,
    webhooks: {
      retries:   { picked: retryCount, success: retrySuccess },
      abandoned: { picked: abandonedCount, triggered: abandonedTriggered },
    },
    emails: {
      due_pending:  { picked: emailDueCount, processed: emailDueProcessed },
      due_retrying: { picked: emailRetryCount, processed: emailRetryProcessed },
    },
  })
}
