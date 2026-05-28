'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Funnel } from '@/components/funnel'
import type { TenantConfig } from '@/types'

type Props = {
  config: TenantConfig
}

/**
 * Generiert eine stabile Session-ID pro Tab + Funnel-Slug.
 * Lebt in sessionStorage (= Tab-scope, neue Tab = neue Session).
 */
function getOrCreateSessionId(slug: string): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID()
  }
  const key = `lp_session_${slug}`
  try {
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    window.sessionStorage.setItem(key, fresh)
    return fresh
  } catch {
    // Private-Mode oder sessionStorage gesperrt → flüchtige Session pro Render
    return crypto.randomUUID()
  }
}

export function TenantFunnelClient({ config }: Props) {
  // Eine stabile Session-ID pro Tab. Wird vom Server zur UPSERT-Identität genommen.
  const sessionId = useMemo(() => getOrCreateSessionId(config.slug), [config.slug])

  // Letzte gesendete Antwort-Snapshot (zur Deduplizierung — verhindere
  // identische Wiederhol-POSTs durch Debounce-Race).
  const lastSentRef = useRef<string>('')

  useEffect(() => {
    fetch('/api/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: config.slug,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      }),
    }).catch(() => {})
  }, [config.slug])

  /**
   * Partial-Submissions-Send. Wird vom Funnel-Widget bei jeder Antwort-Änderung gefeuert
   * (dort schon 600ms-debounced). Hier zusätzlich Skip wenn nichts neues seit letztem Send.
   * Fehler werden geschluckt — Endkunde merkt davon nichts, finaler /api/submit ist die
   * verbindliche Speicher-Garantie.
   */
  async function handleAnswersChange(data: {
    answers: Record<string, string>
    contact: Record<string, string>
  }) {
    const payload = JSON.stringify({
      sessionId,
      tenant: config.slug,
      answers: data.answers,
      contact: data.contact,
      honeypot: '',
      sourceUrl: typeof document !== 'undefined' ? document.referrer : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    })
    if (payload === lastSentRef.current) return
    lastSentRef.current = payload
    try {
      await fetch('/api/track-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
    } catch {
      // silently drop — finaler Submit ist die Garantie
    }
  }

  async function handleSubmit(data: {
    answers: Record<string, string>
    contact: Record<string, string>
    honeypot: string
  }) {
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tenant: config.slug,
          answers: data.answers,
          contact: data.contact,
          honeypot: data.honeypot,
          sourceUrl: typeof document !== 'undefined' ? document.referrer : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })
    } catch (err) {
      console.error('TenantFunnelClient: submit failed', err)
    }
  }

  return (
    <Funnel
      theme={config.theme}
      funnel={config.funnel}
      questions={config.questions}
      contactFields={config.contactFields}
      companyName={config.companyName}
      publicEmail={config.publicEmail}
      publicPhone={config.phone}
      skipSubmitStep={config.skipSubmitStep}
      onSubmit={handleSubmit}
      onAnswersChange={handleAnswersChange}
    />
  )
}
