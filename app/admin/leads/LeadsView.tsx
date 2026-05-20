'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { SubmissionRow, TenantOption, QuestionMeta } from './page'

function resolveAnswer(key: string, val: string, questions: QuestionMeta[]): string {
  const q = questions.find((q) => q.question_key === key)
  if (!q) return val
  const options: Array<{ value: string; label: string }> = Array.isArray(q.options) ? q.options : []
  if (options.length === 0) return val
  const resolved = val.split(',').map((v) => {
    const opt = options.find((o) => o.value === v.trim())
    return opt?.label ?? v.trim()
  })
  return resolved.join(', ')
}

function exportCSV(rows: SubmissionRow[]) {
  const headers = [
    'Datum', 'Uhrzeit', 'Tenant', 'Funnel', 'Anrede', 'Name', 'E-Mail', 'Telefon',
    'Kunde-Mail', 'Tenant-Mail', 'Antworten',
  ]
  const lines = rows.map((s) => {
    const d = new Date(s.created_at)
    const date = d.toLocaleDateString('de-DE')
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    const answers = Object.entries(s.answers ?? {})
      .map(([k, v]) => `${k}: ${resolveAnswer(k, v, s.questions)}`)
      .join(' | ')
    return [
      date, time,
      s.company_name, s.funnel_slug,
      s.contact_anrede ?? '', s.contact_name ?? '',
      s.contact_email ?? '', s.contact_phone ?? '',
      s.customer_email_sent ? 'ja' : 'nein',
      s.tenant_email_sent ? 'ja' : 'nein',
      answers,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = [headers.map((h) => `"${h}"`).join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ExpandedDetail({ s }: { s: SubmissionRow }) {
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

export default function LeadsView({ submissions, tenants }: { submissions: SubmissionRow[]; tenants: TenantOption[] }) {
  const [tenant, setTenant] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let rows = submissions
    if (tenant !== 'all') rows = rows.filter((s) => s.tenant_slug === tenant)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (s) =>
          s.contact_name?.toLowerCase().includes(q) ||
          s.contact_email?.toLowerCase().includes(q) ||
          s.funnel_slug.toLowerCase().includes(q)
      )
    }
    return rows
  }, [submissions, tenant, search])

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="appearance-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-4 pr-10 py-2 text-sm text-gray-900 dark:text-white shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition cursor-pointer"
          >
            <option value="all">Alle Tenants</option>
            {tenants.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        </div>

        <input
          type="search"
          placeholder="Name, E-Mail oder Funnel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
        />

        <span className="text-sm text-gray-400 whitespace-nowrap">
          {filtered.length} Lead{filtered.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary shadow-sm transition-colors cursor-pointer"
        >
          <Download size={14} />
          CSV
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
          Keine Leads gefunden.
        </div>
      ) : (
        <div className="rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
          {filtered.map((s, idx) => {
            const isOpen = openId === s.id
            const isLast = idx === filtered.length - 1

            return (
              <div key={s.id} className={!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}>
                <div
                  onClick={() => setOpenId(isOpen ? null : s.id)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${isOpen ? 'bg-primary/10 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
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

                  {/* Tenant + Funnel */}
                  <div className="hidden sm:block w-32 shrink-0 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.company_name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{s.funnel_slug}</p>
                  </div>

                  {/* Kontakt */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {[s.contact_anrede, s.contact_name].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.contact_email}</p>
                  </div>

                  {/* Badges */}
                  <div className="hidden sm:flex gap-1.5 shrink-0">
                    <Badge variant={s.customer_email_sent ? 'green' : 'red'}>
                      Kunde {s.customer_email_sent ? '✓' : '✗'}
                    </Badge>
                    <Badge variant={s.tenant_email_sent ? 'green' : 'red'}>
                      Tenant {s.tenant_email_sent ? '✓' : '✗'}
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
    </>
  )
}
