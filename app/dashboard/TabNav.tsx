'use client'

import { usePathname } from 'next/navigation'

export const TABS = [
  { label: 'Dashboard',     href: '/dashboard' },
  { label: 'Meine Funnels', href: '/dashboard/funnels' },
  { label: 'Statistiken',   href: '/dashboard/statistiken' },
  { label: 'Embed-Code',    href: '/dashboard/embed' },
]

export default function TabNav() {
  const pathname = usePathname()
  // Funnels-Tab auch bei Sub-Routen aktiv markieren (new, edit)
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
