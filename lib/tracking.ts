import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContactData } from '@/types'

/**
 * Aufgabe 35: Skip-Mode-Backstop. Wenn der Funnel keine Submit-Page hat
 * (skip_submit_step=true), kommen die Lead-Daten aus den answers (Tenant
 * baut Email/Telefon als reguläre Question-Pages ein).
 * Damit die Pricing-Logik (`contact->>'email'`) weiter funktioniert und
 * E-Mails an den Anfragenden gesendet werden können, synthetisieren wir
 * `contact` aus den answers per Pattern-Match.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d\s\-()]{6,}$/
export function deriveContactFromAnswers(
  answers: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(answers)) {
    if (typeof raw !== 'string') continue
    const val = raw.trim()
    if (!val) continue
    if (!out.email && EMAIL_RE.test(val)) out.email = val
    if (!out.telefon && !EMAIL_RE.test(val) && PHONE_RE.test(val)) out.telefon = val
    // Heuristik für name: Key enthält "name" und Value ist kein Email/Telefon
    if (!out.name && /name/i.test(key) && !EMAIL_RE.test(val) && !PHONE_RE.test(val)) {
      out.name = val
    }
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

export async function updateEmailStatus(
  submissionId: string,
  customerSent: boolean,
  tenantSent: boolean,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase
      .from('submissions')
      .update({ customer_email_sent: customerSent, tenant_email_sent: tenantSent })
      .eq('id', submissionId)

    if (error) console.error('Supabase email status update error:', error)
  } catch (err) {
    console.error('Supabase email status update exception:', err)
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
