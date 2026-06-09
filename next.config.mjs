/** @type {import('next').NextConfig} */
const nextConfig = {
  // KEIN turbopack.root setzen: `import.meta.dirname` ist beim internen Config-Load
  // von Next nicht zuverlässig verfügbar (undefined → kaputter Root → Dev-Server-
  // Restart-Schleife, Vorfall 2026-06-10). Das "inferred workspace root"-Warning
  // kam von einem verirrten C:\Programmieren\package-lock.json — das ist gelöscht.
  images: {
    unoptimized: true,
  },
  async headers() {
    // Aufgabe 54 — Clickjacking-Schutz: Vorher galt frame-ancestors * für ALLE
    // Pfade (auch /dashboard, /login, /admin) — das eingeloggte Dashboard war in
    // fremde Seiten einbettbar. Jetzt: Widget-Default bleibt einbettbar (Regel 1,
    // identisch zum bisherigen Embed-Verhalten), die App-Bereiche überschreiben
    // das danach explizit (Next wendet Header-Regeln in Reihenfolge an; gleiche
    // Keys werden von späteren Matches überschrieben). Das ungültige
    // X-Frame-Options: ALLOWALL ist entfernt — frame-ancestors regelt das Framing.
    const denyFraming = [
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'X-Frame-Options', value: 'DENY' },
    ]
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
      { source: '/', headers: denyFraming },
      { source: '/dashboard/:path*', headers: denyFraming },
      { source: '/admin/:path*', headers: denyFraming },
      { source: '/login', headers: denyFraming },
      { source: '/signup', headers: denyFraming },
      { source: '/auth/:path*', headers: denyFraming },
    ]
  },
}

export default nextConfig
