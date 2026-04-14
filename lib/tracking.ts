import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContactData, PriceEstimate } from '@/types'

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

export async function logSubmission(params: {
  tenantSlug: string
  contact: ContactData
  answers: Record<string, string>
  estimate: PriceEstimate
}): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase.from('submissions').insert({
      tenant_slug: params.tenantSlug,
      contact_name: params.contact.name,
      contact_email: params.contact.email,
      contact_phone: params.contact.telefon,
      answers: params.answers,
      price_min: params.estimate.min,
      price_max: params.estimate.max,
      emails_sent: true,
    })
    if (error) console.error('Supabase logging error:', error)
  } catch (err) {
    console.error('Supabase logging exception:', err)
  }
}

export async function getMonthlyCount(tenantSlug: string): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  try {
    const { count, error } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_slug', tenantSlug)
      .gte('created_at', startOfMonth.toISOString())

    if (error) {
      console.error('Supabase monthly count error:', error)
      return 0
    }
    return count ?? 0
  } catch (err) {
    console.error('Supabase monthly count exception:', err)
    return 0
  }
}