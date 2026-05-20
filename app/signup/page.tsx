'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [sent, setSent]           = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)

    if (password !== password2) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    setLoading(false)

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already')) {
        setError('Diese E-Mail-Adresse ist bereits registriert.')
      } else if (msg.includes('rate limit') || msg.includes('after')) {
        setError('Zu viele Versuche. Bitte kurz warten.')
      } else {
        setError(`Registrierung fehlgeschlagen: ${error.message}`)
      }
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div
        className="min-h-screen bg-primary/5 dark:bg-[#0d1117] flex items-center justify-center p-4"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg w-full max-w-sm px-10 py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">E-Mail bestätigen</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
            Wir haben einen Bestätigungslink an<br />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span><br />
            geschickt. Klicke auf den Link um dein Konto zu aktivieren.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Kein E-Mail erhalten? Prüfe deinen Spam-Ordner.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-primary/5 dark:bg-[#0d1117] flex items-center justify-center p-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg w-full max-w-sm px-10 py-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">Leadplug</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-8">Konto erstellen</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="E-Mail"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 text-base text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Passwort (min. 8 Zeichen)"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 text-base text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            placeholder="Passwort wiederholen"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 text-base text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-hover transition-colors tracking-wide cursor-pointer disabled:opacity-60 mt-1"
          >
            {loading ? 'Konto wird erstellt…' : 'Jetzt registrieren'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          Bereits registriert?{' '}
          <a href="/login" className="text-primary font-medium hover:underline">
            Einloggen
          </a>
        </p>
      </div>
    </div>
  )
}