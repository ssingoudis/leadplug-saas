// Self-hosted Fonts unter public/fonts/ (DSGVO-konform, keine Google-Requests).
// "system" = System-Font-Stack ohne Download; merriweather ist eine Serife.
export type FunnelFont =
  | "system" | "inter" | "poppins" | "roboto"
  | "montserrat" | "open-sans" | "lato" | "nunito" | "dm-sans" | "merriweather"

// Aufgabe 77: Farbmodus der Bibliotheks-Icons (funnel-weit, Design-Panel) —
// 'neutral' = textColor (schwarz/weiß je nach Theme, Default), 'brand' = primaryColor.
export type IconColor = 'neutral' | 'brand'

export interface FunnelTheme {
  primaryColor: string         // Markenfarbe (Pflicht). Alle abgeleiteten Farben (Hover, Border, Muted-Text, Input-BG) werden daraus + textColor/backgroundColor berechnet.
  textColor?: string           // Optional. Default "#1f2937". Nur setzen bei Dark-Themes.
  backgroundColor?: string     // Optional. Default "#ffffff". Card-Hintergrund des Widgets.
  pageBackgroundColor?: string // Optional. Default "transparent". Hintergrund der Seite/des iFrames um die Card. "transparent" = Parent-Website scheint durch.
  font?: FunnelFont            // Optional. Default "system".
  borderRadius?: string        // Optional. Default "0.5rem".
  maxWidth?: string            // Optional. Default "720px".
  iconColor?: IconColor        // Optional. Default "neutral". DB-Spalte `icon_color` (NULL = neutral).
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
  | 'rating'      // 1-5 (oder N) Sterne mit Hover-Preview, Antwort als String "1"..."5"
  | 'scale'       // 0-N Skala (NPS-Style), Antwort als String "0"..."N"
  | 'statement'   // Info-Block ohne Input — User klickt OK/Weiter, keine Antwort gespeichert
  // Name-Typen — für robustes contact-Mapping im Server.
  | 'first_name' | 'last_name' | 'full_name'

// Marker-Stil der Antwort-Optionen: 'letters' = A/B/C (Default), 'numbers' = 1/2/3,
// 'none' = kein Chip, 'checkbox' = Haken-Box, 'image' = Bild pro Option (Karten, single_choice + multi_choice).
export type OptionMarker = 'letters' | 'numbers' | 'none' | 'checkbox' | 'image'

// Aufgabe 76: Bilddarstellung der Bild-Optionen — 'contain' = Symbol/Icon (mit Rahmen, Default),
// 'cover' = Foto (randlos füllend, beschnitten).
export type ImageFit = 'contain' | 'cover'

export interface Option {
  label: string
  value: string
  // Aufgabe 76: optionales Bild pro Option (Bild-Funnels, single_choice). DB-Key `image_url`.
  // „leer = aus" → ohne Bild rendert die Option wie bisher (Letter-Chip/Marker).
  imageUrl?: string
  // Aufgabe 77: optionales Bibliotheks-Icon pro Option (Manifest-Key aus lib/funnel/icons.ts).
  // DB-Key `icon_key`. Exklusiv zu imageUrl (Editor erzwingt es); im Render gewinnt iconKey.
  iconKey?: string
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
  placeholder?: string
  required?: boolean
}

export interface CheckboxConfig {
  label?: string     // Text rechts neben der Box
  required?: boolean
}

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
  /** DB-page-uuid (pages.id) — vom Widget für after_page-Webhooks an /api/track-progress geschickt. */
  pageId?: string
  title: string
  subtitle?: string
  questionType: QuestionType
  options: Option[]
  // Marker-Stil der Optionen (A/B/C · 1/2/3 · keiner). Default 'letters'.
  optionMarker?: OptionMarker
  // Aufgabe 76: Bilddarstellung der Bild-Optionen (nur bei optionMarker='image'). Default 'contain'.
  imageFit?: ImageFit
  config:
    | TextConfig | SliderConfig | DateConfig | NumberConfig | CheckboxConfig
    | RatingConfig | ScaleConfig | StatementConfig | WelcomeConfig
    | Record<string, never>
  visible: boolean
  // Diskriminator: "question" (Default) = 1 Feld/Step · "custom" = Multi-Field-Karte
  // (customFields gesetzt) · "welcome" = Intro-Step (config.buttonLabel).
  kind?: 'question' | 'custom' | 'welcome'
  customFields?: ContactFieldConfig[]
}

// Konfiguration eines einzelnen Karten-Felds (Custom-Multi-Field-Pages).
export interface ContactFieldConfig {
  key:          string                           // Eindeutiger Bezeichner, z.B. "name", "email", "plz"
  type:
    | 'radio' | 'text' | 'email' | 'tel' | 'plz'
    | 'long_text' | 'number' | 'date' | 'checkbox' | 'dropdown'
    | 'slider' | 'multi_choice' | 'rating' | 'scale'
    // Name-Typen — Server mappt diese verlässlich ins contact-jsonb.
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
  // Transient flag (wie EditorQuestion._keyTouched); beim DB-Save weggestrippt.
  _keyTouched?: boolean
  // Stabile React-Key/Sortable-ID für die Editor-UI (crypto.randomUUID, beim Save weg).
  // Entkoppelt vom field.key, damit der User den key live editieren kann ohne Row-Remount.
  _clientId?: string
}

export interface FunnelConfig {
  title: string
  subtitle?: string            // Nur noch optional (SEO-Fallback). Kommt nicht aus Supabase.
  successMessage: string
  responseMessage: string
  contactFormSubtitle: string
  privacyPolicyUrl?: string
  privacyText: string          // Einwilligungstext vor dem Datenschutz-Link
  answersOverviewLabel: string // Überschrift der Antworten-Zusammenfassung
  showAnswersOverview: boolean  // Antworten-Übersicht im End-Screen (default false)
  // Kuratierte Anzeige-Schalter (Design-Tab) — KEIN Per-Element-Styling.
  showProgressBar: boolean      // dünner Fortschrittsbalken oben an der Card
  showStepBadge: boolean        // Schritt-Nummern-Chip über der Frage
  titleAlignment: 'left' | 'center'  // Überschriften links (Default) oder mittig
  // Aufgabe 78: Karten-Schatten an/aus — Schatten aus + Funnel-Hintergrund in der
  // Farbe der Eltern-Seite = nahtloses Einbetten. DB-Spalte `show_shadow`.
  showShadow: boolean
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
  companyName: string          // = tenant.company_name (Account-Name) — E-Mail-Absendername, Webhook-Payload, Page-Title
  notificationEmail: string    // Wohin neue Leads gesendet werden
  emailSenderLocal?: string    // Lokalteil der Absender-Adresse, z.B. "anfragen" → anfragen@domain.de
  theme: FunnelTheme
  funnel: FunnelConfig
  billingModel: 'per_lead' | 'per_month' | 'per_year'
  leadPrice: number
  billingPrice?: number

  questions: QuestionConfig[]
  redirectUrl?: string         // wenn gesetzt: Widget redirected nach Submit auf diese URL
  metaPixelId?: string         // Meta-Pixel-ID — embed.js feuert fbq('track','Lead') beim Submit
  googleAdsConversion?: string // Google-Ads-Conversion send_to (AW-XXX/Label) — embed.js feuert gtag
  logicRules?: LogicRule[]     // Logik-Sprünge (leer/undefined = linear)
}

// Öffentliche Projektion von TenantConfig — nur was das Live-Widget braucht. Interne
// Tenant-Daten (notificationEmail, billing, ids) werden NICHT an den Browser serialisiert.
// Erzeugt via toPublicFunnelConfig; einziger Consumer ist TenantFunnelClient.tsx.
export type PublicFunnelConfig = Pick<
  TenantConfig,
  | 'slug'
  | 'theme'
  | 'funnel'
  | 'questions'
  | 'redirectUrl'
  | 'logicRules'
  | 'metaPixelId'
  | 'googleAdsConversion'
>

// =============================================================================
// LOGIK-SPRÜNGE — Regeln pro Step, erste matchende gewinnt.
// Auswertung client (Widget) + server (Submit-Backstop) via lib/funnelLogic.ts.
// =============================================================================

export type LogicOp = 'eq' | 'neq' | 'includes' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'

export interface LogicCondition {
  fieldKey: string   // answers-Key (Question: field_key der Frage; Karte: field_key des Feldes)
  op: LogicOp        // 'includes' = comma-Liste (multi_choice) · 'contains' = Substring (Freitext) · gt/gte/lt/lte = numerisch (Slider/Zahl/Bewertung/Skala)
  value: string
}

export interface LogicRule {
  id: string
  sourcePageId: string            // pages.id des Quell-Steps
  sortOrder: number               // Auswertungs-Reihenfolge (erste matchende Regel gewinnt)
  isFallback: boolean             // „Alle anderen Fälle" — ohne Bedingungen, wird zuletzt geprüft
  conditions: LogicCondition[]    // UND-verknüpft; leer nur bei isFallback
  targetType: 'page' | 'end'      // 'end' = sofort absenden (Erfolgsseite)
  targetPageId: string | null     // NULL (z.B. Ziel-Page gelöscht) ⇒ Runtime-Fallback „weiter"
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
  // Aufgabe 76: optionale Bild-URL pro Option (single_choice). DB-Key `image_url`.
  imageUrl?: string
  // Aufgabe 77: optionales Bibliotheks-Icon pro Option. DB-Key `icon_key`. Exklusiv zu imageUrl.
  iconKey?: string
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
  // Marker-Stil der Optionen (A/B/C · 1/2/3 · keiner). Default 'letters'.
  optionMarker?: OptionMarker
  // Aufgabe 76: Bilddarstellung der Bild-Optionen (nur bei optionMarker='image'). Default 'contain'.
  imageFit?: ImageFit
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
  // Rating (1-N Sterne):
  ratingMaxStars?: string  // Default "5"
  // Scale (0-N Skala, NPS-Style):
  scaleMin?: string
  scaleMax?: string
  scaleLabelLeft?: string
  scaleLabelRight?: string
  // Welcome-Screen:
  welcomeButtonLabel?: string  // Default "Starten"
  // Diskriminator: "question" (Default) = 1 Feld/Step · "custom" = Multi-Field-Karte
  // (customFields gesetzt) · "welcome" = Intro-Step mit eigenem Button-Label.
  kind?: 'question' | 'custom' | 'welcome'
  customFields?: ContactFieldConfig[]
  // Transient (nicht in DB). false = Auto-Sync questionKey ↔ toKey(title) bei Title-Change;
  // true = User hat den key manuell editiert → kein Auto-Sync mehr. Bei dbToEditorState true.
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
  // Aufgabe 77: Farbmodus der Bibliotheks-Icons (Design-Panel). DB-Spalte `icon_color`.
  iconColor: IconColor
  // Texte
  contactFormSubtitle: string
  successMessage: string
  responseMessage: string
  privacyText: string
  privacyPolicyUrl: string
  answersOverviewLabel: string
  // Antworten-Übersicht im End-Screen (default false)
  showAnswersOverview: boolean
  // Anzeige-Schalter (Design-Tab)
  showProgressBar: boolean
  showStepBadge: boolean
  titleAlignment: 'left' | 'center'
  // Aufgabe 78: Karten-Schatten an/aus (nahtloses Einbetten). DB-Spalte `show_shadow`.
  showShadow: boolean
  // E-Mail-Einstellungen (pro Funnel)
  notificationEmail: string   // Wohin neue Leads gesendet werden (Leer = Tenant-Standard)
  emailSenderLocal: string    // Lokalteil der Absender-Adresse, z.B. "anfragen"
  // Status
  isActive: boolean
  // End-Screen-Redirect: leer = Success-Page rendern; Wert = nach Submit dorthin redirecten.
  redirectUrl: string
  // Inhalte
  questions: EditorQuestion[]
}
