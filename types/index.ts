// Self-hosted Fonts unter public/fonts/ (DSGVO-konform, keine Google-Requests).
// "system" = System-Font-Stack ohne Download.
export type FunnelFont = "system" | "inter" | "poppins" | "roboto"

export interface FunnelTheme {
  primaryColor: string         // Markenfarbe (Pflicht). Alle abgeleiteten Farben (Hover, Border, Muted-Text, Input-BG) werden daraus + textColor/backgroundColor berechnet.
  textColor?: string           // Optional. Default "#1f2937". Nur setzen bei Dark-Themes.
  backgroundColor?: string     // Optional. Default "#ffffff". Card-Hintergrund des Widgets.
  pageBackgroundColor?: string // Optional. Default "transparent". Hintergrund der Seite/des iFrames um die Card. "transparent" = Parent-Website scheint durch.
  font?: FunnelFont            // Optional. Default "system".
  borderRadius?: string        // Optional. Default "0.5rem".
  maxWidth?: string            // Optional. Default "720px".
}

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text'
  | 'long_text'
  | 'slider'

export interface Option {
  label: string
  value: string
  iconKey: string
  iconUrl?: string
}

export interface TextConfig {
  placeholder?: string
  maxLength?: number
  required?: boolean
}

export interface SliderConfig {
  min: number
  max: number
  step?: number
  unit?: string
  default?: number
  openMax?: boolean
}

export interface QuestionConfig {
  id: string
  title: string
  subtitle?: string
  questionType: QuestionType
  options: Option[]
  config: TextConfig | SliderConfig | Record<string, never>
  visible: boolean
}

// Konfiguration eines einzelnen Kontaktformular-Felds (kommt aus funnels.contact_fields JSONB).
export interface ContactFieldConfig {
  key:          string                           // Eindeutiger Bezeichner, z.B. "name", "email", "plz"
  type:         'radio' | 'text' | 'email' | 'tel' | 'plz'
  label:        string
  placeholder?: string                           // Nur für text/email/tel
  required:     boolean
  visible:      boolean
  sort_order:   number
  options?:     string[]                         // Nur für type "radio", z.B. ["Herr", "Frau"]
}

export interface FunnelConfig {
  title: string
  subtitle?: string            // Nur noch optional (SEO-Fallback). Kommt nicht aus Supabase.
  submitButtonLabel: string
  successMessage: string
  responseMessage: string
  contactFormSubtitle: string
  privacyPolicyUrl?: string
  privacyText: string          // Einwilligungstext vor dem Datenschutz-Link
  answersOverviewLabel: string // Überschrift der Antworten-Zusammenfassung
  footerText: string           // Footer-Template mit {{company_name}}, {{public_email}}, {{public_phone}}
}

/* alte Datenbank solar-widget
export interface TenantConfig {
  id?: string
  slug: string
  industry: string             // 'solar' | 'waermepumpe' | 'heizung' | 'sanitaer' | 'elektro' | 'general'
  companyName: string
  contactEmail: string
  logoUrl?: string
  phone?: string
  address?: string
  website?: string
  theme: FunnelTheme
  funnel: FunnelConfig
  billingModel: 'per_lead' | 'per_month' | 'per_year'
  leadPrice: number
  billingPrice?: number

  questions: QuestionConfig[]
}
*/

// neue Datenbank widget-funnel
export interface TenantConfig {
  id?: string          // tenant ID
  funnelId?: string    // funnel ID
  slug: string         // funnel slug (URL-Identifier)
  companyName: string
  publicEmail: string          // Wird dem Kunden angezeigt (z.B. im Success-Screen)
  notificationEmail: string    // Wohin neue Leads gesendet werden
  emailSenderLocal?: string    // Lokalteil der Absender-Adresse, z.B. "anfragen" → anfragen@domain.de
  phone?: string
  address?: string
  website?: string
  theme: FunnelTheme
  funnel: FunnelConfig
  billingModel: 'per_lead' | 'per_month' | 'per_year'
  leadPrice: number
  billingPrice?: number

  questions: QuestionConfig[]
  contactFields: ContactFieldConfig[]
}

// Dynamische Kontaktdaten — Keys entsprechen den ContactFieldConfig.key-Werten.
// Record<string, string> erlaubt beliebige Felder (anrede, name, email, telefon + custom).
export type ContactData = Record<string, string>

// =============================================================================
// EDITOR TYPES — nur im Tenant-Editor verwendet, nie im Widget
// =============================================================================

export interface EditorOption {
  _id: string       // temporäre React-Key-ID, wird nicht in DB gespeichert
  label: string
  value: string     // auto-slug aus label, stabil nach erster Erstellung
  iconKey: string
  iconUrl: string
}

export interface EditorQuestion {
  _id: string          // temporäre React-Key-ID
  dbId?: string        // UUID aus DB (vorhanden bei edit, undefined bei neu)
  questionKey: string  // stabiler DB-Key, auto aus title; nie nachträglich ändern
  questionType: QuestionType
  title: string
  subtitle: string
  visible: boolean
  // text-Typen:
  required: boolean
  placeholder: string
  maxLength: string
  // slider:
  sliderMin: string
  sliderMax: string
  sliderStep: string
  sliderUnit: string
  sliderDefault: string
  // choice-Typen:
  options: EditorOption[]
}

export interface EditorState {
  funnelName: string    // interner Name (Funnel-Liste & Header)
  funnelTitle: string   // H1-Überschrift im Kontaktformular
  // Theme
  primaryColor: string
  textColor: string
  backgroundColor: string
  pageBackgroundColor: string
  font: FunnelFont
  borderRadius: string
  maxWidth: string
  // Texte
  contactFormSubtitle: string
  submitButtonLabel: string
  successMessage: string
  responseMessage: string
  privacyText: string
  privacyPolicyUrl: string
  footerText: string
  answersOverviewLabel: string
  // Footer-Kontaktdaten (pro Funnel)
  footerCompanyName: string
  footerEmail: string
  footerPhone: string
  // E-Mail-Einstellungen (pro Funnel)
  notificationEmail: string   // Wohin neue Leads gesendet werden (Leer = Tenant-Standard)
  emailSenderLocal: string    // Lokalteil der Absender-Adresse, z.B. "anfragen"
  // Status
  isActive: boolean
  // Inhalte
  questions: EditorQuestion[]
  contactFields: ContactFieldConfig[]
}
