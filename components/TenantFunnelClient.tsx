'use client'

import { useEffect } from 'react'
import { Funnel } from '@/components/funnel'
import type { TenantConfig } from '@/types'

type Props = {
  config: TenantConfig
}

export function TenantFunnelClient({ config }: Props) {
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
      onSubmit={handleSubmit}
    />
  )
}
