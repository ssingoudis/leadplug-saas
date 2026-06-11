import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/auth/superadmin'

// Superadmin-Gate für den gesamten Admin-Bereich. notFound() (404) statt redirect —
// verrät die Existenz des Bereichs nicht. Service-Key-Reads (lib/admin/queries.ts) laufen
// ausschließlich in den Kind-Seiten, also IMMER hinter diesem Gate.
//
// Aufgabe 60: von /admin nach /dashboard/admin gezogen (Stavros-Wunsch — „das ist ja mein
// Admin-Account"). Der Bereich lebt jetzt im normalen DashboardShell und erbt Sidebar,
// MobileNav, Container und Responsive-Standards; der eigene Standalone-Header entfällt,
// übrig bleibt eine Seiten-Überschrift im Stil der anderen Dashboard-Seiten.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isSuperadmin(user?.email)) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <ShieldCheck size={16} />
        </span>
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Plattform-Admin</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Alle Workspaces der Plattform — nur für dich sichtbar.</p>
        </div>
      </div>
      {children}
    </div>
  )
}
