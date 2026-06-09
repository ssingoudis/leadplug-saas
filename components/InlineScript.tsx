// Offizielles Next.js-16-Pattern (Doku: "Preventing flash before hydration").
// Server rendert type="text/javascript" → das Skript läuft synchron vor dem ersten
// Paint (FOUC-Schutz). Client-Re-Renders rendern type="text/plain" → inert, dadurch
// keine React-19-Dev-Warnung ("Encountered a script tag..."). suppressHydrationWarning
// schluckt den Typ-Unterschied zwischen Server- und Client-Render.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
