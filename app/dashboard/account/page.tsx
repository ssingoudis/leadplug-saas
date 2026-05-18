'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'

function Field({
  label, value, onChange, type = 'text', placeholder, readOnly,
}: {
  label:        string
  value:        string
  onChange?:    (v: string) => void
  type?:        string
  placeholder?: string
  readOnly?:    boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-300 transition ${
          readOnly
            ? 'bg-gray-50 text-gray-400 cursor-default'
            : 'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'
        }`}
      />
    </div>
  )
}

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-5 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
    >
      {loading ? 'Wird gespeichert…' : saved ? '✓ Gespeichert' : 'Speichern'}
    </button>
  )
}

export default function AccountPage() {
  const supabase = createClient()

  const [email, setEmail]               = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [phone, setPhone]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [infoError, setInfoError]       = useState<string | null>(null)

  const [pw, setPw]                     = useState('')
  const [pw2, setPw2]                   = useState('')
  const [pwSaving, setPwSaving]         = useState(false)
  const [pwSaved, setPwSaved]           = useState(false)
  const [pwError, setPwError]           = useState<string | null>(null)

  const [loaded, setLoaded]             = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.display_name ?? '')
      setPhone(user.user_metadata?.phone ?? '')
      setLoaded(true)
    })
  }, [])

  async function handleProfileSave(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    setInfoError(null)
    setSaved(false)

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName, phone },
    })

    setSaving(false)
    if (error) {
      setInfoError('Fehler beim Speichern.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handlePasswordSave(e: React.SyntheticEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSaved(false)

    if (pw.length < 8) { setPwError('Mindestens 8 Zeichen.'); return }
    if (pw !== pw2)     { setPwError('Passwörter stimmen nicht überein.'); return }

    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwSaving(false)

    if (error) {
      setPwError('Passwort konnte nicht geändert werden.')
    } else {
      setPwSaved(true)
      setPw('')
      setPw2('')
      setTimeout(() => setPwSaved(false), 3000)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-gray-400">Wird geladen…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      <Card title="Mein Account">
        <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
          <Field label="E-Mail" value={email} readOnly />
          <Field
            label="Anzeigename (optional)"
            value={displayName}
            onChange={setDisplayName}
            placeholder="z. B. Max Mustermann"
          />
          <Field
            label="Telefon (optional)"
            value={phone}
            onChange={setPhone}
            placeholder="+49 ..."
          />
          {infoError && <p className="text-sm text-red-500">{infoError}</p>}
          <div className="flex justify-end">
            <SaveButton loading={saving} saved={saved} />
          </div>
        </form>
      </Card>

      <Card title="Passwort ändern">
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
          <Field label="Neues Passwort"       value={pw}  onChange={setPw}  type="password" placeholder="min. 8 Zeichen" />
          <Field label="Passwort wiederholen" value={pw2} onChange={setPw2} type="password" />
          {pwError && <p className="text-sm text-red-500">{pwError}</p>}
          <div className="flex justify-end">
            <SaveButton loading={pwSaving} saved={pwSaved} />
          </div>
        </form>
      </Card>

    </div>
  )
}
