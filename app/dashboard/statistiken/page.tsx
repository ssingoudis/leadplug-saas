import { createClient } from '@/lib/supabase/server'
import StatTile from '@/components/ui/StatTile'
import Card from '@/components/ui/Card'
import MonthlyLeadsChart, { type MonthData } from './MonthlyLeadsChart'
import DonutChart from './DonutChart'
import MonthlyTable from './MonthlyTable'

type MonthDataWithViews = MonthData & { views: number }

async function getData() {
  const supabase = await createClient()

  const since12 = new Date()
  since12.setMonth(since12.getMonth() - 11)
  since12.setDate(1)
  since12.setHours(0, 0, 0, 0)

  const [
    { data: funnels },
    { data: submissions },
    { data: viewLogs },
  ] = await Promise.all([
    supabase
      .from('funnels')
      .select('total_views')
      .eq('is_active', true),
    supabase
      .from('submissions')
      .select('created_at')
      .gte('created_at', since12.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('funnel_view_logs')
      .select('viewed_at')
      .gte('viewed_at', since12.toISOString()),
  ])

  // Build month keys for last 12 months
  const monthKeys: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
  const viewMap  = new Map<string, number>(monthKeys.map((k) => [k, 0]))

  for (const row of (submissions ?? []) as { created_at: string }[]) {
    const d   = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
  }

  for (const row of (viewLogs ?? []) as { viewed_at: string }[]) {
    const d   = new Date(row.viewed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (viewMap.has(key)) viewMap.set(key, (viewMap.get(key) ?? 0) + 1)
  }

  const monthlyData: MonthDataWithViews[] = monthKeys.map((month) => ({
    month,
    count: monthMap.get(month) ?? 0,
    views: viewMap.get(month) ?? 0,
  }))

  // Only show months that have at least one lead
  const filledMonths = monthlyData.filter((m) => m.count > 0)

  // Overall stats
  const totalViews   = (funnels ?? []).reduce((s, f) => s + (f.total_views ?? 0), 0)
  const totalLeads   = (submissions ?? []).length
  const conversion   = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0
  const activeMonths = filledMonths.length
  const avgPerMonth  = activeMonths > 0 ? Math.round(totalLeads / activeMonths) : 0

  return { filledMonths, totalViews, totalLeads, conversion, avgPerMonth }
}

export default async function StatistikenPage() {
  const { filledMonths, totalViews, totalLeads, conversion, avgPerMonth } = await getData()

  return (
    <div className="flex flex-col gap-6">

      {/* Monats-Chart */}
      {filledMonths.length > 0
        ? <MonthlyLeadsChart data={filledMonths} />
        : (
          <div className="bg-white rounded-2xl shadow-sm px-6 py-10 text-center text-sm text-gray-400">
            Noch keine Leads in den letzten 12 Monaten.
          </div>
        )
      }

      {/* Gesamt-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
        <StatTile value={totalLeads} label="Leads gesamt" />
        <StatTile value={totalViews} label="Aufrufe gesamt" />
        <div className="bg-gray-50 rounded-xl px-3 py-3 flex flex-col items-center justify-center">
          <DonutChart
            value={totalLeads}
            total={totalViews}
            centerLabel={`${conversion} %`}
            subLabel="Conversion"
            size="md"
          />
        </div>
        <StatTile value={avgPerMonth} label="Ø Leads / Monat" />
        <StatTile value={filledMonths.length} label="Aktive Monate" />
      </div>

      {/* Monatstabelle */}
      {filledMonths.length > 0 && (
        <Card title="Leads pro Monat">
          <MonthlyTable data={[...filledMonths].reverse()} totalLeads={totalLeads} />
        </Card>
      )}

      <p className="text-xs text-gray-400 text-center -mt-2">
        Gesamtaufrufe werden kumulativ gezählt · Monatliche Aufrufe werden ab Aktivierung der Log-Tabelle erfasst
      </p>

    </div>
  )
}
