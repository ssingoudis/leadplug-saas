import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TenantConfig, FunnelFont, ContactFieldConfig, QuestionType, QuestionConfig } from '@/types'

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

// Rückmapping für Submit-Page-Fields → ContactFieldConfig.type (Widget-API stabil halten).
function fieldTypeToContactType(ft: string): ContactFieldConfig['type'] {
  switch (ft) {
    case 'short_text': return 'text'
    case 'email':      return 'email'
    case 'tel':        return 'tel'
    case 'plz':        return 'plz'
    case 'radio':      return 'radio'
    default:           return 'text' // defensive fallback
  }
}

// Rückmapping für Question-Page-Fields → QuestionType.
// Seit Aufgabe 31 sind alle QuestionType-Werte 1:1 valide field_type-Werte.
// `radio` + `plz` sind Submit-Page-only und fallen auf single_choice zurück.
const VALID_QUESTION_TYPES: ReadonlySet<string> = new Set([
  'single_choice', 'multi_choice', 'short_text', 'long_text', 'slider',
  'email', 'tel', 'date', 'number', 'dropdown', 'checkbox',
])
function fieldTypeToQuestionType(ft: string): QuestionType {
  return VALID_QUESTION_TYPES.has(ft) ? (ft as QuestionType) : 'single_choice'
}

interface DbField {
  field_key: string
  field_type: string
  label: string
  subtitle: string | null
  placeholder: string | null
  visible: boolean
  required: boolean
  sort_order: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any
}

interface DbPage {
  id: string
  page_type: 'question' | 'submit' | 'success'
  sort_order: number
  fields: DbField[] | null
}

// neue Datenbank widget-funnel
// funnels-Zeile mit joins auf tenants + pages(fields) → TenantConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbRow(row: Record<string, any>): TenantConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant: Record<string, any> = row.tenants ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme: Record<string, any>  = row
  const pages: DbPage[] = Array.isArray(row.pages) ? row.pages : []

  // Question-Pages (sortiert) → questions[]
  const questionPages = pages
    .filter((p) => p.page_type === 'question')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const questions: QuestionConfig[] = questionPages.map((page) => {
    const pageFields = Array.isArray(page.fields)
      ? [...page.fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : []
    const f = pageFields[0]
    if (!f) {
      // Defensive: Question-Page ohne Field
      return {
        id: page.id,
        title: '',
        questionType: 'single_choice',
        visible: true,
        options: [],
        config: {},
      }
    }
    const opts = Array.isArray(f.options) ? f.options : []
    return {
      id: f.field_key,
      title: f.label,
      subtitle: f.subtitle ?? undefined,
      questionType: fieldTypeToQuestionType(f.field_type),
      visible: f.visible ?? true,
      config: f.config ?? {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: opts.map((o: Record<string, any>) => ({
        label: o.label,
        value: o.value,
      })),
    }
  })

  // Submit-Page → contactFields[]
  const submitPage = pages.find((p) => p.page_type === 'submit')
  const contactFields: ContactFieldConfig[] = submitPage && Array.isArray(submitPage.fields) && submitPage.fields.length > 0
    ? [...submitPage.fields]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((f) => ({
          key:         f.field_key,
          type:        fieldTypeToContactType(f.field_type),
          label:       f.label,
          placeholder: f.placeholder ?? undefined,
          required:    f.required ?? false,
          visible:     f.visible ?? true,
          sort_order:  f.sort_order ?? 0,
          options:     f.field_type === 'radio' && Array.isArray(f.options)
            ? (f.options as string[])
            : undefined,
        }))
    : DEFAULT_CONTACT_FIELDS

  return {
    id:                tenant.id,
    funnelId:          row.id,
    slug:              row.slug,
    companyName:       row.footer_company_name || tenant.company_name || '',
    publicEmail:       row.footer_email || '',
    notificationEmail: row.notification_email,
    emailSenderLocal:  row.email_sender_local ?? undefined,
    phone:             row.footer_phone || undefined,
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
      title:               row.contact_form_title      ?? TEXT_DEFAULTS.funnelTitle,
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
    contactFields,
    questions,
    skipSubmitStep: row.skip_submit_step ?? false,
  }
}

export class TenantInactiveError extends Error {}

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
// Abfrage auf funnels (slug), joined mit tenants + pages → fields
async function fetchFromSupabase(slug: string): Promise<TenantConfig | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('funnels')
    .select(`
      id, slug, is_active,
      contact_form_title, submit_button_label, success_message,
      response_message, contact_form_subtitle, privacy_policy_url,
      privacy_text, answers_overview_label, footer_text,
      footer_company_name, footer_email, footer_phone,
      email_sender_local, notification_email,
      skip_submit_step,
      primary_color, text_color, background_color, page_background_color,
      font, border_radius, max_width,
      tenants!funnels_tenant_id_fkey (
        id, company_name, website, is_active,
        billing_model, lead_price, billing_price
      ),
      pages!pages_funnel_id_fkey (
        id, page_type, sort_order,
        fields!fields_page_id_fkey (
          field_key, field_type, label, subtitle, placeholder,
          visible, required, sort_order, options, config
        )
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
