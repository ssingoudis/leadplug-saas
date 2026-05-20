'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'

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
  questions: QuestionMeta[]
}

const DE_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

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

export default function TenantLeadsTable({ submissions }: { submissions: TenantSubmission[] }) {
  const [openId, setOpenId]         = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const monthOptions = useMemo(() => {
    const seen = Array.from(new Set(submissions.map((s) => s.created_at.slice(0, 7))))
      .sort()
      .reverse()
      .map((m) => {
        const [y, mo] = m.split('-')
        return { value: m, label: `${DE_MONTHS[parseInt(mo, 10) - 1]} ${y}` }
      })
    return [{ value: '', label: 'Alle Monate' }, ...seen]
  }, [submissions])

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (monthFilter && s.created_at.slice(0, 7) !== monthFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (
          !(s.contact_name ?? '').toLowerCase().includes(q) &&
          !(s.contact_email ?? '').toLowerCase().includes(q) &&
          !(s.contact_phone ?? '').toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [submissions, query, monthFilter])

  return (
    <div>
      {/* Header: Titel + Filter in einer Zeile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white shrink-0">
          Leads ({submissions.length})
        </h2>
        <div className="flex gap-3 flex-1 sm:justify-end">
          <Input
            value={query}
            onChange={setQuery}
            placeholder="Suchen…"
            className="flex-1 sm:max-w-xs"
          />
          <Select
            value={monthFilter}
            onChange={setMonthFilter}
            options={monthOptions}
            className="shrink-0 sm:w-44"
          />
        </div>
      </div>

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
