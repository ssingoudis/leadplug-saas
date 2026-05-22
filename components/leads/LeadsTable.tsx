'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Select } from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export interface LeadRow {
  id: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  funnel_slug: string
  funnel_name: string
  created_at: string
}

export interface FunnelOption {
  slug: string
  name: string
}

const DATE_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

interface Props {
  leads: LeadRow[]
  funnels: FunnelOption[]
}

export default function LeadsTable({ leads, funnels }: Props) {
  const [search, setSearch] = useState('')
  const [funnelFilter, setFunnelFilter] = useState('alle')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const rows = leads.filter((l) => {
      if (q && !l.contact_name.toLowerCase().includes(q) &&
                !l.contact_email.toLowerCase().includes(q) &&
                !(l.contact_phone ?? '').toLowerCase().includes(q)) return false
      if (funnelFilter !== 'alle' && l.funnel_slug !== funnelFilter) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (new Date(l.created_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(l.created_at) > to) return false
      }
      return true
    })

    return [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name_asc':  return a.contact_name.localeCompare(b.contact_name, 'de')
        case 'name_desc': return b.contact_name.localeCompare(a.contact_name, 'de')
        default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
  }, [leads, search, funnelFilter, dateFrom, dateTo, sortBy])

  const funnelOptions = [
    { value: 'alle', label: 'Alle Funnels' },
    ...funnels.map((f) => ({ value: f.slug, label: f.name })),
  ]

  const dateInputClass = "w-full rounded-lg border-0 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white outline-none cursor-pointer"
  const hasActiveFilters = search || funnelFilter !== 'alle' || dateFrom || dateTo

  return (
    <Card>
      {/* Zeile 1: Titel + Suche + Funnel */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
        <p className="text-base font-bold text-gray-900 dark:text-white shrink-0 mb-2 sm:mb-0">
          Kontakte ({leads.length})
        </p>
        <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:justify-end">
          <div className="relative min-w-0 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, E-Mail oder Telefon suchen…"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-8 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            />
          </div>
          {funnels.length > 1 && (
            <Select value={funnelFilter} onChange={setFunnelFilter} options={funnelOptions} className="sm:w-40" />
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
            onClick={() => { setSearch(''); setFunnelFilter('alle'); setDateFrom(''); setDateTo('') }}
            className="px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition"
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {filtered.length} von {leads.length} Kontakte
        </p>
      )}

      {/* Mobile: Karten */}
      <div className="sm:hidden -mx-6 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Keine Leads gefunden.</p>
        )}
        {filtered.map((lead) => (
          <div key={lead.id} className="px-6 py-4 space-y-1.5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">{lead.contact_name}</p>
            <a href={`mailto:${lead.contact_email}`} className="block text-xs text-primary hover:underline truncate">
              {lead.contact_email}
            </a>
            {lead.contact_phone && (
              <a href={`tel:${lead.contact_phone}`} className="block text-xs text-gray-600 dark:text-gray-300 hover:text-primary transition-colors truncate">
                {lead.contact_phone}
              </a>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-0.5">
              {lead.funnel_name} · {DATE_FORMAT.format(new Date(lead.created_at))}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop: Tabelle */}
      <div className="hidden sm:block overflow-x-auto -mx-6">
        <table className="w-full text-sm min-w-180">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {['Name', 'E-Mail', 'Telefon', 'Funnel', 'Angelegt'].map((h) => (
                <th key={h} className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                  Keine Leads gefunden.
                </td>
              </tr>
            )}
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{lead.contact_name}</td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <a href={`mailto:${lead.contact_email}`} className="hover:text-primary transition-colors">{lead.contact_email}</a>
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {lead.contact_phone
                    ? <a href={`tel:${lead.contact_phone}`} className="hover:text-primary transition-colors">{lead.contact_phone}</a>
                    : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {lead.funnel_name}
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {DATE_FORMAT.format(new Date(lead.created_at))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
