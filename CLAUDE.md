# CLAUDE.md – Solar Funnel Widget

> Lies zuerst `context/project-overview.md` vollständig, bevor du irgendetwas implementierst.

---

## Projektkontext

Dies ist ein **exportiertes v0-Projekt** (Next.js + TypeScript + TailwindCSS + shadcn/ui).
Die Basis-Komponente `components/solar-funnel.tsx` ist bereits vorhanden und funktioniert.
**Nicht von Grund auf neu schreiben** – auf dem bestehenden Code aufbauen.

---

## Deine Aufgaben (in dieser Reihenfolge)

### 1. Projekt aufräumen
Lösche alle Dateien und Ordner, die für dieses Projekt nicht benötigt werden.
Behalte: `app/`, `components/`, `lib/`, `public/`, `context/`, Konfigurationsdateien.
Lösche: alles was shadcn/v0-Boilerplate ist und nicht gebraucht wird (prüfen!).

### 2. Ordnerstruktur anlegen
Erstelle die in `context/project-overview.md` (Abschnitt 3) beschriebene Struktur:
- `tenants/` mit `_template.json`, `demo.json`, `musterfirma.json`
- `emails/` mit den 3 React-Email-Templates
- `types/index.ts`
- `lib/getTenantConfig.ts`, `lib/generatePDF.ts`, `lib/sendEmails.ts`, `lib/priceCalculator.ts`, `lib/tracking.ts`

### 3. Dependencies installieren
```bash
npm install resend @react-email/components @react-pdf/renderer @supabase/supabase-js
```

### 4. Typen definieren
Implementiere alle Interfaces aus `context/project-overview.md` (Abschnitt 5) in `types/index.ts`.

### 5. Tenant-System
- JSON-Template und Demo-Config anlegen (Abschnitt 4 der Overview)
- `lib/getTenantConfig.ts` implementieren

### 6. Funnel-Komponente überarbeiten
- `components/solar-funnel.tsx` ist die Basis aus v0
- Alle hardgecodeten Werte (Farben, Fragen, Texte) durch Props ersetzen
- Props kommen aus `TenantConfig` (siehe `types/index.ts`)
- Icons aus dem bestehenden Code beibehalten

### 7. Dynamic Route
- `app/[tenant]/page.tsx` – lädt TenantConfig, rendert Funnel
- `app/[tenant]/layout.tsx` – minimales Layout (kein Header/Footer, für iFrame)
- `next.config.mjs` – iFrame-Header setzen (Abschnitt 11 der Overview)

### 8. Preisrechner
- `lib/priceCalculator.ts` implementieren (Abschnitt 10 der Overview)

### 9. Supabase Tracking
- `lib/tracking.ts` implementieren (Abschnitt 8 der Overview)
- SQL für die Tabelle `submissions` in `context/supabase-schema.sql` speichern

### 10. PDF-Generierung
- `lib/generatePDF.ts` mit `@react-pdf/renderer` (Abschnitt 9 der Overview)

### 11. E-Mail-Templates
- `emails/CustomerConfirmation.tsx` (Mail 1 – an Endkunden, mit PDF)
- `emails/TenantLeadNotification.tsx` (Mail 2 – an Monteur)
- `emails/PlatformTracking.tsx` (Mail 3 – an Platform-Owner)

### 12. E-Mail-Versand
- `lib/sendEmails.ts` – alle 3 Mails via Resend parallel (`Promise.all`)

### 13. API-Route
- `app/api/submit/route.ts` – alles zusammenführen (Abschnitt 7 der Overview)
- Reihenfolge: Config laden → Preis berechnen → **Supabase ZUERST loggen** → PDF → Mails

### 14. Aufräumen
Nach erfolgreicher Implementierung:
- Alle nicht verwendeten Boilerplate-Dateien aus dem v0-Export löschen
- Ungenutzte Imports entfernen
- Sicherstellen dass `npm run build` fehlerfrei durchläuft

---

## Dokumentationspflicht

**Nach jeder abgeschlossenen Aufgabe** (jeder der 14 Schritte oben) musst du `context/current-feature.md` aktualisieren:

1. **Status** auf `In Progress` setzen (am Anfang), auf `Completed` wenn alle 14 Schritte fertig sind
2. **History** – neuen Eintrag am Ende der Liste hinzufügen:

```
- [Aufgabenname] – [Was wurde gemacht] ([betroffene Dateien])
```

Beispiele:
```
- Tenant-System – getTenantConfig.ts implementiert, demo.json und musterfirma.json angelegt (lib/getTenantConfig.ts, tenants/)
- Funnel-Komponente – solar-funnel.tsx Props-fähig gemacht, alle Hardcodes entfernt (components/solar-funnel.tsx)
- API-Route – Submit-Endpoint implementiert mit Supabase-Logging vor E-Mail-Versand (app/api/submit/route.ts)
```

**Niemals eine Aufgabe als erledigt betrachten ohne den History-Eintrag.**

---

## Wichtige Regeln

- **Kein Hardcode** – alle Werte kommen aus der TenantConfig-JSON
- **Supabase Service Key** nur server-side verwenden (nie im Client-Code)
- **`SUPABASE_SERVICE_KEY`** niemals mit `NEXT_PUBLIC_` prefix
- Bei Fehlern in Tracking/E-Mail: loggen, aber **nicht werfen** (Endkunde soll nie einen Fehler sehen)
- `Promise.all` für die 3 E-Mails (parallel, nicht sequenziell)
- Alle Umgebungsvariablen stehen in `.env.local` (siehe `.env.example`)

---

## Bestehende Dateien

| Datei | Status |
|---|---|
| `components/solar-funnel.tsx` | ✅ Vorhanden – überarbeiten (Props-fähig machen) |
| `components/theme-provider.tsx` | Prüfen ob benötigt |
| `app/globals.css` | ✅ Behalten |
| `app/layout.tsx` | ✅ Anpassen |
| `app/page.tsx` | Ersetzen durch Dynamic Route |
| `lib/utils.ts` | ✅ Behalten |
| `context/project-overview.md` | ✅ Referenz-Dokument |
