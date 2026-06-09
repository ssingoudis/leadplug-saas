'use client'

import { useEffect } from 'react'

// Allerletzter Fallback: greift NUR, wenn das Root-Layout selbst abstürzt. Dann ist
// globals.css unter Umständen nicht geladen — deshalb hier bewusst Inline-Styles statt
// Tailwind-Tokens (einzige erlaubte Ausnahme zur "kein Hardcode"-Designregel).
// Farben entsprechen den Design-Tokens: #4648d4 = primary, #f3f4f6 = background.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/global-error]', error)
  }, [error])

  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f3f4f6', color: '#111827' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 32, maxWidth: 420, width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Da ist etwas schiefgelaufen</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
              Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
            </p>
            <button
              onClick={reset}
              style={{ cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4648d4', color: '#ffffff' }}
            >
              Seite neu laden
            </button>
            {error.digest && (
              <p style={{ marginTop: 24, fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>
                Fehler-Code: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
