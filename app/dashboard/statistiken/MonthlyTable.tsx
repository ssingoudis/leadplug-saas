'use client'

import { useState } from 'react'
import type { MonthData } from './MonthlyLeadsChart'

const DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function fmtMonthFull(ym: string) {
  const [y, m] = ym.split('-')
  return `${DE_MONTHS[parseInt(m, 10) - 1]} ${y}`
}

function fmtDate(day: number, monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return new Date(parseInt(y), parseInt(mo) - 1, day)
    .toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
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

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function getWeekday(day: number, monthKey: string): string {
  const [y, mo] = monthKey.split('-')
  return WEEKDAYS[new Date(parseInt(y), parseInt(mo) - 1, day).getDay()]
}

function niceTicks(max: number): number[] {
  if (max === 0) return [0]
  if (max <= 4) return [0, max]
  const mid = Math.round(max / 2)
  return [0, mid, max]
}

// ─── Full-width Daily Chart ───────────────────────────────────────────────────

function DailyMonthChart({
  data, color, title, monthKey,
}: {
  data:     { day: number; count: number }[]
  color:    string
  title:    string
  monthKey: string
}) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const max   = Math.max(...data.map((d) => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  const ticks = niceTicks(Math.max(...data.map((d) => d.count)))
  const avg   = data.length > 0 ? (total / data.length).toFixed(1).replace('.', ',') : '0'

  return (
    <div className="bg-white rounded-xl shadow-sm px-5 pt-4 pb-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <span className="text-xs text-gray-400">Ø {avg} / Tag</span>
      </div>

      <div className="flex gap-3">
        {/* Y-axis */}
        <div className="flex flex-col justify-between h-28 shrink-0 text-right">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="text-xs text-gray-400 leading-none">{t}</span>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative flex-1 h-28 pt-4">
          {/* Grid lines */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-gray-100"
              style={{ bottom: `${max > 0 ? (t / max) * 100 : 0}%` }}
            />
          ))}

          {/* Bars */}
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
                      <span className="block text-xs font-semibold">{d.count}</span>
                      <span className="block text-[10px]">{fmtDate(d.day, monthKey)}</span>
                    </div>
                  )}
                  <div
                    className="w-full rounded-t-sm transition-colors duration-100"
                    style={{
                      height:          d.count > 0 ? `${barPct}%` : '2px',
                      backgroundColor: d.count === 0 ? '#f3f4f6' : isHover ? '#4338ca' : color,
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis — every day */}
      <div className="flex mt-1.5 pl-8">
        {data.map((d) => (
          <div key={d.day} className="flex-1 flex justify-center">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-medium text-gray-500 leading-tight">{getWeekday(d.day, monthKey)}</span>
              <span className="text-[9px] text-gray-400 leading-tight">{d.day}</span>
            </div>
          </div>
        ))}
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

  const dailyViews = getDailyData(viewLogTimestamps, m.month)
    .filter((d) => m.month !== currentMonthKey || d.day <= todayDay)
  const dailyLeads = getDailyData(submissionTimestamps, m.month)
    .filter((d) => m.month !== currentMonthKey || d.day <= todayDay)

  return (
    <div className="px-8 pb-8 pt-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-5">

      {/* Row 1: Stat boxes — mirrors Gesamtstatistik layout */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-xl px-5 py-4 text-center shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Leads</p>
          <p className="text-2xl font-bold text-gray-900">{m.count}</p>
        </div>
        {hasViews && (
          <>
            <div className="flex-1 bg-white rounded-xl px-5 py-4 text-center shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Aufrufe</p>
              <p className="text-2xl font-bold text-gray-900">{m.views}</p>
            </div>
            <div className="flex-1 bg-white rounded-xl px-5 py-4 text-center shadow-sm">
              <p className="text-xs text-gray-400 mb-1">Conversion</p>
              <p className="text-2xl font-bold text-gray-900">{conversion} %</p>
            </div>
          </>
        )}
      </div>

      {/* Aufrufe chart — only shown once view logs exist */}
      {hasViews && (
        <DailyMonthChart
          data={dailyViews}
          color="#6366f1"
          title="Aufrufe pro Tag"
          monthKey={m.month}
        />
      )}

      {/* Leads chart */}
      <DailyMonthChart
        data={dailyLeads}
        color="#10b981"
        title="Leads pro Tag"
        monthKey={m.month}
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
          <div key={m.month} className={`bg-white rounded-2xl shadow-sm overflow-hidden${isOpen ? ' mb-2' : ''}`}>
            <button
              type="button"
              className="w-full flex items-center justify-between px-6 py-4 transition-colors text-left hover:bg-gray-50"
              onClick={() => toggle(i)}
            >
              <span className="text-sm font-semibold text-gray-900">
                {fmtMonthFull(m.month)}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
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
