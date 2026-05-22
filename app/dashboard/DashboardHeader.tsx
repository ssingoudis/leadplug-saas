'use client'

import { useState } from 'react'
import { Settings, Power, Menu, X, LayoutDashboard, BarChart2, Code2, Layers, Inbox, Users } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import TabNav, { TABS } from './TabNav'

const TAB_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  '/dashboard':             LayoutDashboard,
  '/dashboard/funnels':     Layers,
  '/dashboard/leads':       Inbox,
  '/dashboard/kontakte':    Users,
  '/dashboard/statistiken': BarChart2,
  '/dashboard/embed':       Code2,
}

function guardedClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guard = (window as any).__editorGuard as ((href: string) => void) | null | undefined;
  if (guard) {
    e.preventDefault();
    guard(href);
  }
}

export default function DashboardHeader() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b-2 border-primary">
      <div className="px-4 sm:px-8 py-0 flex items-stretch gap-0">
        {/* Tabs */}
        <TabNav />

        {/* Desktop actions */}
        <div className="ml-auto hidden lg:flex items-center gap-2 py-3">
          <ThemeToggle />
          <a
            href="/dashboard/account"
            onClick={(e) => guardedClick(e, '/dashboard/account')}
            title="Account"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={16} />
          </a>
          <a
            href="/logout"
            onClick={(e) => guardedClick(e, '/logout')}
            title="Logout"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors"
          >
            <Power size={16} />
          </a>
        </div>

        {/* Mobile: ThemeToggle + Hamburger */}
        <div className="ml-auto flex lg:hidden items-center gap-2 py-3">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menü öffnen"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-1">
          {/* Navigation */}
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.href]
            return (
              <a
                key={tab.href}
                href={tab.href}
                onClick={(e) => { guardedClick(e, tab.href); setOpen(false); }}
                className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {Icon && <Icon size={15} />}
                {tab.label}
              </a>
            )
          })}
          <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
          <a
            href="/dashboard/account"
            onClick={(e) => { guardedClick(e, '/dashboard/account'); setOpen(false); }}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={15} />
            Account
          </a>
          <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
          <a
            href="/logout"
            onClick={(e) => { guardedClick(e, '/logout'); setOpen(false); }}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Power size={15} />
            Logout
          </a>
        </div>
      )}
    </div>
  )
}
