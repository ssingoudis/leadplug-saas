import { createClient } from '@supabase/supabase-js'
import LeadsView from './LeadsView'
import AdminHeader from '../AdminHeader'

export type QuestionMeta = {
  question_key: string
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: Array<{ value: string; label: string }> | any[]
}

export type SubmissionRow = {
  id: string
  created_at: string
  funnel_slug: string
  tenant_slug: string
  company_name: string
  contact_anrede: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact: Record<string, string> | null
  answers: Record<string, string> | null
  customer_email_sent: boolean
  tenant_email_sent: boolean
  questions: QuestionMeta[]
}

export type TenantOption = { slug: string; name: string }

async function getData(): Promise<{ submissions: SubmissionRow[]; tenants: TenantOption[] }> {
  const supabaseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !key) return { submissions: [], tenants: [] }

  const supabase = createClient(supabaseUrl, key)

  const [{ data: funnelData }, { data: subData }] = await Promise.all([
    supabase
      .from('funnels')
      .select('slug, tenant_slug, tenants ( company_name ), funnel_questions ( question_key, title, options )'),
    supabase
      .from('submissions')
      .select('id, created_at, funnel_slug, tenant_slug, contact_anrede, contact_name, contact_email, contact_phone, contact, answers, customer_email_sent, tenant_email_sent')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnelMeta = new Map<string, { company_name: string; questions: QuestionMeta[] }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const f of (funnelData ?? []) as any[]) {
    funnelMeta.set(f.slug as string, {
      company_name: (f.tenants?.company_name as string) ?? (f.slug as string),
      questions: (f.funnel_questions as QuestionMeta[]) ?? [],
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissions: SubmissionRow[] = ((subData ?? []) as any[]).map((s) => {
    const meta = funnelMeta.get(s.funnel_slug as string) ?? { company_name: s.tenant_slug as string, questions: [] }
    return {
      id: s.id as string,
      created_at: s.created_at as string,
      funnel_slug: s.funnel_slug as string,
      tenant_slug: s.tenant_slug as string,
      company_name: meta.company_name,
      contact_anrede: s.contact_anrede as string | null,
      contact_name: s.contact_name as string | null,
      contact_email: s.contact_email as string | null,
      contact_phone: s.contact_phone as string | null,
      contact: s.contact as Record<string, string> | null,
      answers: s.answers as Record<string, string> | null,
      customer_email_sent: (s.customer_email_sent as boolean) ?? false,
      tenant_email_sent: (s.tenant_email_sent as boolean) ?? false,
      questions: meta.questions,
    }
  })

  const tenantMap = new Map<string, string>()
  for (const s of submissions) {
    if (!tenantMap.has(s.tenant_slug)) tenantMap.set(s.tenant_slug, s.company_name)
  }
  const tenants: TenantOption[] = Array.from(tenantMap.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { submissions, tenants }
}

export default async function LeadsPage() {
  const { submissions, tenants } = await getData()

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <LeadsView submissions={submissions} tenants={tenants} />
      </div>
    </div>
  )
}
