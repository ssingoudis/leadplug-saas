'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Badge from '@/components/ui/Badge'

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
    <div className="bg-white border-t border-indigo-100 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kontakt</p>
        {[
          { label: 'Anrede', value: s.contact_anrede },
          { label: 'Name', value: s.contact_name },
          { label: 'E-Mail', value: s.contact_email },
          { label: 'Telefon', value: s.contact_phone },
        ].map(({ label, value }) =>
          value ? (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm text-gray-800 font-medium">{value}</p>
            </div>
          ) : null
        )}
        {extraContact.map(([key, value]) =>
          value ? (
            <div key={key}>
              <p className="text-xs text-gray-400">{key}</p>
              <p className="text-sm text-gray-800 font-medium">{value}</p>
            </div>
          ) : null
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Antworten</p>
        <div className="space-y-2">
          {Object.entries(s.answers ?? {}).map(([key, val]) => {
            const q = s.questions.find((q) => q.question_key === key)
            const label = q?.title?.replace('?', '') ?? key
            const answer = resolveAnswer(key, val, s.questions)
            return (
              <div key={key}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm text-gray-800 font-medium">{answer}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function TenantLeadsTable({ submissions }: { submissions: TenantSubmission[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Noch keine Leads eingegangen.
      </p>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 -mx-6 -mb-6">
      {submissions.map((s, idx) => {
        const isOpen = openId === s.id
        const isLast = idx === submissions.length - 1

        return (
          <div key={s.id} className={!isLast ? 'border-b border-gray-100' : ''}>
            <div
              onClick={() => setOpenId(isOpen ? null : s.id)}
              className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${isOpen ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}
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
                <p className="text-sm font-semibold text-gray-900 truncate">
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

              <div className={`shrink-0 transition-colors ${isOpen ? 'text-indigo-400' : 'text-gray-300'}`}>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {isOpen && <ExpandedDetail s={s} />}
          </div>
        )
      })}
    </div>
  )
}
