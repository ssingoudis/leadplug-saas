'use client'

import { useState } from 'react'

export type MonthData = {
  month: string  // YYYY-MM
  count: number
}

const DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function fmtMonth(ym: string) {
  if (!ym || ym.startsWith('_')) return ''
  const [, m] = ym.split('-')
  return DE_MONTHS[parseInt(m, 10) - 1]
}

function fmtMonthFull(ym: string) {
  const [y, m] = ym.split('-')
  return `${DE_MONTHS[parseInt(m, 10) - 1]} ${y}`
}

function niceTicks(max: number): number[] {
  if (max === 0) return [0]
  if (max <= 4) return [0, max]
  const mid = Math.round(max / 2)
  return [0, mid, max]
}

const MIN_COLS = 6

export default function MonthlyLeadsChart({ data }: { data: MonthData[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Pad to at least MIN_COLS columns so single bars don't span full width
  const padded: MonthData[] = data.length < MIN_COLS
    ? [...data, ...Array(MIN_COLS - data.length).fill(null).map((_, i) => ({ month: `_pad_${i}`, count: 0 }))]
    : data

  const max   = Math.max(...padded.map((d) => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)
  const ticks = niceTicks(Math.max(...padded.map((d) => d.count)))

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm px-6 pt-6 pb-5">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Leads der letzten 12 Monate</h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">{total} Lead{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-3">
        {/* Y-Achse */}
        <div className="flex flex-col justify-between h-32 shrink-0 text-right">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="text-xs text-gray-400 dark:text-gray-500 leading-none">{t}</span>
          ))}
        </div>

        {/* Chart */}
        <div className="relative flex-1 h-32 pt-4">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ bottom: `${max > 0 ? (t / max) * 100 : 0}%` }}
            />
          ))}

          <div className="flex items-end gap-1 h-full relative">
            {padded.map((d, i) => {
              const isPad  = d.month.startsWith('_')
              const hovered = !isPad && hoveredIdx === i
              const barPct  = d.count > 0 ? Math.max((d.count / max) * 100, 8) : 0

              return (
                <div
                  key={d.month}
                  className="relative flex flex-1 flex-col items-center justify-end h-full cursor-default"
                  onMouseEnter={() => !isPad && setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {hovered && (
                    <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                      <span className="font-semibold">{d.count} Lead{d.count !== 1 ? 's' : ''}</span>
                      <span className="text-gray-400 ml-1.5">{fmtMonthFull(d.month)}</span>
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t-sm transition-colors duration-100 ${
                      d.count === 0 ? 'bg-gray-100 dark:bg-gray-700' : hovered ? 'bg-primary-hover' : 'bg-primary'
                    }`}
                    style={{ height: d.count > 0 ? `${barPct}%` : '2px' }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* X-Achse */}
      <div className="flex mt-1.5 pl-8">
        {padded.map((d) => (
          <div key={d.month} className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{fmtMonth(d.month)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
