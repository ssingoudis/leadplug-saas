'use client'

import { useState } from 'react'
import type { MonthData } from './MonthlyLeadsChart'
import ViewsLeadsTrend, { type TrendPoint } from './ViewsLeadsTrend'

const DE_MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function fmtMonthFull(ym: string) {
  const [y, m] = ym.split('-')
  return `${DE_MONTHS_FULL[parseInt(m, 10) - 1]} ${y}`
}

function fmtDate(day: number, monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1, day)
    .toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function getWeekday(day: number, monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return WEEKDAYS[new Date(parseInt(y), parseInt(mo) - 1, day).getDay()]
}

function getDailyData(timestamps: string[], monthKey: string): { day: number; count: number }[] {
  const [y, mo] = monthKey.split('-')
  const year  = parseInt(y)
  const month = parseInt(mo) - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const map = new Map<number, number>()
  for (let d = 1; d <= daysInMonth; d++) map.set(d, 0)

  for (const ts of timestamps) {
    const d = new Date(ts)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      map.set(day, (map.get(day) ?? 0) + 1)
    }
  }
  return Array.from(map.entries()).map(([day, count]) => ({ day, count }))
}

function niceTicks(max: number): number[] {
  if (max === 0) return [0]
  if (max <= 4) return [0, max]
  const mid = Math.round(max / 2)
  return [0, mid, max]
}

// ─── Balken-Chart pro Tag (eine Reihe: Aufrufe ODER Leads) ────────────────────

function DailyMonthChart({
  data, color, title, monthKey, unit,
}: {
  data:     { day: number; count: number }[]
  color:    string
  title:    string
  monthKey: string
  unit:     string
}) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const max   = Math.max(...data.map((d) => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  const ticks = niceTicks(Math.max(...data.map((d) => d.count)))
  const avg   = data.length > 0 ? (total / data.length).toFixed(1).replace('.', ',') : '0'

  return (
    <div className="rounded-xl bg-white px-5 pt-4 pb-4 shadow-sm dark:bg-gray-900">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
        <span className="text-xs text-gray-400 dark:text-gray-500">Ø {avg} / Tag</span>
      </div>

      <div className="flex gap-3">
        {/* Y-Achse */}
        <div className="flex h-28 shrink-0 flex-col justify-between text-right">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="text-xs leading-none text-gray-400 dark:text-gray-500">{t}</span>
          ))}
        </div>

        {/* Chart-Spalte: Balken + X-Achse teilen sich dieselbe Breite → exakte Ausrichtung */}
        <div className="flex-1">
          <div className="relative h-28 pt-4">
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                style={{ bottom: `${max > 0 ? (t / max) * 100 : 0}%` }}
              />
            ))}

            <div className="flex items-end gap-px h-full relative">
              {data.map((d) => {
                const isHover = hoveredDay === d.day
                const barPct  = d.count > 0 ? Math.max((d.count / max) * 100, 8) : 0

                return (
                  <div
                    key={d.day}
                    className="relative flex flex-1 flex-col items-center justify-end h-full cursor-default"
                    onMouseEnter={() => setHoveredDay(d.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {isHover && (
                      <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-white shadow-lg text-center">
                        <span className="block text-xs font-semibold">{d.count} {unit}</span>
                        <span className="block text-[10px]">{fmtDate(d.day, monthKey)}</span>
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t-sm transition-colors duration-100 ${d.count === 0 ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                      style={d.count > 0 ? {
                        height:          `${barPct}%`,
                        backgroundColor: color,
                        filter:          isHover ? 'brightness(0.82)' : 'none',
                      } : { height: '2px' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* X-Achse — gleicher gap wie die Balken (gap-px) → jeder Tag exakt unter seinem Balken */}
          <div className="flex gap-px mt-1.5">
            {data.map((d) => (
              <div key={d.day} className="flex-1 flex justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 leading-tight hidden sm:block">{getWeekday(d.day, monthKey)}</span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight hidden sm:block">{d.day}</span>
                  {(d.day % 7 === 1) && (
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight sm:hidden">{d.day}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Expanded-Detail ──────────────────────────────────────────────────────────

type MonthDataWithViews = MonthData & { views: number }

function ExpandedMonth({
  m, submissionTimestamps, viewLogTimestamps,
}: {
  m:                    MonthDataWithViews
  submissionTimestamps: string[]
  viewLogTimestamps:    string[]
}) {
  const hasViews   = m.views > 0
  const conversion = hasViews ? Math.round((m.count / m.views) * 100) : 0

  const today = new Date()
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const todayDay = today.getDate()
  const inRange = (d: { day: number }) => m.month !== currentMonthKey || d.day <= todayDay

  const dailyViews = getDailyData(viewLogTimestamps, m.month).filter(inRange)
  const dailyLeads = getDailyData(submissionTimestamps, m.month).filter(inRange)

  // Überblick: beide Reihen zu einer Aufrufe-vs-Ausgefüllt-Linie zippen (tagweise gleich indexiert).
  const trendData: TrendPoint[] = dailyViews.map((dv, idx) => ({
    label: String(dv.day),
    sublabel: getWeekday(dv.day, m.month),
    tooltip: fmtDate(dv.day, m.month),
    views: dv.count,
    count: dailyLeads[idx]?.count ?? 0,
  }))

  return (
    <div className="flex flex-col gap-5 border-t border-gray-100 bg-gray-50/50 px-8 pt-5 pb-8 dark:border-gray-700 dark:bg-gray-800/50">

      {/* Stat-Boxen — spiegelt das Gesamtstatistik-Layout */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl bg-white px-5 py-4 text-center shadow-sm dark:bg-gray-800">
          <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">Leads</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.count}</p>
        </div>
        {hasViews && (
          <>
            <div className="flex-1 rounded-xl bg-white px-5 py-4 text-center shadow-sm dark:bg-gray-800">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">Aufrufe</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.views}</p>
            </div>
            <div className="flex-1 rounded-xl bg-white px-5 py-4 text-center shadow-sm dark:bg-gray-800">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">Conversion</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{conversion} %</p>
            </div>
          </>
        )}
      </div>

      {/* Überblick: Aufrufe vs. Ausgefüllt pro Tag (eine Linie) */}
      <ViewsLeadsTrend data={trendData} title="Aufrufe vs. Ausgefüllt pro Tag" />

      {/* Detail: einzelne Reihen mit Tages-Beschriftung */}
      {hasViews && (
        <DailyMonthChart
          data={dailyViews}
          color="var(--color-primary)"
          title="Aufrufe pro Tag"
          monthKey={m.month}
          unit="Aufrufe"
        />
      )}
      <DailyMonthChart
        data={dailyLeads}
        color="#10b981"
        title="Leads pro Tag"
        monthKey={m.month}
        unit="Leads"
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MonthlyTable({
  data, totalLeads, submissionTimestamps, viewLogTimestamps,
}: {
  data:                 MonthDataWithViews[]
  totalLeads:           number
  submissionTimestamps: string[]
  viewLogTimestamps:    string[]
}) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set())
  void totalLeads

  function toggle(i: number) {
    setOpenSet((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((m, i) => {
        const isOpen = openSet.has(i)

        return (
          <div key={m.month} className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden${isOpen ? ' mb-2' : ''}`}>
            <button
              type="button"
              className={`w-full flex items-center justify-between px-6 py-4 transition-colors text-left cursor-pointer ${isOpen ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              onClick={() => toggle(i)}
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {fmtMonthFull(m.month)}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <ExpandedMonth
                m={m}
                submissionTimestamps={submissionTimestamps}
                viewLogTimestamps={viewLogTimestamps}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
