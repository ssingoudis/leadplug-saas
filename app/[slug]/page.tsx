import { notFound } from 'next/navigation'
import { TenantFunnelClient } from '@/components/TenantFunnelClient'
import { getTenantConfig } from '@/lib/getTenantConfig'
import type { Metadata } from 'next'

type SlugPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: SlugPageProps,
): Promise<Metadata> {
  const { slug } = await params
  const config = await getTenantConfig(slug)
  if (!config) return { title: 'Angebot anfordern' }
  return {
    title: `${config.funnel.title} – ${config.companyName}`,
    description: config.funnel.subtitle,
  }
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params
  const config = await getTenantConfig(slug)

  if (!config) {
    notFound()
  }

  return (
    <main
      className="min-h-dvh flex items-center justify-center"
      style={{ backgroundColor: config.theme.pageBackgroundColor ?? "transparent" }}
    >
      <TenantFunnelClient config={config} />
    </main>
  )
}
