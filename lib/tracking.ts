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

// neue Datenbank widget-funnel
export async function logSubmission(params: {
  funnelSlug: string
  tenantSlug: string
  contact: ContactData
  answers: Record<string, string>
  leadPrice: number
  sourceUrl: string
  userAgent: string
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase.from('submissions').insert({
      funnel_slug:   params.funnelSlug,
      tenant_slug:   params.tenantSlug,
      contact_name:  params.contact.name,
      contact_email: params.contact.email,
      contact_phone: params.contact.telefon,
      answers:       params.answers,
      lead_price:    params.leadPrice,
      emails_sent:   true,
      source_url:    params.sourceUrl,
      user_agent:    params.userAgent,
    })
    if (error) console.error('Supabase logging error:', error)
  } catch (err) {
    console.error('Supabase logging exception:', err)
  }
}
