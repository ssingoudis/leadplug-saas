'use client'

import { useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import { Select } from '@/components/ui/Input'
import DonutChart from './DonutChart'
import ViewsLeadsTrend from './ViewsLeadsTrend'
import MonthlyTable from './MonthlyTable'
import type { MonthData } from './MonthlyLeadsChart'

export type FunnelOpt = { id: string; slug: string; name: string }
export type LeadPt = { ts: string; funnel_slug: string }
export type ViewPt = { ts: string; funnel_id: string }

type MonthDataWithViews = MonthData & { views: number }

const DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function StatistikenCockpit({
  funnels,
  leads,
  views,
}: {
  funnels: FunnelOpt[]
  leads: LeadPt[]
  views: ViewPt[]
}) {
  const [funnelFilter, setFunnelFilter] = useState('alle')
  const selected = funnels.find((f) => f.slug === funnelFilter)

  const agg = useMemo(() => {
    const fLeads = funnelFilter === 'alle' ? leads : leads.filter((l) => l.funnel_slug === funnelFilter)
    const fViews = funnelFilter === 'alle'
      ? views
      : selected
        ? views.filter((v) => v.funnel_id === selected.id)
        : []

    const monthKeys: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthKeys.push(monthKey(d))
    }
    const monthMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
    const viewMap = new Map<string, number>(monthKeys.map((k) => [k, 0]))
    for (const l of fLeads) {
      const k = monthKey(new Date(l.ts))
      if (monthMap.has(k)) monthMap.set(k, (monthMap.get(k) ?? 0) + 1)
    }
    for (const v of fViews) {
      const k = monthKey(new Date(v.ts))
      if (viewMap.has(k)) viewMap.set(k, (viewMap.get(k) ?? 0) + 1)
    }

    const monthlyData: MonthDataWithViews[] = monthKeys.map((m) => ({
      month: m,
      count: monthMap.get(m) ?? 0,
      views: viewMap.get(m) ?? 0,
    }))
    const filledMonths = monthlyData.filter((m) => m.count > 0)
    const totalViews = fViews.length
    const totalLeads = fLeads.length
    const conversion = totalViews > 0 ? Math.round((totalLeads / totalViews) * 100) : 0
    const avgPerMonth = filledMonths.length > 0 ? Math.round(totalLeads / filledMonths.length) : 0

    // Rollierendes 30-Tage-Fenster (Recency-Signal — unabhängig vom Kalendermonat).
    const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000
    const leads30 = fLeads.filter((l) => new Date(l.ts).getTime() >= cutoff30).length
    const views30 = fViews.filter((v) => new Date(v.ts).getTime() >= cutoff30).length

    return {
      monthlyData,
      filledMonths,
      totalViews,
      totalLeads,
      conversion,
      avgPerMonth,
      leads30,
      views30,
      submissionTimestamps: fLeads.map((l) => l.ts),
      viewLogTimestamps: fViews.map((v) => v.ts),
    }
  }, [funnelFilter, leads, views, selected])

  const funnelOptions = [
    { value: 'alle', label: 'Alle Funnels' },
    ...funnels.map((f) => ({ value: f.slug, label: f.name })),
  ]

  const isEmpty = agg.totalLeads === 0 && agg.totalViews === 0

  const trendData = agg.monthlyData.map((m) => {
    const [y, mo] = m.month.split('-')
    const label = DE_MONTHS[parseInt(mo, 10) - 1]
    return { label, tooltip: `${label} ${y}`, views: m.views, count: m.count }
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Funnel-Filter — Client-seitig, sofortige Umschaltung */}
      {funnels.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Statistiken</h1>
          <Select value={funnelFilter} onChange={setFunnelFilter} options={funnelOptions} className="w-56" />
        </div>
      )}

      {/* Gesamtstatistik */}
      <Card title="Gesamtstatistik">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row">
          <div className="grid flex-1 grid-cols-2 gap-4">
            <StatTile value={agg.totalLeads} label="Leads gesamt" />
            <StatTile value={agg.totalViews} label="Aufrufe gesamt" />
            <StatTile value={agg.leads30} label="Leads (30 Tage)" />
            <StatTile value={agg.views30} label="Aufrufe (30 Tage)" />
            <StatTile value={agg.avgPerMonth} label="Ø Leads / Monat" />
            <StatTile value={agg.filledMonths.length} label="Aktive Monate" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 p-4 dark:bg-gray-800 sm:w-44">
            <DonutChart
              value={agg.totalLeads}
              total={agg.totalViews}
              centerLabel={`${agg.conversion} %`}
              subLabel="Conversion"
              tooltipLabel={`${agg.totalLeads} Leads / ${agg.totalViews} Aufrufe`}
              size="md"
            />
          </div>
        </div>
      </Card>

      {isEmpty ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-400 shadow-sm dark:bg-gray-900 dark:text-gray-500">
          Noch keine Daten in den letzten 12 Monaten{funnelFilter !== 'alle' ? ' für diesen Funnel' : ''}.
        </div>
      ) : (
        <>
          {/* Aufrufe vs. Ausgefüllt — Trend */}
          <ViewsLeadsTrend data={trendData} />

          {/* Monatstabelle */}
          {agg.filledMonths.length > 0 && (
            <div>
              <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Statistik pro Monat</h2>
              <MonthlyTable
                data={[...agg.filledMonths].reverse()}
                totalLeads={agg.totalLeads}
                submissionTimestamps={agg.submissionTimestamps}
                viewLogTimestamps={agg.viewLogTimestamps}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
