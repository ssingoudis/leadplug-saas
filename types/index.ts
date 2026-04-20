// Self-hosted Fonts unter public/fonts/ (DSGVO-konform, keine Google-Requests).
// "system" = System-Font-Stack ohne Download.
export type FunnelFont = "system" | "inter" | "poppins" | "roboto"

export interface FunnelTheme {
  primaryColor: string         // Markenfarbe (Pflicht). Alle abgeleiteten Farben (Hover, Border, Muted-Text, Input-BG) werden daraus + textColor/backgroundColor berechnet.
  textColor?: string           // Optional. Default "#1f2937". Nur setzen bei Dark-Themes.
  backgroundColor?: string     // Optional. Default "#ffffff". Nur setzen bei Dark-Themes.
  font?: FunnelFont            // Optional. Default "system".
  borderRadius?: string        // Optional. Default "0.5rem".
  maxWidth?: string            // Optional. Default "720px".
}

export interface Option {
  label: string
  value: string
  iconKey: string
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
  subtitle: string
  submitButtonLabel: string
  successMessage: string
  privacyPolicyUrl: string
}

export interface PricingConfig {
  basePrice: Record<string, number>
  storageAddon: number
  currency: string
}

export interface TenantConfig {
  slug: string
  companyName: string
  contactEmail: string
  logoUrl?: string
  phone?: string
  address?: string
  website?: string
  theme: FunnelTheme
  funnel: FunnelConfig
  questions: QuestionConfig[]
  pricing: PricingConfig
}

export interface ContactData {
  anrede: string
  name: string
  telefon: string
  email: string
}

export interface PriceEstimate {
  min: number
  max: number
  currency: string
}

export interface SubmitPayload {
  tenant: string
  answers: Record<string, string>
  contact: ContactData
}