'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface MonthlySubmission {
  created_at: string
  funnel_slug: string
  company_name: string
}

export interface MonthlyRow {
  month: string
  leads: number
  submissions: MonthlySubmission[]
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export default function MonthlyStats({ rows }: { rows: MonthlyRow[] }) {
  const [openMonth, setOpenMonth] = useState<string | null>(null)

  if (rows.length === 0) return null

  const totalLeads = rows.reduce((s, r) => s + r.leads, 0)

  return (
    <div className="mt-14">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Monatsübersicht</h2>
      <p className="text-gray-500 text-sm mb-6">Eingegangene Leads der letzten 12 Monate</p>

      <div className="rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 grid grid-cols-[1fr_80px] px-6 py-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Monat</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Leads</span>
        </div>

        {rows.map((row, idx) => {
          const isOpen = openMonth === row.month
          const isLast = idx === rows.length - 1

          return (
            <div key={row.month} className={!isLast ? 'border-b border-gray-100' : ''}>
              {/* Month row */}
              <div
                onClick={() => setOpenMonth(isOpen ? null : row.month)}
                className={`grid grid-cols-[1fr_80px_32px] items-center px-6 py-4 cursor-pointer transition-colors ${isOpen ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}
              >
                <span className={`text-sm font-medium ${isOpen ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {formatMonth(row.month)}
                </span>
                <span className={`text-sm font-bold text-right ${isOpen ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {row.leads}
                </span>
                <span className={`flex justify-end ${isOpen ? 'text-indigo-400' : 'text-gray-300'}`}>
                  {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </div>

              {/* Expanded: individual leads */}
              {isOpen && (
                <div className="bg-white border-t border-indigo-100 divide-y divide-gray-50">
                  {row.submissions
                    .slice()
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .map((s, i) => {
                      const d = new Date(s.created_at)
                      return (
                        <a key={i} href={`/funnel-overview/${s.funnel_slug}`} className="flex items-center gap-4 px-6 py-3 hover:bg-indigo-50 transition-colors group">
                          <div className="w-36 shrink-0">
                            <p className="text-sm text-gray-700">
                              {d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 truncate transition-colors">{s.company_name}</p>
                            <p className="text-xs text-gray-400 truncate">{s.funnel_slug}</p>
                          </div>
                        </a>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}

        {/* Footer total */}
        <div className="bg-gray-50 border-t border-gray-200 grid grid-cols-[1fr_80px_32px] px-6 py-4">
          <span className="text-sm font-bold text-gray-900">Gesamt</span>
          <span className="text-sm font-bold text-gray-900 text-right">{totalLeads}</span>
          <span />
        </div>
      </div>
    </div>
  )
}
