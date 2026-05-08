'use client'

import { useState } from 'react'
import type { FunnelCard } from './page'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  if (hours > 0) return `vor ${hours} Stunde${hours === 1 ? '' : 'n'}`
  if (minutes > 0) return `vor ${minutes} Minute${minutes === 1 ? '' : 'n'}`
  return 'gerade eben'
}

export default function FunnelGrid({ funnels, failedLast14Days }: { funnels: FunnelCard[]; failedLast14Days: number }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? funnels.filter((f) => f.companyName.toLowerCase().includes(query.toLowerCase()))
    : funnels

  const totalLeads = funnels.reduce((sum, f) => sum + f.submissionCount, 0)

  return (
    <>
      <div className="flex flex-col items-center md:flex-row md:items-center justify-between mb-8 gap-3">
        <div className="flex flex-col items-center md:flex-row md:items-center gap-0.5 md:gap-6 text-base text-gray-600 text-center md:text-left">
          <span>
            <span className="font-semibold text-gray-900">{filtered.length}</span> aktive Funnels
          </span>
          {totalLeads > 0 && (
            <span>
              <span className="font-semibold text-gray-700">{totalLeads}</span> Leads gesamt
            </span>
          )}
          {failedLast14Days > 0 && (
            <span className="text-red-500">
              {failedLast14Days} fehlgeschl. {failedLast14Days === 1 ? 'Mail' : 'Mails'} (14 Tage)
            </span>
          )}
        </div>
        <input
          type="search"
          placeholder="Firma suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full md:w-64 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-base">Kein Funnel gefunden.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <a
              key={f.slug}
              href={`/funnel-overview/${f.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-row min-w-0"
            >
              <div
                className="w-1 shrink-0 rounded-l-2xl"
                style={{ backgroundColor: f.primaryColor }}
              />
              <div className="px-5 pt-4 pb-3 flex flex-col gap-1 flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 leading-tight wrap-break-word">
                  {f.companyName}
                </h2>
                <p className="text-sm font-medium text-gray-500 truncate">{f.slug}</p>
                <p className="text-sm text-gray-400 truncate mb-2">{f.url}</p>

                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-100">
                  <div className="flex-1 min-w-0">
                    {f.submissionCount > 0 ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{f.submissionCount} Lead{f.submissionCount !== 1 ? 's' : ''}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 truncate">
                          {f.lastSubmissionAt ? relativeTime(f.lastSubmissionAt) : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Noch keine Leads</span>
                    )}
                  </div>
                  <span className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                    Details ansehen
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
