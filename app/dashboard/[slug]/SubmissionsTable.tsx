'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnswerLines({ answers, questions }: { answers: Record<string, string>; questions: any[] }) {
  const lines = Object.entries(answers).map(([key, val]) => {
    const q = questions.find((q) => q.question_key === key)
    const label = q?.title?.replace('?', '') ?? key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any[] = Array.isArray(q?.options) ? q.options : []
    const values = val.split(',').map((v: string) => {
      const opt = options.find((o) => o.value === v)
      return opt?.label ?? v
    })
    return { label, answer: values.join(', ') }
  })
  return (
    <div className="space-y-2">
      {lines.map(({ label, answer }) => (
        <div key={label}>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm text-gray-800 font-medium">{answer}</p>
        </div>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function SubmissionsTable({ submissions, questions }: { submissions: any[]; questions: any[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {submissions.map((s, idx) => {
        const isOpen = openId === s.id
        const isLast = idx === submissions.length - 1

        return (
          <div key={s.id} className={!isLast ? 'border-b border-gray-100' : ''}>
            {/* Collapsed row */}
            <div
              onClick={() => setOpenId(isOpen ? null : s.id)}
              className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${isOpen ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50'}`}
            >
              {/* Date */}
              <div className="w-32 shrink-0">
                <p className="text-sm text-gray-500">
                  {new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(s.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                </p>
              </div>

              {/* Contact */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {[s.contact_anrede, s.contact_name].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-gray-400 truncate">{s.contact_email}</p>
              </div>

              {/* Mail badges */}
              <div className="flex gap-1.5 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.customer_email_sent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                  Kunde {s.customer_email_sent ? '✓' : '✗'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.tenant_email_sent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                  Tenant {s.tenant_email_sent ? '✓' : '✗'}
                </span>
              </div>

              {/* Chevron */}
              <div className={`shrink-0 transition-colors ${isOpen ? 'text-indigo-400' : 'text-gray-300'}`}>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className="bg-white border-t border-indigo-100 px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Contact details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kontakt</p>
                  {[
                    { label: 'Anrede', value: s.contact_anrede },
                    { label: 'Name', value: s.contact_name },
                    { label: 'E-Mail', value: s.contact_email },
                    { label: 'Telefon', value: s.contact_phone },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm text-gray-800 font-medium">{value}</p>
                    </div>
                  ) : null)}
                  {s.contact && Object.entries(s.contact as Record<string, string>)
                    .filter(([key]) => !['anrede', 'name', 'email', 'telefon'].includes(key))
                    .map(([key, value]) => value ? (
                      <div key={key}>
                        <p className="text-xs text-gray-400">{key}</p>
                        <p className="text-sm text-gray-800 font-medium">{value}</p>
                      </div>
                    ) : null)
                  }
                </div>

                {/* Answers */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Antworten</p>
                  <AnswerLines answers={s.answers ?? {}} questions={questions} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
