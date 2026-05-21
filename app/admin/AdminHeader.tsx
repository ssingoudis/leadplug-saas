'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, Power, Menu, X, LayoutDashboard, Users } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'

const TABS = [
  { label: 'Funnels', href: '/admin',       icon: LayoutDashboard },
  { label: 'Leads',   href: '/admin/leads', icon: Users },
]

export default function AdminHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const activeTab = TABS.find((tab) => pathname === tab.href)

  return (
    <div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b-2 border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-0 flex items-stretch gap-0">
        {/* Desktop: alle Tabs */}
        {TABS.map((tab) => {
          const active = pathname === tab.href
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
        {/* Mobile: nur aktiver Tab */}
        {activeTab && (
          <span className="sm:hidden flex items-center px-4 py-4 text-sm font-semibold text-primary border-b-2 border-primary -mb-0.5">
            {activeTab.label}
          </span>
        )}

        {/* Desktop actions */}
        <div className="ml-auto hidden sm:flex items-center gap-2 py-3">
          <ThemeToggle />
          <a
            href="/admin/new"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            <Plus size={14} />
            Neuer Kunde
          </a>
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors"
          >
            <LayoutDashboard size={14} />
            Mein Dashboard
          </a>
          <a
            href="/logout"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors"
          >
            <Power size={14} />
            Logout
          </a>
        </div>

        {/* Mobile: ThemeToggle + Hamburger */}
        <div className="ml-auto flex sm:hidden items-center gap-2 py-3">
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
        <div className="sm:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-1">
          {/* Navigation */}
          {TABS.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <tab.icon size={15} />
              {tab.label}
            </a>
          ))}
          <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
          <a
            href="/admin/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus size={15} />
            Neuer Kunde
          </a>
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <LayoutDashboard size={15} />
            Mein Dashboard
          </a>
          <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
          <a
            href="/logout"
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
