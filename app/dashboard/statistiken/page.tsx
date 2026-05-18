import { createClient } from '@/lib/supabase/server'
import StatTile from '@/components/ui/StatTile'
import Card from '@/components/ui/Card'
import type { MonthData } from './MonthlyLeadsChart'
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

  const filledMonths = monthlyData.filter((m) => m.count > 0)

  const totalViews            = (funnels ?? []).reduce((s, f) => s + (f.total_views ?? 0), 0)
  const totalLeads            = (submissions ?? []).length
  const conversion            = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0
  const activeMonths          = filledMonths.length
  const avgPerMonth           = activeMonths > 0 ? Math.round(totalLeads / activeMonths) : 0
  const submissionTimestamps  = (submissions ?? []).map((s) => s.created_at as string)
  const viewLogTimestamps     = (viewLogs ?? []).map((v) => v.viewed_at as string)

  return { filledMonths, totalViews, totalLeads, conversion, avgPerMonth, submissionTimestamps, viewLogTimestamps }
}

export default async function StatistikenPage() {
  const { filledMonths, totalViews, totalLeads, conversion, avgPerMonth, submissionTimestamps, viewLogTimestamps } = await getData()

  if (filledMonths.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm px-6 py-12 text-center text-sm text-gray-400">
        Noch keine Leads in den letzten 12 Monaten.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Gesamtstatistik */}
      <Card title="Gesamtstatistik">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          <div className="grid grid-cols-2 gap-4 flex-1">
            <StatTile value={totalLeads} label="Leads gesamt" />
            <StatTile value={totalViews} label="Aufrufe gesamt" />
            <StatTile value={avgPerMonth} label="Ø Leads / Monat" />
            <StatTile value={filledMonths.length} label="Aktive Monate" />
          </div>
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center sm:w-44">
            <DonutChart
              value={totalLeads}
              total={totalViews}
              centerLabel={`${conversion} %`}
              subLabel="Conversion"
              tooltipLabel={`${totalLeads} Leads / ${totalViews} Aufrufe`}
              size="md"
            />
          </div>
        </div>
      </Card>

      {/* Monatstabelle */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">Statistik pro Monat</h2>
        <MonthlyTable
          data={[...filledMonths].reverse()}
          totalLeads={totalLeads}
          submissionTimestamps={submissionTimestamps}
          viewLogTimestamps={viewLogTimestamps}
        />
      </div>

    </div>
  )
}
