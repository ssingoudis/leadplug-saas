export interface FunnelTheme {
  primaryColor: string
  primaryColorHover: string
  textColor: string
  textColorMuted: string
  backgroundColor: string
  borderColor: string
  inputBgColor: string
  fontFamily: string
  borderRadius: string
  maxWidth: string
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