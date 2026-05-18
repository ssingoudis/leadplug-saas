import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Power } from 'lucide-react'
import TabNav from './TabNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('company_name')
    .maybeSingle()

  if (!tenant) {
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
          <span className="flex items-center px-4 py-4 text-sm font-bold text-gray-900 border-r border-gray-100 mr-2">
            {tenant.company_name}
          </span>
          <TabNav />
          <div className="ml-auto flex items-center py-3">
            <a
              href="/logout"
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
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
