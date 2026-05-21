'use client'

import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export const TABS = [
  { label: 'Dashboard',     href: '/dashboard' },
  { label: 'Meine Funnels', href: '/dashboard/funnels' },
  { label: 'Statistiken',   href: '/dashboard/statistiken' },
  { label: 'Embed-Code',    href: '/dashboard/embed' },
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

  // Account-Seite: Breadcrumb zurück zum Dashboard
  if (pathname === '/dashboard/account') {
    return (
      <div className="flex items-center gap-2 py-4">
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          Dashboard
        </a>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Account</span>
      </div>
    )
  }

  // Normale Seiten: Tab-Leiste
  const activeTab = TABS.find((tab) =>
    tab.href === '/dashboard/funnels'
      ? pathname.startsWith('/dashboard/funnels')
      : pathname === tab.href,
  )

  return (
    <>
      {/* Desktop: alle Tabs */}
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
            className={`hidden sm:flex items-center px-4 py-4 text-sm border-b-2 -mb-0.5 transition-colors ${
              active
                ? 'font-semibold text-primary border-primary'
                : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent'
            }`}
          >
            {tab.label}
          </a>
        )
      })}
      {/* Mobile: nur aktiver Tab als Seitenname */}
      {activeTab && (
        <span className="sm:hidden flex items-center px-4 py-4 text-sm font-semibold text-primary border-b-2 border-primary -mb-0.5">
          {activeTab.label}
        </span>
      )}
    </>
  )
}
