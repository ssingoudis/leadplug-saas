import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import LeadsTable from '@/components/leads/LeadsTable'
import type { LeadRow, FunnelOption } from '@/components/leads/LeadsTable'

async function getKontakteData(): Promise<{ leads: LeadRow[]; funnels: FunnelOption[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .maybeSingle()

  if (!tenant) return { leads: [], funnels: [] }

  const [{ data: submissions }, { data: funnels }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, contact, funnel_slug, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('funnels')
      .select('slug, funnel_name, contact_form_title')
      .eq('tenant_id', tenant.id)
      .order('funnel_name'),
  ])

  const funnelNameMap: Record<string, string> = {}
  for (const f of funnels ?? []) {
    funnelNameMap[f.slug] = f.funnel_name || f.contact_form_title || f.slug
  }

  const leads: LeadRow[] = (submissions ?? []).map((s) => {
    const c = (s.contact ?? {}) as Record<string, string>
    return {
      id: s.id,
      contact_name: c.name ?? '—',
      contact_email: c.email ?? '—',
      contact_phone: c.telefon ?? null,
      funnel_slug: s.funnel_slug,
      funnel_name: funnelNameMap[s.funnel_slug] ?? s.funnel_slug,
      created_at: s.created_at,
    }
  })

  const funnelOptions: FunnelOption[] = (funnels ?? []).map((f) => ({
    slug: f.slug,
    name: f.funnel_name || f.contact_form_title || f.slug,
  }))

  return { leads, funnels: funnelOptions }
}

export default async function KontaktePage() {
  const { leads, funnels } = await getKontakteData()

  return (
    <div className="space-y-6">
      {leads.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Noch keine Kontakte vorhanden.
            </p>
          </div>
        </Card>
      ) : (
        <LeadsTable leads={leads} funnels={funnels} />
      )}
    </div>
  )
}
