import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContactData } from '@/types'

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
  tenantSlug: string
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
      tenant_slug:    params.tenantSlug,
      contact_anrede: params.contact.anrede  ?? null,
      contact_name:   params.contact.name    ?? '',
      contact_email:  params.contact.email   ?? null,
      contact_phone:  params.contact.telefon ?? null,
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
