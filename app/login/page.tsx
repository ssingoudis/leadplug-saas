'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const from = searchParams.get('from') ?? '/dashboard'
  const authError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    authError === 'auth' ? 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.' : null
  )

  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-Mail oder Passwort falsch.')
      setLoading(false)
      return
    }

    router.push(from.startsWith('/') ? from : '/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setError('Google-Anmeldung fehlgeschlagen.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-primary/5 dark:bg-background flex items-center justify-center p-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Karten-Rahmen nach Design-System (Card.tsx) — ohne Border ist die Karte im Dark Mode unsichtbar. */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-800 w-full max-w-sm px-10 py-10">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">LeadPlug</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-8">Anmelden</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
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
            placeholder="Passwort"
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 text-base text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder-gray-400 dark:placeholder-gray-500 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-hover transition-colors tracking-wide cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Wird angemeldet…' : 'Anmelden'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">oder</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Mit Google anmelden
        </button>
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          Noch kein Konto?{' '}
          <a href="/signup" className="text-primary font-medium hover:underline">
            Registrieren
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
