import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import StatTile from '@/components/ui/StatTile'
import DailyLeadsChart, { type DayData } from '@/app/admin/DailyLeadsChart'
import TenantLeadsTable, { type TenantSubmission } from './TenantLeadsTable'

async function getData() {
  const supabase = await createClient()

  const since14 = new Date()
  since14.setDate(since14.getDate() - 13)
  since14.setHours(0, 0, 0, 0)

  const [
    { data: funnels },
    { data: submissions },
    { data: chartRows },
    { data: questionRows },
  ] = await Promise.all([
    supabase
      .from('funnels')
      .select('slug, total_views')
      .eq('is_active', true),
    supabase
      .from('submissions')
      .select('id, created_at, contact_name, contact_email, contact_phone, contact_anrede, contact, answers, customer_email_sent, tenant_email_sent, funnel_slug')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('submissions')
      .select('created_at')
      .gte('created_at', since14.toISOString()),
    supabase
      .from('funnel_questions')
      .select('funnel_slug, question_key, title, options'),
  ])

  // Questions nach funnel_slug gruppieren
  const questionsByFunnel = new Map<string, TenantSubmission['questions']>()
  for (const q of (questionRows ?? []) as { funnel_slug: string; question_key: string; title: string; options: unknown }[]) {
    const list = questionsByFunnel.get(q.funnel_slug) ?? []
    list.push({
      question_key: q.question_key,
      title: q.title,
      options: Array.isArray(q.options) ? q.options as { value: string; label: string }[] : [],
    })
    questionsByFunnel.set(q.funnel_slug, list)
  }

  // Submissions mit Questions anreichern
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedSubmissions: TenantSubmission[] = ((submissions ?? []) as any[]).map((s) => ({
    id: s.id as string,
    created_at: s.created_at as string,
    contact_name: s.contact_name as string | null,
    contact_email: s.contact_email as string | null,
    contact_phone: s.contact_phone as string | null,
    contact_anrede: s.contact_anrede as string | null,
    contact: s.contact as Record<string, string> | null,
    answers: s.answers as Record<string, string> | null,
    customer_email_sent: (s.customer_email_sent as boolean) ?? false,
    tenant_email_sent: (s.tenant_email_sent as boolean) ?? false,
    questions: questionsByFunnel.get(s.funnel_slug as string) ?? [],
  }))

  // Stats
  const totalViews = (funnels ?? []).reduce((s, f) => s + (f.total_views ?? 0), 0)
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

  return { enrichedSubmissions, totalViews, leadsLast14, conversion, dailyData }
}

export default async function DashboardPage() {
  const { enrichedSubmissions, totalViews, leadsLast14, conversion, dailyData } = await getData()

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
        <TenantLeadsTable submissions={enrichedSubmissions} />
      </Card>
    </div>
  )
}
