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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
        <div className="text-sm text-gray-500 dark:text-gray-400">{children}</div>
      </div>
    </div>
  )
}

export default async function EmbedPage() {
  const funnels = await getFunnels()
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.leadplug.de'

  return (
    <div className="flex flex-col gap-6">

      {/* Anleitung */}
      <Card>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">So bindest du den Funnel ein</h2>
        <div className="flex flex-col gap-5">
          <Step n={1} title="Code kopieren">
            Klicke unten auf <span className="font-medium text-gray-700 dark:text-gray-300">„Kopieren"</span> um den Embed-Code in die Zwischenablage zu übernehmen.
          </Step>
          <Step n={2} title="Code in deine Website einfügen">
            Füge den Code an der Stelle ein, wo der Funnel auf deiner Seite erscheinen soll — direkt im HTML-Quellcode, z.&nbsp;B. in einem Custom-HTML-Block.
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Funktioniert auf jeder Website die HTML unterstützt: WordPress, Squarespace, Wix, Webflow, Jimdo und alle anderen.
            </p>
          </Step>
          <Step n={3} title="Fertig">
            Das Widget erscheint sofort und passt seine Höhe automatisch an den Inhalt an — kein weiteres Setup nötig.
          </Step>

          <div className="mt-1 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
            <span className="font-semibold">Tipp:</span> Platziere den Funnel prominent auf deiner Startseite oder einer dedizierten Anfrage-Seite — das steigert die Conversion deutlich.
          </div>
        </div>
      </Card>

      {/* Embed-Code */}
      <Card title="Dein Embed-Code">
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
