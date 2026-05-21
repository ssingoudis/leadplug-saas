# CLAUDE.md – Funnel Widget Platform

Einbettbares iFrame-Widget (Next.js + TypeScript + TailwindCSS), generischer Multi-Tenant Sales-Funnel für Handwerksbetriebe aller Branchen (Solar, Wärmepumpe, Heizung, Sanitär, etc.).

- Architektur & Business-Logik: [`context/project-overview.md`](context/project-overview.md)
- Aufgaben & Status: [`context/current-feature.md`](context/current-feature.md)
- History älterer Aufgaben: [`context/history-archive.md`](context/history-archive.md)
- Architektur-Diagramm (visuell): [`context/Ablaufdiagramm.png`](context/Ablaufdiagramm.png)
- **Tenant Funnel-Editor** (EditorState, Sektionen, Save-Flow, PreviewPanel): [`context/tenant-funnel-editor.html`](context/tenant-funnel-editor.html)

## Git-Workflow

Vor jeder Aufgabe zuerst einen eigenen Branch erstellen:
```
git checkout -b feature/aufgabe-[nummer]-[kurzname]
```
Beispiele: `feature/aufgabe-2-seed-data`, `feature/aufgabe-3-supabase-config`, `feature/aufgabe-5-funnel-generic`

Nach erfolgreichem Test: Branch in `main` mergen. Bei Problemen: Branch verwerfen, `main` bleibt sauber.

**Ausnahme:** Reine Dokumentations-Änderungen (keine Code-Dateien) brauchen keinen eigenen Branch.

## Wichtige Regeln

- **Kein Hardcode** – alle tenant-spezifischen Werte (Texte, Farben, Fragen, Preise) kommen aus Supabase (`tenants`, `funnel_questions`).
- **Primärquelle ist Supabase.** `getTenantConfig()` lädt ausschließlich aus der DB – kein JSON-Fallback.
- **Supabase Service Key** nur server-side; niemals mit `NEXT_PUBLIC_`-Prefix.
- **Billing-Reihenfolge in `/api/submit`:** erst `logSubmission()` (Supabase), dann E-Mails.
- **Nur 2 E-Mails pro Submission:** Danke-Mail an den Anfragenden (kein PDF, keine Preisschätzung) + Lead-Benachrichtigung an den Tenant.
- **Kein PDF, keine Preisschätzung** – `generatePDF.ts` und `priceCalculator.ts` sind deprecated.
- Fehler in Tracking/E-Mail: loggen, **nicht werfen** (Endkunde bekommt immer `{success:true}`).
- **Bot-Schutz:** Honeypot-Feld im Formular (server-side prüfen). Bei ausgelöstem Honeypot: 200 zurückgeben, aber nicht in DB speichern.
- **postMessage Höhe:** Widget sendet nach jedem Render `window.parent.postMessage({type:'funnel-resize', height: X}, '*')`.
- `lead_price` server-side aus `tenants.lead_price_base` lesen – nicht vom Client vertrauen.
- Umgebungsvariablen: `.env.local` (Vorlage `.env.example`).

## Design System (Admin-Dashboard & zukünftiges Tenant-Portal)

**Vor dem Erstellen oder Anpassen einer UI-Komponente zwingend lesen: [`context/design-system.md`](context/design-system.md)**

Die Anleitung enthält: alle Design-Token (Light + Dark Mode), Komponenten-API, Dark-Mode-Implementierung, Layout-Patterns und Verbote.

### Kurzübersicht Komponenten

| Komponente | Verwendung |
|---|---|
| `<Card title="…">` | Jede Inhalts-Box im Dashboard |
| `<Badge variant="green|red|amber|purple|gray">` | Status-Anzeigen, E-Mail-Badges |
| `<Button variant="primary|secondary|ghost">` | Alle klickbaren Aktionen |
| `<Input value onChange placeholder>` | Texteingaben, Suche |
| `<Select value onChange options>` | Dropdowns |
| `<StatTile value label>` | Kennzahlen-Kacheln |
| `<ThemeToggle>` | Dark-Mode-Schalter (nur 1× pro Header) |

### Zwei getrennte Design-Welten

- **`components/ui/`** → Dashboard & Tenant-Portal (dieses System)
- **`components/funnel.tsx`** → Widget-UI (Farben aus DB, komplett eigenständig — **nie anfassen**)

## Icon-System

Einzige Funnel-Komponente: `components/funnel.tsx` (generisch, nicht solar-spezifisch). Icons sind SVG-Komponenten in `components/icons.tsx`, referenziert per `icon_key` (String). Neue Icons = neuer Eintrag im `Icons`-Objekt in `icons.tsx`. Wenn `icon_url` in der DB gesetzt ist, wird das externe Bild statt des Icon-Keys gerendert.

## Supabase / Datenbank

Beim Arbeiten mit dem Supabase MCP Server (Datenbankabfragen, Schema-Änderungen, Migrationen) immer die Best Practices aus [`.agents/skills/supabase-postgres-best-practices/SKILL.md`](.agents/skills/supabase-postgres-best-practices/SKILL.md) anwenden.

## Dokumentationspflicht

Nach jeder abgeschlossenen Aufgabe Eintrag in `context/current-feature.md` anfügen:

```
- [Aufgabenname] – [Was wurde gemacht] ([betroffene Dateien])
```

Bei > ~10 Einträgen die ältesten nach `context/history-archive.md` verschieben.
