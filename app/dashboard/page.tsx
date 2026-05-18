import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import Badge from '@/components/ui/Badge'

async function getData() {
  const supabase = await createClient()

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)

  const [
    { data: funnels },
    { data: submissions },
  ] = await Promise.all([
    supabase
      .from('funnels')
      .select('slug, total_views')
      .eq('is_active', true),
    supabase
      .from('submissions')
      .select('id, created_at, contact_name, contact_email, contact_phone, customer_email_sent, tenant_email_sent')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const totalViews = (funnels ?? []).reduce((s, f) => s + (f.total_views ?? 0), 0)
  const leadsTotal = (submissions ?? []).length
  const leadsLast30 = (submissions ?? []).filter(
    (s) => new Date(s.created_at) >= since30
  ).length
  const conversion = totalViews > 0 ? Math.round((leadsTotal / totalViews) * 100) : 0

  return { submissions: submissions ?? [], totalViews, leadsTotal, leadsLast30, conversion }
}

export default async function DashboardPage() {
  const { submissions, totalViews, leadsLast30, conversion } = await getData()

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile value={leadsLast30} label="Leads (30 Tage)" />
        <StatTile value={totalViews} label="Aufrufe gesamt" />
        <StatTile value={`${conversion} %`} label="Conversion" />
      </div>

      {/* Leads */}
      <Card title={`Leads ${submissions.length > 0 ? `(${submissions.length})` : ''}`}>
        {submissions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Noch keine Leads eingegangen.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6 -mb-6">
            {submissions.map((s) => {
              const d = new Date(s.created_at)
              return (
                <div key={s.id} className="flex items-center gap-4 px-6 py-3">
                  {/* Datum */}
                  <div className="w-24 shrink-0">
                    <p className="text-sm text-gray-700">
                      {d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                    </p>
                  </div>

                  {/* Kontakt */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.contact_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {[s.contact_email, s.contact_phone].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Status-Badges */}
                  <div className="hidden sm:flex gap-1.5 shrink-0">
                    <Badge variant={s.customer_email_sent ? 'green' : 'red'}>
                      Kunde {s.customer_email_sent ? '✓' : '✗'}
                    </Badge>
                    <Badge variant={s.tenant_email_sent ? 'green' : 'red'}>
                      Info {s.tenant_email_sent ? '✓' : '✗'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
