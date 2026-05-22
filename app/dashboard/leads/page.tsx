import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import TenantLeadsTable, { type TenantSubmission, type FunnelOption } from '@/app/dashboard/TenantLeadsTable'

async function getLeadsData(): Promise<{ submissions: TenantSubmission[]; funnels: FunnelOption[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: submissions },
    { data: questionRows },
    { data: funnelRows },
  ] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, created_at, contact_name, contact_email, contact_phone, contact_anrede, contact, answers, customer_email_sent, tenant_email_sent, funnel_slug')
      .order('created_at', { ascending: false }),
    supabase
      .from('funnel_questions')
      .select('funnel_slug, question_key, title, options'),
    supabase
      .from('funnels')
      .select('slug, funnel_name')
      .eq('is_active', true),
  ])

  const funnelNameMap: Record<string, string> = {}
  for (const f of (funnelRows ?? []) as { slug: string; funnel_name: string | null }[]) {
    funnelNameMap[f.slug] = f.funnel_name ?? f.slug
  }

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched: TenantSubmission[] = ((submissions ?? []) as any[]).map((s) => ({
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
    funnel_slug: s.funnel_slug as string,
    funnel_name: funnelNameMap[s.funnel_slug as string] ?? (s.funnel_slug as string),
    questions: questionsByFunnel.get(s.funnel_slug as string) ?? [],
  }))

  const funnels: FunnelOption[] = (funnelRows ?? []).map(
    (f) => ({ slug: (f as { slug: string }).slug, name: funnelNameMap[(f as { slug: string }).slug] ?? (f as { slug: string }).slug })
  )

  return { submissions: enriched, funnels }
}

export default async function LeadsPage() {
  const { submissions, funnels } = await getLeadsData()

  return (
    <div className="space-y-6">
      {submissions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Noch keine Leads eingegangen.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <TenantLeadsTable submissions={submissions} funnels={funnels} />
        </Card>
      )}
    </div>
  )
}
