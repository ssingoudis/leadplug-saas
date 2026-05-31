import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Power } from 'lucide-react'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Admin-Client bypasses RLS — verlässlicher als RLS-Client für Tenant-Lookup
  // (Single-Tenant-pro-User-Annahme heute; Multi-Tenant-UI kommt in Phase E)
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('tenant_members')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  let tenant: { id: string; company_name: string | null } | null = null
  if (membership?.tenant_id) {
    const { data: tenantData } = await admin
      .from('tenants')
      .select('id, company_name')
      .eq('id', membership.tenant_id)
      .maybeSingle()
    tenant = tenantData ?? null
  }

  if (!tenant) {
    if (user.email) {
      // Auto-Tenant-Anlage beim ersten Login
      // (RLS würde blockieren — User hat noch keine Membership)
      const { data: inserted, error: insertError } = await admin
        .from('tenants')
        .insert({
          company_name: user.email.split('@')[0],
          billing_model: 'free',
          is_active: true,
        })
        .select('id, company_name')
        .single()

      if (insertError || !inserted) {
        console.error('[dashboard/layout] tenant insert failed:', insertError)
      } else {
        const { error: memberError } = await admin.from('tenant_members').insert({
          tenant_id: inserted.id,
          auth_user_id: user.id,
          role: 'owner',
        })
        if (memberError) {
          console.error('[dashboard/layout] tenant_members owner insert failed:', memberError)
        }
        tenant = inserted
        redirect('/dashboard')
      }
    }

    return (
      <div
        className="min-h-screen bg-gray-100 dark:bg-background flex items-center justify-center p-4"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">Kein Zugang konfiguriert</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Bitte kontaktiere den Support.</p>
          <a
            href="/logout"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <Power size={14} />
            Ausloggen
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <DashboardShell
        userName={tenant.company_name || user.email || ''}
        userEmail={user.email ?? ''}
      >
        {children}
      </DashboardShell>
    </div>
  )
}
