'use client'

import { useState } from 'react'
import DonutChart from './DonutChart'
import type { MonthData } from './MonthlyLeadsChart'

const DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function fmtMonthFull(ym: string) {
  const [y, m] = ym.split('-')
  return `${DE_MONTHS[parseInt(m, 10) - 1]} ${y}`
}

type MonthDataWithViews = MonthData & { views: number }

export default function MonthlyTable({ data, totalLeads }: { data: MonthDataWithViews[]; totalLeads: number }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <div className="divide-y divide-gray-100 -mx-6 -mb-6">
      {data.map((m, i) => {
        const expanded   = expandedIdx === i
        const conversion = m.views > 0 ? Math.round((m.count / m.views) * 100) : 0

        return (
          <div key={m.month}>
            <button
              type="button"
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpandedIdx(expanded ? null : i)}
            >
              <span className="text-sm text-gray-700">{fmtMonthFull(m.month)}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {m.count} Lead{m.count !== 1 ? 's' : ''}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expanded && (
              <div className="px-6 pb-5 pt-2 bg-gray-50 flex items-center gap-8">
                <DonutChart
                  value={m.count}
                  total={m.views > 0 ? m.views : totalLeads}
                  centerLabel={m.views > 0 ? `${conversion} %` : `${m.count}`}
                  subLabel={m.views > 0 ? 'Conversion' : 'Leads'}
                  size="sm"
                />
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20">Leads</span>
                    <span className="font-semibold text-gray-900">{m.count}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20">Aufrufe</span>
                    <span className="font-semibold text-gray-900">
                      {m.views > 0 ? m.views : <span className="text-gray-300 font-normal">nicht erfasst</span>}
                    </span>
                  </div>
                  {m.views > 0 && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-20">Conversion</span>
                      <span className="font-semibold text-gray-900">{conversion} %</span>
                    </div>
                  )}
                  {m.views === 0 && (
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                      Aufrufe werden ab Einführung der Log-Tabelle erfasst.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
