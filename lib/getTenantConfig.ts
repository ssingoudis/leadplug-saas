import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'
import type { TenantConfig, FunnelFont } from '@/types'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

const TEXT_DEFAULTS = {
  funnelTitle:          'Jetzt kostenloses Angebot anfordern',
  submitButtonLabel:    'Anfrage absenden',
  successMessage:       'Vielen Dank! Wir melden uns in Kürze bei Ihnen.',
  responseTimeText:     'so schnell wie möglich',
  contactFormSubtitle:  'Wer soll das Angebot erhalten?',
}

// neue Datenbank widget-funnel
// funnels-Zeile mit joins auf tenants, themes, funnel_questions → TenantConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRow(row: Record<string, any>): TenantConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant: Record<string, any> = row.tenants ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme: Record<string, any>  = row.themes  ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: Record<string, any>[] = Array.isArray(row.funnel_questions)
    ? row.funnel_questions
    : []

  return {
    id:                tenant.id,
    funnelId:          row.id,
    slug:              row.slug,
    tenantSlug:        tenant.slug,
    industry:          row.industry    ?? 'general',
    companyName:       tenant.company_name,
    publicEmail:       tenant.public_email,
    notificationEmail: tenant.notification_email,
    emailSenderLocal:  row.email_sender_local ?? undefined,
    phone:             tenant.public_phone ?? undefined,
    address:           tenant.address  ?? undefined,
    website:           tenant.website  ?? undefined,
    theme: {
      primaryColor:        theme.primary_color        ?? '#22c55e',
      textColor:           theme.text_color           ?? '#1f2937',
      backgroundColor:     theme.background_color     ?? '#ffffff',
      pageBackgroundColor: theme.page_background_color ?? 'transparent',
      font:                (theme.font ?? 'system') as FunnelFont,
      borderRadius:        theme.border_radius        ?? '0.5rem',
      maxWidth:            theme.max_width            ?? '720px',
    },
    funnel: {
      title:               row.funnel_title          ?? TEXT_DEFAULTS.funnelTitle,
      submitButtonLabel:   row.submit_button_label   ?? TEXT_DEFAULTS.submitButtonLabel,
      successMessage:      row.success_message       ?? TEXT_DEFAULTS.successMessage,
      responseTimeText:    row.response_time_text    ?? TEXT_DEFAULTS.responseTimeText,
      contactFormSubtitle: row.contact_form_subtitle ?? TEXT_DEFAULTS.contactFormSubtitle,
      privacyPolicyUrl:    row.privacy_policy_url    ?? undefined,
    },
    billingModel:         tenant.billing_model         ?? 'per_lead',
    leadPriceBase:        Number(tenant.lead_price_base ?? 0),
    flatMonthlyPrice:     tenant.flat_monthly_price     != null ? Number(tenant.flat_monthly_price)     : undefined,
    flatMonthlyLeadLimit: tenant.flat_monthly_lead_limit != null ? Number(tenant.flat_monthly_lead_limit) : undefined,
    questions: questions
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((q) => ({
        id:           q.question_key,
        title:        q.title,
        questionType: q.question_type ?? 'single_choice',
        visible:      q.visible ?? true,
        config:       q.config ?? {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: (Array.isArray(q.options) ? q.options as Record<string, any>[] : [])
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
      slug:              j.slug              ?? slug,
      tenantSlug:        j.tenantSlug        ?? slug,
      industry:          j.industry          ?? 'general',
      companyName:       j.companyName       ?? '',
      publicEmail:       j.publicEmail       ?? '',
      notificationEmail: j.notificationEmail ?? j.publicEmail ?? '',
      phone:             j.phone,
      address:      j.address,
      website:      j.website,
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
        privacyPolicyUrl:    j.funnel?.privacyPolicyUrl   ?? undefined,
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

// neue Datenbank widget-funnel
// Abfrage auf funnels (slug), joined mit tenants + themes + questions
async function fetchFromSupabase(slug: string): Promise<TenantConfig | null> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('funnels')
    .select(`
      id, slug, industry, is_active,
      funnel_title, submit_button_label, success_message,
      response_time_text, contact_form_subtitle, privacy_policy_url,
      email_sender_local,
      tenants (
        id, slug, company_name, public_email, notification_email, public_phone, address, website, is_active,
        billing_model, lead_price_base, flat_monthly_price, flat_monthly_lead_limit
      ),
      themes (
        primary_color, text_color, background_color, page_background_color,
        font, border_radius, max_width
      ),
      funnel_questions (
        sort_order, question_key, title, question_type, visible, options, config
      )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null  // Funnel nicht in DB → JSON-Fallback

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantActive = (data.tenants as Record<string, any>)?.is_active !== false
  if (!data.is_active || !tenantActive) throw new TenantInactiveError()

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
