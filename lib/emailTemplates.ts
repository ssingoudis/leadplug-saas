import { resolveAnswer } from '@/lib/resolveAnswer'
import type { TenantConfig, ContactData } from '@/types'

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

function renderContactSummary(ctx: TemplateContext, customHeading?: string | null): string {
  const primary = ctx.tenantConfig.theme.primaryColor
  const visibleContactFields = [...ctx.tenantConfig.contactFields]
    .filter((f) => f.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
  const rows = visibleContactFields
    .map((field) => {
      const raw = ctx.contact[field.key]
      if (!raw) return null
      const label = htmlEscape(field.label)
      const value = htmlEscape(raw)
      const linked =
        field.type === 'email' ? `<a href="mailto:${value}" style="color:${primary};">${value}</a>`
        : field.type === 'tel' ? `<a href="tel:${value}" style="color:${primary};">${value}</a>`
        : `<strong>${value}</strong>`
      return `<p style="font-size:13px;color:#374151;margin:0 0 4px;line-height:20px;"><span style="color:#6b7280;">${label}:</span> ${linked}</p>`
    })
    .filter(Boolean)
    .join('')
  if (!rows) return ''
  const heading = htmlEscape(customHeading?.trim() || 'Kontaktdaten')
  return `<div style="background:#f9fafb;padding:14px 18px;border-radius:6px;margin:0 0 16px;border-left:4px solid ${primary};"><h3 style="font-size:13px;font-weight:bold;margin:0 0 10px;color:#1f2937;">${heading}</h3>${rows}</div>`
}

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
  if (name.startsWith('funnel.')) {
    const key = name.slice('funnel.'.length)
    switch (key) {
      case 'name':              return ctx.tenantConfig.companyName ?? ''
      case 'email':             return ctx.tenantConfig.publicEmail ?? ''
      case 'phone':             return ctx.tenantConfig.phone ?? ''
      case 'website':           return ctx.tenantConfig.website ?? ''
      case 'success_message':   return ctx.tenantConfig.funnel.successMessage ?? ''
      case 'response_message':  return ctx.tenantConfig.funnel.responseMessage ?? ''
      case 'slug':              return ctx.tenantConfig.slug ?? ''
      default:                  return ''
    }
  }
  if (name.startsWith('answer.')) {
    return ctx.answers[name.slice('answer.'.length)] ?? ''
  }
  if (name === 'submitted_at') {
    return dateTimeFormat.format(ctx.submittedAt ?? new Date())
  }
  return ''
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
    if (name === 'contact_summary')   return renderContactSummary(ctx, heading)
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
      hasStyleAttr(attrs) ? m : `<a${attrs ?? ''} style="color:${primaryColor};">`,
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
  funnel: [
    { token: 'funnel.name',             label: 'Firmenname',     description: 'Firmenname des Funnels' },
    { token: 'funnel.email',            label: 'Firmen-E-Mail',  description: 'Public E-Mail des Funnels' },
    { token: 'funnel.phone',            label: 'Firmen-Telefon', description: 'Telefon des Funnels' },
    { token: 'funnel.success_message',  label: 'Dankestext',     description: 'Dankestext nach Submit' },
    { token: 'funnel.response_message', label: 'Antworttext',    description: 'Antwort-Text "Wir melden uns binnen..."' },
  ],
  meta: [
    { token: 'submitted_at', label: 'Zeitstempel', description: 'Datum/Uhrzeit des Submits' },
  ],
  magic: [
    { token: 'answers_overview', label: 'Antworten-Box', description: 'Box mit allen sichtbaren Antworten' },
    { token: 'contact_summary',  label: 'Kontakt-Box',   description: 'Box mit allen sichtbaren Kontaktfeldern' },
    // dashboard_button: aus dem Picker entfernt — wird durch den anpassbaren
    // Link-Button-Baustein (CtaButtonNode) abgelöst. resolveMagicSection unten
    // unterstützt 'dashboard_button' weiterhin für Backwards-Compat mit
    // existierenden Backfill-Mails.
  ],
} as const
