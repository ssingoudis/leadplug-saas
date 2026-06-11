'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, MobileNav } from './Sidebar'

// Aufgabe 44 — schaltet zwischen zwei Modi:
//  • Verwaltungs-Modus (alle /dashboard/*-Seiten): linke Side-Nav (voll) + Content.
//  • Bau-Modus (Funnel-Editor): schmale Icon-Leiste bleibt als Anker (VS-Code-Muster),
//    der `fixed`-Editor (EditorShell) liegt per `lg:left-16` rechts daneben. KEIN
//    Vollbild-Takeover mehr — die Nav verschwindet nicht.

function isEditorRoute(pathname: string): boolean {
  return pathname.endsWith('/edit') || pathname === '/dashboard/funnels/new'
}

export default function DashboardShell({
  userName,
  userEmail,
  isSuperadmin = false,
  children,
}: {
  userName?: string
  userEmail?: string
  isSuperadmin?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (isEditorRoute(pathname)) {
    return (
      <>
        <Sidebar userName={userName} userEmail={userEmail} isSuperadmin={isSuperadmin} forceCollapsed />
        {/* Aufgabe 60: unter lg ist die Icon-Sidebar versteckt — ohne MobileNav hätte der
            Editor dort gar keine Navigation. MobileNav ist selbst lg:hidden (Desktop
            unverändert) und nutzt guardedClick → Ungespeichert-Dialog greift. */}
        <MobileNav userName={userName} isSuperadmin={isSuperadmin} />
        {children}
      </>
    )
  }

  return (
    <div className="lg:flex min-h-screen bg-gray-100 dark:bg-background">
      <Sidebar userName={userName} userEmail={userEmail} isSuperadmin={isSuperadmin} />
      <div className="flex-1 min-w-0">
        <MobileNav userName={userName} isSuperadmin={isSuperadmin} />
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
