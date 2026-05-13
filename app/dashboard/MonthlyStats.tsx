'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface MonthlySubmission {
  created_at: string
  funnel_slug: string
  company_name: string
  customer_email_sent: boolean
  tenant_email_sent: boolean
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
    <div className="mt-12">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Monatsübersicht</h2>
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
                        <a key={i} href={`/dashboard/${s.funnel_slug}`} className="flex items-start sm:items-center gap-6 px-4 sm:px-6 py-3 hover:bg-indigo-50 transition-colors group">
                          <div className="w-20 sm:w-36 shrink-0">
                            <p className="text-sm text-gray-700">
                              {d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </p>
                            <p className="text-xs text-gray-400">
                              {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </p>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 truncate transition-colors">{s.company_name}</p>
                              <p className="text-xs text-gray-400 truncate">{s.funnel_slug}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.customer_email_sent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                                Kunde {s.customer_email_sent ? '✓' : '✗'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.tenant_email_sent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                                Tenant {s.tenant_email_sent ? '✓' : '✗'}
                              </span>
                            </div>
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
