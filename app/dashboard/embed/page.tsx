import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import EmbedBlock from '@/app/admin/[slug]/EmbedBlock'

async function getFunnels() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('funnels')
    .select('slug')
    .eq('is_active', true)
    .order('slug')
  return data ?? []
}

export default async function EmbedPage() {
  const funnels = await getFunnels()
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.leadplug.de'

  return (
    <div className="flex flex-col gap-6">
      <Card title="Embed-Code">
        <p className="text-sm text-gray-400 mb-6">
          Kopiere den Code und füge ihn auf deiner Website ein. Das Widget passt seine Höhe automatisch an.
        </p>

        {funnels.length === 0 ? (
          <p className="text-sm text-gray-400">Kein aktiver Funnel gefunden.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {funnels.map((f) => (
              <EmbedBlock
                key={f.slug}
                slug={f.slug}
                url={`${base}/${f.slug}`}
                companyName={f.slug}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
