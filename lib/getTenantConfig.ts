import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TenantConfig, FunnelFont, ContactFieldConfig } from '@/types'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]*$/

const TEXT_DEFAULTS = {
  funnelTitle:           'Jetzt kostenloses Angebot anfordern',
  submitButtonLabel:     'Anfrage absenden',
  successMessage:        'Vielen Dank! Wir melden uns in Kürze bei Ihnen.',
  responseMessage:       'Wir melden uns so schnell wie möglich bei Ihnen.',
  contactFormSubtitle:   'Wer soll das Angebot erhalten?',
  privacyText:           'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden',
  answersOverviewLabel:  'Ihre Angaben im Überblick:',
  footerText:            '{{company_name}} · {{public_email}}',
}

const DEFAULT_CONTACT_FIELDS: ContactFieldConfig[] = [
  { key: 'anrede',  type: 'radio',  label: 'Anrede',           options: ['Herr', 'Frau'], required: true,  visible: true, sort_order: 0 },
  { key: 'name',    type: 'text',   label: 'Vor- und Nachname', placeholder: 'Vor- und Nachname', required: true,  visible: true, sort_order: 1 },
  { key: 'telefon', type: 'tel',    label: 'Telefonnummer',     placeholder: 'Telefonnummer',     required: true,  visible: true, sort_order: 2 },
  { key: 'email',   type: 'email',  label: 'E-Mail',            placeholder: 'E-Mail',            required: true,  visible: true, sort_order: 3 },
]

// neue Datenbank widget-funnel
// funnels-Zeile mit joins auf tenants, themes, funnel_questions → TenantConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRow(row: Record<string, any>): TenantConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant: Record<string, any> = row.tenants ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme: Record<string, any>  = row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: Record<string, any>[] = Array.isArray(row.funnel_questions)
    ? row.funnel_questions
    : []

  return {
    id:                tenant.id,
    funnelId:          row.id,
    slug:              row.slug,
    tenantSlug:        tenant.slug,
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
      title:               row.funnel_title           ?? TEXT_DEFAULTS.funnelTitle,
      submitButtonLabel:   row.submit_button_label    ?? TEXT_DEFAULTS.submitButtonLabel,
      successMessage:      row.success_message        ?? TEXT_DEFAULTS.successMessage,
      responseMessage:     row.response_message       ?? TEXT_DEFAULTS.responseMessage,
      contactFormSubtitle: row.contact_form_subtitle  ?? TEXT_DEFAULTS.contactFormSubtitle,
      privacyPolicyUrl:    row.privacy_policy_url     ?? undefined,
      privacyText:         row.privacy_text           ?? TEXT_DEFAULTS.privacyText,
      answersOverviewLabel: row.answers_overview_label ?? TEXT_DEFAULTS.answersOverviewLabel,
      footerText:          row.footer_text            ?? TEXT_DEFAULTS.footerText,
    },
    billingModel:         tenant.billing_model,
    leadPrice:    Number(tenant.lead_price ?? 0),
    billingPrice: tenant.billing_price != null ? Number(tenant.billing_price) : undefined,
    contactFields: Array.isArray(row.contact_fields) ? row.contact_fields as ContactFieldConfig[] : DEFAULT_CONTACT_FIELDS,
    questions: questions
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((q) => ({
        id:           q.question_key,
        title:        q.title,
        subtitle:     q.subtitle ?? undefined,
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

class TenantInactiveError extends Error {}

let cachedClient: SupabaseClient | null = null

function getSupabase() {
  if (cachedClient) return cachedClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  cachedClient = createClient(url, key, { auth: { persistSession: false } })
  return cachedClient
}

// neue Datenbank widget-funnel
// Abfrage auf funnels (slug), joined mit tenants + themes + questions
async function fetchFromSupabase(slug: string): Promise<TenantConfig | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('funnels')
    .select(`
      id, slug, is_active,
      funnel_title, submit_button_label, success_message,
      response_message, contact_form_subtitle, privacy_policy_url,
      privacy_text, answers_overview_label, footer_text,
      contact_fields,
      email_sender_local,
      primary_color, text_color, background_color, page_background_color,
      font, border_radius, max_width,
      tenants (
        id, slug, company_name, public_email, notification_email, public_phone, address, website, is_active,
        billing_model, lead_price, billing_price
      ),
      funnel_questions (
        sort_order, question_key, title, subtitle, question_type, visible, options, config
      )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantActive = (data.tenants as Record<string, any>)?.is_active !== false
  if (!data.is_active || !tenantActive) throw new TenantInactiveError()

  return mapDbRow(data)
}

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  if (!slug || slug.startsWith('_') || !SLUG_PATTERN.test(slug)) return null

  try {
    return await fetchFromSupabase(slug)
  } catch (err) {
    if (err instanceof TenantInactiveError) return null
    console.error('getTenantConfig: Supabase-Fehler', err)
    return null
  }
}
