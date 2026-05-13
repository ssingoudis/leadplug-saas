import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, Power } from 'lucide-react'
import EmbedBlock from './EmbedBlock'
import EmailPreviewBlock from './EmailPreviewBlock'
import SubmissionsTable from './SubmissionsTable'

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 sm:w-44 sm:shrink-0">{label}</span>
      <span className="text-sm text-gray-900 wrap-break-word">{value}</span>
    </div>
  )
}

function ColorSwatch({ color }: { color?: string | null }) {
  if (!color) return <span className="text-gray-400 text-sm">—</span>
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: color }} />
      <span className="text-sm text-gray-900 font-mono">{color}</span>
    </div>
  )
}


async function getData(slug: string) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)

  const [{ data: funnel }, { data: submissions }] = await Promise.all([
    supabase
      .from('funnels')
      .select(`
        slug, is_active, industry, total_views,
        funnel_title, submit_button_label, success_message,
        response_message, contact_form_subtitle, privacy_policy_url, email_sender_local,
        primary_color, text_color, background_color, page_background_color,
        font, border_radius, max_width,
        tenants (
          slug, company_name, public_email, notification_email, public_phone,
          address, website, billing_model, lead_price_base,
          flat_monthly_price, flat_monthly_lead_limit
        ),
        funnel_questions (
          sort_order, question_key, title, question_type, visible, options, config
        )
      `)
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('submissions')
      .select('id, created_at, contact_anrede, contact_name, contact_email, contact_phone, answers, customer_email_sent, tenant_email_sent')
      .eq('funnel_slug', slug)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return funnel ? { funnel, submissions: submissions ?? [] } : null
}

export default async function FunnelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getData(slug)
  if (!result) notFound()

  const { funnel, submissions } = result
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = funnel.tenants as Record<string, any> ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions = (funnel.funnel_questions as any[] ?? [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const funnelUrl = `${base}/${slug}`

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b-2 border-[#4648d4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-3 min-w-0">
          <a
            href="/funnel-overview"
            className="flex shrink-0 items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Übersicht</span>
          </a>
          <span className="text-gray-300 shrink-0">/</span>
          <span className="text-sm font-semibold text-gray-900 truncate min-w-0">{slug}</span>
          <div className="ml-auto shrink-0 flex items-center gap-2 sm:gap-3">
            <a
              href={funnelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium px-3 sm:px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Live öffnen</span>
            </a>
            <a
              href="/logout"
              className="flex items-center gap-2 text-sm font-medium px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Power size={14} />
              <span className="hidden sm:inline">Logout</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* LEFT: iframe preview */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm p-4">
            <iframe
              src={funnelUrl}
              className="w-full border-0 block h-170"
              title={slug}
            />
          </div>
          <div className="mt-4">
            <EmailPreviewBlock title="Bestätigungs-E-Mail (Anfragender)" src={`/funnel-overview/${slug}/email-preview`} />
          </div>
          <div className="mt-4">
            <EmailPreviewBlock title="Lead-Benachrichtigung (Tenant)" src={`/funnel-overview/${slug}/lead-preview`} />
          </div>
          <div className="mt-4">
            <EmbedBlock slug={slug} url={funnelUrl} companyName={tenant.company_name ?? slug} />
          </div>
        </div>

        {/* RIGHT: info panels */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Tenant */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Kunde</h2>

            <Row label="Firma" value={tenant.company_name} />
            <Row label="Öffentliche E-Mail" value={tenant.public_email} />
            <Row label="Benachrichtigung" value={tenant.notification_email} />
            <Row label="Telefon" value={tenant.public_phone} />
            <Row label="Adresse" value={tenant.address} />
            <Row label="Website" value={tenant.website} />
            <Row label="Billing" value={
              tenant.billing_model === 'flat_monthly'
                ? `Flat Monthly · ${tenant.flat_monthly_price} € · max. ${tenant.flat_monthly_lead_limit} Leads`
                : `Per Lead · ${tenant.lead_price_base} € / Lead`
            } />

            {/* Stats: Aufrufe · Leads · Conversion */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">{funnel.total_views ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">Aufrufe</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">{submissions.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Leads</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
                <p className="text-xl font-bold text-gray-900">
                  {funnel.total_views > 0 ? Math.round((submissions.length / funnel.total_views) * 100) : 0} %
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Conversion</p>
              </div>
            </div>
          </div>

          {/* Funnel config */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Funnel-Konfiguration</h2>
            <Row label="Branche" value={funnel.industry} />
            <Row label="Titel" value={funnel.funnel_title} />
            <Row label="Button-Label" value={funnel.submit_button_label} />
            <Row label="Erfolgs-Nachricht" value={funnel.success_message} />
            <Row label="Reaktionsnachricht" value={funnel.response_message} />
            <Row label="Kontakt-Untertitel" value={funnel.contact_form_subtitle} />
            <Row label="Datenschutz-URL" value={funnel.privacy_policy_url} />
            <Row label="E-Mail-Absender" value={funnel.email_sender_local} />
          </div>

          {/* Theme */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Theme</h2>
            <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 sm:w-44 sm:shrink-0">Primärfarbe</span>
              <ColorSwatch color={funnel.primary_color} />
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 sm:w-44 sm:shrink-0">Textfarbe</span>
              <ColorSwatch color={funnel.text_color} />
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 sm:w-44 sm:shrink-0">Hintergrund</span>
              <ColorSwatch color={funnel.background_color} />
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 sm:w-44 sm:shrink-0">Seiten-BG</span>
              <ColorSwatch color={funnel.page_background_color} />
            </div>
            <Row label="Font" value={funnel.font} />
            <Row label="Border-Radius" value={funnel.border_radius} />
            <Row label="Max-Breite" value={funnel.max_width} />
          </div>

          {/* Questions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              Fragen <span className="font-normal text-gray-400">({questions.length})</span>
            </h2>
            {questions.map((q, i) => (
              <div key={q.question_key} className="py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{q.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {q.question_type} · {q.question_key}
                      {!q.visible && ' · ausgeblendet'}
                    </p>
                    {Array.isArray(q.options) && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(q.options as any[]).map((o) => (
                          <span
                            key={o.value}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {o.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submissions */}
      <div className="max-w-7xl mx-auto px-8 pb-12">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Leads <span className="font-normal text-gray-400">({submissions.length}{submissions.length === 30 ? '+' : ''})</span>
        </h2>

        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
            Noch keine Leads eingegangen.
          </div>
        ) : (
          <SubmissionsTable submissions={submissions} questions={questions} />
        )}
      </div>
    </div>
  )
}
