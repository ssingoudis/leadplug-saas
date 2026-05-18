'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Anmeldung wird abgeschlossen…')

  useEffect(() => {
    const hash   = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const params = new URLSearchParams(window.location.search)

    const code         = params.get('code')
    const accessToken  = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')
    const hashError    = hash.get('error')
    const paramError   = params.get('error')
    const next         = params.get('next') ?? '/dashboard'
    const safeNext     = next.startsWith('/') ? next : '/dashboard'

    if (hashError || paramError) {
      setStatus('Link ungültig oder abgelaufen.')
      setTimeout(() => router.replace('/login?error=auth'), 2000)
      return
    }

    const client = createClient()

    if (code) {
      client.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error('[auth/callback] exchangeCodeForSession:', error.message)
            router.replace('/login?error=auth')
          } else {
            router.replace(safeNext)
          }
        })
      return
    }

    if (accessToken && refreshToken) {
      client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            console.error('[auth/callback] setSession:', error.message)
            router.replace('/login?error=auth')
          } else {
            router.replace(safeNext)
          }
        })
      return
    }

    router.replace('/login?error=auth')
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <p style={{ fontSize: '14px', color: '#94a3b8' }}>{status}</p>
    </div>
  )
}