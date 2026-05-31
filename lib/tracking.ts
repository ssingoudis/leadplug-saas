import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContactData, TenantConfig } from '@/types'

/**
 * Aufgabe 35: Skip-Mode-Backstop. Wenn der Funnel keine Submit-Page hat
 * (skip_submit_step=true), kommen die Lead-Daten aus den answers (Tenant
 * baut Email/Telefon/Name als reguläre Question-Pages ein).
 *
 * Aufgabe 40 Polish: Wenn `tenantConfig` mit-übergeben wird, nutzt die
 * Funktion die Field-Types (`email`, `tel`, `first_name`, `last_name`,
 * `full_name`) für robustes Mapping. Fallback bleibt der Regex-Pattern-
 * Match (für Skip-Mode-Funnels die `short_text` für Name nutzen).
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
  for (const f of config.contactFields) {
    out.push({ key: f.key, type: f.type })
  }
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

/**
 * Aufgabe 40 Polish: Enricht den vom Widget gelieferten contact (Submit-Mode-Pfad)
 * um aggregierte firstName/lastName/name Felder, basierend auf den Field-Type-
 * Definitionen der Submit-Page. Heißt: wenn Tenant ein Feld type=`first_name`
 * mit key=`vorname` baut, landet contact[vorname] zusätzlich als contact.firstName.
 *
 * Wenn first_name + last_name beide vorhanden + kein full_name → contact.name
 * = `firstName + " " + lastName`. So sieht Tenant in Zapier sowohl die separaten
 * Felder als auch das aggregierte Display-Name.
 */
export function enrichContact(
  contact: ContactData,
  tenantConfig: TenantConfig,
): ContactData {
  const out: ContactData = { ...contact }
  for (const f of tenantConfig.contactFields) {
    const val = (out[f.key] ?? '').trim()
    if (!val) continue
    switch (f.type) {
      case 'first_name': if (!out.firstName) out.firstName = val; break
      case 'last_name':  if (!out.lastName)  out.lastName  = val; break
      case 'full_name':  if (!out.name)      out.name      = val; break
      case 'email':      if (!out.email)     out.email     = val; break
      case 'tel':        if (!out.telefon)   out.telefon   = val; break
    }
  }
  if (!out.name && (out.firstName || out.lastName)) {
    out.name = [out.firstName, out.lastName].filter(Boolean).join(' ')
  }
  return out
}

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

export async function isRateLimited(ip: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  try {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', since)

    if (error) return false
    return (count ?? 0) >= 3
  } catch {
    return false
  }
}

export async function logSubmission(params: {
  funnelSlug: string
  tenantId: string
  contact: ContactData
  answers: Record<string, string>
  leadPrice: number
  sourceUrl: string
  userAgent: string
  ipAddress?: string
}): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.from('submissions').insert({
      funnel_slug:    params.funnelSlug,
      tenant_id:      params.tenantId,
      contact:        params.contact,
      answers:        params.answers,
      lead_price:     params.leadPrice,
      source_url:     params.sourceUrl,
      user_agent:     params.userAgent,
      ip_address:     params.ipAddress ?? null,
    }).select('id').single()

    if (error) {
      console.error('Supabase logging error:', error)
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('Supabase logging exception:', err)
    return null
  }
}

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
 */
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
}): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    // Race-Guard: bei track-progress (completed=false) prüfen ob die Session
    // schon completed ist. Wenn ja, NICHT überschreiben — geben die existierende ID
    // zurück (für Webhook-Linking falls Caller das braucht).
    if (!params.completed) {
      const { data: existing } = await supabase
        .from('submissions')
        .select('id, completed_at')
        .eq('session_id', params.sessionId)
        .maybeSingle()
      if (existing?.completed_at) {
        // Late track-progress nach Submit — skip Overwrite, ID zurückgeben
        return existing.id
      }
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
      return null
    }
    return data?.id ?? null
  } catch (err) {
    console.error('Supabase upsert progress exception:', err)
    return null
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
