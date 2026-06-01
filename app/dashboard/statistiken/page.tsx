import { createClient } from '@/lib/supabase/server'
import StatistikenCockpit, { type FunnelOpt, type LeadPt, type ViewPt } from './StatistikenCockpit'

async function getData(): Promise<{ funnels: FunnelOpt[]; leads: LeadPt[]; views: ViewPt[] }> {
  const supabase = await createClient()

  const since12 = new Date()
  since12.setMonth(since12.getMonth() - 11)
  since12.setDate(1)
  since12.setHours(0, 0, 0, 0)

  const [{ data: funnels }, { data: submissions }, { data: viewLogs }] = await Promise.all([
    supabase.from('funnels').select('id, slug, funnel_name').order('funnel_name'),
    // Nur abgeschlossene Submissions = echte Conversions.
    supabase
      .from('submissions')
      .select('created_at, funnel_slug')
      .not('completed_at', 'is', null)
      .gte('created_at', since12.toISOString()),
    // Aufrufe = funnel_view_logs (einzige Quelle seit Aufgabe 46 Phase 3).
    supabase
      .from('funnel_view_logs')
      .select('viewed_at, funnel_id')
      .gte('viewed_at', since12.toISOString()),
  ])

  return {
    funnels: (funnels ?? []).map((f) => ({ id: f.id, slug: f.slug, name: f.funnel_name ?? f.slug })),
    leads: (submissions ?? []).map((s) => ({ ts: s.created_at as string, funnel_slug: s.funnel_slug as string })),
    views: (viewLogs ?? []).map((v) => ({ ts: v.viewed_at as string, funnel_id: v.funnel_id as string })),
  }
}

export default async function StatistikenPage() {
  const { funnels, leads, views } = await getData()
  return <StatistikenCockpit funnels={funnels} leads={leads} views={views} />
}
