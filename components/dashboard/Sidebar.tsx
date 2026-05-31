'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Zap, Menu, X, Settings, Power, ChevronLeft, ChevronRight, Moon, Sun, MoreHorizontal } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { NAV_ITEMS, isNavItemActive } from './navItems'

// Aufgabe 44 — App-Navigation als linke Side-Nav (Desktop) + Top-Bar/Drawer (Mobile).
// `forceCollapsed` (Editor-Modus): schmale Icon-Leiste, fixiert links, kein Toggle — die Nav
// bleibt als Anker stehen (VS-Code-Muster), der Editor sitzt rechts daneben.
//
// Navigation via next/link (Client-Nav) → die Sidebar bleibt über Seitenwechsel gemountet,
// der Collapse-Zustand flackert nicht mehr (kein Remount pro Klick).

const COLLAPSE_KEY = 'lp_sidenav_collapsed'

function guardedClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guard = (window as any).__editorGuard as ((href: string) => void) | null | undefined
  if (guard) {
    e.preventDefault()
    guard(href)
  }
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || ''
}

// ─────────────────────────────── Desktop-Rail ───────────────────────────────

export function Sidebar({
  userName,
  userEmail,
  forceCollapsed = false,
}: {
  userName?: string
  userEmail?: string
  forceCollapsed?: boolean
}) {
  const pathname = usePathname()
  const [storedCollapsed, setStoredCollapsed] = useState(false)

  useEffect(() => {
    try {
      setStoredCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  const collapsed = forceCollapsed || storedCollapsed

  function toggleCollapsed() {
    setStoredCollapsed((c) => {
      const next = !c
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const positionClass = forceCollapsed
    ? 'fixed left-0 top-0 h-screen w-16 z-30'
    : `sticky top-0 h-screen ${collapsed ? 'w-16' : 'w-60'}`

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-[width] duration-200 ${positionClass}`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 shrink-0 ${collapsed ? 'justify-center' : 'px-4'}`}>
        <Link
          href="/dashboard"
          onClick={(e) => guardedClick(e, '/dashboard')}
          className="flex items-center gap-2 min-w-0"
          aria-label="LeadPlug Dashboard"
        >
          <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-primary text-white shadow-sm">
            <Zap size={16} fill="currentColor" />
          </span>
          {!collapsed && (
            <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">
              LeadPlug
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isNavItemActive(item.href, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => guardedClick(e, item.href)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                active
                  ? 'font-semibold text-primary bg-primary/10'
                  : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={17} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse-Toggle (nur außerhalb des Editors) */}
      {!forceCollapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Navigation ausklappen' : 'Navigation einklappen'}
          title={collapsed ? 'Ausklappen' : 'Einklappen'}
          className={`mx-2 mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Einklappen</span></>}
        </button>
      )}

      {/* Footer: sichtbare Theme-Zeile + User-Menü */}
      <SidebarFooter userName={userName} userEmail={userEmail} collapsed={collapsed} />
    </aside>
  )
}

// ─────────────────────────── Theme + User-Footer ───────────────────────────

function SidebarFooter({
  userName,
  userEmail,
  collapsed,
}: {
  userName?: string
  userEmail?: string
  collapsed: boolean
}) {
  const [dark, setDark] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Theme beim Mount anwenden (Desktop-Rolle des früheren ThemeToggle) + Zustand fürs Label.
  useEffect(() => {
    let initial: boolean
    try {
      const stored = localStorage.getItem('theme')
      initial = stored === 'dark' ? true : stored === 'light' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      initial = false
    }
    document.documentElement.classList.toggle('dark', initial)
    setDark(initial)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }

  const initials = userName ? initialsOf(userName) : ''

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 p-2 flex flex-col gap-1">
      {/* Theme — sichtbare, beschriftete Zeile mit Switch */}
      <button
        type="button"
        onClick={toggleTheme}
        title={collapsed ? (dark ? 'Heller Modus' : 'Dunkler Modus') : undefined}
        aria-label={dark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
        {!collapsed && <span className="flex-1 text-left">{dark ? 'Heller Modus' : 'Dunkler Modus'}</span>}
      </button>

      {/* User-Menü */}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={collapsed ? userName || 'Konto' : undefined}
          className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="flex items-center justify-center w-7 h-7 shrink-0 rounded-md bg-primary/10 text-primary text-xs font-bold">
            {initials || <Settings size={14} />}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                  {userName || 'Konto'}
                </span>
                {userEmail && (
                  <span className="block truncate text-xs text-gray-400 dark:text-gray-500">{userEmail}</span>
                )}
              </span>
              <MoreHorizontal size={16} className="shrink-0 text-gray-400" />
            </>
          )}
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={`absolute z-50 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden ${
              collapsed ? 'bottom-2 left-full ml-2' : 'bottom-full left-2 right-2 mb-2'
            }`}
          >
            <Link
              href="/dashboard/account"
              onClick={(e) => { guardedClick(e, '/dashboard/account'); setMenuOpen(false) }}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings size={15} className="text-gray-400" />
              Account-Einstellungen
            </Link>
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <a
              href="/logout"
              onClick={(e) => guardedClick(e, '/logout')}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Power size={15} />
              Abmelden
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────── Mobile-Nav ───────────────────────────────

export function MobileNav({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" onClick={(e) => guardedClick(e, '/dashboard')} className="flex items-center gap-2" aria-label="LeadPlug">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white shadow-sm">
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">LeadPlug</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 top-14 z-20 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-full z-30 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-1 shadow-lg">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isNavItemActive(item.href, pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => { guardedClick(e, item.href); setOpen(false) }}
                  className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                    active
                      ? 'font-semibold text-primary bg-primary/10'
                      : 'font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              )
            })}
            <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
            <Link
              href="/dashboard/account"
              onClick={(e) => { guardedClick(e, '/dashboard/account'); setOpen(false) }}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                pathname === '/dashboard/account'
                  ? 'font-semibold text-primary bg-primary/10'
                  : 'font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Settings size={15} />
              {userName ? `Account · ${userName}` : 'Account'}
            </Link>
            <div className="mx-6 border-t border-gray-100 dark:border-gray-800" />
            <a
              href="/logout"
              onClick={(e) => { guardedClick(e, '/logout'); setOpen(false) }}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Power size={15} />
              Abmelden
            </a>
          </div>
        </>
      )}
    </div>
  )
}
