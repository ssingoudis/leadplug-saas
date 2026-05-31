'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, MobileNav } from './Sidebar'

// Aufgabe 44 — schaltet zwischen zwei Modi:
//  • Verwaltungs-Modus (alle /dashboard/*-Seiten): linke Side-Nav (voll) + Content.
//  • Bau-Modus (Funnel-Editor): schmale Icon-Leiste bleibt als Anker (VS-Code-Muster),
//    der `fixed`-Editor (EditorShellV2) liegt per `lg:left-16` rechts daneben. KEIN
//    Vollbild-Takeover mehr — die Nav verschwindet nicht.

function isEditorRoute(pathname: string): boolean {
  return pathname.endsWith('/edit') || pathname === '/dashboard/funnels/new'
}

export default function DashboardShell({
  userName,
  userEmail,
  children,
}: {
  userName?: string
  userEmail?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (isEditorRoute(pathname)) {
    return (
      <>
        <Sidebar userName={userName} userEmail={userEmail} forceCollapsed />
        {children}
      </>
    )
  }

  return (
    <div className="lg:flex min-h-screen bg-gray-100 dark:bg-background">
      <Sidebar userName={userName} userEmail={userEmail} />
      <div className="flex-1 min-w-0">
        <MobileNav userName={userName} />
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
