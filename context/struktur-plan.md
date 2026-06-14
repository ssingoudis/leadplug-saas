# Struktur-Plan — Ordner-Aufräumung vor Go-Live

> **Zweck:** Schrittweise saubere, für Menschen begreifbare Ordnerstruktur herstellen — wartbar vor dem Go-Live. Pro Schritt ein eigener Branch + Build-Check (`tsc --noEmit` + `next build`) + Doku-Nachzug.
>
> **Leitregel:** Ein Neuer muss aus „was tut die Datei?" erraten können, in welchem Ordner sie liegt. Wo das nicht klappt → Handlungsbedarf. **Nicht über-organisieren** (Ordner mit 1 Datei sind genauso schlecht wie 16 in einem).
>
> **Import-Realität:** durchgängig `@/`-Alias (tsconfig `@/* → ./*`). Jeder Move = mechanischer Import-Rewrite, vom Build sofort verifizierbar. Next.js ist bei Ordnern außerhalb `app/` unkonventioniert (per Doku geprüft) — konfliktfrei.

---

## Status

| Phase | Inhalt | Status |
| --- | --- | --- |
| **0** | `tenant-editor/v2` → `editor` (+ defaults rein, vorlagen.ts weg) | ✅ erledigt (Aufgabe 70) |
| **A** | `dashboard/` entrümpeln + `editor/share/` bündeln + `templates.ts` → lib | 🟢 freigegeben, bereit |
| **B** | `lib/` clustern (`hooks/`, `email/`, optional `logic/`) | 🟢 freigegeben, bereit |
| **C** | Widget-Heimat / `funnel.tsx`-Umzug | ⛔ **bewusst gestrichen** (siehe unten) |

---

## Zielbild (North Star)

```
components/
├── widget/                  ← [Phase C — GESTRICHEN, bleibt vorerst wie es ist]
│   (heute: funnel.tsx · funnel/DateInlinePicker.tsx · TenantFunnelClient.tsx)
├── editor/                  ← ✅ Builder (Phase 0 erledigt)
│   ├── …Panels…  defaults.ts  fieldMeta.ts  types.ts
│   ├── ui/  properties/  email/
│   └── share/                  ← „Einbinden"-Tab gebündelt              [Phase A]
│       └── SharePanel · CodeSnippet · TrackingSettings · PlatformGuides
├── dashboard/               ← NUR Dashboard-Chrome + Funnel-Verwaltung  [Phase A]
│   ├── nav/      (DashboardShell · Sidebar · LogoMark · navItems.ts)
│   ├── funnels/  (FunnelCard · NewFunnelModal · DeleteFunnelModal · CreateFromTemplateDialog · TemplateShowcase)
│   └── BetaFeedback · OnboardingNameModal · Sparkline
├── ui/                      ← ✅ Design-System-Primitive (unverändert)
└── admin/                   ← ✅ (unverändert)

lib/
├── hooks/    useHistoryState · useMinWidth · useSaveStatus              [Phase B]
├── email/    emails · emailTemplates                                   [Phase B]
├── logic/    funnelLogic · logicDisplay · logicRuleMapping   (optional, siehe Haken) [Phase B]
├── supabase/ · auth/ · admin/   ← ✅ schon gruppiert
├── templates.ts             (← dashboard/templates.ts, ist Daten)      [Phase A]
└── getTenantConfig · editorUtils · tracking · webhooks · billing · stripe ·
    csv · embedSnippet · resolveAnswer · validateContactField · utils   ← „große Einzelstücke", bleiben im Wurzel
```

---

## Phase A — `dashboard/` entrümpeln + `share/` bündeln · Nutzen hoch, Risiko niedrig

**Problem:** `dashboard/` = 16 gemischte Dateien, davon 3 die zum Editor gehören + 1 Daten-Datei. `funnel.tsx` ist NICHT betroffen.

| Vorher | Nachher | Warum |
| --- | --- | --- |
| `dashboard/CodeSnippet.tsx · TrackingSettings.tsx · PlatformGuides.tsx` | `editor/share/` | **Verifiziert:** nur `editor/SharePanel.tsx` importiert sie — Editor-Sache |
| `editor/SharePanel.tsx` | `editor/share/SharePanel.tsx` | analog zu `editor/email/` · `editor/properties/` |
| `dashboard/templates.ts` | `lib/templates.ts` | Daten + RPC-Helper (`mapTemplateRows`, `createFunnelFromTemplate()`), keine UI |
| `dashboard/{FunnelCard,NewFunnelModal,DeleteFunnelModal,CreateFromTemplateDialog,TemplateShowcase}` | `dashboard/funnels/` | Funnel-Verwaltung als Gruppe (optional) |
| `dashboard/{DashboardShell,Sidebar,LogoMark,navItems.ts}` | `dashboard/nav/` | Navigations-Gerüst (optional) |

**Import-Aufwand (verifiziert):** Share-Helfer = 3 Zeilen in SharePanel + 1 in EditorShell. `templates.ts` ≈ 6 Stellen (3 app-Pages + 3 dashboard-Komponenten). Sub-Gruppen `nav/`/`funnels/` = relative Imports + ein paar app-Pages.

> Sub-Ordner `nav/`+`funnels/` sind **optional** (12 Dateien wären noch OK). Echter Gewinn = die 3 Share-Helfer + `templates.ts` rausräumen.

---

## Phase B — `lib/` clustern · Nutzen mittel, Risiko niedrig

Nur die echten Cluster sichtbar machen; der Rest bleibt im lib-Wurzel (kein Über-Verschachteln).

| Cluster → Ordner | Dateien | Import-Stellen (verifiziert) | funnel.tsx? |
| --- | --- | --- | --- |
| `lib/hooks/` | useHistoryState · useMinWidth · useSaveStatus | 6 | nein |
| `lib/email/` | emails · emailTemplates | 8 | nein |
| `lib/logic/` | funnelLogic · logicDisplay · logicRuleMapping | 7 | ⚠️ **ja, 1 Zeile** |

**⚠️ Haken bei `lib/logic/`:** `funnel.tsx:35` importiert `@/lib/funnelLogic`. Der Ordner anzulegen heißt, **eine Import-Zeile in der hands-off-Datei** zu ändern. Optionen:
- **B-sicher:** `lib/logic/` weglassen (oder nur logicDisplay/logicRuleMapping; funnelLogic bleibt im Wurzel) → funnel.tsx wird **nicht** angefasst. Empfohlen, wenn funnel.tsx tabu bleiben soll.
- **B-voll:** alle 3 zusammen inkl. der trivialen 1-Zeile in funnel.tsx (Build fängt Fehler sofort) — nur mit explizitem Go.

`hooks/` + `email/` sind in jedem Fall unkritisch und direkt machbar.

---

## Phase C — Widget / `funnel.tsx` · ⛔ BEWUSST GESTRICHEN

**Entscheidung (2026-06-14, Stavros + Copilot-Empfehlung): funnel.tsx bleibt, wo es ist.**

### Begründung (ehrlich + kritisch)
- Der **Umzug selbst** wäre mechanisch low-risk (git mv + 4 Import-Zeilen + Build-Check). Das ist nicht das Problem.
- Der **Gewinn ist rein kosmetisch**: Namenskollision `funnel.tsx` (Datei) ↕ `funnel/` (Ordner) auflösen + `widget/`-Heimat. Kein echtes Wartbarkeitsproblem.
- Das **echte** Problem (2000-LOC-Monolith) wird durch Verschieben **nicht** gelöst — das wäre ein *internes Aufsplitten*, eine eigene, große, riskante Aufgabe, die NICHT Teil von „Ordner aufräumen" ist.
- funnel.tsx ist laut CLAUDE.md §11 hands-off, weil sie der **Umsatzpfad** ist (live `/[slug]` via `TenantFunnelClient` UND Editor-Vorschau via `CenterCanvas`). Bricht sie, ist alles gebrochen.
- **Fazit:** Vor Go-Live die heiligste Datei für eine Kosmetik anzufassen = schlechtes Risiko/Nutzen-Verhältnis. Kollision tolerieren.

### Wann doch?
Nur falls die Datei je wirklich intern aufgesplittet wird — *dann* zieht man sie im selben Zug nach `components/widget/Funnel.tsx` um. Bis dahin: liegen lassen.

---

## Namens-Konventionen (Spickzettel)

- **Komponenten-Datei = PascalCase = Name des Exports** → `FunnelCard.tsx` exportiert `FunnelCard`.
- **Hilfsfunktion/Hook = camelCase** → `editorUtils.ts`, `useSaveStatus.ts`.
- **Ordnername = Domäne/Feature**, nicht Technik → `editor/`, `dashboard/funnels/` statt `modals/`/`helpers/`.
- **Daten/Config ≠ Komponente** → gehört nach `lib/`, nicht zwischen die `.tsx`.

## Bleibt bewusst unangetastet (ist gut so)
`components/ui/` · `components/admin/` · `components/editor/`-Kern · `lib/supabase|auth|admin` · App-Routen in `app/` inkl. der colocated Charts in `app/dashboard/statistiken/`.