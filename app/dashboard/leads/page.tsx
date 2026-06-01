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
    { data: questionPageRows },
    { data: funnelRows },
  ] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, created_at, completed_at, contact, answers, status, notes, funnel_slug')
      .order('created_at', { ascending: false }),
    // Frage-Metadaten: pages mit page_type='question' + ihre Fields (genau 1 pro Page)
    supabase
      .from('pages')
      .select('id, funnel_id')
      .eq('page_type', 'question'),
    supabase
      .from('funnels')
      .select('id, slug, funnel_name')
      .eq('is_active', true),
  ])

  // Frage-Fields nachladen
  const questionPageIds = (questionPageRows ?? []).map((p) => p.id)
  const { data: questionFieldRows } = questionPageIds.length > 0
    ? await supabase
        .from('fields')
        .select('page_id, field_key, label, options')
        .in('page_id', questionPageIds)
    : { data: [] as { page_id: string; field_key: string; label: string; options: unknown }[] }

  const funnelNameMap: Record<string, string> = {}
  const funnelSlugById = new Map<string, string>()
  for (const f of (funnelRows ?? []) as { id: string; slug: string; funnel_name: string | null }[]) {
    funnelNameMap[f.slug] = f.funnel_name ?? f.slug
    funnelSlugById.set(f.id, f.slug)
  }

  // page_id → funnel_id Lookup
  const funnelIdByPageId = new Map<string, string>()
  for (const p of (questionPageRows ?? []) as { id: string; funnel_id: string }[]) {
    funnelIdByPageId.set(p.id, p.funnel_id)
  }

  // Questions per Funnel-Slug indexieren (über page_id → funnel_id → slug)
  const questionsByFunnel = new Map<string, TenantSubmission['questions']>()
  for (const f of (questionFieldRows ?? []) as { page_id: string; field_key: string; title?: string; label: string; options: unknown }[]) {
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

  // Aufgabe 46: Mini-CRM. Bucket-Klassifikation entfällt — eine Liste, neueste oben.
  // Türsteher: nur kontaktierbare Leads (E-Mail oder Telefon vorhanden) landen im CRM,
  // kontaktlose Tracking-Spuren werden ausgeblendet (zählen nur in der Statistik).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched: TenantSubmission[] = ((submissions ?? []) as any[])
    .map((s) => {
      const c = (s.contact ?? {}) as Record<string, string>
      const email = (c.email as string | undefined)?.trim() || null
      const phone = (c.telefon as string | undefined)?.trim() || null
      return {
        id: s.id as string,
        created_at: s.created_at as string,
        completed_at: (s.completed_at as string | null) ?? null,
        status: (s.status as TenantSubmission['status']) ?? 'offen',
        notes: (s.notes as string | null) ?? null,
        contact_name: (c.name as string | undefined) ?? null,
        contact_email: email,
        contact_phone: phone,
        contact_anrede: (c.anrede as string | undefined) ?? null,
        contact: s.contact as Record<string, string> | null,
        answers: s.answers as Record<string, string> | null,
        funnel_slug: s.funnel_slug as string,
        funnel_name: funnelNameMap[s.funnel_slug as string] ?? (s.funnel_slug as string),
        questions: questionsByFunnel.get(s.funnel_slug as string) ?? [],
      }
    })
    .filter((s) => s.contact_email || s.contact_phone)

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
