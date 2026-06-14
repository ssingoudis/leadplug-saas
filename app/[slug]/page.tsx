import { notFound } from 'next/navigation'
import { TenantFunnelClient } from '@/components/TenantFunnelClient'
import { getTenantConfig, toPublicFunnelConfig, TenantInactiveError } from '@/lib/getTenantConfig'
import type { Metadata } from 'next'

type SlugPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: SlugPageProps,
): Promise<Metadata> {
  const { slug } = await params
  try {
    const config = await getTenantConfig(slug)
    if (!config) return { title: 'Angebot anfordern' }
    return {
      title: `${config.funnel.title} – ${config.companyName}`,
      description: config.funnel.subtitle,
    }
  } catch {
    return { title: 'Nicht verfügbar' }
  }
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params
  let config
  try {
    config = await getTenantConfig(slug)
  } catch (err) {
    if (err instanceof TenantInactiveError) notFound()
    throw err
  }

  if (!config) {
    notFound()
  }

  return (
    <main
      className="min-h-dvh flex items-center justify-center"
      style={{ backgroundColor: config.theme.pageBackgroundColor ?? "transparent" }}
    >
      <TenantFunnelClient config={toPublicFunnelConfig(config)} />
    </main>
  )
}
