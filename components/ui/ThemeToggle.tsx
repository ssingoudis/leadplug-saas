'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

// Liest gespeicherten Modus. "system" und Legacy-Werte werden als nicht-explizit behandelt.
function getStoredDark(): boolean | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('theme')
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return null
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = getStoredDark()
    const initial =
      stored !== null
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', initial)
    setDark(initial)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      title={dark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
