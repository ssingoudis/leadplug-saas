import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * Löscht den Account des eingeloggten Users unwiderruflich:
 *  - alle Submissions der Tenants, in denen er OWNER ist (FK ist SET NULL → manuell löschen)
 *  - die Tenants selbst (cascadet funnels/pages/fields/webhooks/emails/members/view_logs)
 *  - den Auth-User (kein erneuter Login möglich)
 * Owner-Prüfung läuft über die RLS-gefilterten tenant_members des Users.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)

  const ownerTenantIds = (memberships ?? [])
    .filter((m) => m.role === 'owner')
    .map((m) => m.tenant_id as string)

  const admin = createAdminClient()

  try {
    if (ownerTenantIds.length > 0) {
      // Submissions zuerst (FK ON DELETE SET NULL → würden sonst verwaisen statt gelöscht).
      const { error: sErr } = await admin.from('submissions').delete().in('tenant_id', ownerTenantIds)
      if (sErr) throw sErr
      // Tenant löschen → Cascade räumt funnels/pages/fields/webhooks/emails/members/view_logs.
      const { error: tErr } = await admin.from('tenants').delete().in('id', ownerTenantIds)
      if (tErr) throw tErr
    }
    // Auth-User entfernen → Account ist endgültig weg.
    const { error: uErr } = await admin.auth.admin.deleteUser(user.id)
    if (uErr) throw uErr
  } catch (e) {
    console.error('[account delete]', e)
    return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 })
  }

  // Session-Cookies löschen (User existiert nicht mehr).
  await supabase.auth.signOut().catch(() => {})

  return NextResponse.json({ ok: true })
}
