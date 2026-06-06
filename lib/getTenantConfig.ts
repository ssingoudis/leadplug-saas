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

// Aufgabe 52D: DEFAULT_CONTACT_FIELDS entfernt (Submit-Page/Kontaktformular abgeschafft).

// Rückmapping field_type → ContactFieldConfig.type — weiter genutzt für Karten-Felder (custom pages).
function fieldTypeToContactType(ft: string): ContactFieldConfig['type'] {
  switch (ft) {
    case 'short_text':   return 'text'
    case 'email':        return 'email'
    case 'tel':          return 'tel'
    case 'plz':          return 'plz'
    case 'radio':        return 'radio'
    // Aufgabe 39 Polish
    case 'long_text':    return 'long_text'
    case 'number':       return 'number'
    case 'date':         return 'date'
    case 'checkbox':     return 'checkbox'
    case 'dropdown':     return 'dropdown'
    // Polish-Runde 2
    case 'slider':       return 'slider'
    case 'multi_choice': return 'multi_choice'
    case 'rating':       return 'rating'
    case 'scale':        return 'scale'
    // Aufgabe 40 Polish
    case 'first_name':   return 'first_name'
    case 'last_name':    return 'last_name'
    case 'full_name':    return 'full_name'
    default:             return 'text' // defensive fallback
  }
}

// Rückmapping für Question-Page-Fields → QuestionType.
// Seit Aufgabe 31 sind alle QuestionType-Werte 1:1 valide field_type-Werte.
// `radio` + `plz` sind Submit-Page-only und fallen auf single_choice zurück.
const VALID_QUESTION_TYPES: ReadonlySet<string> = new Set([
  'single_choice', 'multi_choice', 'short_text', 'long_text', 'slider',
  'email', 'tel', 'date', 'number', 'dropdown', 'checkbox',
  // Aufgabe 39
  'rating', 'scale', 'statement',
  // Aufgabe 40 Polish
  'first_name', 'last_name', 'full_name',
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
  page_type: 'question' | 'submit' | 'success' | 'custom' | 'welcome'
  sort_order: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: Record<string, any> | null
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

  // Question + Custom + Welcome-Pages (sortiert nach sort_order) → questions[]
  // Aufgabe 38 + 39: Alle drei Page-Typen leben im selben ordered Array.
  // kind-Diskriminator pro Entry. Widget branched in der Render-Logik.
  const stepPages = pages
    .filter((p) => p.page_type === 'question' || p.page_type === 'custom' || p.page_type === 'welcome')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const questions: QuestionConfig[] = stepPages.map((page) => {
    const pageFields = Array.isArray(page.fields)
      ? [...page.fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      : []

    // Aufgabe 39: Welcome-Screen
    if (page.page_type === 'welcome') {
      const pageCfg = page.config ?? {}
      return {
        id: typeof pageCfg.page_key === 'string' && pageCfg.page_key ? pageCfg.page_key : page.id,
        // Aufgabe 40 Polish: echte page-uuid für after_page-Webhook-Trigger
        pageId: page.id,
        title: typeof pageCfg.title === 'string' ? pageCfg.title : '',
        subtitle: typeof pageCfg.subtitle === 'string' ? pageCfg.subtitle : undefined,
        questionType: 'single_choice',
        visible: true,
        options: [],
        config: {
          buttonLabel: typeof pageCfg.button_label === 'string' ? pageCfg.button_label : 'Starten',
        },
        kind: 'welcome',
      }
    }

    // Aufgabe 38: Custom-Multi-Field-Page
    if (page.page_type === 'custom') {
      const pageCfg = page.config ?? {}
      const customFields: ContactFieldConfig[] = pageFields.map((f) => ({
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
      return {
        id: typeof pageCfg.page_key === 'string' && pageCfg.page_key ? pageCfg.page_key : page.id,
        // Aufgabe 40 Polish: echte page-uuid für after_page-Webhook-Trigger
        pageId: page.id,
        title: typeof pageCfg.title === 'string' ? pageCfg.title : '',
        subtitle: typeof pageCfg.subtitle === 'string' ? pageCfg.subtitle : undefined,
        // Custom-Page hat keinen klassischen questionType — Default-Wert nur fürs Type-System,
        // wird vom Widget durch kind="custom" überschrieben/ignoriert.
        questionType: 'single_choice',
        visible: true,
        options: [],
        config: {},
        kind: 'custom',
        customFields,
      }
    }

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
        kind: 'question',
      }
    }
    const opts = Array.isArray(f.options) ? f.options : []
    // Aufgabe 50: Marker-Stil (A/B/C · 1/2/3 · keiner) aus config; Default 'letters'.
    const fcfg = (f.config ?? {}) as Record<string, unknown>
    return {
      id: f.field_key,
      // Aufgabe 40 Polish: echte page-uuid für after_page-Webhook-Trigger
      pageId: page.id,
      title: f.label,
      subtitle: f.subtitle ?? undefined,
      questionType: fieldTypeToQuestionType(f.field_type),
      visible: f.visible ?? true,
      optionMarker:
        fcfg.optionMarker === 'numbers' || fcfg.optionMarker === 'none' ? fcfg.optionMarker : 'letters',
      config: f.config ?? {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: opts.map((o: Record<string, any>) => ({
        label: o.label,
        value: o.value,
      })),
      kind: 'question',
    }
  })

  // Aufgabe 52D: Submit-Page → contactFields entfernt. Orphaned Submit-Pages bei Alt-Funnels
  // werden ignoriert; Lead-Daten kommen aus den Karten-Antworten (deriveContactFromAnswers).

  return {
    id:                tenant.id,
    funnelId:          row.id,
    slug:              row.slug,
    companyName:       tenant.company_name || '',
    notificationEmail: row.notification_email,
    emailSenderLocal:  row.email_sender_local ?? undefined,
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
      successMessage:      row.success_message        || 'Vielen Dank für Ihre Anfrage!',  // Aufgabe 51: Titel nie leer (nacktes Häkchen reicht nicht). Sauberer Editor-Default → Plan.
      responseMessage:     row.response_message       ?? '',  // Aufgabe 51: optional — leer = ausgeblendet (kein Default-Fallback)
      contactFormSubtitle: row.contact_form_subtitle  ?? TEXT_DEFAULTS.contactFormSubtitle,
      privacyPolicyUrl:    row.privacy_policy_url     ?? undefined,
      privacyText:         row.privacy_text           ?? TEXT_DEFAULTS.privacyText,
      answersOverviewLabel: row.answers_overview_label ?? '',  // Aufgabe 52: Editor-Default, kein Render-Fallback
      showAnswersOverview: row.show_answers_overview ?? false,
    },
    billingModel:         tenant.billing_model,
    leadPrice:    Number(tenant.lead_price ?? 0),
    billingPrice: tenant.billing_price != null ? Number(tenant.billing_price) : undefined,
    questions,
    redirectUrl: row.redirect_url ?? undefined,
    metaPixelId: row.meta_pixel_id ?? undefined,
    googleAdsConversion: row.google_ads_conversion ?? undefined,
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
      privacy_text, answers_overview_label, show_answers_overview,
      email_sender_local, notification_email,
      redirect_url,
      meta_pixel_id, google_ads_conversion,
      primary_color, text_color, background_color, page_background_color,
      font, border_radius, max_width,
      tenants!funnels_tenant_id_fkey (
        id, company_name, is_active,
        billing_model, lead_price, billing_price
      ),
      pages!pages_funnel_id_fkey (
        id, page_type, sort_order, config,
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
