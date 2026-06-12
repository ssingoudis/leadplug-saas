import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

// Aufgabe 67: Beta-Feedback-Endpoint. Eingeloggte Nutzer schicken über das
// Feedback-Widget (Dashboard, unten rechts) Kategorie + Nachricht.
// Kanal ist AUSSCHLIESSLICH die Mail an SUPPORT_EMAIL (Resend, reply-to = Absender).
// Eine DB-Archiv-Tabelle wurde vorgeschlagen und von Stavros abgelehnt (2026-06-12)
// — bewusst KEIN Schreibzugriff auf die Datenbank in dieser Route.

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

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  let body: { category?: string; message?: string; pagePath?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const category = CATEGORIES.includes(body.category as Category)
    ? (body.category as Category)
    : 'feedback'
  const message = (body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ success: false, error: 'Nachricht fehlt.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json(
      { success: false, error: 'Nachricht zu lang (max. 5000 Zeichen).' },
      { status: 400 },
    )
  }
  const pagePath = typeof body.pagePath === 'string' ? body.pagePath.slice(0, 300) : null

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
