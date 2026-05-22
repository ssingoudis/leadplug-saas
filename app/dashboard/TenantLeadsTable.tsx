'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'

type QuestionMeta = {
  question_key: string
  title: string
  options: Array<{ value: string; label: string }>
}

export type TenantSubmission = {
  id: string
  created_at: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_anrede: string | null
  contact: Record<string, string> | null
  answers: Record<string, string> | null
  customer_email_sent: boolean
  tenant_email_sent: boolean
  funnel_slug: string
  funnel_name: string
  questions: QuestionMeta[]
}

export type FunnelOption = {
  slug: string
  name: string
}

function resolveAnswer(key: string, val: string, questions: QuestionMeta[]): string {
  const q = questions.find((q) => q.question_key === key)
  if (!q) return val
  const options = Array.isArray(q.options) ? q.options : []
  if (options.length === 0) return val
  return val
    .split(',')
    .map((v) => options.find((o) => o.value === v.trim())?.label ?? v.trim())
    .join(', ')
}

function ExpandedDetail({ s }: { s: TenantSubmission }) {
  const extraContact = Object.entries(s.contact ?? {}).filter(
    ([key]) => !['anrede', 'name', 'email', 'telefon'].includes(key)
  )

  return (
    <div className="bg-white dark:bg-gray-900 border-t border-primary/20 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Kontakt</p>
        {[
          { label: 'Anrede', value: s.contact_anrede },
          { label: 'Name', value: s.contact_name },
          { label: 'E-Mail', value: s.contact_email },
          { label: 'Telefon', value: s.contact_phone },
        ].map(({ label, value }) =>
          value ? (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</p>
            </div>
          ) : null
        )}
        {extraContact.map(([key, value]) =>
          value ? (
            <div key={key}>
              <p className="text-xs text-gray-400 dark:text-gray-500">{key}</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</p>
            </div>
          ) : null
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Antworten</p>
        <div className="space-y-2">
          {Object.entries(s.answers ?? {}).map(([key, val]) => {
            const q = s.questions.find((q) => q.question_key === key)
            const label = q?.title?.replace('?', '') ?? key
            const answer = resolveAnswer(key, val, s.questions)
            return (
              <div key={key}>
                <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{answer}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const dateInputClass = "w-full rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white outline-none cursor-pointer"

export default function TenantLeadsTable({
  submissions,
  funnels,
}: {
  submissions: TenantSubmission[]
  funnels: FunnelOption[]
}) {
  const [openId, setOpenId]         = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [funnelFilter, setFunnelFilter] = useState('alle')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [sortBy, setSortBy]         = useState('date_desc')

  const funnelOptions = [
    { value: 'alle', label: 'Alle Funnels' },
    ...funnels.map((f) => ({ value: f.slug, label: f.name })),
  ]

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const rows = submissions.filter((s) => {
      if (q && !(s.contact_name ?? '').toLowerCase().includes(q) &&
               !(s.contact_email ?? '').toLowerCase().includes(q) &&
               !(s.contact_phone ?? '').toLowerCase().includes(q)) return false
      if (funnelFilter !== 'alle' && s.funnel_slug !== funnelFilter) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (new Date(s.created_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(s.created_at) > to) return false
      }
      return true
    })

    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc':  return (a.contact_name ?? '').localeCompare(b.contact_name ?? '', 'de')
        case 'name_desc': return (b.contact_name ?? '').localeCompare(a.contact_name ?? '', 'de')
        default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [submissions, query, funnelFilter, dateFrom, dateTo, sortBy])

  const hasActiveFilters = query || funnelFilter !== 'alle' || dateFrom || dateTo

  return (
    <div>
      {/* Zeile 1: Titel + Suche + Funnel */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white shrink-0 mb-2 sm:mb-0">
          Leads ({submissions.length})
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:justify-end">
          <div className="relative min-w-0 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, E-Mail oder Telefon…"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-8 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            />
          </div>
          {funnels.length > 1 && (
            <Select
              value={funnelFilter}
              onChange={setFunnelFilter}
              options={funnelOptions}
              className="sm:w-40"
            />
          )}
        </div>
      </div>

      {/* Zeile 2: Datum + Sort */}
      <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2 mb-4">
        <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden divide-x divide-gray-200 dark:divide-gray-600">
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Von</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={dateInputClass} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Bis</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={dateInputClass} />
          </div>
        </div>
        <Select
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: 'date_desc', label: 'Neueste zuerst' },
            { value: 'date_asc',  label: 'Älteste zuerst' },
            { value: 'name_asc',  label: 'Name A → Z' },
            { value: 'name_desc', label: 'Name Z → A' },
          ]}
          className="sm:w-40"
        />
        {hasActiveFilters && (
          <button
            onClick={() => { setQuery(''); setFunnelFilter('alle'); setDateFrom(''); setDateTo('') }}
            className="px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition"
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {filtered.length} von {submissions.length} Leads
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {submissions.length === 0 ? 'Noch keine Leads eingegangen.' : 'Keine Ergebnisse für diese Filter.'}
        </p>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 -mx-6 -mb-6">
          {filtered.map((s, idx) => {
            const isOpen = openId === s.id
            const isLast = idx === filtered.length - 1

            return (
              <div key={s.id} className={!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}>
                <div
                  onClick={() => setOpenId(isOpen ? null : s.id)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${isOpen ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  {/* Datum */}
                  <div className="w-24 shrink-0">
                    <p className="text-sm text-gray-500">
                      {new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                    </p>
                  </div>

                  {/* Kontakt */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {[s.contact_anrede, s.contact_name].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.contact_email}</p>
                  </div>

                  {/* Funnel-Name (nur wenn mehrere vorhanden) */}
                  {funnels.length > 1 && (
                    <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 shrink-0 max-w-36 truncate">
                      {s.funnel_name}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="hidden sm:flex gap-1.5 shrink-0">
                    <Badge variant={s.customer_email_sent ? 'green' : 'red'}>
                      Kunde {s.customer_email_sent ? '✓' : '✗'}
                    </Badge>
                    <Badge variant={s.tenant_email_sent ? 'green' : 'red'}>
                      Info {s.tenant_email_sent ? '✓' : '✗'}
                    </Badge>
                  </div>

                  <div className={`shrink-0 transition-colors ${isOpen ? 'text-primary/60' : 'text-gray-300'}`}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isOpen && <ExpandedDetail s={s} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
