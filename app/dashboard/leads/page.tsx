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
      .select('id, created_at, contact, answers, customer_email_sent, tenant_email_sent, funnel_slug')
      .order('created_at', { ascending: false }),
    supabase
      .from('funnel_questions')
      .select('funnel_id, question_key, title, options'),
    supabase
      .from('funnels')
      .select('id, slug, funnel_name')
      .eq('is_active', true),
  ])

  const funnelNameMap: Record<string, string> = {}
  const funnelSlugById = new Map<string, string>()
  for (const f of (funnelRows ?? []) as { id: string; slug: string; funnel_name: string | null }[]) {
    funnelNameMap[f.slug] = f.funnel_name ?? f.slug
    funnelSlugById.set(f.id, f.slug)
  }

  // Questions per Funnel-Slug indexieren (über funnel_id → slug)
  const questionsByFunnel = new Map<string, TenantSubmission['questions']>()
  for (const q of (questionRows ?? []) as { funnel_id: string; question_key: string; title: string; options: unknown }[]) {
    const slug = funnelSlugById.get(q.funnel_id)
    if (!slug) continue
    const list = questionsByFunnel.get(slug) ?? []
    list.push({
      question_key: q.question_key,
      title: q.title,
      options: Array.isArray(q.options) ? q.options as { value: string; label: string }[] : [],
    })
    questionsByFunnel.set(slug, list)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched: TenantSubmission[] = ((submissions ?? []) as any[]).map((s) => {
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
