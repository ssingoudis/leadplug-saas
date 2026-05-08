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
  questionType: QuestionType
  options: Option[]
  config: TextConfig | SliderConfig | Record<string, never>
  defaultValue?: string
  visible: boolean
}

export interface FunnelConfig {
  title: string
  subtitle?: string            // Nur noch optional (SEO-Fallback). Kommt nicht aus Supabase.
  submitButtonLabel: string
  successMessage: string
  responseMessage: string
  contactFormSubtitle: string
  privacyPolicyUrl?: string
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
  billingModel: 'per_lead' | 'flat_monthly'
  leadPriceBase: number
  flatMonthlyPrice?: number
  flatMonthlyLeadLimit?: number
  questions: QuestionConfig[]
}
*/

// neue Datenbank widget-funnel
export interface TenantConfig {
  id?: string          // tenant ID
  funnelId?: string    // funnel ID
  slug: string         // funnel slug (URL-Identifier)
  tenantSlug: string   // tenant slug (lesbarer Identifier des Kunden)
  industry: string
  companyName: string
  publicEmail: string          // Wird dem Kunden angezeigt (z.B. im Success-Screen)
  notificationEmail: string    // Wohin neue Leads gesendet werden
  emailSenderLocal?: string    // Lokalteil der Absender-Adresse, z.B. "anfragen" → anfragen@domain.de
  phone?: string
  address?: string
  website?: string
  theme: FunnelTheme
  funnel: FunnelConfig
  billingModel: 'per_lead' | 'flat_monthly'
  leadPriceBase: number
  flatMonthlyPrice?: number
  flatMonthlyLeadLimit?: number
  questions: QuestionConfig[]
}

export interface ContactData {
  anrede: string
  name: string
  telefon: string
  email: string
}


export interface SubmitPayload {
  tenant: string
  answers: Record<string, string>
  contact: ContactData
  honeypot?: string
  sourceUrl: string
  userAgent: string
}
