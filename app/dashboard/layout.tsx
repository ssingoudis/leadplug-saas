import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Power, Settings } from 'lucide-react'
import TabNav from './TabNav'

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
    .select('id')
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
        className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-base font-semibold text-gray-900 mb-2">Kein Zugang konfiguriert</p>
          <p className="text-sm text-gray-400 mb-6">Bitte kontaktiere den Support.</p>
          <a
            href="/logout"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
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
      <div className="bg-white sticky top-0 z-10 border-b-2 border-[#4648d4]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-0 flex items-stretch gap-0">
          <TabNav />
          <div className="ml-auto flex items-center gap-2 py-3">
            <a
              href="/dashboard/account"
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4648d4] text-white hover:bg-[#3537b0] transition-colors"
            >
              <Settings size={14} />
              Account
            </a>
            <a
              href="/logout"
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-500 bg-white hover:border-[#4648d4] hover:text-[#4648d4] transition-colors"
            >
              <Power size={14} />
              Logout
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        {children}
      </div>
    </div>
  )
}