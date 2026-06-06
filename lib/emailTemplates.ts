import { resolveAnswer } from '@/lib/resolveAnswer'
import type { TenantConfig, ContactData, ContactFieldConfig } from '@/types'

// Aufgabe 53: Marker für „Mein Postfach" in custom-Empfänger-Listen. Löst beim Versand auf die
// Funnel-Benachrichtigungs-Adresse (TenantConfig.notificationEmail) auf — folgt also automatisch
// der Account-Adresse. Geteilt zwischen Editor-UI (EmailsPanel) und Sender (lib/emails.ts).
export const RECIPIENT_ME = '@me'

// =============================================================================
// Aufgabe 41 — E-Mail-Template-Rendering (TipTap-HTML-Modell)
//
// Tenants editieren Mails im TipTap-WYSIWYG-Editor. TipTap exportiert HTML mit:
//   • Variable-Chips als <span data-variable="contact.name">{{contact.name}}</span>
//   • Magic-Section-Blöcke als <div data-magic-section="answers_overview"></div>
//
// Beim Versand expandieren wir die data-* Elemente serverseitig:
//   • data-variable → resolveVar(name, ctx) → HTML-escaped Plain-Text
//   • data-magic-section → renderXxx(ctx) → fertiges Sub-HTML
//
// Subject läuft denselben Var-Pfad, aber HTML-Tags werden gestripped (Plain-Text).
// =============================================================================

export interface TemplateContext {
  contact:      ContactData
  answers:      Record<string, string>
  tenantConfig: TenantConfig
  submission: {
    id:           string
    session_id:   string
    created_at:   string
    completed_at: string | null
    source_url:   string | null
  }
  submittedAt?: Date
}

export interface RenderedEmail {
  subject:  string
  bodyHtml: string
}

// ---------------------------------------------------------------------------
// HTML Escaping (für untrusted Lead-Daten)
// ---------------------------------------------------------------------------

function htmlEscape(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Magic-Section Renderer (= Sub-HTML-Snippets)
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.leadplug.de'

const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day:    '2-digit',
  month:  '2-digit',
  year:   'numeric',
  hour:   '2-digit',
  minute: '2-digit',
})

function renderAnswersOverview(ctx: TemplateContext, customHeading?: string | null): string {
  const primary = ctx.tenantConfig.theme.primaryColor
  const visibleQuestions = ctx.tenantConfig.questions.filter((q) => q.visible)
  const rows = visibleQuestions
    .map((q) => {
      const display = resolveAnswer(q, ctx.answers)
      if (!display) return null
      const label = htmlEscape(q.title.replace('?', ''))
      const value = htmlEscape(display)
      return `<p style="font-size:13px;line-height:20px;color:#374151;margin:0 0 4px;"><span style="color:#6b7280;">${label}:</span> <strong>${value}</strong></p>`
    })
    .filter(Boolean)
    .join('')
  if (!rows) return ''
  const headingText = customHeading?.trim() || ctx.tenantConfig.funnel.answersOverviewLabel || 'Angaben im Überblick'
  const heading = htmlEscape(headingText)
  return `<div style="background:#f9fafb;padding:16px 20px;border-radius:4px;border-left:4px solid ${primary};margin:16px 0;"><h3 style="font-size:15px;font-weight:bold;margin:0 0 10px;color:#1f2937;">${heading}</h3>${rows}</div>`
}

// Aufgabe 52D: renderContactSummary entfernt — die contact_summary-Magic-Section nutzte
// tenantConfig.contactFields (Submit-Page, abgeschafft). answers_overview zeigt die Karten-Antworten.

function renderDashboardButton(ctx: TemplateContext): string {
  const primary = ctx.tenantConfig.theme.primaryColor
  const url = `${BASE_URL}/dashboard`
  return `<div style="text-align:center;margin:20px 0 8px;"><a href="${url}" style="background:${primary};color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:bold;text-decoration:none;display:inline-block;">Lead im Dashboard ansehen →</a></div>`
}

// ---------------------------------------------------------------------------
// Variable Resolution
// ---------------------------------------------------------------------------

function resolveVar(name: string, ctx: TemplateContext): string {
  if (name.startsWith('contact.')) {
    return ctx.contact[name.slice('contact.'.length)] ?? ''
  }
  // Aufgabe 52: funnel.*-Variablen (Firmenname/E-Mail/Telefon etc.) entfernt — Mails nutzen nur
  // Lead-Daten. {{funnel.*}} degradiert sauber zu '' (fällt durch zum return '' am Ende).
  // Aufgabe 53: answer.<feld-key> löst auf den Anzeige-Wert auf (Choice→Label, checkbox→Ja/Nein, …).
  if (name.startsWith('answer.')) {
    return resolveAnswerVar(name.slice('answer.'.length), ctx)
  }
  if (name === 'submitted_at') {
    return dateTimeFormat.format(ctx.submittedAt ?? new Date())
  }
  return ''
}

// Aufgabe 53: Löst eine answer.<key>-Variable in ihren Anzeige-Wert auf. Findet das Feld in der
// TenantConfig (Question-Page-Field ODER Custom-Karten-Feld) und mappt Choice-Werte auf Labels —
// sonst stünde der Options-Slug (z.B. "zu_wenig") statt des Labels ("Zu wenig Kundenanfragen").
function resolveAnswerVar(key: string, ctx: TemplateContext): string {
  // 1. Question-Page-Field: QuestionConfig.id === field_key
  for (const q of ctx.tenantConfig.questions) {
    if (q.kind === 'custom' || q.kind === 'welcome') continue
    if (q.id === key) return resolveAnswer(q, ctx.answers) ?? ''
  }
  // 2. Custom-Karten-Feld: q.customFields[].key === field_key
  for (const q of ctx.tenantConfig.questions) {
    if (q.kind !== 'custom' || !q.customFields) continue
    const f = q.customFields.find((cf) => cf.key === key)
    if (f) return resolveCustomFieldDisplay(f, ctx.answers[key])
  }
  // 3. Fallback: Rohwert (z.B. Feld nachträglich gelöscht)
  return ctx.answers[key] ?? ''
}

// Custom-Karten-Felder speichern bei Choice-Typen bereits den Label-String als Wert
// (Optionen sind plain strings) — nur checkbox + date brauchen Aufbereitung.
function resolveCustomFieldDisplay(f: ContactFieldConfig, raw: string | undefined): string {
  if (raw == null) return ''
  const val = raw.trim()
  if (!val) return ''
  if (f.type === 'checkbox') return val === 'true' ? 'Ja' : val === 'false' ? 'Nein' : val
  if (f.type === 'date') {
    const d = new Date(val)
    return isNaN(d.getTime())
      ? val
      : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return val
}

// ---------------------------------------------------------------------------
// Substitution Logic
// ---------------------------------------------------------------------------

// data-variable: <span data-variable="contact.name">...</span> (Chip-Inhalt egal)
const VARIABLE_RE = /<span[^>]*\bdata-variable=["']([^"']+)["'][^>]*>[\s\S]*?<\/span>/gi

// data-magic-section: <div data-magic-section="answers_overview" data-heading="…"></div>
const MAGIC_SECTION_RE = /<(div|span|p)[^>]*\bdata-magic-section=["']([^"']+)["'][^>]*>[\s\S]*?<\/\1>/gi
const ATTR_HEADING_RE  = /\bdata-heading=["']([^"']*)["']/i

// data-cta-button: <div data-cta-button data-label="…" data-url="…"></div>
const CTA_BUTTON_RE = /<div[^>]*\bdata-cta-button\b[^>]*>[\s\S]*?<\/div>/gi
const ATTR_LABEL_RE = /\bdata-label=["']([^"']*)["']/i
const ATTR_URL_RE   = /\bdata-url=["']([^"']*)["']/i

// HTML-Tag-Stripper für Subject (Plain-Text-only)
const HTML_TAG_RE = /<[^>]+>/g

function renderCtaButton(label: string, url: string, ctx: TemplateContext): string {
  const primary = ctx.tenantConfig.theme.primaryColor
  const safeUrl = url && /^https?:\/\//i.test(url) ? url : '#'
  const safeLabel = label || 'Jetzt mehr erfahren'
  return `<div style="text-align:center;margin:24px 0;"><a href="${htmlEscape(safeUrl)}" style="background:${primary};color:#fff;padding:14px 28px;border-radius:8px;font-size:14px;font-weight:bold;text-decoration:none;display:inline-block;">${htmlEscape(safeLabel)}</a></div>`
}

function expandBody(html: string, ctx: TemplateContext): string {
  // Magic-Sections zuerst (sie können Sub-HTML enthalten)
  let out = html.replace(MAGIC_SECTION_RE, (match: string, _tag: string, name: string) => {
    const headingMatch = ATTR_HEADING_RE.exec(match)
    const heading = headingMatch?.[1] ?? null
    if (name === 'answers_overview')  return renderAnswersOverview(ctx, heading)
    // Aufgabe 52D: contact_summary entfernt — gespeicherte Blöcke (Alt-Mails) degradieren sauber zu ''.
    if (name === 'dashboard_button')  return renderDashboardButton(ctx)  // Legacy
    return ''
  })
  // CTA-Buttons (custom label + url)
  out = out.replace(CTA_BUTTON_RE, (match: string) => {
    const labelMatch = ATTR_LABEL_RE.exec(match)
    const urlMatch   = ATTR_URL_RE.exec(match)
    return renderCtaButton(labelMatch?.[1] ?? '', urlMatch?.[1] ?? '', ctx)
  })
  // Dann Variable-Chips
  out = out.replace(VARIABLE_RE, (_match, name: string) => {
    return htmlEscape(resolveVar(name, ctx))
  })
  // ZULETZT: inline-styles für die generischen Tags. Gmail/Outlook ignorieren
  // CSS-Klassen aus React-Email-Layouts, daher MÜSSEN p/h/ul/ol/li/a/hr-Tags
  // direkt im HTML inline-styled sein.
  out = inlineGenericTagStyles(out, ctx.tenantConfig.theme.primaryColor)
  return out
}

/**
 * Injiziert inline-styles in die Standard-HTML-Tags die TipTap erzeugt (p, h2, h3,
 * ul, ol, li, a, hr, strong, em). Tags die bereits style= haben werden NICHT
 * überschrieben — das schützt unsere selbst-generierten Magic-Section- und
 * CTA-Button-Snippets, die schon korrekte Styles tragen.
 */
function inlineGenericTagStyles(html: string, primaryColor: string): string {
  // Erst leere <p></p>-Tags zu <p>&nbsp;</p> wandeln (Browser/Mail-Clients
  // kollabieren sonst leere Paragraphen → doppelte Enter sind weg).
  let out = html.replace(/<p(\s[^>]*)?>(\s|&nbsp;)*<\/p>/gi, `<p$1>&nbsp;</p>`)

  out = out
    .replace(/<p(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<p${attrs ?? ''} style="margin:0 0 12px;font-size:14px;line-height:22px;color:#374151;">`,
    )
    .replace(/<h2(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<h2${attrs ?? ''} style="font-size:18px;font-weight:bold;margin:16px 0 8px;color:#1f2937;">`,
    )
    .replace(/<h3(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<h3${attrs ?? ''} style="font-size:15px;font-weight:bold;margin:12px 0 6px;color:#1f2937;">`,
    )
    .replace(/<ul(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<ul${attrs ?? ''} style="margin:0 0 12px;padding-left:24px;">`,
    )
    .replace(/<ol(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<ol${attrs ?? ''} style="margin:0 0 12px;padding-left:24px;">`,
    )
    .replace(/<li(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<li${attrs ?? ''} style="margin:0 0 4px;">`,
    )
    .replace(/<a(\s[^>]*)?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<a${attrs ?? ''} style="color:${primaryColor};text-decoration:underline;">`,
    )
    .replace(/<hr(\s[^>]*)?\/?>/gi, (m, attrs) =>
      hasStyleAttr(attrs) ? m : `<hr style="border:0;border-top:1px solid #e5e7eb;margin:16px 0;" />`,
    )

  return out
}

function hasStyleAttr(attrs: string | undefined): boolean {
  return !!attrs && /\bstyle\s*=/i.test(attrs)
}

function expandSubject(rawSubject: string, ctx: TemplateContext): string {
  // Variable-Chips ersetzen
  let out = rawSubject.replace(VARIABLE_RE, (_match, name: string) => {
    return resolveVar(name, ctx)
  })
  // Magic-Sections + CTA-Buttons im Subject sind sinnlos → entfernen
  out = out.replace(MAGIC_SECTION_RE, '')
  out = out.replace(CTA_BUTTON_RE, '')
  // Restliches HTML strippen + Whitespace normalisieren
  out = out.replace(HTML_TAG_RE, '')
  return out.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function renderEmail(
  subjectHtml: string,
  bodyHtml: string,
  ctx: TemplateContext,
): RenderedEmail {
  return {
    subject:  expandSubject(subjectHtml, ctx),
    bodyHtml: expandBody(bodyHtml, ctx),
  }
}

/**
 * Liste der verfügbaren Tokens — wird im TipTap-Editor als "Variable einfügen"-Dropdown
 * angezeigt. Jedes Token kann als Chip an der Cursor-Position eingefügt werden.
 */
export const AVAILABLE_TOKENS = {
  contact: [
    { token: 'contact.name',    label: 'Lead-Name',    description: 'Vollständiger Name des Leads' },
    { token: 'contact.email',   label: 'Lead-E-Mail',  description: 'E-Mail-Adresse des Leads' },
    { token: 'contact.telefon', label: 'Lead-Telefon', description: 'Telefonnummer des Leads' },
  ],
  // Aufgabe 52: funnel-Gruppe (Firmen-Variablen) entfernt — Mails nutzen nur Lead-Daten + Zeit.
  meta: [
    { token: 'submitted_at', label: 'Zeitstempel', description: 'Datum/Uhrzeit des Submits' },
  ],
  magic: [
    { token: 'answers_overview', label: 'Antworten-Box', description: 'Box mit allen sichtbaren Antworten' },
    // Aufgabe 52D: contact_summary entfernt (Submit-Page abgeschafft) — answers_overview deckt die Lead-Antworten ab.
    // dashboard_button: aus dem Picker entfernt — wird durch den anpassbaren
    // Link-Button-Baustein (CtaButtonNode) abgelöst. resolveMagicSection unten
    // unterstützt 'dashboard_button' weiterhin für Backwards-Compat mit
    // existierenden Backfill-Mails.
  ],
} as const
