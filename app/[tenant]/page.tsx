import { notFound } from 'next/navigation'
import { SolarFunnel } from '@/components/solar-funnel'
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
      <div className="mx-auto" style={{ maxWidth: config.theme.maxWidth }}>
        <div className="text-center mb-6">
          <h1
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: config.theme.textColor }}
          >
            {config.funnel.title}
          </h1>
          <p style={{ color: config.theme.textColorMuted }}>
            {config.funnel.subtitle}
          </p>
        </div>

        <SolarFunnel
          theme={config.theme}
          questions={config.questions}
        />
      </div>
    </main>
  )
}
