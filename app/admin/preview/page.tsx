'use client'

import { useEffect, useState } from 'react'
import { Funnel } from '@/components/funnel'
import type { QuestionConfig, ContactFieldConfig, FunnelConfig, FunnelTheme } from '@/types'

const DEFAULT_CONTACT_FIELDS: ContactFieldConfig[] = [
  { key: 'anrede', type: 'radio', label: 'Anrede', options: ['Herr', 'Frau'], required: true, visible: true, sort_order: 0 },
  { key: 'name', type: 'text', label: 'Vor- und Nachname', placeholder: 'Vor- und Nachname', required: true, visible: true, sort_order: 1 },
  { key: 'telefon', type: 'tel', label: 'Telefonnummer', placeholder: 'Telefonnummer', required: true, visible: true, sort_order: 2 },
  { key: 'email', type: 'email', label: 'E-Mail', placeholder: 'E-Mail', required: true, visible: true, sort_order: 3 },
]

function toKey(s: string) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQuestions(raw: any[]): QuestionConfig[] {
  return raw
    .filter((q) => q.title?.trim())
    .map((q, i) => ({
      id: toKey(q.title) || `q_${i}`,
      title: q.title,
      questionType: q.question_type,
      visible: q.visible ?? true,
      options: (q.question_type === 'single_choice' || q.question_type === 'multiple_choice')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (q.options ?? []).filter((o: any) => o.label?.trim()).map((o: any) => ({
            label: o.label,
            value: o.value || toKey(o.label),
            iconKey: '',
          }))
        : [],
      config: q.question_type === 'slider'
        ? { min: Number(q.slider?.min) || 0, max: Number(q.slider?.max) || 100, step: Number(q.slider?.step) || 1, default: Number(q.slider?.default) || 50, unit: q.slider?.unit || '', required: q.required ?? true }
        : (q.question_type === 'short_text' || q.question_type === 'long_text')
          ? { placeholder: q.placeholder || undefined, required: q.required ?? true }
          : { required: q.required ?? true },
    }))
}

export default function PreviewPage() {
  const [ready, setReady] = useState(false)
  const [theme, setTheme] = useState<FunnelTheme>({ primaryColor: '#4648d4' })
  const [funnel, setFunnel] = useState<FunnelConfig | null>(null)
  const [questions, setQuestions] = useState<QuestionConfig[]>([])
  const [companyName, setCompanyName] = useState('Vorschau')
  const [publicEmail, setPublicEmail] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('funnel_preview')
    if (!stored) { setReady(true); return }

    const { form, questions: rawQ } = JSON.parse(stored)

    setTheme({
      primaryColor: form.primary_color || '#4648d4',
      font: form.font || 'system',
    })
    setFunnel({
      title: form.funnel_title || 'Jetzt kostenloses Angebot anfordern',
      submitButtonLabel: form.submit_button_label || 'Anfrage absenden',
      successMessage: form.success_message || 'Vielen Dank! Wir melden uns in Kürze bei Ihnen.',
      responseMessage: form.response_message || 'Wir melden uns so schnell wie möglich bei Ihnen.',
      contactFormSubtitle: form.contact_form_subtitle || 'Wer soll das Angebot erhalten?',
      privacyPolicyUrl: form.privacy_policy_url || undefined,
      privacyText: 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden',
      answersOverviewLabel: 'Ihre Angaben im Überblick:',
      footerText: '{{company_name}} · {{public_email}}',
    })
    setQuestions(buildQuestions(rawQ ?? []))
    setCompanyName(form.company_name || 'Vorschau')
    setPublicEmail(form.public_email || '')
    setReady(true)
  }, [])

  if (!ready) return null

  if (!funnel) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      Keine Vorschau-Daten gefunden — bitte öffne die Vorschau aus dem Formular.
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-800 flex items-center justify-center gap-4">
        <span>Vorschau — noch nicht gespeichert</span>
        <button onClick={() => window.close()} className="underline hover:no-underline">
          Schließen
        </button>
      </div>
      <div className="max-w-2xl mx-auto pt-8 px-4 pb-16">
        <Funnel
          theme={theme}
          funnel={funnel}
          questions={questions}
          contactFields={DEFAULT_CONTACT_FIELDS}
          companyName={companyName}
          publicEmail={publicEmail}
          onSubmit={() => {}}
        />
      </div>
    </div>
  )
}
