import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import Sparkline from '@/components/dashboard/Sparkline'
import { NewFunnelButton } from '@/components/dashboard/funnels/NewFunnelModal'
import { mapTemplateRows, TEMPLATE_GALLERY_SELECT } from '@/lib/templates'

type LeadStatus = 'offen' | 'kontaktiert' | 'abgeschlossen'

const STATUS_ORDER: LeadStatus[] = ['offen', 'kontaktiert', 'abgeschlossen']
const STATUS_META: Record<LeadStatus, { label: string; dot: string; pill: string }> = {
  offen:         { label: 'Neu',        dot: 'bg-amber-500',  pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  kontaktiert:   { label: 'Kontaktiert', dot: 'bg-purple-500', pill: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  abgeschlossen: { label: 'Erledigt',   dot: 'bg-green-500',  pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 30

type Row = {
  id: string
  created_at: string
  completed_at: string | null
  status: string
  contact: Record<string, string> | null
  funnel_slug: string
}

async function getData() {
  const supabase = await createClient()

  const now = Date.now()
  const cutoff30 = (() => {
    const d = new Date(now - (WINDOW_DAYS - 1) * DAY_MS)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })()

  const [{ data: funnels }, { data: submissions }, { data: viewLogs }] = await Promise.all([
    supabase.from('funnels').select('id, slug, funnel_name').eq('is_active', true),
    supabase
      .from('submissions')
      .select('id, created_at, completed_at, status, contact, funnel_slug')
      .order('created_at', { ascending: false }),
    supabase.from('funnel_view_logs').select('funnel_id, viewed_at'),
  ])

  const funnelList = (funnels ?? []) as { id: string; slug: string; funnel_name: string | null }[]
  const funnelNameMap: Record<string, string> = {}
  const slugById = new Map<string, string>()
  for (const f of funnelList) {
    funnelNameMap[f.slug] = f.funnel_name ?? f.slug
    slugById.set(f.id, f.slug)
  }

  const all = (submissions ?? []) as Row[]

  // CRM-Universum (Aufgabe 56, konsistent zu /dashboard/leads): completed IMMER,
  // Abbrecher nur mit Kontaktkanal (E-Mail oder Telefon).
  const leads = all
    .map((s) => {
      const c = s.contact ?? {}
      return {
        id: s.id,
        created_at: s.created_at,
        completed_at: s.completed_at,
        status: (s.status as LeadStatus) ?? 'offen',
        funnel_slug: s.funnel_slug,
        name: (c.name ?? '').trim(),
        anrede: (c.anrede ?? '').trim(),
        email: (c.email ?? '').trim(),
        phone: (c.telefon ?? '').trim(),
      }
    })
    .filter((l) => l.completed_at || l.email || l.phone)

  // Pipeline = aktueller Stand ALLER Leads (Backlog), nicht zeitgefenstert.
  const statusCounts: Record<LeadStatus, number> = {
    offen: leads.filter((l) => l.status === 'offen').length,
    kontaktiert: leads.filter((l) => l.status === 'kontaktiert').length,
    abgeschlossen: leads.filter((l) => l.status === 'abgeschlossen').length,
  }
  const recent = leads.slice(0, 5)

  const views = (viewLogs ?? []) as { funnel_id: string; viewed_at: string }[]
  const completed = all.filter((s) => s.completed_at)

  // 30-Tage-Kennzahlen (Cockpit-Fenster).
  const leads30 = leads.filter((l) => new Date(l.created_at).getTime() >= cutoff30).length
  const completed30 = completed.filter((s) => new Date(s.created_at).getTime() >= cutoff30).length
  const views30 = views.filter((v) => new Date(v.viewed_at).getTime() >= cutoff30).length
  const conversion30 = views30 > 0 ? Math.round((completed30 / views30) * 100) : 0

  // Sparkline-Reihen: pro Tag der letzten 30 Tage.
  const dayKeys: string[] = []
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    dayKeys.push(new Date(now - i * DAY_MS).toISOString().slice(0, 10))
  }
  const leadDaily = new Map(dayKeys.map((k) => [k, 0]))
  const viewDaily = new Map(dayKeys.map((k) => [k, 0]))
  for (const l of leads) {
    const k = new Date(l.created_at).toISOString().slice(0, 10)
    if (leadDaily.has(k)) leadDaily.set(k, (leadDaily.get(k) ?? 0) + 1)
  }
  for (const v of views) {
    const k = new Date(v.viewed_at).toISOString().slice(0, 10)
    if (viewDaily.has(k)) viewDaily.set(k, (viewDaily.get(k) ?? 0) + 1)
  }
  const leadSpark = dayKeys.map((k) => leadDaily.get(k) ?? 0)
  const viewSpark = dayKeys.map((k) => viewDaily.get(k) ?? 0)

  // Per-Funnel-Stats (Top nach Leads, dann Aufrufe).
  const leadsByFunnel = new Map<string, number>()
  for (const l of leads) leadsByFunnel.set(l.funnel_slug, (leadsByFunnel.get(l.funnel_slug) ?? 0) + 1)
  const viewsByFunnel = new Map<string, number>()
  for (const v of views) {
    const slug = slugById.get(v.funnel_id)
    if (slug) viewsByFunnel.set(slug, (viewsByFunnel.get(slug) ?? 0) + 1)
  }
  const funnelStats = funnelList
    .map((f) => ({
      slug: f.slug,
      name: f.funnel_name ?? f.slug,
      leads: leadsByFunnel.get(f.slug) ?? 0,
      views: viewsByFunnel.get(f.slug) ?? 0,
    }))
    .sort((a, b) => b.leads - a.leads || b.views - a.views)

  return {
    funnelNameMap,
    statusCounts,
    recent,
    leads30,
    views30,
    conversion30,
    leadSpark,
    viewSpark,
    funnelStats,
    activeFunnels: funnelList.length,
  }
}

function KpiCard({
  href,
  value,
  label,
  spark,
}: {
  href: string
  value: number | string
  label: string
  spark?: number[]
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:bg-gray-50 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
    >
      <div>
        <p className="text-2xl font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{label}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {spark ? <Sparkline data={spark} /> : <span />}
        <ArrowRight size={14} className="shrink-0 text-gray-300 transition group-hover:text-primary dark:text-gray-600" />
      </div>
    </Link>
  )
}

// Vorlagen-Metadaten fürs „Neuer Funnel"-Modal (Aufgabe 62 Runde 2) — kleine Query, keine definition.
async function getTemplates() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('funnel_templates')
    .select(TEMPLATE_GALLERY_SELECT)
    .order('sort_order', { ascending: true })
  return mapTemplateRows(data)
}

export default async function DashboardPage() {
  const [
    {
      funnelNameMap,
      statusCounts,
      recent,
      leads30,
      views30,
      conversion30,
      leadSpark,
      viewSpark,
      funnelStats,
      activeFunnels,
    },
    templates,
  ] = await Promise.all([getData(), getTemplates()])

  const topFunnels = funnelStats.slice(0, 4)

  return (
    <div className="flex flex-col gap-6">
      {/* Kopfzeile */}
      <PageHeader
        title="Willkommen zurück"
        subtitle="Überblick der letzten 30 Tage."
        action={
          <NewFunnelButton
            templates={templates}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <Plus size={16} strokeWidth={2.5} />
            Neuer Funnel
          </NewFunnelButton>
        }
      />

      {/* KPIs — klickbar, mit Mini-Trend */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard href="/dashboard/leads" value={leads30} label="Leads · 30 Tage" spark={leadSpark} />
        <KpiCard href="/dashboard/statistiken" value={views30} label="Aufrufe · 30 Tage" spark={viewSpark} />
        <KpiCard href="/dashboard/statistiken" value={`${conversion30} %`} label="Conversion · 30 Tage" />
        <KpiCard
          href="/dashboard/funnels"
          value={activeFunnels}
          label={activeFunnels === 1 ? 'aktiver Funnel' : 'aktive Funnels'}
        />
      </div>

      {/* Hauptbereich */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Neueste Leads (breit) */}
        <div className="lg:col-span-2">
          <Card title="Neueste Leads">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Noch keine Leads.</p>
            ) : (
              <div className="flex flex-col">
                {recent.map((l, idx) => {
                  const m = STATUS_META[l.status as LeadStatus]
                  return (
                    <Link
                      key={l.id}
                      href="/dashboard/leads"
                      className={`-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        idx < recent.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {[l.anrede, l.name].filter(Boolean).join(' ') || '—'}
                        </p>
                        <p className="truncate text-xs text-gray-400">{l.email || l.phone}</p>
                      </div>
                      <span className="hidden max-w-32 shrink-0 truncate text-xs text-gray-400 dark:text-gray-500 sm:block">
                        {funnelNameMap[l.funnel_slug] ?? l.funnel_slug}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {new Date(l.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </span>
                      {m && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${m.pill}`}>
                          {m.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="mt-4 text-right">
              <Link href="/dashboard/leads" className="text-sm font-semibold text-primary hover:underline">
                Alle Leads →
              </Link>
            </div>
          </Card>
        </div>

        {/* Rechte Spalte: Pipeline + Deine Funnels */}
        <div className="flex flex-col gap-6">
          <Card title="Pipeline">
            <div className="flex flex-col gap-2">
              {STATUS_ORDER.map((st) => {
                const m = STATUS_META[st]
                return (
                  <Link
                    key={st}
                    href={`/dashboard/leads?status=${st}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary/40 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                      {m.label}
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{statusCounts[st]}</span>
                  </Link>
                )
              })}
            </div>
          </Card>

          <Card title="Funnels">
            {topFunnels.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Noch keine aktiven Funnels.</p>
            ) : (
              <div className="flex flex-col">
                {topFunnels.map((f, idx) => (
                  <Link
                    key={f.slug}
                    href={`/dashboard/funnels/${f.slug}/edit`}
                    className={`-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      idx < topFunnels.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {f.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {f.leads} Leads · {f.views} Aufrufe
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 text-right">
              <Link href="/dashboard/funnels" className="text-sm font-semibold text-primary hover:underline">
                Alle Funnels →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
