import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContactData, TenantConfig } from '@/types'

/**
 * Lead-Daten aus den answers ableiten. Seit Aufgabe 52D (Submit-Page abgeschafft)
 * der einzige Weg: der Tenant baut Email/Telefon/Name als Karten-/Question-Felder ein.
 *
 * Aufgabe 40 Polish: Wenn `tenantConfig` mit-übergeben wird, nutzt die
 * Funktion die Field-Types (`email`, `tel`, `first_name`, `last_name`,
 * `full_name`) für robustes Mapping. Fallback bleibt der Regex-Pattern-
 * Match (für Funnels die `short_text` für Name nutzen).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d\s\-()]{6,}$/

interface FieldMeta {
  key: string
  type: string
}

/** Sammelt alle Field-Definitionen aus TenantConfig (Questions + Custom + ContactFields). */
function collectFieldMetas(config: TenantConfig): FieldMeta[] {
  const out: FieldMeta[] = []
  for (const q of config.questions) {
    if (q.kind === 'custom' && q.customFields) {
      for (const f of q.customFields) out.push({ key: f.key, type: f.type })
    } else if (q.kind !== 'welcome' && q.questionType !== 'statement') {
      out.push({ key: q.id, type: q.questionType })
    }
  }
  // Aufgabe 52D: contactFields-Loop entfernt (Submit-Page abgeschafft) — Karten-Felder
  // (q.customFields, oben) liefern die Lead-Metas für deriveContactFromAnswers.
  return out
}

export function deriveContactFromAnswers(
  answers: Record<string, string>,
  tenantConfig?: TenantConfig,
): Record<string, string> {
  const out: Record<string, string> = {}

  // Pass 1: Field-Type-basiertes Mapping (Aufgabe 40 Polish — bevorzugt, weil deterministisch).
  if (tenantConfig) {
    const metas = collectFieldMetas(tenantConfig)
    for (const meta of metas) {
      const raw = answers[meta.key]
      if (typeof raw !== 'string') continue
      const val = raw.trim()
      if (!val) continue
      switch (meta.type) {
        case 'email':      if (!out.email)     out.email     = val; break
        case 'tel':        if (!out.telefon)   out.telefon   = val; break
        case 'plz':        if (!out.plz)       out.plz       = val; break
        case 'first_name': if (!out.firstName) out.firstName = val; break
        case 'last_name':  if (!out.lastName)  out.lastName  = val; break
        case 'full_name':  if (!out.name)      out.name      = val; break
      }
    }
    // Wenn firstName + lastName beide gesetzt aber kein name (full_name), aggregieren.
    if (!out.name && (out.firstName || out.lastName)) {
      out.name = [out.firstName, out.lastName].filter(Boolean).join(' ')
    }
  }

  // Pass 2: Regex-Fallback für legacy/skip-Mode-Funnels mit `short_text` für Name.
  // Nur Felder befüllen die Pass 1 nicht gesetzt hat.
  for (const [key, raw] of Object.entries(answers)) {
    if (typeof raw !== 'string') continue
    const val = raw.trim()
    if (!val) continue
    if (!out.email && EMAIL_RE.test(val)) out.email = val
    if (!out.telefon && !EMAIL_RE.test(val) && PHONE_RE.test(val)) out.telefon = val
    if (!out.name && /name/i.test(key) && !EMAIL_RE.test(val) && !PHONE_RE.test(val)) {
      out.name = val
    }
  }
  return out
}

// Aufgabe 52D: enrichContact entfernt — war die Submit-Page-Contact-Anreicherung.
// Lead-Daten kommen jetzt ausschließlich aus deriveContactFromAnswers (Karten-Antworten).

let cachedClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!url || !serviceKey) {
    console.error(
      'Supabase env vars missing (SUPABASE_URL / SUPABASE_SERVICE_KEY) – tracking disabled',
    )
    return null
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
  return cachedClient
}

/**
 * Rate-Limit für /api/submit (Aufgabe 54 überarbeitet).
 *
 * Zählt NUR completed Submissions der IP in den letzten 10 Minuten. Vorher zählten
 * auch Partial-Rows aus /api/track-progress mit — dadurch blockten sich schon
 * 3 parallele Nutzer hinter einer geteilten IP (Büro-NAT, Mobilfunk-CGNAT)
 * gegenseitig still die Submits = Lead-Verlust. Die eigene Session wird
 * ausgenommen (Re-Submit derselben Session ist idempotent, darf nie blocken).
 * Schwelle 10/10min: großzügig für geteilte IPs, eng genug gegen Submit-Spam —
 * Honeypot + Card-Backstop-Validierung fangen den Rest.
 * Query läuft über den partial Index idx_submissions_ip_completed (Aufgabe 54).
 */
const RATE_LIMIT_MAX_COMPLETED = 10
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

export async function isRateLimited(ip: string, excludeSessionId?: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    let query = supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .not('completed_at', 'is', null)
      .gte('created_at', since)
    if (excludeSessionId) query = query.neq('session_id', excludeSessionId)
    const { count, error } = await query

    if (error) return false
    return (count ?? 0) >= RATE_LIMIT_MAX_COMPLETED
  } catch {
    return false
  }
}

// Aufgabe 54b: logSubmission entfernt — seit Aufgabe 34 deprecated (Insert ohne
// session_id verletzt die UNIQUE/NOT-NULL-Spalte), war nirgends mehr referenziert.
// Einziger Submission-Schreibpfad ist upsertSubmissionProgress (unten).

/**
 * Partial-Submissions: UPSERT by session_id. Wird vom Widget bei jedem Antwort-Commit gefeuert.
 * Wenn completed=true: setzt completed_at=NOW() (= finaler Submit, triggert downstream Mails/Webhooks).
 * Sonst: completed_at bleibt NULL = "abgebrochen / in Bearbeitung".
 * Idempotent: gleicher sessionId-Aufruf ist sicher mehrfach aufrufbar.
 *
 * Race-Schutz (Hotfix 2026-05-29 nach Aufgabe 40 Smoke-Test):
 * Wenn completed=false (= track-progress) und in der DB schon eine completed-Row
 * existiert, NICHT überschreiben. Grund: Widget kann late /api/track-progress feuern
 * NACH /api/submit (debounced 600ms im funnel.tsx-useEffect, plus React-render-cycle
 * Window). Ohne diesen Guard würde der UPSERT contact={} + answers={} setzen und
 * die echten Submit-Daten überschreiben — completed_at bliebe stehen (war nicht im
 * UPDATE-Set), aber Lead-Inbox + Cron-Abandoned-Logik wären zerstört.
 *
 * Aufgabe 54: Rückgabe enthält `alreadyCompleted` — war die Session VOR diesem
 * Aufruf schon completed, überschreibt auch der completed-Pfad nichts mehr
 * (Erst-Submit-Daten stehen) und /api/submit skippt Webhooks + Mails. Vorher
 * feuerte ein doppelter POST (Doppelklick, Netzwerk-Retry) alle Actions doppelt.
 */
export interface UpsertSubmissionResult {
  id: string | null
  alreadyCompleted: boolean
}

export async function upsertSubmissionProgress(params: {
  sessionId: string
  funnelSlug: string
  tenantId: string
  contact: ContactData
  answers: Record<string, string>
  leadPrice: number
  sourceUrl: string
  userAgent: string
  ipAddress?: string
  completed?: boolean
}): Promise<UpsertSubmissionResult> {
  const supabase = getSupabase()
  if (!supabase) return { id: null, alreadyCompleted: false }

  try {
    // Race-Guard (beide Pfade): wenn die Session schon completed ist, nie
    // überschreiben — existierende ID + Flag zurückgeben. track-progress würde
    // sonst die Submit-Daten zerstören, ein Doppel-Submit würde die Actions
    // (Webhooks/Mails) doppelt feuern.
    const { data: existing } = await supabase
      .from('submissions')
      .select('id, completed_at')
      .eq('session_id', params.sessionId)
      .maybeSingle()
    if (existing?.completed_at) {
      return { id: existing.id, alreadyCompleted: true }
    }

    const row: Record<string, unknown> = {
      session_id:  params.sessionId,
      funnel_slug: params.funnelSlug,
      tenant_id:   params.tenantId,
      contact:     params.contact,
      answers:     params.answers,
      lead_price:  params.leadPrice,
      source_url:  params.sourceUrl,
      user_agent:  params.userAgent,
      ip_address:  params.ipAddress ?? null,
    }
    if (params.completed) {
      row.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('submissions')
      .upsert(row, { onConflict: 'session_id' })
      .select('id')
      .single()

    if (error) {
      console.error('Supabase upsert progress error:', error)
      return { id: null, alreadyCompleted: false }
    }
    return { id: data?.id ?? null, alreadyCompleted: false }
  } catch (err) {
    console.error('Supabase upsert progress exception:', err)
    return { id: null, alreadyCompleted: false }
  }
}

export async function logHoneypot(params: {
  funnelSlug?: string
  ipAddress?: string
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase.from('honeypot_triggers').insert({
      funnel_slug: params.funnelSlug ?? null,
      ip_address:  params.ipAddress ?? null,
    })
    if (error) console.error('Supabase honeypot log error:', error)
  } catch (err) {
    console.error('Supabase honeypot log exception:', err)
  }
}
