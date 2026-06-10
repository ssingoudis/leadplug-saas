import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// Globale 404-Seite: wird für unbekannte URLs UND für jeden `notFound()`-Aufruf gezeigt
// (z.B. ungültiger Funnel-Slug, /admin ohne Superadmin-Recht). Bewusst neutral gehalten,
// weil sie sowohl Dashboard-Nutzer als auch anonyme Funnel-Besucher erreichen kann.
export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-background flex items-center justify-center p-4"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <p className="text-5xl font-bold text-primary mb-3">404</p>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Seite nicht gefunden
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Diese Seite gibt es nicht (mehr). Vielleicht wurde sie verschoben oder der
          Link ist veraltet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
        >
          <ArrowLeft size={15} /> Zur Startseite
        </Link>
      </div>
    </div>
  )
}
