'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TriangleAlert, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'

// Fehler-Boundary für alle Routen unterhalb des Root-Layouts (Dashboard, Funnel-Seite, …).
// Greift, wenn eine Server- oder Client-Komponente unerwartet wirft. Muss eine Client-
// Komponente sein (Next.js-Vorgabe) und bekommt `reset()` zum erneuten Rendern.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Für die spätere Diagnose festhalten. In Produktion versteckt Next.js die echte
    // Fehlermeldung und liefert nur `digest` — den zeigen wir dem User als Support-Code.
    console.error('[app/error]', error)
  }, [error])

  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-background flex items-center justify-center p-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert size={22} />
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Da ist etwas schiefgelaufen
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ein unerwarteter Fehler ist aufgetreten. Versuch es bitte erneut — wenn es
          weiterhin auftritt, melde dich beim Support.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            Erneut versuchen
          </Button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={15} /> Zur Startseite
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-xs text-gray-400 dark:text-gray-500">
            Fehler-Code: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
