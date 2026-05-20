# Design System – Leadplug SaaS

Diese Anleitung ist **Pflichtlektüre vor dem Erstellen oder Anpassen einer UI-Komponente** im Admin-Dashboard oder Tenant-Portal. Sie beschreibt das gesamte Designsystem: Token, Komponenten, Dark Mode, Patterns und Verbote.

---

## 1. Zwei getrennte Design-Welten

| Bereich | Dateien | Regel |
|---|---|---|
| Dashboard & Tenant-Portal | `components/ui/`, `app/admin/`, `app/dashboard/` | Dieses Designsystem |
| Funnel-Widget | `components/funnel.tsx`, `components/icons.tsx` | **Nie anfassen** — eigene CSS-Variablen aus DB |

Das Widget läuft im iFrame und hat kein gemeinsames Stylesheet mit dem Dashboard. Änderungen am Designsystem betreffen das Widget nie und umgekehrt.

---

## 2. Design Tokens (CSS-Variablen)

Definiert in `app/globals.css`. **Nie Hex-Werte hardcoden** — immer die Tailwind-Utility nutzen, die auf die Variable zeigt.

### Light Mode (`:root`)

| Variable | Wert | Tailwind-Klasse | Bedeutung |
|---|---|---|---|
| `--primary` | `#4648d4` | `bg-primary` / `text-primary` / `border-primary` | Indigo — Header-Border, aktiver Tab, CTAs |
| `--primary-hover` | `#3537b0` | `hover:bg-primary-hover` | Hover-State für Primary-Buttons |
| `--primary-foreground` | `#ffffff` | `text-primary-foreground` | Text auf Primary-Hintergrund |
| `--background` | `#f3f4f6` | `bg-background` | Seiten-Hintergrund (gray-100) |
| `--foreground` | `#111827` | `text-foreground` | Primärtext |
| `--border` | `#e5e7eb` | `border-border` | Standard-Borders |
| `--ring` | `#4648d4` | `outline-ring` | Fokus-Ringe |
| `--destructive` | `#ef4444` | `bg-destructive` / `text-destructive` | Fehlerzustände, Löschen |

### Dark Mode (`.dark`)

| Variable | Wert | Bedeutung |
|---|---|---|
| `--primary` | `#5b78f5` | Heller, blau-lehnender Indigo (mehr Kontrast auf dunkel) |
| `--primary-hover` | `#4a67e4` | Dunkler als Dark-Primary |
| `--background` | `#0f172a` | Slate-900 — Seitenhintergrund |
| `--foreground` | `#f1f5f9` | Slate-100 — Primärtext |
| `--border` | `#334155` | Slate-700 |
| `--ring` | `#5b78f5` | |
| `--destructive` | `#f87171` | Red-400 |

> **Warum unterschiedliche Primary-Farben?** Dark-Primary ist bewusst heller (`#5b78f5` statt `#4648d4`), weil dunkle Hintergründe einen höheren Kontrast brauchen. Die CSS-Variable sorgt dafür, dass `bg-primary` in beiden Modi automatisch korrekt ist.

---

## 3. Dark Mode — Implementierung

### Wie es funktioniert

- Klasse `.dark` auf `<html>` aktiviert Dark Mode (class-based, nicht `prefers-color-scheme`)
- `@custom-variant dark (&:is(.dark *))` in `globals.css` — alle `dark:` Tailwind-Klassen greifen nur wenn `.dark` gesetzt ist
- `ThemeToggle` (`components/ui/ThemeToggle.tsx`) setzt/entfernt die Klasse und persistiert in `localStorage`
- FOUC-Prevention: Inline-Script im `<html>`-Tag (`app/layout.tsx`) setzt `.dark` synchron vor dem ersten Paint

### Faustregel für neue Komponenten

Jede Hintergrundfarbe und jede Textfarbe braucht eine `dark:`-Variante:

```tsx
// Statt:
<div className="bg-white text-gray-900">

// Immer:
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

### Graustufen-Hierarchie im Dark Mode

| Rolle | Tailwind | Hex |
|---|---|---|
| Seiten-Hintergrund | `dark:bg-[#0d1117]` (hardcoded) | `#0d1117` |
| Karten / Panels | `dark:bg-gray-900` | `#111827` |
| Erhöhte Elemente (Sub-Panels) | `dark:bg-gray-800` | `#1f2937` |
| Hover-State | `dark:hover:bg-gray-800` | `#1f2937` |
| Noch höher (Chips, Tags) | `dark:bg-gray-700` | `#374151` |

> **Wichtig:** Seiten-Hintergrund ist `dark:bg-[#0d1117]` (hardcoded), nicht `dark:bg-background` — das ist bewusst, weil `#0d1117` dunkler ist als slate-900 und mehr Tiefe gibt.

### Textfarben im Dark Mode

| Rolle | Light | Dark |
|---|---|---|
| Primärtext / Überschriften | `text-gray-900` | `dark:text-white` |
| Sekundärtext | `text-gray-500` | `dark:text-gray-400` |
| Subtext / Labels | `text-gray-400` | `dark:text-gray-500` |
| Deaktiviert / Placeholder | `text-gray-300` | `dark:text-gray-600` |

### Borders im Dark Mode

```tsx
// Standard-Border
className="border border-gray-200 dark:border-gray-700"

// Subtile Trennlinie (z.B. Listen-Items)
className="border-b border-gray-100 dark:border-gray-800"

// Panel-Trennlinie
className="border-t border-gray-100 dark:border-gray-800"
```

### SVGs im Dark Mode

SVG-Icons nie mit hardcoded `fill="#111827"` — stattdessen `currentColor`:

```tsx
// Falsch:
<svg fill="#111827" ...>

// Richtig:
<svg stroke="currentColor" className="text-gray-900 dark:text-white" ...>
```

---

## 4. Komponenten-Bibliothek (`components/ui/`)

### `<Card>`
```tsx
import Card from '@/components/ui/Card'

<Card title="Überschrift">
  {/* Inhalt */}
</Card>
```
Rendert: `bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6`. Titel: `text-base font-bold text-gray-900 dark:text-white`.

---

### `<Button>`
```tsx
import Button from '@/components/ui/Button'

<Button variant="primary" onClick={...}>Speichern</Button>
<Button variant="secondary">Abbrechen</Button>
<Button variant="ghost">Mehr</Button>
```

| Variant | Light | Dark |
|---|---|---|
| `primary` | `bg-primary text-white hover:bg-primary-hover` | automatisch via CSS-Variable |
| `secondary` | `border-gray-200 text-gray-700 hover:border-primary hover:text-primary` | kein separates Dark-Styling |
| `ghost` | `text-gray-500 hover:text-primary` | kein separates Dark-Styling |

> `secondary` und `ghost` haben kein eigenes `dark:`-Styling in der Komponente. Wenn sie in Dark-Mode-Kontexten erscheinen, ggf. per `className`-Prop ergänzen.

---

### `<Badge>`
```tsx
import Badge from '@/components/ui/Badge'

<Badge variant="green">Aktiv</Badge>
<Badge variant="red">Fehler</Badge>
<Badge variant="amber">Ausstehend</Badge>
<Badge variant="purple">Premium</Badge>
<Badge variant="gray">Inaktiv</Badge>
```

---

### `<Input>` und `<Select>`
```tsx
import { Input, Select } from '@/components/ui/Input'

<Input value={val} onChange={setVal} placeholder="Suchen..." />

<Select
  value={selected}
  onChange={setSelected}
  options={[{ value: 'a', label: 'Option A' }]}
/>
```

Beide nutzen denselben `baseClass`: `rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary focus:ring-1 focus:ring-primary/20`.

---

### `<StatTile>`
```tsx
import StatTile from '@/components/ui/StatTile'

<StatTile value="42" label="Leads (14 Tage)" />
```

Rendert: `bg-white dark:bg-gray-800 rounded-xl shadow-sm px-3 py-3 text-center`. Immer in einem `grid grid-cols-3 gap-4` verwenden.

---

### `<ThemeToggle>`
```tsx
import ThemeToggle from '@/components/ui/ThemeToggle'
```

Nur einmal pro Header. Kein eigenes Styling nötig.

---

## 5. Layout-Patterns

### Seiten-Wrapper
```tsx
<div className="min-h-screen bg-gray-100 dark:bg-[#0d1117] py-8">
  <div className="max-w-5xl mx-auto px-4 sm:px-8 space-y-6">
    {/* Cards */}
  </div>
</div>
```

### Header / Navbar
```tsx
<div className="bg-white dark:bg-gray-900 sticky top-0 z-10 border-b-2 border-primary">
  <div className="max-w-7xl mx-auto px-4 sm:px-8 py-0 flex items-stretch gap-0">
    {/* Tabs */}
    {/* Desktop Actions rechts */}
  </div>
</div>
```

### Tab (aktiv / inaktiv)
```tsx
// Aktiv:
className="flex items-center px-4 py-4 text-sm border-b-2 -mb-0.5 font-semibold text-primary border-primary"

// Inaktiv (nur Textfarbe beim Hover — kein Hintergrund):
className="flex items-center px-4 py-4 text-sm border-b-2 -mb-0.5 font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent"
```

> **Kein `hover:bg-*` auf Tabs** — führt zu Rendering-Bugs mit dem custom dark variant in Tailwind v4.

### Listen mit aufklappbaren Rows
```tsx
// Trennlinie zwischen Items:
<div className={!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}>
  {/* Collapsed row — aktiv (offen): */}
  <div className={`... ${isOpen ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
  {/* Expanded detail: */}
  <div className="bg-gray-50 dark:bg-gray-900 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
```

> `bg-primary/10` (getönte Indigo-Hintergrundfarbe) **nicht für aktive Rows** verwenden — sieht im Dark Mode lila aus. Stattdessen `bg-gray-100 dark:bg-gray-800`.

### Outline-Buttons (außerhalb `<Button>`)
```tsx
className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:bg-gray-800 transition-colors"
```

---

## 6. Typografie

| Klasse | Verwendung |
|---|---|
| `text-base font-bold text-gray-900 dark:text-white` | Card-Überschriften, Section-Titles |
| `text-sm font-semibold text-gray-900 dark:text-white` | Listen-Namen (Lead-Name, Firma) |
| `text-sm font-medium text-gray-700 dark:text-gray-300` | Sekundäre Labels, Button-Text |
| `text-sm text-gray-500 dark:text-gray-400` | Beschreibungen, Datum, Email |
| `text-xs text-gray-400 dark:text-gray-500` | Meta-Infos, Subtext |
| `font-mono text-xs text-gray-400 dark:text-gray-500` | Technische Infos, Code-Labels |

---

## 7. Verbote

- **Nie `#4648d4` oder `#5b78f5` hardcoden** — immer `bg-primary`, `text-primary`, `border-primary`
- **Nie `hover:bg-gray-50 dark:hover:bg-gray-800/60`** auf Tab-Links — Opacity-Modifier mit custom dark variant in Tailwind v4 führt zu Bugs
- **Nie `bg-primary/10` für aktive Zustände** in Listen — wirkt im Dark Mode lila/violett
- **Nie `components/funnel.tsx` anfassen** — komplett eigenständiges System
- **Nie inline `style={{ color: '#4648d4' }}`** für UI-Elemente — ausschließlich Tailwind-Utilities
- **Nie `bg-gray-50` für StatTiles** — zu wenig Kontrast auf `bg-gray-100` Seiten-BG; stattdessen `bg-white shadow-sm`
