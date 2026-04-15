import { notFound } from 'next/navigation'
import { TenantFunnelClient } from '@/components/TenantFunnelClient'
import { getTenantConfig } from '@/lib/getTenantConfig'
import type { Metadata } from 'next'

type TenantPageProps = {
  params: Promise<{ tenant: string }>
}

export async function generateMetadata(
  { params }: TenantPageProps,
): Promise<Metadata> {
  const { tenant } = await params
  const config = await getTenantConfig(tenant)
  if (!config) return { title: 'Solar-Konfigurator' }
  return {
    title: `${config.funnel.title} – ${config.companyName}`,
    description: config.funnel.subtitle,
  }
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenant } = await params
  const config = await getTenantConfig(tenant)

  if (!config) {
    notFound()
  }

  return (
    <main
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: config.theme.backgroundColor }}
    >
      <TenantFunnelClient config={config} />
    </main>
  )
}
