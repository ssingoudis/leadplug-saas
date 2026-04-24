# CLAUDE.md – Funnel Widget Platform

Einbettbares iFrame-Widget (Next.js + TypeScript + TailwindCSS), generischer Multi-Tenant Sales-Funnel für Handwerksbetriebe aller Branchen (Solar, Wärmepumpe, Heizung, Sanitär, etc.).

- Architektur & Business-Logik: [`context/project-overview.md`](context/project-overview.md)
- Aufgaben & Status: [`context/current-feature.md`](context/current-feature.md)
- History älterer Aufgaben: [`context/history-archive.md`](context/history-archive.md)
- Architektur-Diagramm (visuell): [`context/Ablaufdiagramm.png`](context/Ablaufdiagramm.png)

## Git-Workflow

Vor jeder Aufgabe zuerst einen eigenen Branch erstellen:
```
git checkout -b feature/aufgabe-[nummer]-[kurzname]
```
Beispiele: `feature/aufgabe-2-seed-data`, `feature/aufgabe-3-supabase-config`, `feature/aufgabe-5-funnel-generic`

Nach erfolgreichem Test: Branch in `main` mergen. Bei Problemen: Branch verwerfen, `main` bleibt sauber.

**Ausnahme:** Reine Dokumentations-Änderungen (keine Code-Dateien) brauchen keinen eigenen Branch.

## Wichtige Regeln

- **Kein Hardcode** – alle tenant-spezifischen Werte (Texte, Farben, Fragen, Preise) kommen aus Supabase (`tenants`, `funnel_questions`, `funnel_options`). JSON-Dateien in `tenants/` sind nur Fallback.
- **Primärquelle ist Supabase.** `getTenantConfig()` fragt zuerst die DB ab, fällt bei Fehler auf die entsprechende JSON-Datei zurück.
- **Supabase Service Key** nur server-side; niemals mit `NEXT_PUBLIC_`-Prefix.
- **Billing-Reihenfolge in `/api/submit`:** erst `logSubmission()` (Supabase), dann E-Mails.
- **Nur 2 E-Mails pro Submission:** Danke-Mail an den Anfragenden (kein PDF, keine Preisschätzung) + Lead-Benachrichtigung an den Tenant.
- **Kein PDF, keine Preisschätzung** – `generatePDF.ts` und `priceCalculator.ts` sind deprecated.
- Fehler in Tracking/E-Mail: loggen, **nicht werfen** (Endkunde bekommt immer `{success:true}`).
- **Bot-Schutz:** Honeypot-Feld im Formular (server-side prüfen). Bei ausgelöstem Honeypot: 200 zurückgeben, aber nicht in DB speichern.
- **postMessage Höhe:** Widget sendet nach jedem Render `window.parent.postMessage({type:'funnel-resize', height: X}, '*')`.
- `lead_price` server-side aus `tenants.lead_price_base` lesen – nicht vom Client vertrauen.
- Umgebungsvariablen: `.env.local` (Vorlage `.env.example`).

## Icon-System

Einzige Komponente: `components/funnel.tsx` (generisch, nicht solar-spezifisch). Icons sind SVG-Komponenten in einer wachsenden Bibliothek im gleichen File, referenziert per `icon_key` (String). Neue Icons = neuer Eintrag im `Icons`-Objekt in `funnel.tsx`. Kein eigenes Icon-File nötig. Wenn `icon_url` in der DB gesetzt ist, wird das externe Bild statt des Icon-Keys gerendert.

## Dokumentationspflicht

Nach jeder abgeschlossenen Aufgabe Eintrag in `context/current-feature.md` anfügen:

```
- [Aufgabenname] – [Was wurde gemacht] ([betroffene Dateien])
```

Bei > ~10 Einträgen die ältesten nach `context/history-archive.md` verschieben.
