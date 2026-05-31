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
    // D.2 Conversion-Tracking: dem einbettenden Parent signalisieren, dass ein Lead
    // abgeschickt wurde — die Parent-Seite (embed.js) feuert daraufhin Meta/Google-Conversions.
    // BEWUSST sofort (vor dem await): robust gegen redirectUrl-Race (Widget kann den iFrame
    // wegnavigieren) und gegen verworfene fetch-Promises. Der Widget-Pfad ruft onSubmit nur bei
    // echtem User-Abschluss → kein Fehlfeuern bei Bots/Honeypot (die füllen kein echtes Formular aus).
    // KEINE PII im Payload (kein email/name): targetOrigin '*' ist von jedem Parent-Skript lesbar;
    // Meta-'Lead' / Google-'conversion' brauchen clientseitig keine personenbezogenen Daten.
    // Aufgabe 43 (Turnkey): die hinterlegten Pixel-IDs reisen mit — embed.js feuert damit
    // automatisch. Pixel-IDs sind öffentliche Bezeichner (kein PII), daher unbedenklich.
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'funnel-submit',
          funnel: config.slug,
          meta: config.metaPixelId ?? null,
          google: config.googleAdsConversion ?? null,
        },
        '*',
      )
    }

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

  /**
   * Aufgabe 40 Polish: After-Page-Webhook-Trigger. Wird vom Widget gefeuert wenn
   * der User über eine Page advancet. Wir POSTen page_id + den aktuellen answers/
   * contact-Snapshot an /api/track-progress — Server upsertet (wie normaler
   * track-progress-Call) UND triggert after_page-Webhooks via triggerOnPageAdvance.
   * Server-side Dedup verhindert Doppel-Trigger pro Page+Session.
   */
  async function handlePageAdvanced(
    pageId: string,
    snapshot: { answers: Record<string, string>; contact: Record<string, string> },
  ) {
    try {
      await fetch('/api/track-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tenant: config.slug,
          answers: snapshot.answers,
          contact: snapshot.contact,
          honeypot: '',
          advancedPageId: pageId,
          sourceUrl: typeof document !== 'undefined' ? document.referrer : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })
    } catch {
      // silently drop — fire-and-forget
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
      redirectUrl={config.redirectUrl}
      onSubmit={handleSubmit}
      onAnswersChange={handleAnswersChange}
      onPageAdvanced={handlePageAdvanced}
    />
  )
}
