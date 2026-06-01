import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import DailyLeadsChart, { type DayData } from '@/components/dashboard/DailyLeadsChart'

type LeadStatus = 'offen' | 'kontaktiert' | 'abgeschlossen'

const STATUS_ORDER: LeadStatus[] = ['offen', 'kontaktiert', 'abgeschlossen']
const STATUS_META: Record<LeadStatus, { label: string; dot: string; pill: string }> = {
  offen:         { label: 'Neu',        dot: 'bg-amber-500',  pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  kontaktiert:   { label: 'Kontaktiert', dot: 'bg-purple-500', pill: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  abgeschlossen: { label: 'Erledigt',   dot: 'bg-green-500',  pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

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

  const since14 = new Date()
  since14.setDate(since14.getDate() - 13)
  since14.setHours(0, 0, 0, 0)

  const [{ data: funnels }, { data: submissions }, { count: viewCount }] = await Promise.all([
    supabase.from('funnels').select('slug, funnel_name').eq('is_active', true),
    supabase
      .from('submissions')
      .select('id, created_at, completed_at, status, contact, funnel_slug')
      .order('created_at', { ascending: false }),
    // Aufrufe = Zeilen in funnel_view_logs (RLS-scoped auf den Tenant).
    supabase.from('funnel_view_logs').select('*', { count: 'exact', head: true }),
  ])

  const funnelNameMap: Record<string, string> = {}
  for (const f of (funnels ?? []) as { slug: string; funnel_name: string | null }[]) {
    funnelNameMap[f.slug] = f.funnel_name ?? f.slug
  }

  const all = (submissions ?? []) as Row[]

  // Kontaktierbare Leads (= das CRM-Universum: E-Mail oder Telefon vorhanden).
  const leads = all
    .map((s) => {
      const c = s.contact ?? {}
      return {
        id: s.id,
        created_at: s.created_at,
        status: (s.status as LeadStatus) ?? 'offen',
        funnel_slug: s.funnel_slug,
        name: (c.name ?? '').trim(),
        anrede: (c.anrede ?? '').trim(),
        email: (c.email ?? '').trim(),
        phone: (c.telefon ?? '').trim(),
      }
    })
    .filter((l) => l.email || l.phone)

  const statusCounts: Record<LeadStatus, number> = {
    offen: leads.filter((l) => l.status === 'offen').length,
    kontaktiert: leads.filter((l) => l.status === 'kontaktiert').length,
    abgeschlossen: leads.filter((l) => l.status === 'abgeschlossen').length,
  }
  const totalLeads = leads.length
  const recent = leads.slice(0, 5)

  // Conversion + 14-Tage-Chart auf Basis abgeschlossener Submissions.
  const completed = all.filter((s) => s.completed_at)
  const totalViews = viewCount ?? 0
  const conversion = totalViews > 0 ? Math.round((completed.length / totalViews) * 100) : 0

  const dailyMap = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const s of completed) {
    const key = new Date(s.created_at).toISOString().slice(0, 10)
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
  }
  const dailyData: DayData[] = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  return { funnelNameMap, statusCounts, totalLeads, recent, totalViews, conversion, dailyData }
}

export default async function DashboardPage() {
  const { funnelNameMap, statusCounts, totalLeads, recent, totalViews, conversion, dailyData } = await getData()

  return (
    <div className="flex flex-col gap-6">
      {/* 14-Tage-Chart */}
      <DailyLeadsChart data={dailyData} />

      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile value={totalLeads} label="Leads gesamt" />
        <StatTile value={totalViews} label="Aufrufe gesamt" />
        <StatTile value={`${conversion} %`} label="Conversion" />
      </div>

      {/* Pipeline + Neueste Leads */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline */}
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

        {/* Neueste Leads */}
        <div className="lg:col-span-2">
          <Card title="Neueste Leads">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Noch keine Leads.</p>
            ) : (
              <div className="flex flex-col">
                {recent.map((l, idx) => {
                  const m = STATUS_META[l.status as LeadStatus]
                  return (
                    <div
                      key={l.id}
                      className={`flex items-center gap-3 py-3 ${idx < recent.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
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
                    </div>
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
      </div>
    </div>
  )
}
