'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, Power, ChevronDown, User as UserIcon } from 'lucide-react'

interface Props {
  /** Anzeigename (z.B. tenant.company_name oder E-Mail). Fällt auf User-Icon zurück wenn leer. */
  userName?: string
  /** Optionaler E-Mail / Sekundärtext unter dem Namen im Dropdown. */
  userEmail?: string
}

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

export default function UserMenu({ userName, userEmail }: Props) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = userName ? initialsOf(userName) : ''

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 160)
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open])

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Konto-Menü"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold">
          {initials || <UserIcon size={14} />}
        </span>
        <ChevronDown size={13} className="text-gray-400 dark:text-gray-500" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50"
        >
          {(userName || userEmail) && (
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              {userName && (
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
              )}
              {userEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {userEmail}
                </p>
              )}
            </div>
          )}

          <a
            href="/dashboard/account"
            onClick={(e) => guardedClick(e, '/dashboard/account')}
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={14} className="text-gray-400" />
            Account-Einstellungen
          </a>
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <a
            href="/logout"
            onClick={(e) => guardedClick(e, '/logout')}
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Power size={14} />
            Abmelden
          </a>
        </div>
      )}
    </div>
  )
}
