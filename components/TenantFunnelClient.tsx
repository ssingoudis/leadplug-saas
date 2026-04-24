'use client'

import { useRef } from 'react'
import { Funnel } from '@/components/funnel'
import type { TenantConfig, ContactData } from '@/types'

type Props = {
  config: TenantConfig
}

export function TenantFunnelClient({ config }: Props) {
  const startedAtRef = useRef<string | null>(null)
  if (startedAtRef.current === null) {
    startedAtRef.current = new Date().toISOString()
  }

  async function handleSubmit(data: {
    answers: Record<string, string>
    contact: ContactData
  }) {
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: config.slug,
          answers: data.answers,
          contact: data.contact,
          startedAt: startedAtRef.current,
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
      onSubmit={handleSubmit}
    />
  )
}
