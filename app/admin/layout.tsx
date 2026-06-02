import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/auth/superadmin'

// Superadmin-Gate für den gesamten /admin-Bereich. notFound() (404) statt redirect —
// verrät die Existenz des Bereichs nicht. Service-Key-Reads (lib/admin/queries.ts) laufen
// ausschließlich in den Kind-Seiten, also IMMER hinter diesem Gate.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isSuperadmin(user?.email)) notFound()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <ShieldCheck size={16} />
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-white">Plattform-Admin</span>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft size={15} /> Zurück zum Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  )
}
