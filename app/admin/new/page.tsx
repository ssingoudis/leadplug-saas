'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { IconPicker } from './IconPicker'

// ── helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function toKey(s: string) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function uid() { return Math.random().toString(36).slice(2, 9) }

// ── types ─────────────────────────────────────────────────────────────────────

type Option = { id: string; label: string; value: string; icon_key: string }
type SliderConfig = { min: string; max: string; step: string; default: string; unit: string }
type Question = {
  id: string
  title: string
  question_type: 'single_choice' | 'multiple_choice' | 'slider' | 'short_text' | 'long_text'
  visible: boolean
  options: Option[]
  slider: SliderConfig
  placeholder: string
  required: boolean
}

type Form = {
  company_name: string
  tenant_slug: string
  public_email: string
  notification_email: string
  public_phone: string
  website: string
  billing_model: string
  lead_price: string
  billing_price: string
  funnel_slug: string

  primary_color: string
  text_color: string
  background_color: string
  page_background_color: string
  font: string
  border_radius: string
  max_width: string
  contact_form_title: string
  submit_button_label: string
  success_message: string
  response_message: string
  contact_form_subtitle: string
  privacy_policy_url: string
  email_sender_local: string
}

// ── sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{children}</p>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function SelectNative({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition pr-8 cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function NewFunnelPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form>({
    company_name: '', tenant_slug: '', public_email: '', notification_email: '',
    public_phone: '', website: '', billing_model: 'per_month', lead_price: '3',
    billing_price: '', funnel_slug: '', primary_color: '#4648d4',
    text_color: '', background_color: '', page_background_color: '', border_radius: '', max_width: '',
    font: 'system', contact_form_title: '', submit_button_label: '', success_message: '',
    response_message: '', contact_form_subtitle: '', privacy_policy_url: '',
    email_sender_local: '',
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenantSlugEdited, setTenantSlugEdited] = useState(false)
  const [funnelSlugEdited, setFunnelSlugEdited] = useState(false)

  const set = (key: keyof Form) => (value: string) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    if (!tenantSlugEdited) setForm(f => ({ ...f, tenant_slug: toSlug(f.company_name) }))
  }, [form.company_name, tenantSlugEdited])

  useEffect(() => {
    if (!funnelSlugEdited) setForm(f => ({ ...f, funnel_slug: f.tenant_slug }))
  }, [form.tenant_slug, funnelSlugEdited])

  // questions
  const addQuestion = () =>
    setQuestions(qs => [...qs, {
      id: uid(), title: '', question_type: 'single_choice', visible: true, options: [],
      slider: { min: '0', max: '100', step: '1', default: '50', unit: '' },
      placeholder: '',
      required: true,
    }])

  const updateQ = (id: string, updates: Partial<Question>) =>
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...updates } : q))

  const removeQ = (id: string) => setQuestions(qs => qs.filter(q => q.id !== id))

  const moveQ = (id: string, dir: -1 | 1) => setQuestions(qs => {
    const i = qs.findIndex(q => q.id === id)
    if (i < 0) return qs
    const next = [...qs]
    const j = i + dir
    if (j < 0 || j >= next.length) return qs
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  // options
  const addOption = (qId: string) =>
    updateQ(qId, { options: [...(questions.find(q => q.id === qId)?.options ?? []), { id: uid(), label: '', value: '', icon_key: '' }] })

  const updateO = (qId: string, oId: string, field: keyof Option, val: string) =>
    setQuestions(qs => qs.map(q => q.id !== qId ? q : {
      ...q,
      options: q.options.map(o => o.id !== oId ? o : { ...o, [field]: val }),
    }))

  const removeO = (qId: string, oId: string) =>
    setQuestions(qs => qs.map(q => q.id !== qId ? q : { ...q, options: q.options.filter(o => o.id !== oId) }))

  const handlePreview = () => {
    localStorage.setItem('funnel_preview', JSON.stringify({ form, questions }))
    window.open('/admin/preview', '_blank')
  }

  // submit
  const handleSubmit = async () => {
    if (!form.company_name || !form.tenant_slug || !form.public_email || !form.funnel_slug) {
      setError('Pflichtfelder: Firmenname, Slug, E-Mail, Funnel-Slug')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/create-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant: {
          slug: form.tenant_slug,
          company_name: form.company_name,
          public_email: form.public_email,
          notification_email: form.notification_email || form.public_email,
          public_phone: form.public_phone || null,
          website: form.website || null,
          billing_model: form.billing_model,
          lead_price: form.billing_model === 'per_lead' ? Number(form.lead_price) : 0,
          billing_price: form.billing_model !== 'per_lead' && form.billing_price ? Number(form.billing_price) : null,
        },
        funnel: {
          slug: form.funnel_slug,
          tenant_slug: form.tenant_slug,
          primary_color: form.primary_color || null,
          text_color: form.text_color || null,
          background_color: form.background_color || null,
          page_background_color: form.page_background_color || null,
          font: form.font || null,
          border_radius: form.border_radius || null,
          max_width: form.max_width || null,
          contact_form_title: form.contact_form_title || null,
          submit_button_label: form.submit_button_label || null,
          success_message: form.success_message || null,
          response_message: form.response_message || null,
          contact_form_subtitle: form.contact_form_subtitle || null,
          privacy_policy_url: form.privacy_policy_url || null,
          email_sender_local: form.email_sender_local || null,
        },
        questions: questions
          .filter(q => q.title.trim())
          .map((q, i) => ({
            funnel_slug: form.funnel_slug,
            title: q.title,
            question_key: toKey(q.title) || uid(),
            question_type: q.question_type,
            visible: q.visible,
            sort_order: i,
            options: (q.question_type === 'single_choice' || q.question_type === 'multiple_choice')
              ? q.options.filter(o => o.label.trim()).map(o => ({ label: o.label, value: o.value || toKey(o.label), icon_key: o.icon_key || null }))
              : [],
            config: q.question_type === 'slider'
              ? { min: Number(q.slider.min) || 0, max: Number(q.slider.max) || 100, step: Number(q.slider.step) || 1, default: Number(q.slider.default) || 50, unit: q.slider.unit || '', required: q.required }
              : (q.question_type === 'short_text' || q.question_type === 'long_text')
                ? { placeholder: q.placeholder || undefined, required: q.required }
                : { required: q.required },
          })),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Unbekannter Fehler')
      setSaving(false)
      return
    }
    router.push(`/admin/${data.slug}`)
  }

  const billingOptions = [
    { value: 'per_month', label: 'Pro Monat (Flatrate)' },
    { value: 'per_year', label: 'Pro Jahr (Flatrate)' },
    { value: 'per_lead', label: 'Pro Lead' },
    { value: 'free', label: 'Kostenlos' },
  ]

  const fontOptions = [
    { value: 'system', label: 'System (Standard)' },
    { value: 'inter', label: 'Inter' },
    { value: 'poppins', label: 'Poppins' },
    { value: 'roboto', label: 'Roboto' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b-2 border-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-3">
          <a href="/admin" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Übersicht</span>
          </a>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Neuer Kunde</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Vorschau
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? 'Speichert…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Kunde */}
        <Section title="Kunde">
          <div className="flex flex-col gap-4">
            <Field label="Firmenname *">
              <Input value={form.company_name} onChange={set('company_name')} placeholder="Muster Solar GmbH" />
            </Field>
            <Field label="Tenant-Slug *">
              <Input
                value={form.tenant_slug}
                onChange={v => { setTenantSlugEdited(true); set('tenant_slug')(v) }}
                placeholder="muster-solar"
              />
            </Field>
            <Grid>
              <Field label="Öffentliche E-Mail *">
                <Input value={form.public_email} onChange={set('public_email')} placeholder="info@firma.de" type="email" />
              </Field>
              <Field label="Lead-Benachrichtigung (E-Mail)">
                <Input value={form.notification_email} onChange={set('notification_email')} placeholder="wie öffentliche E-Mail" type="email" />
              </Field>
            </Grid>
            <Grid>
              <Field label="Telefon">
                <Input value={form.public_phone} onChange={set('public_phone')} placeholder="+49 89 12345678" />
              </Field>
              <Field label="Website">
                <Input value={form.website} onChange={set('website')} placeholder="https://firma.de" />
              </Field>
            </Grid>
            <Grid>
              <Field label="Abrechnungsmodell">
                <SelectNative value={form.billing_model} onChange={set('billing_model')} options={billingOptions} />
              </Field>
              {form.billing_model === 'per_lead' ? (
                <Field label="Preis pro Lead (€)">
                  <Input value={form.lead_price} onChange={set('lead_price')} placeholder="3.00" type="number" />
                </Field>
              ) : form.billing_model === 'free' ? (
                <div />
              ) : (
                <Field label={form.billing_model === 'per_year' ? 'Jahrespreis (€)' : 'Monatspreis (€)'}>
                  <Input value={form.billing_price} onChange={set('billing_price')} placeholder="99.00" type="number" />
                </Field>
              )}
            </Grid>
          </div>
        </Section>

        {/* Funnel */}
        <Section title="Funnel">
          <div className="flex flex-col gap-4">
            <Grid>
              <Field label="Funnel-Slug *">
                <Input
                  value={form.funnel_slug}
                  onChange={v => { setFunnelSlugEdited(true); set('funnel_slug')(v) }}
                  placeholder="muster-solar"
                />
              </Field>
              <Field label="E-Mail-Absender-Präfix">
                <Input value={form.email_sender_local} onChange={set('email_sender_local')} placeholder="z.B. muster-solar" />
              </Field>
            </Grid>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-1">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Theme (optional — Defaults werden verwendet wenn leer)</p>
              <div className="flex flex-col gap-4 mb-4">
                <Field label="Font">
                  <SelectNative value={form.font} onChange={set('font')} options={fontOptions} />
                </Field>
                <Grid>
                  <Field label="Primärfarbe">
                    <div className="flex gap-2">
                      <input type="color" value={form.primary_color} onChange={e => set('primary_color')(e.target.value)} className="h-9 w-14 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white shadow-sm" />
                      <Input value={form.primary_color} onChange={set('primary_color')} placeholder="#4648d4" />
                    </div>
                  </Field>
                  <Field label="Textfarbe">
                    <div className="flex gap-2">
                      <input type="color" value={form.text_color || '#1f2937'} onChange={e => set('text_color')(e.target.value)} className="h-9 w-14 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white shadow-sm" />
                      <Input value={form.text_color} onChange={set('text_color')} placeholder="#1f2937" />
                    </div>
                  </Field>
                </Grid>
                <Grid>
                  <Field label="Widget-Hintergrund">
                    <div className="flex gap-2">
                      <input type="color" value={form.background_color || '#ffffff'} onChange={e => set('background_color')(e.target.value)} className="h-9 w-14 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white shadow-sm" />
                      <Input value={form.background_color} onChange={set('background_color')} placeholder="#ffffff" />
                    </div>
                  </Field>
                  <Field label="Seiten-Hintergrund">
                    <div className="flex gap-2">
                      <input type="color" value={form.page_background_color || '#f3f4f6'} onChange={e => set('page_background_color')(e.target.value)} className="h-9 w-14 rounded-lg border border-gray-300 p-0.5 cursor-pointer bg-white shadow-sm" />
                      <Input value={form.page_background_color} onChange={set('page_background_color')} placeholder="#f3f4f6" />
                    </div>
                  </Field>
                </Grid>
                <Grid>
                  <Field label="Border-Radius">
                    <Input value={form.border_radius} onChange={set('border_radius')} placeholder="0.5rem" />
                  </Field>
                  <Field label="Max-Breite">
                    <Input value={form.max_width} onChange={set('max_width')} placeholder="720px" />
                  </Field>
                </Grid>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-1">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Texte (optional — Defaults werden verwendet wenn leer)</p>
              <div className="flex flex-col gap-4">
                <Field label="Funnel-Titel">
                  <Input value={form.contact_form_title} onChange={set('contact_form_title')} placeholder="Jetzt kostenloses Angebot anfordern" />
                </Field>
                <Field label="Kontaktformular-Untertitel">
                  <Input value={form.contact_form_subtitle} onChange={set('contact_form_subtitle')} placeholder="Wer soll das Angebot erhalten?" />
                </Field>
                <Field label="Button-Beschriftung">
                  <Input value={form.submit_button_label} onChange={set('submit_button_label')} placeholder="Anfrage absenden" />
                </Field>
                <Field label="Erfolgsmeldung">
                  <Input value={form.success_message} onChange={set('success_message')} placeholder="Vielen Dank! Wir melden uns in Kürze bei Ihnen." />
                </Field>
                <Field label="Antwortzeit-Text">
                  <Input value={form.response_message} onChange={set('response_message')} placeholder="Wir melden uns so schnell wie möglich bei Ihnen." />
                </Field>
                <Field label="Datenschutz-URL">
                  <Input value={form.privacy_policy_url} onChange={set('privacy_policy_url')} placeholder="https://firma.de/datenschutz" />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        {/* Fragen */}
        <Section title={`Fragen (${questions.length})`}>
          <div className="flex flex-col gap-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  {/* sort */}
                  <div className="flex flex-col gap-0.5 pt-0.5 shrink-0">
                    <button onClick={() => moveQ(q.id, -1)} disabled={qi === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => moveQ(q.id, 1)} disabled={qi === questions.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default">
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    {/* question title + type */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          value={q.title}
                          onChange={v => updateQ(q.id, { title: v })}
                          placeholder={`Frage ${qi + 1}`}
                        />
                      </div>
                      <SelectNative
                        value={q.question_type}
                        onChange={v => updateQ(q.id, { question_type: v as Question['question_type'] })}
                        options={[
                          { value: 'single_choice', label: 'Einfachauswahl' },
                          { value: 'multiple_choice', label: 'Mehrfachauswahl' },
                          { value: 'slider', label: 'Slider' },
                          { value: 'short_text', label: 'Freitext (kurz)' },
                          { value: 'long_text', label: 'Freitext (lang)' },
                        ]}
                      />
                    </div>

                    {/* options — bei allen Typen außer slider/text */}
                    {q.question_type !== 'slider' && q.question_type !== 'short_text' && q.question_type !== 'long_text' && (
                      <div className="flex flex-col gap-2">
                        {q.options.map(o => (
                          <div key={o.id} className="flex gap-2 items-center">
                            <IconPicker
                              value={o.icon_key}
                              onChange={v => updateO(q.id, o.id, 'icon_key', v)}
                            />
                            <Input
                              value={o.label}
                              onChange={v => updateO(q.id, o.id, 'label', v)}
                              placeholder="Antwort-Option"
                            />
                            <button onClick={() => removeO(q.id, o.id)} className="text-gray-400 hover:text-red-500 shrink-0 transition-colors cursor-pointer">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(q.id)}
                          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors w-fit cursor-pointer"
                        >
                          <Plus size={12} /> Option hinzufügen
                        </button>
                      </div>
                    )}

                    {/* slider config */}
                    {q.question_type === 'slider' && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(['min', 'max', 'step', 'default', 'unit'] as const).map(field => (
                          <div key={field}>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{field}</p>
                            <Input
                              value={q.slider[field]}
                              onChange={v => updateQ(q.id, { slider: { ...q.slider, [field]: v } })}
                              placeholder={field === 'unit' ? 'm²' : field === 'min' ? '0' : field === 'max' ? '100' : field === 'step' ? '1' : '50'}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* freitext — placeholder */}
                    {(q.question_type === 'short_text' || q.question_type === 'long_text') && (
                      <Input
                        value={q.placeholder}
                        onChange={v => updateQ(q.id, { placeholder: v })}
                        placeholder="Placeholder-Text im Eingabefeld (optional)"
                      />
                    )}

                    {/* pflichtfeld — alle typen */}
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={e => updateQ(q.id, { required: e.target.checked })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pflichtfeld</span>
                    </label>
                  </div>

                  <button onClick={() => removeQ(q.id)} className="text-gray-400 hover:text-red-500 shrink-0 transition-colors pt-0.5 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover transition-colors w-fit cursor-pointer"
            >
              <Plus size={16} /> Frage hinzufügen
            </button>
          </div>
        </Section>

        {/* Bottom buttons */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 text-sm font-medium px-6 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            Vorschau
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-medium px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
