'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Settings, Power, Menu, X, LayoutDashboard, BarChart2, Code2, Layers, Inbox, Users, CreditCard, Zap } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import UserMenu from '@/components/ui/UserMenu'
import TabNav, { TABS } from './TabNav'

interface Props {
  userName?: string
  userEmail?: string
}

const TAB_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  '/dashboard':             LayoutDashboard,
  '/dashboard/funnels':     Layers,
  '/dashboard/leads':       Inbox,
  '/dashboard/kontakte':    Users,
  '/dashboard/statistiken': BarChart2,
  '/dashboard/embed':       Code2,
  '/dashboard/billing':     CreditCard,
}

function guardedClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guard = (window as any).__editorGuard as ((href: string) => void) | null | undefined;
  if (guard) {
    e.preventDefault();
    guard(href);
  }
}

export default function DashboardHeader({ userName, userEmail }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Klick außerhalb / ESC schließt das Mobile-Menü.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!mobileMenuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function isActive(href: string): boolean {
    return href === '/dashboard/funnels'
      ? pathname.startsWith('/dashboard/funnels')
      : pathname === href
  }

  return (
    <div ref={mobileMenuRef} className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
      <div className="relative px-4 sm:px-8 flex items-stretch">
        {/* Brand / Logo */}
        <a
          href="/dashboard"
          onClick={(e) => guardedClick(e, '/dashboard')}
          className="flex items-center gap-2 py-3 shrink-0 group relative z-10"
          aria-label="LeadPlug Dashboard"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white shadow-sm group-hover:shadow-md transition-shadow">
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            LeadPlug
          </span>
        </a>

        {/* Tabs — absolut mittig (Desktop), unabhängig von Logo/Action-Breite */}
        <div className="hidden lg:flex absolute inset-x-0 top-0 bottom-0 items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <TabNav />
          </div>
        </div>

        {/* Desktop actions */}
        <div className="ml-auto hidden lg:flex items-center gap-2 py-3 relative z-10">
          <ThemeToggle />
          <UserMenu userName={userName} userEmail={userEmail} />
        </div>

        {/* Mobile: ThemeToggle + Hamburger */}
        <div className="ml-auto flex lg:hidden items-center gap-2 py-3 relative z-10">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
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
            const active = isActive(tab.href)
            return (
              <a
                key={tab.href}
                href={tab.href}
                onClick={(e) => { guardedClick(e, tab.href); setOpen(false); }}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active
                    ? 'font-semibold text-primary bg-primary/10'
                    : 'font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
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
            className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
              pathname === '/dashboard/account'
                ? 'font-semibold text-primary bg-primary/10'
                : 'font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Settings size={15} />
            Account
          </a>
          <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
          <a
            href="/logout"
            onClick={(e) => { guardedClick(e, '/logout'); setOpen(false); }}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Power size={15} />
            Abmelden
          </a>
        </div>
      )}
    </div>
  )
}
