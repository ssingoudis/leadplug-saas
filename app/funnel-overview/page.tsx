import { createClient } from '@supabase/supabase-js'
import { Power } from 'lucide-react'
import FunnelGrid from './FunnelGrid'
import MonthlyStats, { type MonthlyRow } from './MonthlyStats'

export interface FunnelCard {
  slug: string
  companyName: string
  primaryColor: string
  url: string
  submissionCount: number
  lastSubmissionAt: string | null
}

async function getAllData(): Promise<{ funnels: FunnelCard[]; monthlyRows: MonthlyRow[] }> {
  const supabaseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !key) return { funnels: [], monthlyRows: [] }

  const supabase = createClient(supabaseUrl, key)

  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const [
    { data: funnelData, error: funnelError },
    { data: subData },
    { data: monthData },
  ] = await Promise.all([
    supabase
      .from('funnels')
      .select(`slug, primary_color, tenants ( company_name )`)
      .eq('is_active', true)
      .order('slug'),
    supabase
      .from('submissions')
      .select('funnel_slug, created_at')
      .eq('honeypot_triggered', false),
    supabase
      .from('submissions')
      .select('created_at')
      .eq('honeypot_triggered', false)
      .gte('created_at', since.toISOString()),
  ])

  if (funnelError) {
    console.error('funnel-overview: funnels query error', funnelError)
    return { funnels: [], monthlyRows: [] }
  }

  // --- per-funnel stats ---
  const stats = new Map<string, { count: number; lastAt: string | null }>()
  for (const row of (subData ?? []) as { funnel_slug: string; created_at: string }[]) {
    const s = stats.get(row.funnel_slug) ?? { count: 0, lastAt: null }
    s.count++
    if (!s.lastAt || row.created_at > s.lastAt) s.lastAt = row.created_at
    stats.set(row.funnel_slug, s)
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnels: FunnelCard[] = (funnelData ?? []).map((row: any) => {
    const slug = row.slug as string
    const s = stats.get(slug) ?? { count: 0, lastAt: null }
    return {
      slug,
      companyName: (row.tenants?.company_name as string) ?? slug,
      primaryColor: (row.primary_color as string) ?? '#22c55e',
      url: `${base}/${slug}`,
      submissionCount: s.count,
      lastSubmissionAt: s.lastAt,
    }
  })

  // --- monthly stats ---
  const monthMap = new Map<string, number>()
  for (const row of (monthData ?? []) as { created_at: string }[]) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
  }
  const monthlyRows: MonthlyRow[] = Array.from(monthMap.entries())
    .map(([month, leads]) => ({ month, leads }))
    .sort((a, b) => b.month.localeCompare(a.month))

  return { funnels, monthlyRows }
}

export default async function FunnelOverviewPage() {
  const { funnels, monthlyRows } = await getAllData()

  return (
    <div className="min-h-screen bg-gray-100" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">Funnel-Übersicht</h1>
          <a
            href="/logout"
            title="Abmelden"
            className="flex flex-col items-center gap-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-2xl px-4 py-3 transition-colors shadow-sm cursor-pointer"
          >
            <Power size={20} />
            <span className="text-xs font-semibold tracking-wide">Logout</span>
          </a>
        </div>
        <FunnelGrid funnels={funnels} />
        <MonthlyStats rows={monthlyRows} />
      </div>
    </div>
  )
}
