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
  totalViews: number
}

async function getAllData(): Promise<{ funnels: FunnelCard[]; monthlyRows: MonthlyRow[]; failedLast14Days: number }> {
  const supabaseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !key) return { funnels: [], monthlyRows: [], failedLast14Days: 0 }

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
      .select(`slug, primary_color, total_views, tenants ( company_name )`)
      .eq('is_active', true)
      .order('slug'),
    supabase
      .from('submissions')
      .select('funnel_slug, created_at'),
    supabase
      .from('submissions')
      .select('funnel_slug, created_at, customer_email_sent, tenant_email_sent')
      .gte('created_at', since.toISOString()),
  ])

  if (funnelError) {
    console.error('funnel-overview: funnels query error', funnelError)
    return { funnels: [], monthlyRows: [], failedLast14Days: 0 }
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
      totalViews: (row.total_views as number) ?? 0,
    }
  })

  // --- monthly stats ---
  const companyBySlug = new Map<string, string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (funnelData ?? []).map((row: any) => [row.slug as string, (row.tenants?.company_name as string) ?? row.slug])
  )

  const monthMap = new Map<string, MonthlyRow>()
  type MonthDataRow = { funnel_slug: string; created_at: string; customer_email_sent: boolean; tenant_email_sent: boolean }

  for (const row of (monthData ?? []) as MonthDataRow[]) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const entry = monthMap.get(key) ?? { month: key, leads: 0, submissions: [] }
    entry.leads++
    entry.submissions.push({
      created_at: row.created_at,
      funnel_slug: row.funnel_slug,
      company_name: companyBySlug.get(row.funnel_slug) ?? row.funnel_slug,
      customer_email_sent: row.customer_email_sent ?? false,
      tenant_email_sent: row.tenant_email_sent ?? false,
    })
    monthMap.set(key, entry)
  }
  const monthlyRows: MonthlyRow[] = Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month))

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const failedLast14Days = (monthData ?? []).filter(
    (r) => (r as MonthDataRow).created_at >= fourteenDaysAgo &&
      (!(r as MonthDataRow).customer_email_sent || !(r as MonthDataRow).tenant_email_sent)
  ).length

  return { funnels, monthlyRows, failedLast14Days }
}

export default async function FunnelOverviewPage() {
  const { funnels, monthlyRows, failedLast14Days } = await getAllData()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b-2 border-[#4648d4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900">Funnel-Übersicht</h1>
          <a
            href="/logout"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Power size={14} />
            Logout
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <FunnelGrid funnels={funnels} failedLast14Days={failedLast14Days} />
        <MonthlyStats rows={monthlyRows} />
      </div>
    </div>
  )
}
