import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestEmail } from '@/lib/emails'

// POST /api/tenant/funnels/[slug]/emails/[id]/test
// Body: { recipient?: string }  ← optional, sonst default-Recipient laut Subscription
// Resultat: { ok, error? } — landet seit Aufgabe 57B auch in der Versand-Historie
// (delivery_attempts-Row mit is_test=true, submission_id=NULL).

export const runtime = 'nodejs'

interface TestBody {
  recipient?:            string
  draft_subject?:        string
  draft_body_html?:      string
  draft_recipient_type?: 'customer' | 'tenant' | 'custom'
  draft_recipient_value?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: funnel } = await supabase
    .from('funnels')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!funnel) return NextResponse.json({ error: 'Funnel not found' }, { status: 404 })

  const { data: sub } = await supabase
    .from('email_subscriptions')
    .select('id')
    .eq('id', id)
    .eq('funnel_id', funnel.id)
    .maybeSingle()
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  let body: TestBody = {}
  try {
    body = (await req.json()) as TestBody
  } catch {
    // empty body → use defaults
  }

  let override: string | null = null
  if (body.recipient && typeof body.recipient === 'string') {
    const candidate = body.recipient.trim()
    if (!EMAIL_RE.test(candidate)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 })
    }
    override = candidate
  }

  const draftRecipientType =
    body.draft_recipient_type === 'customer' || body.draft_recipient_type === 'tenant' || body.draft_recipient_type === 'custom'
      ? body.draft_recipient_type
      : undefined

  const result = await sendTestEmail(sub.id, {
    customRecipient:     override,
    draftSubject:        typeof body.draft_subject === 'string'   ? body.draft_subject   : undefined,
    draftBodyHtml:       typeof body.draft_body_html === 'string' ? body.draft_body_html : undefined,
    draftRecipientType:  draftRecipientType,
    draftRecipientValue: typeof body.draft_recipient_value === 'string' ? body.draft_recipient_value : undefined,
  })
  return NextResponse.json(result)
}
