'use client'

import { SolarFunnel } from '@/components/solar-funnel'
import type { TenantConfig, ContactData } from '@/types'

type Props = {
  config: TenantConfig
}

export function TenantFunnelClient({ config }: Props) {
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
        }),
      })
    } catch (err) {
      console.error('TenantFunnelClient: submit failed', err)
    }
  }

  return (
    <SolarFunnel
      theme={config.theme}
      questions={config.questions}
      onSubmit={handleSubmit}
    />
  )
}
