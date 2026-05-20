'use client'

import { useState } from 'react'

export interface DayData {
  date:  string  // YYYY-MM-DD
  count: number
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function fmtDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}.${m}.`
}

function weekday(iso: string) {
  return WEEKDAYS[new Date(iso + 'T00:00:00').getDay()]
}

function niceTicks(max: number): number[] {
  if (max === 0) return [0]
  if (max <= 4) return [0, max]
  const mid = Math.round(max / 2)
  return [0, mid, max]
}

export default function DailyLeadsChart({ data }: { data: DayData[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const max   = Math.max(...data.map((d) => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  const ticks = niceTicks(Math.max(...data.map((d) => d.count)))

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm px-6 pt-6 pb-5">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Leads der letzten 14 Tage</h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">{total} Lead{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-3">

        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-28 shrink-0 text-right">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="text-xs text-gray-400 leading-none">{t}</span>
          ))}
        </div>

        {/* Chart area — pt-4 gibt Luft über dem höchsten Balken */}
        <div className="relative flex-1 h-28 pt-4">

          {/* Horizontal grid lines */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ bottom: `${max > 0 ? (t / max) * 100 : 0}%` }}
            />
          ))}

          {/* Bars */}
          <div className="flex items-end gap-0.75 h-full relative">
            {data.map((day, i) => {
              const hovered = hoveredIdx === i
              const barPct  = day.count > 0 ? Math.max((day.count / max) * 100, 8) : 0

              return (
                <div
                  key={day.date}
                  className="relative flex flex-1 flex-col items-center justify-end h-full cursor-default"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Tooltip */}
                  {hovered && (
                    <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                      <span className="font-semibold">{day.count} Lead{day.count !== 1 ? 's' : ''}</span>
                      <span className="text-gray-400 ml-1.5">{weekday(day.date)} {fmtDate(day.date)}</span>
                    </div>
                  )}

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-sm transition-colors duration-100 ${
                      day.count === 0 ? 'bg-gray-100 dark:bg-gray-700' : hovered ? 'bg-primary-hover' : 'bg-primary'
                    }`}
                    style={{ height: day.count > 0 ? `${barPct}%` : '2px' }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-axis labels — nur ab sm sichtbar, auf Mobile zu eng */}
      <div className="hidden sm:flex mt-1.5 pl-8">
        {data.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">{weekday(day.date)}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{fmtDate(day.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
