import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperadmin } from '@/lib/auth/superadmin'

export const runtime = 'nodejs'

// Admin-Aktionen auf einen Workspace (Tenant). Ausschließlich Superadmin.
// 404 statt 403, damit die Existenz des Endpoints nicht verraten wird.

const ALLOWED_BILLING = ['free', 'per_month', 'per_year', 'per_lead']

async function gate(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isSuperadmin(user?.email)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await gate())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { id } = await params

  let body: { is_active?: unknown; billing_model?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active
  if (typeof body.billing_model === 'string') {
    if (!ALLOWED_BILLING.includes(body.billing_model)) {
      return NextResponse.json({ error: 'Invalid billing_model' }, { status: 400 })
    }
    update.billing_model = body.billing_model
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('tenants').update(update).eq('id', id)
  if (error) {
    console.error('[admin workspaces PATCH]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await gate())) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { id } = await params

  const admin = createAdminClient()
  try {
    // Submissions zuerst (FK ON DELETE SET NULL → würden sonst verwaisen statt gelöscht).
    const { error: sErr } = await admin.from('submissions').delete().eq('tenant_id', id)
    if (sErr) throw sErr
    // Tenant → Cascade räumt funnels/pages/fields/webhooks/emails/members/view_logs.
    const { error: tErr } = await admin.from('tenants').delete().eq('id', id)
    if (tErr) throw tErr
  } catch (e) {
    console.error('[admin workspaces DELETE]', e)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
