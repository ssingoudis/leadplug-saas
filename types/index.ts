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

export interface Option {
  label: string
  value: string
  iconKey: string
  iconUrl?: string
  iconProps?: Record<string, string>
}

export interface QuestionConfig {
  id: string
  title: string
  options: Option[]
  defaultValue?: string
  visible: boolean
}

export interface FunnelConfig {
  title: string
  subtitle?: string            // Nur noch optional (SEO-Fallback). Kommt nicht aus Supabase.
  submitButtonLabel: string
  successMessage: string
  responseTimeText: string
  contactFormSubtitle: string
  privacyText: string
  privacyPolicyUrl: string
}

// Deprecated – wird in Aufgabe 4 entfernt
export interface PricingConfig {
  basePrice: Record<string, number>
  storageAddon: number
  currency: string
}

// Deprecated – wird in Aufgabe 4 entfernt
export interface BillingConfig {
  pricePerLead: number
  currency: string
}

export interface TenantConfig {
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
  // Billing
  billingModel: 'per_lead' | 'flat_monthly'
  leadPriceBase: number
  flatMonthlyPrice?: number
  flatMonthlyLeadLimit?: number
  questions: QuestionConfig[]
  // Deprecated – wird in Aufgabe 4 entfernt
  pricing?: PricingConfig
  billing?: BillingConfig
}

export interface ContactData {
  anrede: string
  name: string
  telefon: string
  email: string
}

// Deprecated – wird in Aufgabe 4 entfernt (generatePDF.ts, tracking.ts)
export interface PriceEstimate {
  min: number
  max: number
  currency: string
}

export interface SubmitPayload {
  tenant: string
  answers: Record<string, string>
  contact: ContactData
  startedAt: string
  sourceUrl: string
  userAgent: string
}
