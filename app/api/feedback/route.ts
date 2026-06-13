import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

// Aufgabe 67: Beta-Feedback-Endpoint. Eingeloggte Nutzer schicken über das
// Feedback-Widget (Dashboard, unten rechts) Kategorie + Nachricht.
// Kanal ist AUSSCHLIESSLICH die Mail an SUPPORT_EMAIL (Resend, reply-to = Absender).
// Eine DB-Archiv-Tabelle wurde vorgeschlagen und von Stavros abgelehnt (2026-06-12)
// — bewusst KEIN Schreibzugriff auf die Datenbank in dieser Route.
// Aufgabe 69: optionaler Datei-Anhang (PNG/JPG/PDF, ≤ 3 MB) als Resend-Anhang —
// weiterhin keine Storage, kein DB-Schreibzugriff.

export const runtime = 'nodejs'

const CATEGORIES = ['feedback', 'problem', 'frage'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_LABELS: Record<Category, string> = {
  feedback: 'Feedback',
  problem: 'Problem',
  frage: 'Frage',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Optionaler Datei-Anhang (Aufgabe 69) — Whitelist serverseitig erzwingen.
// Bis zu 3 Dateien, zusammen ≤ 4 MB (sicher unter Vercels ~4,5 MB Body-Limit).
const MAX_FILES = 3
const MAX_TOTAL_BYTES = 4 * 1024 * 1024 // 4 MB gesamt
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/pdf': '.pdf',
}
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf']

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '' // nur Basename
  // Whitelist: nur unbedenkliche Zeichen behalten (Buchstaben, Ziffern, . _ - Leerzeichen),
  // alles andere (Steuerzeichen, Pfad-/Sonderzeichen, Umlaute) → '_'.
  return base.replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 100).trim()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  // Aufgabe 69: FormData statt JSON (der optionale Anhang reist als File mit).
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const rawCategory = form.get('category')
  const category = CATEGORIES.includes(rawCategory as Category)
    ? (rawCategory as Category)
    : 'feedback'
  const message = (form.get('message')?.toString() ?? '').trim()
  if (!message) {
    return NextResponse.json({ success: false, error: 'Nachricht fehlt.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { success: false, error: 'Nachricht zu lang (max. 5000 Zeichen).' },
      { status: 400 },
    )
  }
  const pagePathRaw = form.get('pagePath')
  const pagePath = typeof pagePathRaw === 'string' ? pagePathRaw.slice(0, 300) : null

  // Optionale Anhänge — server-seitig erneut prüfen (Client nie vertrauen):
  // Anzahl, Gesamtgröße sowie MIME-Typ UND Dateiendung jeder Datei.
  const rawFiles = form.getAll('file').filter((f): f is File => f instanceof File && f.size > 0)
  if (rawFiles.length > MAX_FILES) {
    return NextResponse.json(
      { success: false, error: `Höchstens ${MAX_FILES} Dateien.` },
      { status: 400 },
    )
  }
  if (rawFiles.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Anhänge zusammen zu groß (max. 4 MB).' },
      { status: 400 },
    )
  }
  const attachments: { filename: string; content: Buffer }[] = []
  for (const f of rawFiles) {
    const ext = ALLOWED_TYPES[f.type]
    const nameExt = f.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? ''
    if (!ext || !ALLOWED_EXTENSIONS.includes(nameExt)) {
      return NextResponse.json(
        { success: false, error: 'Nur PNG, JPG oder PDF erlaubt.' },
        { status: 400 },
      )
    }
    const safeName = sanitizeFilename(f.name) || `anhang${ext}`
    attachments.push({ filename: safeName, content: Buffer.from(await f.arrayBuffer()) })
  }

  // Konto-Name für den Mail-Kontext (reines Lesen über die eigene Membership, RLS).
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id, tenants ( company_name )')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const tenantName: string =
    (membership?.tenants as { company_name?: string | null } | null)?.company_name ?? '—'

  const supportEmail = process.env.SUPPORT_EMAIL
  const apiKey = process.env.RESEND_API_KEY
  if (!supportEmail || !apiKey) {
    console.error('[api/feedback] SUPPORT_EMAIL oder RESEND_API_KEY fehlt')
    return NextResponse.json(
      { success: false, error: 'Feedback-Kanal ist nicht konfiguriert.' },
      { status: 500 },
    )
  }

  try {
    const resend = new Resend(apiKey)
    const fromDomain =
      process.env.EMAIL_DOMAIN_PLATFORM ||
      (process.env.EMAIL_FROM ?? 'noreply@example.com').split('@')[1]
    // Absendezeit in deutscher Zeitzone (Server läuft in UTC).
    const sentAt = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())
    const senderEmail = user.email ?? 'unbekannt'
    const metaRow = (label: string, value: string) => `
      <tr>
        <td style="padding:3px 16px 3px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:3px 0;color:#111827">${value}</td>
      </tr>`
    const { error: sendError } = await resend.emails.send({
      from: `LeadPlug Feedback <noreply@${fromDomain}>`,
      to: supportEmail,
      replyTo: user.email ?? undefined,
      subject: `[Beta · ${CATEGORY_LABELS[category]}] ${senderEmail}`,
      ...(attachments.length > 0 ? { attachments } : {}),
      html: `
        <div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#111827;line-height:1.6;max-width:560px">
          <p style="margin:0 0 4px;font-size:16px;font-weight:700">Neue Nachricht aus der Beta</p>
          <p style="margin:0 0 16px">
            <span style="display:inline-block;background:#eef2ff;color:#4648d4;border-radius:9999px;padding:2px 10px;font-size:12px;font-weight:600">${CATEGORY_LABELS[category]}</span>
          </p>
          <table style="border-collapse:collapse;font-size:13px;margin:0 0 16px">
            ${metaRow('Von', `<a href="mailto:${escapeHtml(senderEmail)}" style="color:#4648d4">${escapeHtml(senderEmail)}</a>`)}
            ${metaRow('Konto', escapeHtml(tenantName))}
            ${metaRow('Seite', escapeHtml(pagePath ?? '—'))}
            ${metaRow('Gesendet', `${sentAt} Uhr`)}
            ${attachments.length > 0 ? metaRow(attachments.length > 1 ? 'Anhänge' : 'Anhang', escapeHtml(attachments.map((a) => a.filename).join(', '))) : ''}
          </table>
          <div style="background:#f3f4f6;border-left:4px solid #4648d4;border-radius:8px;padding:12px 16px;white-space:pre-wrap;font-size:14px">${escapeHtml(message)}</div>
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px">Direkt auf diese Mail antworten erreicht die Absender-Adresse (reply-to).</p>
        </div>
      `,
    })
    if (sendError) {
      console.error('[api/feedback] resend failed:', sendError)
      return NextResponse.json(
        { success: false, error: 'Feedback konnte nicht übermittelt werden.' },
        { status: 500 },
      )
    }
  } catch (err) {
    console.error('[api/feedback] resend threw:', err)
    return NextResponse.json(
      { success: false, error: 'Feedback konnte nicht übermittelt werden.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
