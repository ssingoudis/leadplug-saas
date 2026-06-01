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
  | 'multi_choice'
  | 'short_text'
  | 'long_text'
  | 'slider'
  | 'date'
  | 'number'
  | 'dropdown'
  | 'checkbox'
  // Aufgabe 39: neue Element-Types
  | 'rating'      // 1-5 (oder N) Sterne mit Hover-Preview, Antwort als String "1"..."5"
  | 'scale'       // 0-N Skala (NPS-Style), Antwort als String "0"..."N"
  | 'statement'   // Info-Block ohne Input — User klickt OK/Weiter, keine Antwort gespeichert
  // Aufgabe 40 Polish: Name-Field-Types — Skip-Mode-Funnels brauchen das für robustes contact-Mapping.
  | 'first_name' | 'last_name' | 'full_name'

export interface Option {
  label: string
  value: string
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

export interface DateConfig {
  min?: string       // ISO YYYY-MM-DD
  max?: string
  default?: string
  required?: boolean
}

export interface NumberConfig {
  min?: number
  max?: number
  step?: number
  unit?: string
  default?: number
  required?: boolean
}

export interface CheckboxConfig {
  label?: string     // Text rechts neben der Box
  required?: boolean
}

// Aufgabe 39: neue Element-Configs
export interface RatingConfig {
  maxStars?: number  // Default 5
  required?: boolean
}

export interface ScaleConfig {
  min?: number          // Default 0
  max?: number          // Default 10
  labelLeft?: string    // z.B. "Sehr unwahrscheinlich"
  labelRight?: string   // z.B. "Sehr wahrscheinlich"
  required?: boolean
}

export interface StatementConfig {
  // Statement hat keinen Input — Page hat nur Title + Subtitle, User klickt OK/Weiter ohne Antwort
  // Konfigurierbar evtl. später: alignment, icon
}

export interface WelcomeConfig {
  buttonLabel?: string  // z.B. "Los geht's →" — Default "Starten"
}

export interface QuestionConfig {
  id: string
  /** Aufgabe 40 Polish: echte DB-page-uuid (pages.id). Wird vom Widget für
   *  after_page-Webhook-Trigger an /api/track-progress mitgeschickt. */
  pageId?: string
  title: string
  subtitle?: string
  questionType: QuestionType
  options: Option[]
  config:
    | TextConfig | SliderConfig | DateConfig | NumberConfig | CheckboxConfig
    | RatingConfig | ScaleConfig | StatementConfig | WelcomeConfig
    | Record<string, never>
  visible: boolean
  // Aufgabe 38 + 39: Diskriminator.
  // "question" (Default) = klassisch 1-Field-pro-Step.
  // "custom" = Multi-Field-Karte. customFields ist dann gesetzt.
  // "welcome" = Optionaler Intro-Step am Anfang. config.buttonLabel = Button-Text.
  kind?: 'question' | 'custom' | 'welcome'
  customFields?: ContactFieldConfig[]
}

// Konfiguration eines einzelnen Kontaktformular-Felds (kommt aus den Fields der submit-Page
// und ab Aufgabe 38 auch Custom-Multi-Field-Pages).
// Aufgabe 39 Polish: erweitert um long_text/number/date/checkbox/dropdown.
// Aufgabe 39 Polish-Runde 2: + slider/multi_choice/rating/scale.
export interface ContactFieldConfig {
  key:          string                           // Eindeutiger Bezeichner, z.B. "name", "email", "plz"
  type:
    | 'radio' | 'text' | 'email' | 'tel' | 'plz'
    | 'long_text' | 'number' | 'date' | 'checkbox' | 'dropdown'
    | 'slider' | 'multi_choice' | 'rating' | 'scale'
    // Aufgabe 40 Polish: Name-Field-Types — Server mapped diese verlässlich ins contact-jsonb.
    | 'first_name' | 'last_name' | 'full_name'
  label:        string
  placeholder?: string                           // Nur für textish (text/email/tel/plz/long_text/number)
  required:     boolean
  visible:      boolean
  sort_order:   number
  options?:     string[]                         // Für type "radio" / "dropdown" / "multi_choice"
  checkboxLabel?: string                         // Nur für type "checkbox" — Text rechts neben der Box
  // Slider-config (nur für type "slider")
  sliderMin?:     number
  sliderMax?:     number
  sliderStep?:    number
  sliderUnit?:    string
  sliderDefault?: number
  // Rating-config (nur für type "rating")
  ratingMaxStars?: number
  // Scale-config (nur für type "scale")
  scaleMin?:        number
  scaleMax?:        number
  scaleLabelLeft?:  string
  scaleLabelRight?: string
  // Aufgabe 40 Polish: transient flag — Logik wie bei EditorQuestion._keyTouched.
  // Wird beim DB-Save weggestrippt.
  _keyTouched?: boolean
  // Aufgabe 40 Polish: stabile React-Key + Sortable-ID für Editor-UI.
  // Initial bei jedem Add/Load via crypto.randomUUID(). Wird beim Save weggestrippt.
  // Entkoppelt den UI-Identifier vom field.key, damit der user den key live editieren
  // kann ohne dass die Row re-mounted und Edit-State verliert.
  _clientId?: string
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
  theme: FunnelTheme
  funnel: FunnelConfig
  billingModel: 'per_lead' | 'per_month' | 'per_year'
  leadPrice: number
  billingPrice?: number

  questions: QuestionConfig[]
  contactFields: ContactFieldConfig[]
  skipSubmitStep: boolean      // Aufgabe 35: wenn true, kein Submit-Schritt — Funnel endet nach letzter Frage direkt auf Success-Page
  redirectUrl?: string         // Aufgabe 39: wenn gesetzt, Widget redirected nach Submit auf diese URL statt Success-Page
  metaPixelId?: string         // Aufgabe 43: Meta-Pixel-ID — embed.js feuert fbq('track','Lead') beim Submit
  googleAdsConversion?: string // Aufgabe 43: Google-Ads-Conversion send_to (AW-XXX/Label) — embed.js feuert gtag conversion
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
}

export interface EditorQuestion {
  _id: string          // temporäre React-Key-ID
  dbId?: string        // UUID aus DB (vorhanden bei edit, undefined bei neu)
  questionKey: string  // stabiler DB-Key, auto aus title; nie nachträglich ändern
  questionType: QuestionType
  title: string
  subtitle: string
  visible: boolean
  // shared: text, long_text, email, tel:
  required: boolean
  placeholder: string
  maxLength: string
  // slider:
  sliderMin: string
  sliderMax: string
  sliderStep: string
  sliderUnit: string
  sliderDefault: string
  // choice + dropdown:
  options: EditorOption[]
  // date (alle ISO YYYY-MM-DD):
  dateMin: string
  dateMax: string
  dateDefault: string
  // number:
  numberMin: string
  numberMax: string
  numberStep: string
  numberDefault: string
  numberUnit: string      // optional, z.B. "kWh", "Stück"
  // checkbox (Single-Checkbox, z.B. DSGVO/Newsletter):
  checkboxLabel: string   // Text rechts neben der Box, z.B. "Ja, ich stimme zu"
  // Aufgabe 39 — Rating (1-N Sterne):
  ratingMaxStars?: string  // Default "5"
  // Aufgabe 39 — Scale (0-N Skala, NPS-Style):
  scaleMin?: string
  scaleMax?: string
  scaleLabelLeft?: string
  scaleLabelRight?: string
  // Aufgabe 39 — Welcome-Screen:
  welcomeButtonLabel?: string  // Default "Starten"
  // Aufgabe 38 + 39: Diskriminator.
  // "question" (Default) = klassisch 1-Field-pro-Step.
  // "custom" = Multi-Field-Karte. customFields ist dann gesetzt.
  // "welcome" = Intro-Step am Anfang mit eigenem Button-Label.
  kind?: 'question' | 'custom' | 'welcome'
  customFields?: ContactFieldConfig[]
  // Aufgabe 40 Polish: transient flag — nur im Editor-State, NICHT in DB persistiert.
  // false = Auto-Sync questionKey ↔ toKey(title) bei jedem Title-Change.
  // true = User hat questionKey manuell editiert → kein Auto-Sync mehr (Stabilität).
  // Beim dbToEditorState wird das auf true gesetzt (alle existing keys sind "gesetzt").
  _keyTouched?: boolean
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
  // Submit-Schritt
  skipSubmitStep: boolean      // Aufgabe 35: wenn true, Submit-Page wird übersprungen
  // Aufgabe 39: End-Screen-Redirect-Modus. Leer = Content-Modus (Success-Page wird gerendert).
  // Wert = window.location.replace nach Submit (Widget zeigt Success-Page kurz und redirected danach).
  redirectUrl: string
  // Inhalte
  questions: EditorQuestion[]
  contactFields: ContactFieldConfig[]
}
