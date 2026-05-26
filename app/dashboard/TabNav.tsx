'use client'

import { usePathname } from 'next/navigation'

export const TABS = [
  { label: 'Dashboard',     href: '/dashboard' },
  { label: 'Meine Funnels', href: '/dashboard/funnels' },
  { label: 'Leads',         href: '/dashboard/leads' },
  { label: 'Kontakte',      href: '/dashboard/kontakte' },
  { label: 'Statistiken',   href: '/dashboard/statistiken' },
  { label: 'Einbinden',     href: '/dashboard/embed' },
  { label: 'Billing',       href: '/dashboard/billing' },
]

function guardedClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guard = (window as any).__editorGuard as ((href: string) => void) | null | undefined;
  if (guard) {
    e.preventDefault();
    guard(href);
  }
}

export default function TabNav() {
  const pathname = usePathname()

  // Nur Desktop: Tabs als Pills. Mobile zeigt den Page-Title im Header bewusst nicht —
  // der aktive Eintrag wird im Hamburger-Menü visuell markiert (siehe DashboardHeader).
  return (
    <div className="hidden lg:flex items-center gap-1 py-3">
      {TABS.map((tab) => {
        const active =
          tab.href === '/dashboard/funnels'
            ? pathname.startsWith('/dashboard/funnels')
            : pathname === tab.href
        return (
          <a
            key={tab.href}
            href={tab.href}
            onClick={(e) => guardedClick(e, tab.href)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              active
                ? 'font-semibold text-primary bg-primary/10'
                : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </a>
        )
      })}
    </div>
  )
}
