'use client'

import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Dashboard',   href: '/dashboard' },
  { label: 'Statistiken', href: '/dashboard/statistiken' },
  { label: 'Embed-Code',  href: '/dashboard/embed' },
]

export default function TabNav() {
  const pathname = usePathname()

  return (
    <>
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={`flex items-center px-4 py-4 text-sm border-b-2 -mb-[2px] transition-colors ${
              active
                ? 'font-semibold text-[#4648d4] border-[#4648d4]'
                : 'font-medium text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            {tab.label}
          </a>
        )
      })}
    </>
  )
}
