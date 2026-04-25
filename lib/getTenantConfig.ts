import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'
import type { TenantConfig, FunnelFont } from '@/types'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

const TEXT_DEFAULTS = {
  funnelTitle:          'Jetzt kostenloses Angebot anfordern',
  submitButtonLabel:    'Anfrage absenden',
  successMessage:       'Vielen Dank! Wir melden uns in Kürze bei Ihnen.',
  responseTimeText:     '24 Stunden',
  contactFormSubtitle:  'Wer soll das Angebot erhalten?',
  privacyText:          'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden. Widerrufen geht jederzeit.',
  privacyPolicyUrl:     '#',
}

// Supabase-DB-Zeile → TenantConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRow(row: Record<string, any>): TenantConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: Record<string, any>[] = Array.isArray(row.funnel_questions)
    ? row.funnel_questions
    : []

  return {
    id:           row.id,
    slug:         row.slug,
    industry:     row.industry ?? 'general',
    companyName:  row.company_name,
    contactEmail: row.contact_email,
    phone:        row.phone    ?? undefined,
    address:      row.address  ?? undefined,
    website:      row.website  ?? undefined,
    logoUrl:      row.logo_url ?? undefined,
    theme: {
      primaryColor:       row.primary_color       ?? '#22c55e',
      textColor:          row.text_color           ?? '#1f2937',
      backgroundColor:    row.background_color     ?? '#ffffff',
      pageBackgroundColor:row.page_background_color ?? 'transparent',
      font:               (row.font ?? 'system') as FunnelFont,
      borderRadius:       row.border_radius        ?? '0.5rem',
      maxWidth:           row.max_width            ?? '720px',
    },
    funnel: {
      title:              row.funnel_title         ?? TEXT_DEFAULTS.funnelTitle,
      submitButtonLabel:  row.submit_button_label  ?? TEXT_DEFAULTS.submitButtonLabel,
      successMessage:     row.success_message      ?? TEXT_DEFAULTS.successMessage,
      responseTimeText:   row.response_time_text   ?? TEXT_DEFAULTS.responseTimeText,
      contactFormSubtitle:row.contact_form_subtitle ?? TEXT_DEFAULTS.contactFormSubtitle,
      privacyText:        row.privacy_text         ?? TEXT_DEFAULTS.privacyText,
      privacyPolicyUrl:   row.privacy_policy_url   ?? TEXT_DEFAULTS.privacyPolicyUrl,
    },
    billingModel:         row.billing_model        ?? 'per_lead',
    leadPriceBase:        Number(row.lead_price_base ?? 0),
    flatMonthlyPrice:     row.flat_monthly_price     != null ? Number(row.flat_monthly_price)     : undefined,
    flatMonthlyLeadLimit: row.flat_monthly_lead_limit != null ? Number(row.flat_monthly_lead_limit) : undefined,
    questions: questions
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((q) => ({
        id:      q.question_key,
        title:   q.title,
        visible: q.visible ?? true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: (Array.isArray(q.funnel_options) ? q.funnel_options as Record<string, any>[] : [])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((o) => ({
            label:   o.label,
            value:   o.value,
            iconKey: o.icon_key ?? '',
            iconUrl: o.icon_url ?? undefined,
          })),
      })),
  }
}

// JSON-Datei → TenantConfig (mit Defaults für fehlende neue Felder)
async function fetchFromJson(slug: string): Promise<TenantConfig | null> {
  const filePath = path.join(process.cwd(), 'tenants', `${slug}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j: Record<string, any> = JSON.parse(raw)
    return {
      slug:         j.slug         ?? slug,
      industry:     j.industry     ?? 'general',
      companyName:  j.companyName  ?? '',
      contactEmail: j.contactEmail ?? '',
      phone:        j.phone,
      address:      j.address,
      website:      j.website,
      logoUrl:      j.logoUrl,
      theme: {
        primaryColor:        j.theme?.primaryColor        ?? '#22c55e',
        textColor:           j.theme?.textColor,
        backgroundColor:     j.theme?.backgroundColor,
        pageBackgroundColor: j.theme?.pageBackgroundColor,
        font:                j.theme?.font,
        borderRadius:        j.theme?.borderRadius,
        maxWidth:            j.theme?.maxWidth,
      },
      funnel: {
        title:               j.funnel?.title              ?? TEXT_DEFAULTS.funnelTitle,
        subtitle:            j.funnel?.subtitle,
        submitButtonLabel:   j.funnel?.submitButtonLabel  ?? TEXT_DEFAULTS.submitButtonLabel,
        successMessage:      j.funnel?.successMessage     ?? TEXT_DEFAULTS.successMessage,
        responseTimeText:    j.funnel?.responseTimeText   ?? TEXT_DEFAULTS.responseTimeText,
        contactFormSubtitle: j.funnel?.contactFormSubtitle ?? TEXT_DEFAULTS.contactFormSubtitle,
        privacyText:         j.funnel?.privacyText        ?? TEXT_DEFAULTS.privacyText,
        privacyPolicyUrl:    j.funnel?.privacyPolicyUrl   ?? TEXT_DEFAULTS.privacyPolicyUrl,
      },
      billingModel:         j.billingModel         ?? 'per_lead',
      leadPriceBase:        Number(j.leadPriceBase ?? j.billing?.pricePerLead ?? 0),
      flatMonthlyPrice:     j.flatMonthlyPrice,
      flatMonthlyLeadLimit: j.flatMonthlyLeadLimit,
      questions: j.questions ?? [],
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

class TenantInactiveError extends Error {}

// Supabase-Abfrage: gibt null zurück wenn Tenant nicht existiert,
// wirft TenantInactiveError wenn Tenant existiert aber is_active=false.
async function fetchFromSupabase(slug: string): Promise<TenantConfig | null> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      funnel_questions (
        id, sort_order, question_key, title, visible,
        funnel_options ( id, sort_order, label, value, icon_key, icon_url )
      )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data)          return null   // Tenant nicht in DB → JSON-Fallback
  if (!data.is_active) throw new TenantInactiveError()  // Deaktiviert → 404, kein Fallback

  return mapDbRow(data)
}

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  if (!slug || slug.startsWith('_') || !SLUG_PATTERN.test(slug)) return null

  try {
    const config = await fetchFromSupabase(slug)
    if (config !== null) return config
    // config === null heißt: nicht in DB gefunden → JSON-Fallback
  } catch (err) {
    if (err instanceof TenantInactiveError) return null
    console.error('getTenantConfig: Supabase-Fehler, fallback auf JSON', err)
  }

  return fetchFromJson(slug)
}
