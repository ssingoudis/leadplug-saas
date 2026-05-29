import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { retryDelivery, triggerOnSubmit, type SubmissionSnapshot } from '@/lib/webhooks'
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
      //   a) effectiveContact bauen
      //   b) Skip wenn email + telefon fehlen (= Trash-Lead, kein Webhook-würdig)
      //   c) tenantConfig laden (cache via Map damit gleicher Funnel nicht 50x lädt)
      //   d) triggerOnSubmit('submission.abandoned', ...)
      //   e) submissions.abandoned_webhook_fired_at = NOW() — verhindert Doppel-Trigger im nächsten Run
      const configCache = new Map<string, Awaited<ReturnType<typeof getTenantConfig>>>()

      for (const sub of pendingAbandoned) {
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
          // Funnel gelöscht / inaktiv — Trash-Markieren damit wir's nicht wiederholen
          await supabase.from('submissions')
            .update({ abandoned_webhook_fired_at: new Date().toISOString() })
            .eq('id', sub.id)
          continue
        }

        const effective = { ...deriveContactFromAnswers(rawAnswers, tenantConfig), ...rawContact }
        const hasReachableChannel = Boolean(effective.email) || Boolean(effective.telefon)

        // Wir markieren immer (auch wenn skip), sonst pickt der Cron diese Row
        // beim nächsten Run wieder. Nur Trigger ist konditional.
        if (!hasReachableChannel) {
          await supabase.from('submissions')
            .update({ abandoned_webhook_fired_at: new Date().toISOString() })
            .eq('id', sub.id)
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

        // Marker setzen — auch wenn 0 Subscriptions oder Trigger-Error.
        // Verhindert dass wir die Session beim nächsten Run wieder picken.
        await supabase.from('submissions')
          .update({ abandoned_webhook_fired_at: new Date().toISOString() })
          .eq('id', sub.id)
      }
    }
  } catch (err) {
    console.error('cron/webhook-retry: abandoned-block exception', err)
  }

  // ----------------------------------------------------------------------
  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - startedAt,
    retries: { picked: retryCount, success: retrySuccess },
    abandoned: { picked: abandonedCount, triggered: abandonedTriggered },
  })
}
