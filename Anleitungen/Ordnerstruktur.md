# Ordnerstruktur — verständlich erklärt

> Für mich (Stavros) als dauerhafte Gedächtnisstütze: **Wie ist der Code organisiert und wo finde ich was?**
> Stand: 2026-06-14, nach der Aufräumung (Aufgaben 70–72). Migrations-Plan dazu: [`../context/struktur-plan.md`](../context/struktur-plan.md).

---

## 1. Das mentale Modell: „3 Welten"

Alles im Code gehört zu genau einer von drei Welten. Wenn ich das im Kopf habe, finde ich fast alles:

| Welt | Wer benutzt es | Wo im Code |
| --- | --- | --- |
| 🟦 **Dashboard** | die Agentur (eingeloggt) | `app/dashboard/` + `components/dashboard/` |
| 🟪 **Editor** | die Agentur (baut Funnels) | `components/editor/` |
| 🟩 **Widget** | der Endkunde (füllt den Funnel aus) | `components/funnel.tsx` + `app/[slug]/` |

---

## 2. Die obersten Ordner — ein Satz pro Stück

```
leadplug-saas/
├── app/          → URLs & API. Jeder Unterordner = eine Webadresse (Next.js-Regel).
├── components/   → sichtbare UI-Bausteine (React).
├── lib/          → unsichtbare Logik & Helfer (KEIN UI).
├── types/        → zentrale Typdefinitionen (eine Wahrheit für Datenformen).
├── emails/       → das React-Mail-Template (DynamicEmail).
├── supabase/     → Datenbank-Migrationen + Demo-Funnel-SQL.
├── public/       → statische Dateien (embed.js, Schriften).
├── context/      → technische Doku (architecture.md, struktur-plan.md, …).
└── Anleitungen/  → Anleitungen für mich (dieses Dokument liegt hier).
```

**Faustregel:**
- Eine Adresse im Browser? → `app/`
- Etwas Sichtbares? → `components/`
- Eine Rechen-/Hilfsfunktion? → `lib/`

---

## 3. Innen: `components/` (die UI)

```
components/
├── funnel.tsx + funnel/   → 🟩 DAS WIDGET (der ausfüllbare Funnel beim Endkunden)
├── TenantFunnelClient.tsx → lädt das Widget live auf /[slug]
├── editor/                → 🟪 DER FUNNEL-BUILDER
│   ├── EditorShell · StepList · CenterCanvas · PropertiesPanel · …  (Haupt-Panels)
│   ├── ui/          → Editor-eigene Knöpfe/Modals
│   ├── properties/  → die Feld-Einstellungen (rechte Spalte)
│   ├── email/       → der Mail-Editor (Tab „E-Mails")
│   └── share/       → der Tab „Einbinden" (Embed-Code + Tracking)
├── dashboard/             → 🟦 DAS AGENTUR-BACKEND
│   ├── nav/         → Seitenleiste + Navigation (Shell, Sidebar, Logo, Menüpunkte)
│   ├── funnels/     → Funnel-Karten, Anlegen/Löschen, Vorlagen-Auswahl
│   └── BetaFeedback · OnboardingNameModal · Sparkline   (lose Einzelstücke)
├── ui/                    → Design-System: Button, Card, Input, Badge … (überall benutzt)
└── admin/                 → mein Superadmin-Cockpit
```

**Merkregel für den Editor:** Das *Haupt-Panel* eines Tabs liegt direkt in `editor/` (z.B. `EmailsPanel.tsx`, `SharePanel.tsx`), seine *Einzelteile* im gleichnamigen Unterordner (`editor/email/`, `editor/share/`). Gleiches Prinzip durchgehend.

---

## 4. Innen: `lib/` (die Logik, ohne UI)

```
lib/
├── logic/     → Funnel-Sprünge (Wenn-Dann): auswerten · anzeigen · DB-Mapping
├── hooks/     → React-Helfer (Undo/Redo, Speichern-Status, Breite messen)
├── email/     → Mail-Versand + Vorlagen-Bausteine
├── supabase/  → 3 DB-Verbindungen (User · Anonym · Service-Key)
├── auth/      → Superadmin-Prüfung
├── admin/     → Datenabfragen fürs Admin-Cockpit
└── (lose Einzelstücke direkt im Wurzel:)
    getTenantConfig · editorUtils · tracking · webhooks · billing · stripe ·
    csv · embedSnippet · resolveAnswer · validateContactField · utils · templates
```

**Warum manche Dateien in Unterordnern, andere lose?**
Unterordner = **Themen-Bündel** (mehrere zusammengehörige Dateien). Die losen Dateien sind **eigenständige große Brocken**, die zu keinem Bündel gehören — die werden bewusst NICHT künstlich verschachtelt. (Ein Ordner mit nur 1 Datei ist genauso schlecht wie 16 in einem.)

---

## 5. Namens-Regeln (damit Namen vorhersehbar bleiben)

- **Komponenten-Datei = PascalCase = Name des Exports** → `FunnelCard.tsx` exportiert `FunnelCard`.
- **Hilfsfunktion/Hook = camelCase** → `editorUtils.ts`, `useSaveStatus.ts`.
- **Ordnername = Domäne/Feature**, nicht Technik → `editor/`, `dashboard/funnels/` (nicht `modals/`, `helpers/`).
- **Daten/Config sind KEINE Komponente** → gehören nach `lib/`, nicht zwischen die `.tsx`.

**Die Leitregel über allem:** *Ein Neuer muss aus „was tut die Datei?" erraten können, in welchem Ordner sie liegt.*

---

## 6. „Wo finde ich …?" — Spickzettel

| Ich suche … | Ort |
| --- | --- |
| Wie der Funnel aussieht, den der Kunde ausfüllt | `components/funnel.tsx` |
| Den Builder / einen Editor-Tab | `components/editor/…` |
| Lead-Tabelle / Statistiken / Funnel-Liste | `app/dashboard/…` |
| Wie ein Lead gespeichert/verschickt wird | `lib/tracking` · `lib/email/` · `lib/webhooks` · `app/api/submit` |
| Datenformate („was ist ein Funnel/Lead") | `types/index.ts` |
| DB-Änderungen | `supabase/migrations/` |
| Wie das Embed-Script funktioniert | `public/embed.js` |

---

## 7. KI-Modelle & diese Struktur — erkennen sie die Logik, oder murksen sie?

Ehrliche Antwort (direkt aus der Praxis):

**Eine saubere, konventionelle Struktur — genau die, die wir jetzt haben — wird von KI-Modellen sehr gut erkannt.** Eine KI liest die Struktur aus zwei Dingen ab: aus **Namen** (Ordner + Dateien) und aus **Imports** (`@/components/editor/…`). Weil unsere Namen jetzt selbsterklärend sind und ein bekanntes Muster folgen (feature-Ordner, `@/`-Alias), trifft eine KI die richtigen Annahmen meist von allein.

**ABER — und das ist wichtig:** Eine KI kennt *deine* Konventionen nicht automatisch. Sie kann „murksen", wenn man sie lässt — typische Fehler:
- eine neue Komponente in den falschen Ordner legen,
- einen Helfer in `components/` statt `lib/` packen,
- etwas doppelt anlegen, statt Vorhandenes zu nutzen,
- eine große Datei „spontan" umbauen.

**Was die KI auf Kurs hält (die Sicherungen, die wir haben):**
1. **`CLAUDE.md`** — die Regel-Datei, die jede KI-Sitzung zuerst liest. Hier stehen die Verbote + Verweise (auf genau dieses Dokument).
2. **Diese Anleitung + `context/struktur-plan.md`** — dokumentierte Konventionen zum Nachschlagen.
3. **`@/`-Alias + TypeScript** — falsche Importpfade fallen beim Build sofort auf (`tsc`/`next build` werden rot).
4. **Du als Owner** — Review + klare Ansagen. Eine KI ist Copilot, nicht Pilot.

**Fazit:** Die saubere Struktur **senkt** die Wahrscheinlichkeit, dass eine KI murkst, deutlich — sie eliminiert sie aber nicht. Deshalb: bei neuen Dateien der KI ruhig sagen *wohin* (oder hinterher kurz prüfen), und die Schutzregeln in `CLAUDE.md` gepflegt halten. Besonders geschützt ist `components/funnel.tsx` (siehe `CLAUDE.md` §11): an dieser Datei darf eine KI nicht spontan herumbauen — sie ist der Umsatzpfad und soll für *dich* lesbar bleiben.
