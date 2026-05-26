import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Power } from 'lucide-react'
import DashboardHeader from './DashboardHeader'

function emailToSlug(email: string): string {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40)
}


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Admin-Client bypasses RLS — verlässlicher als RLS-Client für Tenant-Lookup
  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, company_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!tenant) {
    if (user.email) {
      const { error: insertError } = await admin.from('tenants').insert({
        slug: await (async () => {
          const base = emailToSlug(user.email!)
          let slug = base
          for (let i = 2; i <= 99; i++) {
            const { data } = await admin.from('tenants').select('slug').eq('slug', slug).maybeSingle()
            if (!data) break
            slug = `${base}-${i}`
          }
          return slug
        })(),
        company_name: user.email.split('@')[0],
        notification_email: user.email,
        public_email: user.email,
        auth_user_id: user.id,
        billing_model: 'free',
        is_active: true,
      })
      if (insertError) console.error('[dashboard/layout] tenant insert failed:', insertError)
      if (!insertError) redirect('/dashboard')
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
    <div className="min-h-screen bg-gray-100 dark:bg-background" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <DashboardHeader
        userName={tenant.company_name ?? user.email ?? ''}
        userEmail={user.email ?? ''}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {children}
      </div>
    </div>
  )
}