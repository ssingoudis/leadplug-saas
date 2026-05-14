import { notFound } from 'next/navigation'
import { getTenantConfig } from '@/lib/getTenantConfig'
import { Funnel } from '@/components/funnel'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const config = await getTenantConfig(slug)
  if (!config) notFound()

  return (
    <Funnel
      theme={config.theme}
      funnel={config.funnel}
      questions={config.questions}
      contactFields={config.contactFields}
      companyName={config.companyName}
      publicEmail={config.publicEmail}
      publicPhone={config.phone}
      initialSubmitted
    />
  )
}
