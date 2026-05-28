import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import DailyLeadsChart, { type DayData } from '@/components/dashboard/DailyLeadsChart'
import TenantLeadsTable, { type TenantSubmission, type FunnelOption } from './TenantLeadsTable'

async function getData() {
  const supabase = await createClient()

  const since14 = new Date()
  since14.setDate(since14.getDate() - 13)
  since14.setHours(0, 0, 0, 0)

  const [
    { data: funnels },
    { data: submissions },
    { data: chartRows },
    { data: questionPageRows },
  ] = await Promise.all([
    supabase
      .from('funnels')
      .select('id, slug, funnel_name, total_views')
      .eq('is_active', true),
    supabase
      .from('submissions')
      .select('id, created_at, contact, answers, customer_email_sent, tenant_email_sent, funnel_slug')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('submissions')
      .select('created_at')
      .gte('created_at', since14.toISOString()),
    // Frage-Metadaten: pages mit page_type='question' + ihre Fields (genau 1 pro Page)
    supabase
      .from('pages')
      .select('id, funnel_id')
      .eq('page_type', 'question'),
  ])

  // Frage-Fields nachladen (Field hat field_key, label, options — entspricht alter funnel_questions-Shape)
  const questionPageIds = (questionPageRows ?? []).map((p) => p.id)
  const { data: questionFieldRows } = questionPageIds.length > 0
    ? await supabase
        .from('fields')
        .select('page_id, field_key, label, options')
        .in('page_id', questionPageIds)
    : { data: [] as { page_id: string; field_key: string; label: string; options: unknown }[] }

  // Funnel-Name-Map + slug-by-id für Questions-Aggregation
  const funnelNameMap: Record<string, string> = {}
  const funnelSlugById = new Map<string, string>()
  for (const f of (funnels ?? []) as { id: string; slug: string; funnel_name: string | null }[]) {
    funnelNameMap[f.slug] = f.funnel_name ?? f.slug
    funnelSlugById.set(f.id, f.slug)
  }

  // page_id → funnel_id Lookup
  const funnelIdByPageId = new Map<string, string>()
  for (const p of (questionPageRows ?? []) as { id: string; funnel_id: string }[]) {
    funnelIdByPageId.set(p.id, p.funnel_id)
  }

  // Questions (von Question-Pages) per Funnel-Slug indexieren
  const questionsByFunnel = new Map<string, TenantSubmission['questions']>()
  for (const f of (questionFieldRows ?? []) as { page_id: string; field_key: string; label: string; options: unknown }[]) {
    const funnelId = funnelIdByPageId.get(f.page_id)
    if (!funnelId) continue
    const slug = funnelSlugById.get(funnelId)
    if (!slug) continue
    const list = questionsByFunnel.get(slug) ?? []
    list.push({
      question_key: f.field_key,
      title: f.label,
      options: Array.isArray(f.options) ? f.options as { value: string; label: string }[] : [],
    })
    questionsByFunnel.set(slug, list)
  }

  // Submissions mit Questions anreichern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedSubmissions: TenantSubmission[] = ((submissions ?? []) as any[]).map((s) => {
    const c = (s.contact ?? {}) as Record<string, string>
    return {
      id: s.id as string,
      created_at: s.created_at as string,
      contact_name: (c.name as string | undefined) ?? null,
      contact_email: (c.email as string | undefined) ?? null,
      contact_phone: (c.telefon as string | undefined) ?? null,
      contact_anrede: (c.anrede as string | undefined) ?? null,
      contact: s.contact as Record<string, string> | null,
      answers: s.answers as Record<string, string> | null,
      customer_email_sent: (s.customer_email_sent as boolean) ?? false,
      tenant_email_sent: (s.tenant_email_sent as boolean) ?? false,
      funnel_slug: s.funnel_slug as string,
      funnel_name: funnelNameMap[s.funnel_slug as string] ?? (s.funnel_slug as string),
      questions: questionsByFunnel.get(s.funnel_slug as string) ?? [],
    }
  })

  const funnelList: FunnelOption[] = (funnels ?? []).map(
    (f) => ({ slug: (f as { slug: string }).slug, name: funnelNameMap[(f as { slug: string }).slug] ?? (f as { slug: string }).slug })
  )

  // Stats
  const totalViews = (funnels ?? []).reduce((s, f) => s + ((f as { total_views: number | null }).total_views ?? 0), 0)
  const leadsLast14 = (chartRows ?? []).length
  const conversion = totalViews > 0 ? Math.round((enrichedSubmissions.length / totalViews) * 100) : 0

  // 14-Tage-Chart
  const dailyMap = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const row of (chartRows ?? []) as { created_at: string }[]) {
    const key = new Date(row.created_at).toISOString().slice(0, 10)
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
  }
  const dailyData: DayData[] = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))

  return { enrichedSubmissions, funnelList, totalViews, leadsLast14, conversion, dailyData }
}

export default async function DashboardPage() {
  const { enrichedSubmissions, funnelList, totalViews, leadsLast14, conversion, dailyData } = await getData()

  return (
    <div className="flex flex-col gap-6">
      {/* Chart */}
      <DailyLeadsChart data={dailyData} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile value={leadsLast14} label="Leads (14 Tage)" />
        <StatTile value={totalViews} label="Aufrufe gesamt" />
        <StatTile value={`${conversion} %`} label="Conversion" />
      </div>

      {/* Leads */}
      <Card>
        <TenantLeadsTable submissions={enrichedSubmissions} funnels={funnelList} />
      </Card>
    </div>
  )
}
