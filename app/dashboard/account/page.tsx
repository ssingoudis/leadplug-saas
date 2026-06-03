'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import { useSaveStatus } from '@/lib/useSaveStatus'
import { SaveStatus } from '@/components/ui/SaveStatus'

function Field({
  label, value, onChange, onBlur, type = 'text', placeholder, readOnly,
}: {
  label:        string
  value:        string
  onChange?:    (v: string) => void
  onBlur?:      () => void
  type?:        string
  placeholder?: string
  readOnly?:    boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={onBlur}
        onKeyDown={onBlur ? (e) => { if (e.key === 'Enter') e.currentTarget.blur() } : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none placeholder-gray-300 dark:placeholder-gray-600 transition ${
          readOnly
            ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-default'
            : 'bg-white dark:bg-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20'
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
      className="px-5 py-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-60"
    >
      {loading ? 'Wird gespeichert…' : saved ? '✓ Gespeichert' : 'Speichern'}
    </button>
  )
}

export default function AccountPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail]               = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [tenantId, setTenantId]         = useState<string | null>(null)
  const [phone, setPhone]               = useState('')
  const [savedName, setSavedName]       = useState('')
  const [savedPhone, setSavedPhone]     = useState('')
  const profileSave                     = useSaveStatus()

  const [pw, setPw]                     = useState('')
  const [pw2, setPw2]                   = useState('')
  const [pwSaving, setPwSaving]         = useState(false)
  const [pwSaved, setPwSaved]           = useState(false)
  const [pwError, setPwError]           = useState<string | null>(null)

  const [loaded, setLoaded]             = useState(false)

  const [showDelete, setShowDelete]     = useState(false)
  const [confirmText, setConfirmText]   = useState('')
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      setPhone(user.user_metadata?.phone ?? '')
      setSavedPhone(user.user_metadata?.phone ?? '')
      // Anzeigename = tenants.company_name (der Name, der in der Navigation angezeigt wird).
      // RLS (tenants_select) liefert nur den eigenen Tenant.
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, company_name')
        .maybeSingle()
      if (tenant) {
        setTenantId(tenant.id)
        setDisplayName(tenant.company_name ?? '')
        setSavedName(tenant.company_name ?? '')
      }
      setLoaded(true)
    })()
  }, [])

  // Aufgabe 50: Profil-Felder speichern on-blur (Autosave-Pattern). Nur wenn sich vs. zuletzt
  // gespeichert etwas geändert hat. Anzeigename → tenants.company_name (RLS: tenants_update),
  // Telefon → Auth-Metadaten. Fehler bleiben als „Nicht gespeichert" sichtbar (kein stiller Verlust).
  async function saveProfile() {
    const trimmedName = displayName.trim()
    if (trimmedName === savedName && phone === savedPhone) return
    await profileSave.run(async () => {
      if (tenantId && trimmedName !== savedName) {
        const { error } = await supabase
          .from('tenants')
          .update({ company_name: trimmedName || null })
          .eq('id', tenantId)
        if (error) throw error
      }
      if (phone !== savedPhone) {
        const { error } = await supabase.auth.updateUser({ data: { phone } })
        if (error) throw error
      }
      setSavedName(trimmedName)
      setSavedPhone(phone)
      // Server-Layout (Sidebar-Footer liest tenant.company_name) neu laden.
      router.refresh()
    })
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

  const confirmPhrase = displayName.trim() || 'LÖSCHEN'

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('delete failed')
      // Account ist weg → harter Redirect auf Login (Session ungültig).
      window.location.href = '/login'
    } catch {
      setDeleting(false)
      setDeleteError('Account konnte nicht gelöscht werden. Bitte versuche es erneut.')
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
        <div className="flex flex-col gap-4">
          <Field label="E-Mail" value={email} readOnly />
          <Field
            label="Anzeigename (in der Navigation sichtbar)"
            value={displayName}
            onChange={setDisplayName}
            onBlur={saveProfile}
            placeholder="z. B. Deine Agentur"
          />
          <Field
            label="Telefon (optional)"
            value={phone}
            onChange={setPhone}
            onBlur={saveProfile}
            placeholder="+49 ..."
          />
          <div className="flex h-5 items-center justify-end">
            <SaveStatus status={profileSave.status} />
          </div>
        </div>
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

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900/40 dark:bg-red-900/10">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400">Account löschen</h2>
        <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
          Löscht deinen Account, alle Funnels, Leads und Daten unwiderruflich. Das kann nicht rückgängig gemacht werden.
        </p>
        <button
          type="button"
          onClick={() => { setShowDelete(true); setConfirmText(''); setDeleteError(null) }}
          className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
        >
          Account löschen
        </button>
      </div>

      {/* Lösch-Bestätigung */}
      {showDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!deleting) setShowDelete(false) }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Account wirklich löschen?</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Alle Funnels, Leads und Daten werden{' '}
              <strong className="text-red-600 dark:text-red-400">unwiderruflich</strong> gelöscht. Tippe zur Bestätigung{' '}
              <strong className="text-gray-800 dark:text-gray-200">{confirmPhrase}</strong> ein.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              autoFocus
              className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            {deleteError && <p className="mt-2 text-sm text-red-500">{deleteError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || confirmText.trim() !== confirmPhrase}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
