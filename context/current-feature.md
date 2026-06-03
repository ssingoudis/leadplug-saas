# Current Feature

LeadPlug — SaaS-Funnel-Builder mit integriertem CRM für **Agenturen und Marketer**, die Funnels für ihre Endkunden bauen (branchen-offen). Multi-Tenant iFrame-Widget + Editor + Lead-Posteingang. Strategische Grundlagen siehe [`../CLAUDE.md`](../CLAUDE.md).

---

## Notes

### Font-System

Kuratierter Font-Enum: `FunnelFont = "system" | "inter" | "poppins" | "roboto"`. Self-hosted unter `public/fonts/` (DSGVO-konform). Neuen Font: `.woff2` in `public/fonts/<name>/`, `@font-face` in `app/globals.css`, Key in `FunnelFont` und `FONT_STACKS` in `funnel.tsx`.

### Billing-Logik

- `per_lead`: `lead_price` aus `tenants.lead_price` pro Submission
- `per_month`: `lead_price` = `0`; Pauschale in `tenants.billing_price`
- `per_year`: `lead_price` = `0`; Jahrespreis in `tenants.billing_price`
- `billing_model` ist PostgreSQL-Enum `billing_model_type`, Default `per_month`

### Tenant-Struktur (DB-Stand)

Nur noch 2 aktive Tenants:
- `demo` → alle Demo-Funnels: `demo`, `demo-solar`, `demo-waermepumpe`, `demo-bad`, `demo-klima`, `demo-dach`, `demo-fenster`, `demo-wallbox`, `demo-klartext`
- `leadplug` → `leadplug` (echter Produktiv-Funnel)

---

## Aktueller Status (Stand: 2026-05-22)

**Alle 3 Phasen abgeschlossen.** Das Stripe Billing ist vollständig implementiert und in Vercel deployed — aktuell im **Test-Modus** (Stripe Sandbox, `sk_test_...`).

### Stripe-Setup in Vercel (Production-Umgebung)

Folgende Env-Vars sind in Vercel eingetragen:

| Variable | Inhalt |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_51...` (Test-Key — für Production durch `sk_live_...` ersetzen) |
| `STRIPE_PRICE_ID_STANDARD` | `price_1TZygpQ5RyuRWopIg2SVj4PD` (49€/Monat, Test-Produkt) |
| `STRIPE_PRICE_ID_TEST` | `price_1TZzEyQ5RyuRWopIGMR2h0B4` (1€/Monat, Sofortkündigung — nur dev/staging) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (Signing-Secret des Stripe Webhook-Endpoints) |

Webhook-Endpoint in Stripe (Test-Modus): `https://app.leadplug.de/api/stripe/webhook`
Lauscht auf: `customer.subscription.created`, `.updated`, `.deleted`

### Wechsel auf Production (Live-Betrieb)

Wenn echte Zahlungen aktiviert werden sollen:

1. **Stripe Dashboard → Live-Modus** (Toggle oben links von "Test" auf "Live")
2. Neues Live-Produkt + Price anlegen (49€/Monat)
3. In Vercel ersetzen:
   - `STRIPE_SECRET_KEY` → `sk_live_...` (oder Restricted Key `rk_live_...` empfohlen)
   - `STRIPE_PRICE_ID_STANDARD` → neue `price_live_...`-ID
   - `STRIPE_PRICE_ID_TEST` → **leer lassen** oder entfernen (Test-Kachel verschwindet dann automatisch)
4. Neuen Live-Webhook in Stripe anlegen: `https://app.leadplug.de/api/stripe/webhook`
5. `STRIPE_WEBHOOK_SECRET` → neues `whsec_live_...` aus dem Live-Endpoint
6. Redeploy in Vercel

> **Wichtig:** `STRIPE_PRICE_ID_TEST` nur in Test-/Staging-Umgebungen setzen. Wenn die Env-Var fehlt, wird die Test-Kachel auf der Billing-Seite automatisch ausgeblendet.

### Billing-Portal-Konfiguration

Portal-Config-ID: `bpc_1TZypEQ5RyuRWopI3iAIq9DL` (Test-Modus, `mode: 'immediately'` für sofortige Kündigung).
Für Production eine neue Portal-Config im Live-Modus anlegen.

---

## Stripe Billing — Erweiterungsanleitung

### Neuen Plan hinzufügen (z.B. "LeadPlug Pro")

1. **Stripe Dashboard:** Neues Product + Price anlegen (oder via MCP: `create_product` → `create_price`)
2. **`.env.local` + `.env.example`:** Neue Env-Var eintragen:
   ```
   STRIPE_PRICE_ID_PRO=price_xxxxx
   ```
3. **`lib/stripe.ts`:** Export ergänzen:
   ```ts
   export const STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO ?? ''
   ```
4. **`/api/stripe/checkout/route.ts`:** Request-Body um `plan`-Parameter erweitern und je nach Wert den richtigen Price wählen.
5. **`/dashboard/billing/BillingClient.tsx`:** Upgrade-Button für den neuen Plan ergänzen.
6. Kein DB-Schema-Change nötig — `stripe_price_id` speichert die aktive Price-ID als String.

### Webhook lokal testen

```bash
# Stripe CLI installieren: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Das CLI gibt einen whsec_... Key aus → in .env.local als STRIPE_WEBHOOK_SECRET eintragen
```

### Produktions-Webhook einrichten

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://deine-domain.de/api/stripe/webhook`
3. Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Signing Secret in Produktions-Env als `STRIPE_WEBHOOK_SECRET` eintragen

### Free-Status für Testkunden

Direkt in Supabase (Admin-Client oder SQL):
```sql
UPDATE tenants SET billing_model = 'free' WHERE slug = 'kunde-slug';
```
→ Kein Stripe-Check, voller Funktionsumfang, keine Abrechnung.

---

## Aktuell: Aufgabe 49 — Editor-UX-Uplift + Autosave-Pattern + Funnel-Cards + Webhook-Namen (2026-06-03)

**Status:** Branch `feature/aufgabe-49-funnel-cards`. Type-Check grün durchgehend. Visuell abgenommen. **1 additiver DB-Change** (`webhook_subscriptions.name`).

**Editor-Design-System erweitert — alle /edit-Tabs auf ein Vokabular (Bearbeiten war seit Aufgabe 45 schon Benchmark, jetzt der Rest dazu):**
- Kanonische Controls [`ui/Controls.tsx`](../components/tenant-editor/v2/ui/Controls.tsx): `EditorButton` (primary/secondary/ghost/danger + loading-Spinner), `TextInput`, `Textarea`, `Select`, `Toggle`. Verfeinert den bestehenden hellen Look, kein Stilbruch. (Lokale Controls in `FieldProperties.tsx` sind optisch identisch — bewusst nicht refactored, wäre rein DRY + riskant.)
- [`ui/Panel.tsx`](../components/tenant-editor/v2/ui/Panel.tsx) ergänzt: `SectionCard` (rounded-2xl Card mit optionalem Header) + `EmptyState` (Icon-Kreis + Headline + CTA).
- Geteilte Modal-Chrome [`ui/EditorModal.tsx`](../components/tenant-editor/v2/ui/EditorModal.tsx): Overlay+blur, Header (Scope+Titel+X), Scroll-Body, optionaler Footer, ESC + Klick-außen. [`AddElementModal`](../components/tenant-editor/v2/AddElementModal.tsx) + [`WebhookAddModal`](../components/tenant-editor/v2/WebhookAddModal.tsx) beide darauf gezogen.
- **Webhooks** + **E-Mails** + **Einbinden** ([`SharePanel.tsx`](../components/tenant-editor/v2/SharePanel.tsx)) auf SectionCard/EmptyState/Controls re-skinnt (Logik 1:1). „Signatur verifizieren"-Code-Snippet-Sektion aus Webhooks entfernt (für Nutzer ohne Mehrwert). Einbinden-Breite `max-w-3xl`→`max-w-5xl`.
- **Bearbeiten-Tab**: Canvas-Toolbar Desktop/Mobile-Umschalter auf TopTabs-Pill-Stil, Platzhalter (keine Frage / Submit übersprungen) auf `EmptyState` [`CenterCanvas.tsx`](../components/tenant-editor/v2/CenterCanvas.tsx).

**Autosave-on-blur-Pattern (projektweit, neu):**
- [`lib/useSaveStatus.ts`](../lib/useSaveStatus.ts) (Hook idle→saving→saved→idle / error) + [`components/ui/SaveStatus.tsx`](../components/ui/SaveStatus.tsx) (Indikator „Speichern…/Gespeichert ✓/Nicht gespeichert" — nie still, Kernprinzip „Daten gehen nicht verloren").
- Angewendet: **Funnel-Name** (Top-Bar inline editierbar mit Hover-Stift; schlanker `PATCH /api/tenant/funnels/[slug]` nur Metadaten — **kein** voller Dokument-Save, bewegliche Dirty-Baseline) · **Account-Profil** (Anzeigename+Telefon on-blur, [`account/page.tsx`](../app/dashboard/account/page.tsx)) · **Lead-Notizen** (immer editierbar + Auto-Grow-Textarea statt Stift-Modus, [`TenantLeadsTable.tsx`](../app/dashboard/TenantLeadsTable.tsx)). **Bewusst NICHT:** Mehrfeld-Draft-Editoren (E-Mail/Webhook-Eintrag) + Funnel-Inhalt → bleiben Dokument-Save mit Verwerfen.

**Webhook-Namen (DB-Change):**
- Migration `aufgabe_50_webhook_name`: `webhook_subscriptions.name text NULL` + Backfill bestehender Rows aus URL-Host. Rollback: `DROP COLUMN name`. Additiv, direkt auf Prod (mit User-Go, Präzedenz Aufgabe 43).
- POST leitet Default aus Host ab (`deriveWebhookName`), PATCH erlaubt `name`-Update, GET/Selects um `name` erweitert. UI: Liste zeigt **Name primär** + URL/Trigger, Detail-Header Name+Status, Name als Feld in der **Konfiguration** (mit dem Eintrag gespeichert), Anlegen-Modal optionales Name-Feld.

**Funnel-Cards-Redesign** [`FunnelCard.tsx`](../components/dashboard/FunnelCard.tsx):
- Bunter Per-Funnel-Akzentstreifen entfernt (war inkonsistent — jeder Funnel andere Farbe) → einheitliches **Status-Badge** (grün Aktiv / grau Inaktiv). Conversion-Chip raus. Kennzahlen als **Stat-Kacheln** (Leads + Aufrufe). Kompakter (`p-5`, Footer mit Trennlinie). Grid **3 Spalten** auf breiten Screens [`funnels/page.tsx`](../app/dashboard/funnels/page.tsx).

**Editor-Rename + Top-Bar/Sidebar (Branch-Basis, vor dem Uplift):**
- **`EditorShellV2` → `EditorShell`** (Symbol + Datei via `git mv` + alle Code-Refs + Doku-Sweep über alle `context/*`-Files; der Ordner `tenant-editor/v2/` + das `?v=2`-Routing-Flag bleiben bewusst unberührt).
- 3-Zonen-Top-Bar (Name links editierbar · Pill-Tabs mittig · Speichern/Status rechts) [`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx) + [`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx). Sidebar Hover-Expand im Editor-Modus [`Sidebar.tsx`](../components/dashboard/Sidebar.tsx).

> **Nächster + finaler Schritt vor Go-Live:** „Bearbeiten"-Tab perfektionieren (Funktionalität + Optik) — der Haupt-Arbeitsplatz des Users.

---

## Aufgabe 47 + 48 — Statistik-Feinschliff + Admin-Cockpit v1 (2026-06-02)

**Status:** Branch `feature/aufgabe-47-cockpit-polish`. Type-Check grün. Visuell abgenommen. **Kein DB-Change.**

**Aufgabe 47 — Cockpit-Feinschliff:**
- **Linien-Chart-X-Achse = Balken-Chart-Mechanik** ([`ViewsLeadsTrend.tsx`](../app/dashboard/statistiken/ViewsLeadsTrend.tsx)): Punkte sitzen in Spalten-Mitten (`xPct=(i+0.5)/n`), Labels als `flex-1`-Felder darunter (statt absolut positioniert), Desktop Wochentag+Tag, Mobile jedes N-te. Wochentag kommt als optionales `sublabel` aus [`MonthlyTable.tsx`](../app/dashboard/statistiken/MonthlyTable.tsx) (`getWeekday`). Behebt das „Labels verzogen / nicht responsive"-Problem.
- **Stripe-Entwicklungshinweis** (Webhook-Listen-Box) aus [`BillingClient.tsx`](../app/dashboard/billing/BillingClient.tsx) entfernt (unnötig, zeigte sich im Dev).

**Aufgabe 48 — Admin-Cockpit v1 (read-only Plattform-Owner-Sicht):**
- **Gating** [`lib/auth/superadmin.ts`](../lib/auth/superadmin.ts): `isSuperadmin(email)` über bestehende Env `SUPERADMIN_EMAIL` (komma-separiert, server-only). Kein neues Schema.
- **Route-Group** `app/admin/*`: [`layout.tsx`](../app/admin/layout.tsx) gated hart (`notFound()` für Nicht-Superadmins, verrät Bereich nicht) + schlanke Chrome. [`page.tsx`](../app/admin/page.tsx) = Workspace-Liste (Totals + Tabelle: Name·Owner·#Funnels·#Leads·zuletzt aktiv·Billing; verwaiste Tenants „kein Owner", eigener „du"). [`[tenantId]/page.tsx`](../app/admin/%5BtenantId%5D/page.tsx) = read-only Drill-in (Tenant-Header, Stat-Kacheln, Funnel-Liste, Leads aufklappbar via natives `<details>` — kein Client-JS).
- **Datenschicht** [`lib/admin/queries.ts`](../lib/admin/queries.ts): `getWorkspaces()` + `getWorkspaceDetail()` via Service-Key (`createAdminClient`), JS-Assembly (tenants + tenant_members + `auth.admin.listUsers/getUserById` für E-Mail+`last_sign_in_at` + funnels + submissions + view_logs). **Nur hinter dem Gate aufgerufen.**
- **Entry-Point**: Superadmin-only „Admin"-Link (Shield, amber) in [`Sidebar.tsx`](../components/dashboard/Sidebar.tsx) (Desktop + Mobile), `isSuperadmin` via [`dashboard/layout.tsx`](../app/dashboard/layout.tsx) → `DashboardShell` → `Sidebar`.
- **Read-only**, keine Aktionen (Billing einheitlich `free`). **Stufe 2 später:** Impersonation, Aktionen (sperren/löschen/Billing), Live-Presence, Such-/Sortier-UI, Cleanup der 6 verwaisten Test-Tenants.
- **Live-Hinweis:** `SUPERADMIN_EMAIL` muss im Vercel-Env gesetzt sein, sonst /admin = 404 für alle (fail-safe).

---

## Aufgabe 46 — Leads zu Mini-CRM + Kontakte-Merge + Billing-Box (2026-06-01)

**Status:** Code auf Branch `feature/aufgabe-46-leads-crm`. Migration `aufgabe_46_submissions_notes` **auf Produktion appliziert** (1 nullable Spalte, additiv, DOWN vorhanden). Type-Check grün. Tenant `Stavros` auf `billing_model='free'` gesetzt. Visuelle Abnahme offen. Teil 1 des Programms „Dashboard-Konsolidierung & Mini-CRM".

**Warum:** Das Dashboard-Areal zeigte dieselben `submissions`-Daten dreifach (Dashboard-Tabelle, Leads-Seite, Kontakte-Seite). Das CRM-Rückgrat (`submissions.status` + PATCH-Route `app/api/leads/[id]`) existierte seit Aufgabe 20, war aber **in keinem UI verdrahtet**. Ziel: ein schlankes Mini-CRM hinter dem Funnel-Leadmagnet.

**Entschieden (mit Stavros):**
- Status behält DB-Werte `offen/kontaktiert/abgeschlossen`, UI labelt neu → **Neu · Kontaktiert · Erledigt** (kein Enum-Change).
- **Türsteher**: nur kontaktierbare Submissions (E-Mail ODER Telefon) erscheinen als Leads; kontaktlose Tracking-Spuren werden ausgeblendet (zählen weiter in Statistik). Live: 32 Submissions → 26 Leads.
- Die alten 3 Bucket-Tabs (Abgeschlossen / Abbrecher-mit-Mail / Abbrecher-ohne-Mail) + „Kunde/Info"-Mail-Badges **komplett raus** (technisches Rauschen).
- **Kontakte-Seite entfernt** (war redundant zu Leads-„Abgeschlossen", kein Dedup).

**Umsetzung:**
- **Migration** `aufgabe_46_submissions_notes`: `submissions.notes text NULL` (freie interne CRM-Notiz pro Lead). Additiv, kein Backfill, kein CHECK (Längen-Cap ~5000 app-seitig).
- **API** [`app/api/leads/[id]/route.ts`](../app/api/leads/%5Bid%5D/route.ts): PATCH akzeptiert jetzt `{ status?, notes? }` (mind. eins). Status-Validierung wie gehabt, `notes` getrimmt, leer → NULL. User-Client + RLS.
- **Leads-Seite** [`app/dashboard/leads/page.tsx`](../app/dashboard/leads/page.tsx): Select um `status, notes` erweitert, Mail-Felder raus, Türsteher-Filter im Enrich, Bucket-Logik entfernt.
- **CRM-Tabelle** [`app/dashboard/TenantLeadsTable.tsx`](../app/dashboard/TenantLeadsTable.tsx) neu: Status-Tabs `Alle/Neu/Kontaktiert/Erledigt` mit Zählern; klickbarer **Status-Badge pro Zeile** (Dropdown → optimistic PATCH); Detail mit Status-Segmented-Control + **Notiz-Textarea (debounced Autosave ~800 ms)**. `resolveAnswer`/Detail/Filter wiederverwendet. Keine Mail-Badges.
- **Dashboard** [`app/dashboard/page.tsx`](../app/dashboard/page.tsx): Mapping an neue Shape angeglichen (Interim — Phase 2 baut Dashboard um).
- **Kontakte entfernt**: `app/dashboard/kontakte/page.tsx` + `components/leads/LeadsTable.tsx` gelöscht, Nav-Eintrag + `Users`-Icon-Import in [`navItems.ts`](../components/dashboard/navItems.ts) raus.
- **Billing** [`app/dashboard/billing/BillingClient.tsx`](../app/dashboard/billing/BillingClient.tsx): grüne Kostenlos-Info-Box bei `status==='free'`. Kein Feature-Gate aktiv (`isBillingActive()` nirgends aufgerufen) → rein kosmetisch. Abo-Button + Test-Kachel blenden sich für `free` automatisch aus. Stripe-Pfad intakt.

**Iteration (gleiche Session, Stavros-Feedback):**
- **Kanban-Board** in [`TenantLeadsTable.tsx`](../app/dashboard/TenantLeadsTable.tsx): List/Board-Umschalter oben. Board = 3 Spalten (Neu/Kontaktiert/Erledigt) via `@dnd-kit/core` (`useDraggable`/`useDroppable`/`DragOverlay`, schon vorhandene Dep) — Karte in andere Spalte ziehen = optimistischer Status-PATCH. Klick auf Karte → `LeadDetailModal` (geteilter `LeadDetailBody`: Kontakt+Antworten+Status+Notiz). `justDragged`-Ref unterdrückt Klick direkt nach Drag.
- **CRM-Notizfeld gesperrt**: `NotesEditor` jetzt Anzeige-Modus (Notiz-Text + ✎ / „+ Notiz hinzufügen") → Klick öffnet Textarea mit Speichern/Abbrechen. Autosave entfernt (explizites Speichern, nicht permanent editierbar).
- **Status-Sortierung** „Neu → Erledigt" als Sort-Option in der Liste.
- **Sanfter Status-Wechsel**: Listen-Zeilen via `framer-motion` `AnimatePresence` (Opacity-Exit) — kein abruptes Wegspringen mehr beim Statuswechsel.
- **„Feldname im Export" gehärtet** ([`FieldProperties.tsx`](../components/tenant-editor/v2/properties/FieldProperties.tsx) `FieldKeyEditor`): gesperrter Zustand ist jetzt ein eindeutig-gelockter Button (🔒 + „Ändern") statt input-artiger Box.

**Iteration 2 — Phasen 2-4 des Programms (2026-06-01, Commit 2):**
- **P2 Dashboard als Übersicht** [`app/dashboard/page.tsx`](../app/dashboard/page.tsx): volle Lead-Tabelle raus → 14-Tage-Chart + 3 KPIs (Leads gesamt/Aufrufe/Conversion) + **Pipeline-Karte** (Neu/Kontaktiert/Erledigt, klickbar → `/dashboard/leads?status=…`) + **Neueste-Leads-Teaser**. Leads-Seite liest `?status=`-Param ([`leads/page.tsx`](../app/dashboard/leads/page.tsx) → `TenantLeadsTable.initialStatus`). _(4 Zusatz-Cards waren testweise drin, auf Stavros-Wunsch wieder entfernt — Dashboard-Feinschliff bleibt für ganz am Ende.)_
- **P3 Statistik-Cockpit** ([`statistiken/`](../app/dashboard/statistiken/)): **Aufruf-Quelle vereinheitlicht** — `funnel_view_logs` ist jetzt die *einzige* Quelle für „Aufrufe"/Conversion (überall: Dashboard, Statistiken, Funnel-Liste). `total_views`-Zähler + `increment_funnel_views` aus dem Code raus, `track-view` schreibt nur noch den Log. Grund: nur Logs haben Zeitstempel → einzige konsistente, periodenfähige Quelle (Zahlen ändern sich: dein Funnel 114→291, Demos ohne Logs 0). **Chart-Ausrichtung gefixt** (Labels exakt unter Balken, `pl-8`-Hack raus). Neuer **Dual-Linien-Chart** `ViewsLeadsTrend` (Aufrufe vs. Ausgefüllt, generisch monatlich+täglich). **Funnel-Filter** als Client-Cockpit `StatistikenCockpit` (instant, kein Reload; filtert alles). Monats-Aufklapp: Dual-Linie (Überblick) + die zwei Tages-Balken (Detail, alle Tage beschriftet). Monats-Header ausgeschrieben (April 2026).
- **P4 Account** [`account/page.tsx`](../app/dashboard/account/page.tsx): **Danger Zone — Account löschen** mit Tipp-Bestätigung (Agentur-Name) + Server-Route [`api/account/delete`](../app/api/account/delete/route.ts) (Owner-geprüft, löscht Submissions + Tenant-Cascade + Auth-User, Service-Key). Website/Logo/Team bewusst weggelassen (nicht genutzt).
- **`tenants.website` deprecated**: Code-Refs raus (`getTenantConfig`/`emailTemplates`/`TenantConfig`), Daten geleert (6 Demo-Tenants → NULL). Spalte bleibt physisch (Prod-Sicherheit), Drop nach Deploy.
- **DB**: `total_views` + `increment_funnel_views` per Migration [`aufgabe_46b_drop_total_views`](../supabase/migrations/20260601130000_aufgabe_46b_drop_total_views.sql) gedroppt (Stavros-Go nach dem Commit — Prod-Dashboard auf altem `main` betroffen bis Deploy; öffentliche Widgets nicht, da `getTenantConfig` den Zähler nie las).

**Folgephasen (Plan, noch offen):** Cockpit-Stats optional (Antworten-Auswertung/Drop-off/Eingangs-Zeiten) · P5 Admin-Cockpit (Cross-Tenant, Owner-gated) · Dashboard-Feinschliff ganz am Ende · `tenants.website` physisch droppen nach Deploy.

---

## Aufgabe 45 — Editor-Design-System: Voll-Unifizierung der /edit-Tabs (2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking` (uncommitted, mit 42–44). Type-Check grün. Visuell iterativ mit Stavros abgenommen. Kein DB-/API-Touch.

**Warum:** Editor war Tab-für-Tab gewachsen → 5 Tabs, 4 Layout-Skelette, 2 Speichern-Modelle, 3 Sektion-Stile. Stavros: „insgesamt unstimmig". Gewählt: gemeinsames Editor-Design-System.

**Umsetzung (phasiert, mit visuellen Checkpoints):**
- **Geteilte Primitive** [`components/tenant-editor/v2/ui/Panel.tsx`](../components/tenant-editor/v2/ui/Panel.tsx): `PanelShell · PanelHeader · Section · Field · FieldHint` — kanonisiert aus dem bis dahin in jedem Panel duplizierten ThemePanel-Code. `ThemePanel` + `PropertiesPanel` laufen jetzt darauf (eine Quelle statt 2 Kopien).
- **Ein Speichern-Modell** ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx)): globaler Top-„Speichern" nur auf dem Dokument-Tab „Bearbeiten" (bzw. wenn ungesicherte Dokument-Änderungen bestehen). Ressourcen-Tabs (E-Mails/Webhooks/Einbinden) speichern pro Eintrag → kein doppeltes Speichern mehr.
- **Webhooks → Master-Detail** ([`WebhooksPanel.tsx`](../components/tenant-editor/v2/WebhooksPanel.tsx)): von zentrierter Karten-Liste + Modal auf Liste·Detail umgebaut — gleiches Layout wie E-Mails (`SubscriptionCard`→`WebhookDetail`, `selectedId` statt expand). Logik (CRUD/Test/Logs/Secret) unverändert wiederverwendet. Add-Modal bleibt vorerst fürs Anlegen.
- **Inhalt + Design zu einem Tab „Bearbeiten" zusammengelegt** ([`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx) + `EditorShell`): 3-Pane (StepList · Canvas · Inspektor). Rechter Inspektor hat einen **Umschalter „Inhalt | Design"** (`inspectorMode`): Inhalt = Schritt-Eigenschaften (`PropertiesPanel`), Design = funnel-weites Theme (`ThemePanel`). Scope wird vom `PanelHeader` angesagt. Top-Tabs jetzt: Bearbeiten · Logik (bald) · E-Mails · Webhooks · Einbinden (6 → 5).

**Konsens-Entscheidungen:**
- Drei kanonische Templates: A Canvas+Properties (Bearbeiten), B Master-Detail (E-Mails, Webhooks), C Einzelspalte-Config (Einbinden).
- Design nicht als eigener Tab (wirkte „verloren" als 2-Pane) → in „Bearbeiten" integriert mit Inspektor-Umschalter (gleiches Skelett wie Inhalt, Theme-Vorschau je Schritt).
- Funnel-Brand-Farbe nur im Canvas; Editor-Chrome bleibt Indigo. Widget (`funnel.tsx`) unberührt.

**Offen / Nice-to-have:** Einbinden-Section-Feinschliff, StepList-/Listen-Breiten-Angleich, Dark-Mode-/Abstands-Durchgang — fein-granular, am besten mit visueller Kontrolle.

---

## Aufgabe 44 — Navigations-Refactor: Side-Nav-Shell + Vollbild-Editor-Takeover (2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking` (weiterhin uncommitted mit 42+43). Type-Check grün, Smoke-Test grün (App bootet, Auth-Guard intakt, 0 Konsolen-Fehler). **Visuelle Abnahme durch Stavros offen** (Shell ist hinter Login — headless nicht prüfbar).

**Warum:** „Doppel-Navigation" — globale Top-Navbar + Editor-Tab-Leiste lagen als zwei gleich-aussehende Horizontal-Bars direkt übereinander (Ursache: Editor rendert im Dashboard-Layout, saß per `top:64px` unter dem Header). Beratung → Entscheidung: zwei Modi trennen.

**Umsetzung:**
- **Verwaltungs-Modus → linke Side-Nav** (Vercel-Stil, einklappbar): [`components/dashboard/Sidebar.tsx`](../components/dashboard/Sidebar.tsx) (Desktop-Rail `w-60`/`w-16` collapse + localStorage `lp_sidenav_collapsed`; Mobile = Top-Bar + Drawer als `MobileNav`-Export). Nav-Daten zentral in [`navItems.ts`](../components/dashboard/navItems.ts).
- **Bau-Modus → Icon-Leiste bleibt (VS-Code-Muster, KEIN Takeover):** [`DashboardShell.tsx`](../components/dashboard/DashboardShell.tsx) schaltet per `usePathname()`: Editor-Routen → `<Sidebar forceCollapsed/>` (fixierte 64px-Icon-Leiste, links) + Editor daneben; sonst volle Side-Nav. [`EditorShell`](../components/tenant-editor/v2/EditorShell.tsx) Container `top:64px` → `inset-y-0 right-0 left-0 lg:left-16` (sitzt rechts neben der Leiste). Die Nav verschwindet nie.
- **Layout:** [`app/dashboard/layout.tsx`](../app/dashboard/layout.tsx) rendert `DashboardShell` statt `DashboardHeader`+Wrapper (Auth/Tenant-Logik unverändert).
- **Footer = konsolidiertes User-Menü** (Vercel-Stil): Avatar + Name/Email + „…"-Trigger → Popover mit Account · Theme-Umschalter · Abmelden. Ersetzt den inkonsistenten nackten Theme-Icon. Theme-Init (dark-class on mount) lebt jetzt hier (Desktop) bzw. in `MobileNav`-`ThemeToggle` (Mobile).
- **Collapse-Toggle** als ruhige Zeile unten („‹ Einklappen") statt floatendem Pfeil oben rechts.
- **Gelöscht:** `app/dashboard/DashboardHeader.tsx` + `app/dashboard/TabNav.tsx`. Reuse: `__editorGuard`-Unsaved-Guard (Nav-Links im Editor bleiben klickbar → Guard schützt).

**Iteration 1 (Stavros-Feedback nach erstem Bild):** (a) Vollbild-Takeover war Überkorrektur — Side-Nav ist vertikal, löst die Doppel-Leiste schon → im Editor bleibt die Icon-Leiste stehen. (b) Footer-Theme-Icon inkonsistent → User-Menü-Popover. (c) Collapse-Pfeil oben rechts → ruhige Zeile unten.

**Offen:** erneute visuelle Abnahme; danach Nachzug der Nav-Beschreibungen in `architecture.md` + HTML-Diagrammen (Top-Nav → Side-Nav). Kein DB-/API-Touch, voll reversibel.

---

## Aufgabe 43 — Turnkey-Conversion-Tracking + Plattform-Anleitungen (2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking` (direkte Fortsetzung von Aufgabe 42, gleicher Branch). Migration **auf Produktion angewendet** (2 nullable Spalten, additiv). Type-Check grün. E2E-Browser-Test grün. Vollreferenz: [`conversion-tracking.md`](conversion-tracking.md).

**Warum:** Aufgabe 42 ließ den Kunden seinen Pixel selbst in GTM/Code verdrahten — laut Stavros nach dem Anschauen zu kompliziert („Copy-Paste ist das Maximum, niemand fummelt im Code"). Turnkey: Pixel-ID **einmal in ein Feld** eintragen, Snippet bleibt die 2 Zeilen, `embed.js` feuert automatisch.

**Migration** (`aufgabe_43_funnel_tracking`, additiv, DOWN vorhanden): `funnels` + `meta_pixel_id text NULL` + `google_ads_conversion text NULL`. Nullable, kein Backfill, kein CHECK (Format app-seitig). Direkt auf Produktion appliziert (mit Stavros-Go — Branch-Test für 2 Spalten unverhältnismäßig).

**Umsetzung:**
- **Config-Fluss:** `getTenantConfig` lädt die 2 Spalten → `TenantConfig.metaPixelId` / `.googleAdsConversion` ([`types/index.ts`](../types/index.ts)). `TenantFunnelClient` sendet sie **PII-frei** im `funnel-submit`-postMessage mit (`meta`/`google`).
- **[`public/embed.js`](../public/embed.js):** `funnel-submit`-Handler erweitert — IDs aus der Message (Vorrang) oder Fallback data-Attribute. `fireMeta` (init+track, Basiscode-Injection wenn `fbq` fehlt) + `fireGoogle` (gtag-Injection wenn `gtag` fehlt). **Format-Whitelist** vor jeder Injection (`^[0-9]{5,20}$` / `^AW-[0-9]+(/[\w-]+)?$`) — XSS/Injection-Schutz.
- **Save/Load:** [`app/api/tenant/funnels/[slug]/tracking/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/tracking/route.ts) — `GET` (Prefill) + `PATCH` (speichern), user-client + RLS, serverseitige Format-Whitelist.
- **UI — Editor-Reiter „Einbinden" (statt globaler Seite):** Nach Stavros-Feedback („zwei Einbinden-Reiter verwirren; Tracking ist pro Funnel") wurde der **deaktivierte Editor-Reiter `share` aktiviert** ([`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx)) und ein **[`SharePanel`](../components/tenant-editor/v2/SharePanel.tsx)** gebaut (Snippet + `TrackingSettings` + `PlatformGuides` + GTM/Callback-Details), full-width wie Webhooks/E-Mails ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx), mit „Funnel zuerst speichern"-Guard im Create-Modus).
- **Komponenten:** [`TrackingSettings.tsx`](../components/dashboard/TrackingSettings.tsx) (Eingabe + PATCH + DSGVO-Hinweis), [`PlatformGuides.tsx`](../components/dashboard/PlatformGuides.tsx) (WordPress/Wix/Squarespace/Webflow/Jimdo via `<details>`), [`CodeSnippet.tsx`](../components/dashboard/CodeSnippet.tsx) (CodeBlock+CopyBar, aus EmbedBlock extrahiert).
- **Entfernt (Konsolidierung):** globale Menü-Seite `app/dashboard/embed/page.tsx` + `components/dashboard/EmbedBlock.tsx` + Nav-Eintrag in [`TabNav.tsx`](../app/dashboard/TabNav.tsx) + Icon in [`DashboardHeader.tsx`](../app/dashboard/DashboardHeader.tsx). Eine Agentur nutzt je Endkunde ein anderes Pixel → Tracking gehört pro Funnel, nicht global.

**E2E verifiziert (Headless-Browser):** gültige IDs → `fbq('init',<id>)`+`fbq('track','Lead')` + `gtag('event','conversion',{send_to})` + dataLayer + onLead. Ungültige IDs (`abc` / `https://evil…`) → von Whitelist geblockt (kein fbq/gtag), dataLayer+onLead feuern weiter.

**Bewusst ausgeklammert (on-demand):** mehrere Pixel pro *einzelnem* Funnel; Server-CAPI.

---

## Aufgabe 42 (vorher) — Conversion-Tracking + `embed.js` Script-Loader (D.2, 2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking`, Type-Check grün. Kein DB-Touch (rein additiver Code). Vollreferenz: [`conversion-tracking.md`](conversion-tracking.md).

**Warum:** Laut Fokus-Roadmap der einzige rote Launch-Blocker — Performance-Agenturen können ohne Conversion-Signal ihre Ads nicht auf Leads optimieren. Funnel läuft im iFrame auf Fremddomain → Pixel der Kundenseite sieht den Submit nicht → Brücke via `postMessage`.

**Gewähltes Modell (Beratung mit Stavros): A — event-basiert.** Keine Pixel-IDs in der DB, kein Editor-UI. Funnel feuert ein sauberes Event, die (technische) Agentur verdrahtet ihre Pixel selbst (GTM). Begründung: Zielgruppe lebt in GTM + „nicht over-engineeren". Turnkey (DB+UI) + Server-CAPI bewusst als spätere On-Demand-Stufen (Letzteres passt später als Action-Element in `/api/submit`).

**Umsetzung:**
- **[`components/TenantFunnelClient.tsx`](../components/TenantFunnelClient.tsx)**: `handleSubmit` sendet **vor** dem `await fetch` ein PII-freies `window.parent.postMessage({ type:'funnel-submit', funnel:<slug> }, '*')` (guard `window.parent !== window`). Sofort-Feuern = robust gegen `redirectUrl`-Race. Deckt Submit- + Skip-Mode ab. **`components/funnel.tsx` unangetastet** (§11 hands-off).
- **[`public/embed.js`](../public/embed.js) (Upgrade des Alt-Loaders)**: **Wichtiger Fund während der Umsetzung** — es existierte bereits ein älteres `public/embed.js` (Slug-Schema `data-funnel-slug`/`data-slug`, nur Resize, kein Tracking, eigenes Anleitungen/-Doku-Ökosystem). Meine zunächst geplante Route `app/embed.js/route.ts` kollidierte damit (`conflicting public file and page file`). Nach Rücksprache mit Stavros: **altes Loader-File in-place upgraden** statt Route. Neuer Stand: self-deriving Origin, erzeugt iFrames pro Slug-Container, globale Message-Bridge (Resize mit Clamp 100–10000 + origin+source-gehärtet) + `funnel-submit` → `dataLayer`-Push `{event:'leadplug_lead'}` + optionale `data-meta-lead`/`data-google-conversion`-Auto-Fires + `window.LeadPlug.onLead`-Callback. **Abwärtskompatibel:** erkennt neu `data-leadplug` **und** Legacy `data-funnel-slug`/`data-slug`. Route-Datei wieder gelöscht.
- **[`lib/embedSnippet.ts`](../lib/embedSnippet.ts)**: `buildScriptEmbed(slug, origin)` (empfohlenes 2-Zeilen-Snippet); `buildEmbedSnippet` bleibt als iFrame-Fallback. Kommentar aktualisiert.
- **[`components/dashboard/EmbedBlock.tsx`](../components/dashboard/EmbedBlock.tsx)**: Script-Snippet primär (Badge „Empfohlen · mit Conversion-Tracking"), iFrame als aufklappbarer Fallback. `CopyBar`-Subkomponente extrahiert. Neue Prop `origin`.
- **[`app/dashboard/embed/page.tsx`](../app/dashboard/embed/page.tsx)**: Platzhalter „Bald verfügbar" → echte Doku-Karte mit 3 Abgreif-Wegen (GTM-`leadplug_lead` / data-Attribute / `onLead`-Callback) inkl. Code-Beispielen. `origin=base` an EmbedBlock.

**Sicherheit:** keine PII im postMessage; `/embed.js`-Listener prüft `e.origin` + `e.source === iframe.contentWindow`; Höhen-Clamp 100–10000.

**Bewusst ausgeklammert (on-demand):** Turnkey-Pixel-ID-im-Editor (DB+UI), Server-CAPI. Stacken additiv, kein Rework. Pre-launch → keine bestehenden Production-Embeds, um die man sich sorgen müsste.

---

## Aufgabe 41 (vorher) — E-Mails als Drip-Action-Element (2026-05-31)

**Status:** Migration appliziert (24 Default-Subscriptions via Backfill für 12 existierende Funnels), Code auf Branch `feature/aufgabe-41-emails-tab`, Type-Check + Build grün.

**Strategischer Pivot mittendrin:** ursprünglich als 1:1-Klon des Webhook-Tabs gebaut (trigger_type on_submit/after_page/on_abandoned + Markdown-Body). Nach Stavros' Feedback („Vorlagen-Editor unbrauchbar, Trigger sind irrelevant für E-Mails") komplett umgebaut zum **Drip-Modell für Lead-Nurturing**: E-Mails laufen zeitversetzt nach Submit (0 Min / 1 Tag / 3 Tage / …). Webhooks bleiben unverändert beim Event-Push-Modell.

**Schema** (Migration `aufgabe_41_email_subscriptions`, additive):
- `email_subscriptions` — pro Funnel N Drip-Mails: `delay_minutes int` · `recipient_type ('customer'|'tenant')` · `subject text` · `body_html text` (TipTap-Output) · `is_active` · `from_local`. CHECK-Constraints + 2 partial Indices + updated_at-Trigger + 4 RLS-Policies.
- `email_delivery_attempts` — Queue + Audit-Trail: `scheduled_at` (= completed_at + delay_minutes) · `status (pending|retrying|success|failed)` · `attempt_count` · `resend_message_id` · `recipient_address` · `next_retry_at`. 4 Indices (subscription, submission, due-pending, due-retrying) + 1 SELECT-Policy.
- **Backfill:** für jeden Funnel 2 Default-Subscriptions (Customer-Confirmation + Tenant-Notification, beide delay=0) → reproduziert das heutige hartkodierte Mail-Verhalten 1:1. Keine Verhaltens-Änderung beim Cutover.

**Sender** ([`lib/emails.ts`](../lib/emails.ts)):
- `triggerEmailsOnSubmit(funnelId, snapshot, tenantConfig)` — beim Submit insertet für jede aktive Subscription eine attempt-Row mit `scheduled_at = NOW() + delay_minutes`, sendet sofort alle die jetzt fällig sind (delay=0) via `after()`.
- `processPendingDelivery(attemptId)` + `retryEmailDelivery(attemptId)` — Cron-Pfade.
- Backoff identisch zu Webhooks (1m/5m/30m/2h/6h). 4xx von Resend → sofort `failed`. 5xx/Timeout → `retrying`.
- `aggregateEmailStatusForSubmission(submissionId)` — schreibt nach Send-Pass aggregiert `customer_email_sent` / `tenant_email_sent` in submissions (für Dashboard-Lead-Badges).
- `sendTestEmail(subId, options)` — options enthält `customRecipient`, `draftSubject`, `draftBodyHtml`, `draftRecipientType`. **Test-Mail rendert immer den aktuellen Editor-Stand**, auch wenn noch nicht gespeichert.

**Templates** ([`lib/emailTemplates.ts`](../lib/emailTemplates.ts) + [`emails/DynamicEmail.tsx`](../emails/DynamicEmail.tsx)):
- TipTap-Output ist HTML mit `<span data-variable="contact.name">{{contact.name}}</span>` + `<div data-magic-section="answers_overview">`.
- Server-Render via Regex-Substitution: Variable-Spans → HTML-escaped Value, Magic-Section-Divs → fertiges Sub-HTML (Antworten-Box · Kontakt-Box · Dashboard-Button).
- `DynamicEmail.tsx` React-Email-Shell mit Brand-Color-Header + dangerouslySetInnerHTML Body + Footer.

**Cron** ([`/api/cron/webhook-retry`](../app/api/cron/webhook-retry/route.ts), erweitert):
- Bestehende Webhook-Sektionen unverändert.
- Neu: due-pending (`status='pending' AND scheduled_at <= NOW()`) + due-retrying (`status='retrying' AND next_retry_at <= NOW()`). Beide rufen denselben `processAttempt`-Pfad.
- Nach jedem Lauf: `aggregateEmailStatusForSubmission` für alle berührten Submissions.

**CRUD-API** unter [`app/api/tenant/funnels/[slug]/emails/...`](../app/api/tenant/funnels/%5Bslug%5D/emails/route.ts):
- GET-Liste · POST-Create · GET/PATCH/DELETE pro Sub · `/test` (mit Draft-Override-Parametern) · `/logs` (Delivery-Attempts).
- Neue Route `/preview-leads`: liefert top 5 completed Submissions für den Vorschau-Lead-Picker im Editor.

**UI** (komplett neu, kein Modal):
- [`components/tenant-editor/v2/EmailsPanel.tsx`](../components/tenant-editor/v2/EmailsPanel.tsx) — **3-Pane-Layout** (Liste · Editor · Live-Vorschau), wie Funnel-Editor.
- Linke Spalte: Liste mit Name + Trigger-Label + Recipient-Badge. Switch-Wrapper `trySwitchTo()` warnt bei ungesichertem Draft.
- Mittlere Spalte: Editor mit Name-Input + Delay (Anzahl + Einheit Min/Std/Tage) + Recipient + Subject (TipTap single-line) + Body (TipTap full) + Test-Mail (collapsible) + Logs (collapsible).
- Rechte Spalte: Vorschau, **resizable per Drag-Handle** (320–900 px), mit Dropdown „Mock-Lead" / echte Leads aus `preview-leads`-API. Mail-Card auf `maxWidth: 600 px` zentriert (identisch zu echter Mail).
- **TipTap-Editor** ([`components/tenant-editor/v2/email/`](../components/tenant-editor/v2/email/)): Custom `VariableNode` (inline-Chip) + `MagicSectionNode` (block-Card mit X-Button zum Entfernen). Toolbar mit Bold/Italic/H2/H3/Listen/Link + Portal-Dropdowns für „+Variable" / „+Baustein" (kein Cropping mehr).
- **Live-Update:** Draft-State im `EmailsPanel`, Editor + Vorschau lesen denselben Draft → Vorschau aktualisiert sich bei jedem Keystroke.
- **Auto-Save:** Debounced 1.5 s nach letztem Keystroke. Status-Indikator: „Speichere…" / „Ungesichert · auto-save in ~1.5 s" / „Gespeichert".
- **Demo-Mode:** wenn API-Call fehlschlägt (z.B. Tabellen fehlen), Auto-Fallback auf 3 In-Memory Mock-Subscriptions mit gelbem Banner. Test/Logs sind im Demo-Mode disabled.

**Wiring:**
- [`/api/submit/route.ts`](../app/api/submit/route.ts): hartkodierter `sendAllEmails`-Call raus, `triggerEmailsOnSubmit` + `aggregateEmailStatusForSubmission` via `after()`.
- [`/api/track-progress/route.ts`](../app/api/track-progress/route.ts): kein E-Mail-Trigger (E-Mails haben kein after_page, das ist Webhook-Domain).
- [`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx): „E-Mails"-Tab aktiv (war disabled).
- [`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx): routet auf `EmailsPanel` (full-width, kein Canvas).

**Cleanup:**
- ❌ `lib/sendEmails.ts` gelöscht (hartkodiert)
- ❌ `emails/CustomerConfirmation.tsx` gelöscht
- ❌ `emails/TenantLeadNotification.tsx` gelöscht
- ❌ `lib/tracking.ts.updateEmailStatus` gelöscht (jetzt `aggregateEmailStatusForSubmission` in `lib/emails.ts`)
- ❌ `marked` dep deinstalliert (TipTap-Output ist HTML, kein Markdown nötig)

**Konsens-Entscheidungen (2026-05-31):**
- E-Mails = **Lead-Nurturing-Drip** (zeitversetzt). Nicht 1:1 zu Webhooks. Recipient nur customer|tenant (kein custom in v1). Trigger nur delay_minutes (kein after_page, kein on_abandoned).
- **TipTap-WYSIWYG** statt Markdown-Editor. Variablen + Bausteine als Chips, nicht als Token-Text. Neue Deps: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`.
- **In-Place-Editor** statt Modal — konsistent zu Funnel-Builder.
- **Live-Vorschau** mit Mock + echten Leads, resizable.
- **Auto-Save** mit 1.5 s Debounce.

**Polish-Iterationen nach erstem Migration-Apply (2026-05-31 Nachmittag → Abend):**

Nach dem ersten Doku-Pass folgten mehrere Runden Iteration auf Stavros-Feedback. Alle in derselben Branch `feature/aufgabe-41-emails-tab`, alle uncommitted bis zum finalen Commit.

- **CTA-Button-Baustein** (`components/tenant-editor/v2/email/CtaButtonNode.ts`): Custom TipTap-Block-Atom mit **inline editierbaren `label` + `url`-Attributen** (zwei `<input>`-Felder direkt im NodeView). Renderer in `lib/emailTemplates.ts` (`renderCtaButton`) generiert Brand-Color-Button. URL-Whitelist auf `^https?://` (XSS-Schutz). Verfügbar via „+Baustein"-Dropdown als „🔗 Link-Button". Ersetzt den vordefinierten `dashboard_button`-Magic-Section funktional (Legacy-Renderer bleibt für Backfill-Mails).
- **Anpassbarer Heading bei Antworten-Box + Kontakt-Box:** `MagicSectionNode` bekommt `heading`-Attribut. NodeView zeigt für `answers_overview` + `contact_summary` einen Heading-Input mit Placeholder vom Default-Wert. Speichert sich als `data-heading="..."`-Attribut. Renderer (`renderAnswersOverview`, `renderContactSummary`) schluckt optionalen `customHeading`.
- **Dashboard-Button aus Picker raus:** `AVAILABLE_TOKENS.magic` zeigt nur noch `answers_overview` + `contact_summary`. Legacy-Block bleibt im Editor-View für existierende Backfill-Mails ("Dashboard-Button (Legacy)"-Label im LABEL_MAP).
- **Drag-and-Drop für alle Block-/Inline-Atoms:** `draggable: true` auf `MagicSectionNode` + `CtaButtonNode` + `VariableNode`. `cursor: grab` im NodeView. TipTap-Native-Drag → Tenant verschiebt Bausteine/Variablen durch den Text. `stopEvent`-Handler sorgt dafür dass Inputs/Buttons im NodeView ihre normalen Events behalten.
- **Custom-Recipient (Migration `aufgabe_41_custom_recipient`):** Neue Spalte `email_subscriptions.recipient_value text NULL` + CHECK-Constraint-Erweiterung auf `recipient_type IN ('customer','tenant','custom')` + CHECK dass `recipient_value` bei `custom` gefüllt ist. **Multi-Recipient bis 3 Adressen** comma-separated im selben `recipient_value`-String (kein N:M-Schema-Refactor). Sender splittet beim Send, Resend bekommt `to: string[]`-Array (1 Send-Call, alle im To-Header). UI: dynamische Liste mit „+ Weitere Adresse"-Button + X-Button pro Adresse + Live-Email-Validation + DSGVO-Hinweis. **Bugfix unterwegs:** `addOne()` ändert nur lokalen State (kein onChange) — `serializeRecipients` filterte leere Slots raus → Add-Button machte vorher nichts.
- **3-Pane In-Place-Editor + Resizable Vorschau:** Add-Modal komplett gelöscht. Layout: Liste (280 px) · Editor (flex) · Vorschau (340-1100 px resizable, default 680). Drag-Handle als 6 px-Spalte zwischen Editor und Vorschau (`GripVertical`-Icon, Brand-Color bei Hover). Mail-Card in Vorschau auf `maxWidth: 600 px` mittig zentriert (= echte Mail-Breite). Inline `<style>`-Block in Vorschau überschreibt Tailwind-p/h/ul-Resets — Optik identisch zur Production-Mail.
- **Live-Vorschau via Draft-Lift:** Draft-State aus `SelectedEditor` ins `EmailsPanel` hochgezogen. Editor + Vorschau lesen denselben Draft → Update bei jedem Keystroke. `dirty`/`saving` jetzt im Parent.
- **Manual Save + UnsavedChangesModal:** Auto-Save (1.5 s Debounce) wieder entfernt nach User-Feedback („katastrophe, macht einen verrückt"). Speichern-Button bleibt sichtbar wenn dirty, Label wechselt zu „Speichere…" während Save. Bei Subscription-Switch mit dirty Draft zeigt jetzt **`UnsavedChangesModal`** (TriangleAlert-Icon, 3 Buttons Abbrechen/Verwerfen/Speichern) statt Browser-`confirm()`.
- **Karten-Toggle statt Selects:**
  - **Trigger**: 2 Karten „Sofort" (⚡) / „Verzögert" (🕒). Bei Verzögert öffnet sich Sub-Picker mit Number + Unit. Defaultet auf „1 Tag" beim Switch.
  - **Empfänger**: 3 Karten „An den Lead" (👤) / „An dich" (📥, zeigt konkrete `notification_email` darunter, amber Warnung wenn leer) / „Eigene Adresse" (@). Aktive Karte mit Brand-Border + Tint.
- **Inline-HTML-Styles für Mail-Render** (`inlineGenericTagStyles` in `lib/emailTemplates.ts`): nach der Variable-/Magic-/CTA-Substitution werden alle `<p>` / `<h2>` / `<h3>` / `<ul>` / `<ol>` / `<li>` / `<a>` / `<hr>` mit inline `style="…"` versehen. Bugfix: Gmail/Outlook stripen `<p>`-Margins aus CSS-Blöcken → Zeilenumbrüche aus TipTap (Enter = neuer `<p>`) waren in der echten Mail unsichtbar. Tags die bereits `style=` haben (Magic-Sections, CTA-Buttons) bleiben unverändert. Leere `<p></p>` (doppelter Enter) werden zu `<p>&nbsp;</p>` damit Browser sie nicht kollabieren.
- **Echte Lead-Daten in Vorschau:** Neue Route [`/preview-leads`](../app/api/tenant/funnels/%5Bslug%5D/preview-leads/route.ts) liefert top 5 completed Submissions. Dropdown im Vorschau-Header schaltet zwischen Mock-Lead (Max Mustermann) und echten Leads.
- **Test-Mail nimmt Draft-Daten:** `/test`-Route schluckt `draft_subject` / `draft_body_html` / `draft_recipient_type` / `draft_recipient_value` als Override. Frontend schickt immer den aktuellen Draft mit. So testet der Tenant immer den ungesicherten Stand.
- **Variable-Picker reduziert:** nur `Daten vom Lead` (contact.*) + `Datum/Zeit` (submitted_at). Funnel-Variablen (`funnel.name` etc.) aus dem Picker raus — die werden vom Tenant direkt getippt (sind nicht pro-Lead-dynamisch). `resolveVar()` versteht `{{funnel.*}}` weiterhin für Backwards-Compat mit Backfill-Mails.
- **Subject ohne Variable-Toolbar:** Subject-TipTap rendert nur das Eingabefeld, kein „+Variable"-Button mehr. Existing Chips aus Backfill werden weiter angezeigt.
- **Name inline editierbar im Header:** kein separates Name-Feld mehr im Body. Header hat Titel-gestylten `<input>` mit Hover-Border-Cue, Focus-Highlight, Pencil-Icon-Tooltip „Klick zum Umbenennen".
- **Tailwind-Canonical-Classes-Fixes** (6 Stellen): `h-[320px]` / `max-w-[320px]` / `h-[2px]` / `z-[60..100]` auf canonical-form (lints-clean).
- **Demo-Mode**: bei API-Fehler (Tabellen nicht da) fällt UI auf 3 In-Memory Mock-Subscriptions zurück + gelbes Banner. Im Demo-Mode sind Test-Send + Logs disabled.

**Migration-History für Aufgabe 41:**
1. `aufgabe_41_email_subscriptions` (2026-05-31 morgens) — initiale Tabellen + Backfill (24 Subscriptions)
2. `aufgabe_41_custom_recipient` (2026-05-31 abends) — `recipient_value` column + CHECK-Erweiterung für `custom`

**Konsens-Entscheidungen (2026-05-31):**
- E-Mails = **Lead-Nurturing-Drip** (zeitversetzt). Nicht 1:1 zu Webhooks. Trigger nur delay_minutes (kein after_page, kein on_abandoned).
- **TipTap-WYSIWYG** statt Markdown-Editor. Variablen + Bausteine als Chips, nicht als Token-Text.
- **In-Place-Editor** statt Modal — konsistent zu Funnel-Builder.
- **Live-Vorschau** mit Mock + echten Leads, resizable, identisch zur echten Mail.
- **Manuelles Speichern** statt Auto-Save (User-Kontrolle). Warn-Modal beim Verlassen.
- **CTA-Button** als anpassbarer Universal-Baustein (Label + URL inline editierbar). Vordefinierte Magic-Section-Variante `dashboard_button` aus Picker entfernt.
- **Custom-Recipient** mit max 3 Adressen pro Subscription (Resend-Kontingent-Schutz). Multi via comma-separated string ohne Schema-Refactor.
- **Inline-HTML-Styles** im Mail-Render (Gmail/Outlook-Kompatibilität).

**Bekannte Nice-to-Haves (verschoben, nicht-blockierend):**
- Mobile-Responsive (3-Pane bricht unter ~1100 px) — wird mit dem allgemeinen Design-Pass für alle Editor-Tabs gefixt.

---

## History (vorher)

## Aufgabe 40 — Webhook-Actions + Robustheits-Polish (2026-05-29)

**Update 2026-05-29 abends — Robustheits-Polish nach Smoke-Test:**
- ✅ Hotfix `submissions.tenant_slug` NOT NULL → NULLable (Pre-Existing Bug seit Aufgabe 26 entdeckt + gefixt)
- ✅ Race-Fix in `upsertSubmissionProgress`: track-progress überschreibt completed-Rows nicht mehr
- ✅ Name-Field-Types: `first_name`, `last_name`, `full_name` als first-class Field-Types, contact.name-Aggregation
- ✅ Field-Key-System: Auto-Gen + Editor-UI „Feldname im Export" + Stabilität bei Label-Re-Names + Live-Transform (Slug/Lowercase)
- ✅ Stable `_clientId` für ContactField-UI (verhindert UI-Remount bei Live-Key-Sync)
- ✅ Sender: 4xx → sofort failed (kein 9h-Retry-Spam gegen kaputte Tenant-URLs)
- ✅ `after_page`-Trigger LIVE verkabelt (Widget → /api/track-progress → triggerOnPageAdvance + server-side Dedup)
- ✅ `lead_price` aus Webhook-Payload (Pricing ist Abo-only Konsens)



**Status:** Branch `feature/aufgabe-40-webhook-actions`. Backend + Editor-UI komplett, Type-Check clean. Test-Smoke + Doku-Pass ausstehend, danach Merge.

**Strategischer Konsens (siehe Memory `strategy-action-modell`):** Webhooks sind dynamisch konfigurierbare Action-Elemente im Funnel-Editor — kein impliziter „feuert immer am Ende"-Automatismus. LeadPlug ist „eine Art Typeform-Klon", alle Output-Mechanismen (Webhook jetzt, E-Mail später) folgen demselben Pattern: eigener Tab im Editor, Liste pro Funnel, pro Action Trigger-Konfiguration. Der heutige hartkodierte Auto-Mail-Versand bei `/api/submit` ist „alt" und wird im Email-Tab-Sprint ebenfalls dynamisch.

**Umsetzungs-Highlights:**
- **Schema** (Migration `aufgabe_40_webhook_actions`, additive): `webhook_subscriptions.funnel_id` + `trigger_type` + `trigger_page_id`; `webhook_delivery_attempts.next_retry_at` + `response_status_code` + `response_body` + `event_type`; `submissions.abandoned_webhook_fired_at` + 4 neue Indices.
- **Sender** ([`lib/webhooks.ts`](../lib/webhooks.ts)): HMAC-SHA256-Signing im Stripe-Pattern `X-LeadPlug-Signature: t=<ts>,v1=<hex>`. Payload-Builder mit `answers[]` (Array, self-describing) + `answers_flat` (Map, label statt value). Test-Modus mit Mock-Daten.
- **Trigger** in [`/api/submit`](../app/api/submit/route.ts): `after(triggerOnSubmit(...))` — fire-and-forget via Next 16 `after()`.
- **Cron** ([`/api/cron/webhook-retry`](../app/api/cron/webhook-retry/route.ts)) alle 5 Min: (a) Retries mit Backoff (1m/5m/30m/2h/6h, dann failed) (b) Abbrecher-Trigger nach 10 Min Cooldown + Email-oder-Telefon-Check. Auth via `Authorization: Bearer $CRON_SECRET`.
- **CRUD-API** unter `app/api/tenant/funnels/[slug]/webhooks/...`: GET-Liste, POST-Create (returnt Secret 1×), GET/PATCH/DELETE pro Sub, `/test` (Mock-Senden), `/logs` (Delivery-Attempts).
- **Editor-Tab „Webhooks"** ([`components/tenant-editor/v2/WebhooksPanel.tsx`](../components/tenant-editor/v2/WebhooksPanel.tsx) + `WebhookAddModal.tsx`): Liste mit Cards, Add-Modal mit Trigger-Auswahl, Edit-Section mit URL/Events/Trigger-Konfig, Test-Button mit Status-Anzeige, Logs-Drawer mit Inspector (status_code + response_body), Secret-Rotation, Verify-Snippet-Tabs (Node/Python/PHP).
- **StepPill-Badge** (Modell 3 Hybrid): wenn `after_page`-Webhook auf Page X zeigt, rendert die Pill in der StepList ein violettes Webhook-Icon mit Count. Click springt in den Webhooks-Tab.
- **`vercel.json`** mit `crons: ["*/5 * * * *"]`.

**Konsens-Entscheidungen (2026-05-29):**
- Cooldown für abandoned-Trigger: **10 Min** (statt Stripe-default 30 Min — Speed-to-Lead ist im Lead-Gen wichtig).
- Webhooks sind **funnel-scoped** (1 Tenant kann je Funnel andere Endpoints konfigurieren).
- Payload-Format: **beides** (answers-Array für Zapier-Visual + answers_flat für Direct-CRM).
- field_keys bleiben **auto-generiert** (kein Editor-Override) — wenn ein Tenant fragt, in 1-2 Std nachgereicht.
- Action-Element-Modell statt Auto-Trigger — selber Pattern wird E-Mails-Tab später anwenden.

## Post-Sprint-Agenda (NACH Aufgabe 40)

1. **E-Mails-Tab dynamisch machen** — selbes Pattern wie Webhooks-Tab. Bestehender disabled Tab-Slot wird funktional.
2. **D.2 — Conversion-Tracking + Script-Loader-Embed** (~2-3 Tage) — Widget sendet bei Submit `postMessage`, Parent ruft `fbq()` / `gtag()`. Step-Tracking-Variante für Facebook-Funnel-Drop-Off-Analytics. **Performance-Marketing-Blocker.**
3. **D.3 — 3-5 Demo-Funnels als Templates** (~2-3 Tage) — Content.
4. **D.1 — Stripe Live** (~1 Tag) — aufgeschoben weil Testkunden `free`-Tier kriegen.
5. **(Optional)** C.4 Logic Jumps + Submit-Page-Cleanup.

---

## History

- **Embed-Snippet-Hardening + D.2-Erweiterung um Script-Loader-Embed ✅ (2026-05-28)**

  Stavros' Frage „ist mein iframe gut gebaut?" → kritische Bewertung + 3 kleine Hardenings im `lib/embedSnippet.ts`:

  1. **Origin-Check** — `if (e.origin !== ALLOWED) return;` mit `new URL(url).origin`. Schützt gegen fremde iframes auf der Tenant-Seite (Google-Ads, Cookie-Banner, etc.) die zufällig oder böswillig `funnel-resize`-shaped Messages senden könnten.
  2. **Height-Clamp** — `if (!h || h < 100 || h > 10000) return;` (statt `h > 0`). Defensive gegen versehentliche scrollHeight-Ausreißer.
  3. **`loading="lazy"` entfernt** — Lead-Funnels sitzen typisch above-the-fold, lazy verschärft nur Boot-Race-Edge-Cases (siehe gestern: nur per Console-Inject reproduziert) ohne Speed-Gewinn.

  Plus: Script in IIFE gewrapped (`(function(){...})();`) — verhindert Variable-Leaks im Parent-Window. Minified-Style (kompakt) damit Tenants den Code-Block visuell verstehen.

  **Wichtige Limitation transparent dokumentiert:** Diese Hardenings landen nur in NEUEN Snippets. **Bestehende Embeds auf Tenant-Seiten laufen mit der alten Logik weiter** — funktionieren ohne Bruch, kriegen aber die Hardenings nicht. Saubere Lösung dafür ist Aufgabe D.2 mit Script-Loader-Embed (Tenants kopieren `<script src="…/embed.js">` statt full Snippet → wir können das Script jederzeit zentral updaten ohne Tenant-Aktion).

  **D.2 in roadmap.md erweitert:** zusammengelegt mit Script-Loader-Embed (Typeform-Stil) weil beide denselben postMessage-Mechanismus nutzen. Aufwand 1-2 Tage → 2-3 Tage. iframe-Snippet bleibt als Fallback.

  **Files:** `lib/embedSnippet.ts`, `context/roadmap.md`, `context/current-feature.md`.

- **Polish-Runde 2 nach Aufgabe 39 — Cleanup + Date-Picker + 4 weitere ContactField-Types ✅ (2026-05-28)**

  Quick-Wins-Sprint vor Pause. 5 Punkte (A-E) abgehakt:

  - **A: Code-Cleanup** in funnel.tsx — ungenutzte `arrayMove`, `getOptionColSpanClasses`, `getOptionsGridClasses` + `gridClasses` rausgeworfen, deprecated-Warnings für `execCommand` mit eslint-disable-Kommentaren + Begründung
  - **B: Date-Inline-Kalender** mit `react-day-picker` v10 + `date-fns` v4 — lazy-loaded via `dynamic(() => import("./funnel/DateInlinePicker"), { ssr: false })`. Funnels ohne date-Field laden 0 KB Extra; mit date-Field landet ~30 KB beim ersten Render des Date-Steps. Brand-Theme via CSS-Custom-Properties (--rdp-accent-color etc.). de-Locale, weekStartsOn=1, single-mode mit min/max-Disable. Ersetzt HTML5-`<input type="date">` in 3 Pfaden (Question-Page + Custom-Page + Submit-Form)
  - **C: Slider als Custom-Field-Type** — ContactFieldConfig.type erweitert um `'slider'`, neue Felder `sliderMin/Max/Step/Unit/Default` in der Config. Widget rendert big number-readout + range input + min/max-Labels. PropertiesPanel hat 3-Spalten-Layout für Min/Max/Step + Standard + Einheit
  - **D: Multi-Choice als Custom-Field-Type** — ContactFieldConfig.type um `'multi_choice'` erweitert. Widget rendert vertikale Card-Liste mit Checkbox-Indikator (selected = Brand-Tint + Border). Answer-Storage als comma-separated string, parsing über `split(",").filter(Boolean)`
  - **E: Rating + Scale als Custom-Field-Types** — beide nutzen die existierenden `RatingStars` und `ScaleButtons` Helper-Komponenten aus Aufgabe 39 (Code-Reuse). Configs `ratingMaxStars`, `scaleMin/Max/LabelLeft/LabelRight` in ContactFieldConfig
  - **Bonus:** `buildContactFieldConfig` + `fieldRowToContactConfig` als zentrale Helper für Write/Read in `lib/editorUtils.ts` — vermeidet die zuvor verteilte Logik in Submit-Page + Custom-Page-Mappings, ein Ort der ContactFieldConfig-Schema-Wahrheit

  **Field-Type-Picker im Custom/Submit-PropertiesPanel hat jetzt 14 Types** (war 5 vor Aufgabe 39): text, long_text, email, tel, plz, number, slider, date, checkbox, radio, multi_choice, dropdown, rating, scale

  **Files:**
  - `package.json`: + react-day-picker v10 + date-fns v4
  - `components/funnel/DateInlinePicker.tsx` neu (~70 LOC) — Brand-themable Day-Picker mit min/max + de-Locale
  - `components/funnel.tsx`: lazy-loaded DateInlinePicker, alle 3 date-Pfade portiert, ungenutzte Helper raus, 4 neue Custom-Field-Branches (Multi-Choice/Slider/Rating/Scale), 4 gleiche Branches im Submit-Form-Render
  - `types/index.ts`: ContactFieldConfig.type erweitert + 9 neue optionale Config-Felder (slider*, ratingMaxStars, scale*)
  - `lib/editorUtils.ts`: buildContactFieldConfig + fieldRowToContactConfig Helper, CONTACT_TYPE_TO_FIELD_TYPE + OPTION_BASED_CONTACT_TYPES + fieldTypeToContactType-Switch erweitert
  - `lib/getTenantConfig.ts`: fieldTypeToContactType-Switch erweitert
  - `lib/validateContactField.ts`: Validation für multi_choice/slider/rating/scale
  - `components/tenant-editor/v2/EditorShell.tsx`: labelByType-Record erweitert
  - `components/tenant-editor/v2/properties/AddContactFieldPicker.tsx`: 4 neue Picker-Entries, RATING_PILL als 4. Kategorie-Farbe
  - `components/tenant-editor/v2/properties/FieldProperties.tsx`: ContactFieldProps mit isSlider/isRating/isScale-Branches + 3 neue Config-Sektionen
  - `components/tenant-editor/v2/PropertiesPanel.tsx`: SortableContactFieldRow iconByType + pillByType um 4 Types erweitert
  - `components/tenant-editor/v2/fieldMeta.ts`: contactFieldTypeLabel-Switch erweitert

  **Wie testen:**
  1. Funnel öffnen, Custom-Karte hinzufügen → „+ Feld hinzufügen" → jetzt 14 Types statt 5
  2. Slider-Feld konfigurieren (Min 0 Max 200 Einheit „kWh") → testen → großer Number-Readout
  3. Date-Feld → testen → Inline-Kalender lädt asynchron (lazy)
  4. Multi-Choice mit 3 Options → testen → Checkbox-Cards mit Brand-Tint
  5. Rating 5 Sterne → testen → Hover-Preview funktioniert
  6. Scale 0-10 mit Labels → testen → NPS-Style-Buttons-Reihe

- **Polish-Iteration nach Aufgabe 39 (Sammel-Commit) ✅ (2026-05-28)**

  Stavros-Feedback-Runde nach Aufgabe 39, in zwei Schwüngen abgearbeitet:

  **Schwung 1 — Defaults + neue Types:**
  - **Welcome-Constraints:** `handleAddWelcome` ignoriert atIndex und fügt IMMER an Position 0 ein. Bei vorhandenem Welcome wird der bestehende selektiert statt einen zweiten anzulegen (max 1 pro Funnel).
  - **Custom-Karte Defaults:** `makeDefaultCustomPage` startet mit `customFields: []` statt vorbefüllten Name+Email-Defaults (Stavros: „sind oft fehl am Platz"). User fügt eigene Felder per Picker hinzu.
  - **Eye-Toggle in FieldRow:** Sichtbarkeit jetzt direkt per Klick neben dem Müllkorb umschaltbar (Eye/EyeOff-Icon). Unsichtbare Felder kriegen 60% Opazität — auf einen Blick erkennbar.
  - **Required default TRUE:** `defaultContactField` setzt `required: true` bei jedem neuen Feld. Stavros-Rationale: wer ein Feld hinzufügt will i.d.R. dass es ausgefüllt wird.
  - **5 neue ContactField-Types:** `long_text` (Textarea), `number` (numeric input), `date` (HTML5 date picker — Inline-Kalender geplant für nächste Iteration), `checkbox` (single boolean mit `checkboxLabel`), `dropdown` (select mit options). Picker-Modal zeigt jetzt 10 Types statt 5. Widget rendert in beiden Pfaden (Custom-Page + Submit-Page-Form), Validation in `validateContactField`.

  **Schwung 2 — UX-Bugs & Visual-Builder-Polish:**
  - **Welcome +Option-Bug:** Welcome-Screens hatten fälschlich „+ Option hinzufügen" gerendert (weil questionType-Fallback „single_choice" den Choice-Block triggerte). Fix: `!isWelcomeStep`-Guard im Widget-Render.
  - **Hidden-State im Canvas:** statt „Diese Frage ist ausgeblendet"-Placeholder rendert das Canvas die hidden-Page jetzt normal, aber mit 50% Opazität + Grau-Overlay + Eye-Off-Badge oben rechts („Ausgeblendet"). Tenant sieht den Inhalt weiter, weiß aber sofort dass sie im Live nicht erscheint. `buildQuestions` mit neuem `keepHidden`-Flag.
  - **Custom-Karte leer im Canvas:** wenn `customFields.length === 0`, rendert das Widget jetzt einen großen dashed-Border-Button „+ Feld hinzufügen" in Brand-Tint statt leerem Bereich. Click öffnet einen Shell-Level-AddContactFieldPicker (neu in EditorShell). Picker im Properties-Panel bleibt unverändert — beide arbeiten unabhängig.
  - **Drag-Handle auf ganzem Pill:** StepPill nimmt den DnD-Listener jetzt am Outer-Container statt nur am Grip-Icon-Span. Komplettes Pill ist draggable, Click vs Drag wird von der `activationConstraint: { distance: 4 }` der PointerSensor automatisch unterschieden — kurzer Klick = onClick, Bewegung > 4px = Drag.

  **Files (Sammel-Liste):**
  - `types/index.ts`: ContactFieldConfig.type erweitert + optional `checkboxLabel`
  - `components/tenant-editor/defaults.ts`: makeDefaultCustomPage leer
  - `components/tenant-editor/v2/EditorShell.tsx`: handleAddWelcome enforcement + defaultContactField labels + required=true + canvasFieldPickerOpen-State + Shell-Level AddContactFieldPicker-Render
  - `components/tenant-editor/v2/properties/FieldRow.tsx`: Eye-Toggle-Button + Opazitäts-Indicator
  - `components/tenant-editor/v2/properties/AddContactFieldPicker.tsx`: 5 neue Picker-Entries
  - `components/tenant-editor/v2/properties/FieldProperties.tsx`: ContactFieldProps mit hasOptions (radio+dropdown), Checkbox-Label-Field
  - `components/tenant-editor/v2/PropertiesPanel.tsx`: SortableContactFieldRow Icon+Pill-Map erweitert + onToggleVisible-Verkabelung
  - `components/tenant-editor/v2/fieldMeta.ts`: contactFieldTypeLabel für neue Types
  - `components/tenant-editor/v2/StepPill.tsx`: Drag-Listener am Outer-Container, Grip-Icon nur visuell
  - `components/tenant-editor/v2/CenterCanvas.tsx`: Hidden-Overlay-Render + onAddCustomFieldRequest-Pass-Through
  - `lib/editorUtils.ts`: CONTACT_TYPE_TO_FIELD_TYPE + fieldTypeToContactType + buildQuestions.keepHidden
  - `lib/getTenantConfig.ts`: fieldTypeToContactType-Switch erweitert
  - `lib/validateContactField.ts`: Validation für long_text/number/date/checkbox/dropdown
  - `components/funnel.tsx`: Custom-Page-Render + Submit-Form-Render jeweils 5 neue Type-Branches, `!isWelcomeStep`-Guard, `onAddCustomFieldRequest` Prop + Empty-State-Button

  **Files:**
  - `types/index.ts`: ContactFieldConfig.type erweitert + optional `checkboxLabel`
  - `components/tenant-editor/defaults.ts`: makeDefaultCustomPage leer
  - `components/tenant-editor/v2/EditorShell.tsx`: handleAddWelcome enforcement + defaultContactField labels + required=true
  - `components/tenant-editor/v2/properties/FieldRow.tsx`: Eye-Toggle-Button + Opazitäts-Indicator
  - `components/tenant-editor/v2/properties/AddContactFieldPicker.tsx`: 5 neue Picker-Entries
  - `components/tenant-editor/v2/properties/FieldProperties.tsx`: ContactFieldProps mit hasOptions (radio+dropdown), Checkbox-Label-Field
  - `components/tenant-editor/v2/PropertiesPanel.tsx`: SortableContactFieldRow Icon+Pill-Map erweitert + onToggleVisible-Verkabelung
  - `components/tenant-editor/v2/fieldMeta.ts`: contactFieldTypeLabel für neue Types
  - `lib/editorUtils.ts`: CONTACT_TYPE_TO_FIELD_TYPE + fieldTypeToContactType erweitert
  - `lib/getTenantConfig.ts`: fieldTypeToContactType-Switch erweitert
  - `lib/validateContactField.ts`: Validation für long_text/number/date/checkbox/dropdown
  - `components/funnel.tsx`: Custom-Page-Render + Submit-Form-Render jeweils 5 neue Type-Branches

  **Wie testen:**
  1. Custom-Karte anlegen → kommt leer, Stand Standard-Add-Button für Felder
  2. Custom-Karte mit allen 10 Field-Types befüllen (text/long_text/email/tel/plz/number/date/checkbox/radio/dropdown)
  3. Auge-Icon neben einem Feld klicken → Feld wird grau + ausgeblendet im Widget
  4. Welcome-Screen 2x anlegen → 2. Klick selektiert den bestehenden (max 1 enforced)

- **Aufgabe 39 — Page+Elements-Erweiterung: Welcome + Rating/Scale/Statement + End-Screen-Redirect + Builder-Cleanup ✅ (2026-05-28)**

  Strukturell-feature-getriebene Erweiterung im Polish-Loop. Stavros' Vision: Builder muss mehr Element-Types haben (besonders Rating/Scale für Lead-Quali-Karten), Welcome- und End-Screens sollen erstklassige Konzepte sein. Außerdem gestrichene Vorlagen-Section (Stavros: „die sind imo schrott") + Custom-Karte als primäre Action prominent.

  **Drei strategische Pfade in einem Sprint:**

  1. **Neue Element-Types:** `rating` (1-N Sterne mit Hover-Preview), `scale` (0-N Buttons NPS-Style mit optionalen left/right Labels), `statement` (Info-Block ohne Input). Statt vollständigem Page+Elements-Refactor (~3 Tage) pragmatisch in QuestionType-Union ergänzt — ~80% Code-Reuse von slider/number-Pattern.
  2. **Welcome-Screen** als neue `kind="welcome"` Variante + neue `page_type='welcome'`. Eigene Pill-Farbe (indigo). Renders: kein Step-Counter, eigener Button-Label (z.B. „Los geht's →"), Click → handleNext.
  3. **End-Screen-Redirect-Modus:** `funnels.redirect_url text NULL`. Wenn gesetzt → Widget zeigt Success-Page 1.5s an (für Tracking-Pixel) + window.location.replace(url). Toggle im Success-Page-PropertiesPanel.

  **Schema-Migration `aufgabe_39_page_elements` (additive):**
  - `ALTER TYPE page_type ADD VALUE 'welcome'`
  - `ALTER TYPE field_type ADD VALUE 'rating' | 'scale' | 'statement'`
  - `ALTER TABLE funnels ADD COLUMN redirect_url text NULL`
  - PG erlaubt kein DROP VALUE — DOWN-File dokumentiert manuellen Recovery-Pfad

  **Editor-Cleanup (Stavros-Forderungen):**
  - **Vorlagen-Section komplett raus** aus AddElementModal — „Kontakt/Adresse/Ja-Nein"-Vorlagen waren Schrott (Custom-Pages erfüllen denselben Zweck flexibler)
  - **Custom-Karte als prominentes Top-Element** im AddElementModal (statt unten als Section-Item)
  - **Adresse-Quick-Card** als neuer Top-Button → erzeugt Custom-Page vorausgefüllt mit Straße/Hausnr/PLZ/Ort
  - **Welcome-Screen-Button** als 3. Top-Card-Option
  - **Auto-Advance bleibt nur single_choice** (Rating/Scale/Statement haben OK-Button, Welcome hat Custom-Button-Label)

  **Files:**
  - Migration `aufgabe_39_page_elements.sql` (lokal + Production via mcp__supabase__apply_migration)
  - `types/index.ts`: 3 neue QuestionType-Werte, RatingConfig + ScaleConfig + StatementConfig + WelcomeConfig, EditorQuestion erweitert um ratingMaxStars/scaleMin/scaleMax/scaleLabelLeft/scaleLabelRight/welcomeButtonLabel + kind="welcome", EditorState.redirectUrl, TenantConfig.redirectUrl
  - `lib/editorUtils.ts`: page_type "welcome" in beide Mapping-Pfade, neue field_type-configs in buildQuestionConfig (rating/scale/statement), dbToEditorState liest config-Werte zurück, buildQuestions reicht kind="welcome" durch, VALID_QUESTION_TYPES erweitert, editorStateToFunnelRow schreibt redirect_url
  - `lib/getTenantConfig.ts`: page_type "welcome" im Filter + Render, redirect_url im SELECT + Mapping, VALID_QUESTION_TYPES für neue Types
  - `components/funnel.tsx`: isWelcomeStep + isStatementStep + isCustomStep-Branching, neue render-Blocks für rating + scale (eigene RatingStars + ScaleButtons Helper-Components), Welcome rendert ohne Step-Counter, OK-Button-Label berücksichtigt kind="welcome" + welcomeButtonLabel, useEffect für End-Screen-Redirect nach Submit (1.5s delay), redirectUrl als neuer Prop
  - `components/TenantFunnelClient.tsx`: redirectUrl-Prop durchreichen
  - `components/tenant-editor/defaults.ts`: makeDefaultWelcomePage + makeAddressCustomPage + Default redirectUrl
  - `components/tenant-editor/v2/fieldMeta.ts`: QUESTION_META erweitert um rating/scale/statement (yellow + gray pills), WELCOME_META export (indigo)
  - `components/tenant-editor/v2/AddElementModal.tsx`: komplett refactored — Vorlagen weg, neue Top-Section mit 3 Karten (Custom/Adresse/Welcome), Einzelne-Felder-Grid mit den neuen Types automatisch über QUESTION_TYPE_OPTIONS
  - `components/tenant-editor/v2/StepList.tsx`: kind-basierte Meta-Selection (welcome → WELCOME_META), onAddAddressCard + onAddWelcome Props
  - `components/tenant-editor/v2/EditorShell.tsx`: handleAddVorlage entfernt, handleAddAddressCard + handleAddWelcome hinzu, Imports + Wiring
  - `components/tenant-editor/v2/PropertiesPanel.tsx`: neue WelcomeProps-Section (kind="welcome"), SuccessProps erweitert um Redirect-Mode-Toggle + URL-Input
  - `components/tenant-editor/v2/properties/FieldProperties.tsx`: neue Properties-Blocks für rating (max stars) + scale (min/max/labels) + statement (Hinweistext), required-Toggle für statement ausgeblendet

  **Wie testen:**
  1. Editor → „Frage hinzufügen" → neues Modal: 3 Karten oben (Custom / Adresse / Welcome), unten Einzelne Felder (jetzt mit Sterne-Rating / Skala / Info-Block dabei)
  2. Welcome-Screen anlegen → Title/Subtitle/Button-Label im Right-Panel anpassen → „Funnel testen" → Welcome ist erster Step ohne Step-Counter
  3. Rating-Frage anlegen → Properties: Anzahl Sterne anpassen → „Funnel testen" → Hover über Sterne zeigt Preview, Click setzt Wert
  4. Skala-Frage anlegen → min/max/Labels anpassen → Test → NPS-Style Buttons mit Labels darunter
  5. Adresse-Quick-Card → Custom-Page mit 4 Adress-Feldern direkt vorbefüllt
  6. End-Screen-Redirect: Erfolgsseite wählen → Toggle „Nach Submit auf URL weiterleiten" → URL eintragen → Test → nach Submit zeigt Success-Page 1.5s + redirect

  **Bewusst NICHT in Aufgabe 39:**
  - Vollumbau zu Page+Elements-Model (Pages enthalten N beliebige Elements aller Typen) — pragmatisch über kind-Diskriminator gelöst statt Schema-Reset
  - Image-Element (braucht Storage-Bucket-Setup, Stavros hatte Logo abgelehnt — defer)
  - Page+Elements-Tree-Editor (Stavros hat das selbst als „später" markiert)
  - WYSIWYG-Inline-Edit war schon da (EditableText im Widget greift via fieldRef auf state.questions[i].title — funktioniert für alle kinds)

- **Aufgabe 38 — Custom Multi-Field-Pages (Karten mit beliebig vielen Feldern, überall platzierbar) ✅ (2026-05-28)**

  Strukturelle Erweiterung mitten im Polish-Loop. Stavros hat erkannt: die Submit-Page ist im Kern eine Multi-Field-Karte mit Titel + N hide/show-baren Feldern + Validation pro Field-Typ — wir verstecken das Pattern nur künstlich am Ende. Lösung: generische „Custom Multi-Field Page" als 3. Page-Type, überall im Funnel platzierbar.

  **Schema:** `ALTER TYPE page_type ADD VALUE 'custom'` — additive Migration, kein Daten-Touch, bestehende Funnels bleiben unverändert. PG kein DROP VALUE → DOWN-File dokumentiert manuelle Recovery-Pfade.

  **Datenmodell:**
  - `state.questions[]` bleibt single ordered Liste — beide Page-Typen (`kind: "question" | "custom"`) leben gemischt drin, sortiert nach Array-Position
  - Custom-Pages haben `customFields: ContactFieldConfig[]` (= dieselbe Type wie Submit-Page Contact-Fields, Reuse statt Duplikation)
  - Title/Subtitle der Custom-Page landen in `pages.config jsonb` ({title, subtitle, page_key}), Fields normal in `fields`-Tabelle
  - Antworten in `submissions.answers` jsonb keyed by `field_key` (gleich wie Question-Pages)

  **Widget (`components/funnel.tsx`):**
  - Neuer abgeleiteter Zustand `isCustomStep` (`currentQuestion.kind === "custom"`)
  - `isChoiceType` und `isWeiterDisabled` mit Custom-Branch erweitert: Custom = nie auto-advance, OK-Button validiert alle required Custom-Fields per `validateContactField`
  - Eigener Render-Block für Custom-Step direkt vor den question-Type-Renders, rendert die `customFields` als vertikalen Stack (radio + text/email/tel/plz wie Submit-Page)
  - Auto-Advance-Branch (single_choice) schützt jetzt explizit gegen `kind === "custom"` (Fallback-questionType "single_choice" sonst hätte fälschlich getriggert)

  **Editor-UI:**
  - `fieldMeta.ts` — neues `CUSTOM_META` (Orange-Pill, „▥"-Icon) für visuelle Differenzierung in der StepList
  - `defaults.ts` — `makeDefaultCustomPage()`-Factory: neue Karte kommt mit 2 Default-Fields (Name + Email) damit Tenant einen Startpunkt hat
  - `AddElementModal.tsx` — neuer Top-Section „Karte mit mehreren Feldern" (über Vorlagen + Einzelfeldern), 1 Klick legt Custom-Page an
  - `StepList.tsx` — Custom-Pages nutzen CUSTOM_META statt questionMeta für StepPill-Rendering
  - `PropertiesPanel.tsx` — neue `CustomPageProps` Section: Title + Subtitle + Sichtbarkeit + Drag-Reorder der Custom-Fields + AddContactFieldPicker-Reuse + Lösch-Button (anders als Kontaktformular ist Custom-Page löschbar)
  - `EditorShell.tsx` — 5 neue Handler: `handleAddCustomPage`, `handlePatchCustomField`, `handleAddCustomField`, `handleDeleteCustomField`, `handleReorderCustomFields`

  **Mapping (`lib/editorUtils.ts` + `lib/getTenantConfig.ts`):**
  - Read-Pfad: `pages` mit `page_type === "custom"` interleaved sortiert mit question-Pages, jeweils zur `EditorQuestion` mit `kind: "custom"` + customFields rekonstruiert
  - Write-Pfad: für jeden `state.questions[]`-Entry wird je nach `kind` entweder eine question-Page (1 Field) oder eine custom-Page (N Fields, Title/Subtitle in page-config) angelegt
  - `pages.config` muss jetzt mitgequeriert werden (war vorher nicht im SELECT) — beide Stellen aktualisiert (`getTenantConfig`-SQL-Query + Tenant-Funnels-API)
  - `buildQuestions(state)` reicht Custom-Pages mit `kind: "custom"` + sichtbaren `customFields` an's Widget durch

  **Aufgabe-37-Refix-Nebeneffekt:** Custom-Pages haben durch die mehreren Felder mehr vertikalen Content und nutzen die `p-4 @md:p-8` Standard-Card-Padding — Beweis dass der Polish-Fix funktioniert.

  **Wie testen:**
  1. Editor öffnen → „Frage hinzufügen" → Modal zeigt „Karte mit mehreren Feldern" als Top-Option → Klick legt orange Custom-Page mit Default Name+Email an
  2. Custom-Page-Properties: Titel + Untertitel anpassen, Felder per Picker hinzufügen (z.B. PLZ + Telefon), Felder per Drag reordnen, Sichtbarkeit umschalten
  3. „Funnel testen" → Custom-Page rendert als Multi-Field-Karte mit Back+OK-Bar, Validation blockiert OK wenn required Field leer
  4. Speichern → Reload → Custom-Page mit allen Feldern persistiert (page_type='custom' in DB, Fields normal)

  **Files:**
  - Migration `aufgabe_38_add_custom_page_type` (additive Enum-Value, lokal + Production)
  - `types/index.ts`: kind + customFields auf EditorQuestion und QuestionConfig
  - `lib/editorUtils.ts`: kind-Branch in editorStateToPagesAndFields + dbToEditorState + buildQuestions + Type-Updates auf DbPageRow + PageInsertRow
  - `lib/getTenantConfig.ts`: kind-Branch in mapDbRow + SQL-Query um `config` ergänzt
  - `app/api/tenant/funnels/[slug]/route.ts`, `app/dashboard/funnels/[slug]/edit/page.tsx`: `config` zur pages-SELECT-Liste
  - `components/tenant-editor/defaults.ts`: makeDefaultCustomPage + DEFAULT_QUESTION explizit kind="question"
  - `components/tenant-editor/v2/fieldMeta.ts`: CUSTOM_META + CUSTOM_PILL + category "custom"
  - `components/tenant-editor/v2/AddElementModal.tsx`: neue Top-Section + onSelectCustomPage-Prop
  - `components/tenant-editor/v2/StepList.tsx`: kind-basierte Meta-Selection für Pill-Render + onAddCustomPage-Prop
  - `components/tenant-editor/v2/PropertiesPanel.tsx`: neue CustomPageProps-Komponente + 4 neue Handler-Props
  - `components/tenant-editor/v2/EditorShell.tsx`: 5 neue Handler + makeDefaultCustomPage-Import + Prop-Wiring
  - `components/funnel.tsx`: isCustomStep + visibleCustomFields + isCustomStepValid + Custom-Render-Block + Auto-Advance-Guard

- **C.2 — Theme-Panel (Brand-Farbe, Schrift, Layout) ✅ (2026-05-28)**

  Fünfter und finaler Sprint-Schritt. Macht die Theme-Felder, die seit Phase B in der DB stehen und vom Widget gerendert werden, im Builder editierbar — vorher musste man Brand-Color, Font, Border-Radius manuell in der DB ändern.

  **Stavros-Entscheidung im Scope:** Logo-Upload bewusst rausgenommen („das ist unnötig auch wenn manche Firmen das wollen"). C.2 ist damit reine Theme-Felder ohne Storage-Bucket-Setup.

  **Was geht jetzt:** Klick auf den „Design"-Tab in der Top-Bar (war vorher disabled) → StepList verschwindet (Theme ist funnel-weit), Properties-Panel wird zum ThemePanel mit Color-Pickern, Font-Dropdown, Border-Radius-Slider mit 8 Stufen, Max-Width-Presets. CenterCanvas zeigt das Widget live mit den Änderungen.

  **UI-Sections im Panel:**
  - **Markenfarbe:** Brand · Text · Hintergrund Card · Seiten-Hintergrund (mit Klar/Transparent-Toggle für letzteres)
  - **Schrift:** Dropdown (System / Inter / Poppins / Roboto)
  - **Layout:** Ecken-Rundung-Slider (0/2/4/8/12/16/24/32 px) + Max-Width-Presets (480/600/720/900/100%)

  **Files:**
  - `components/tenant-editor/v2/ThemePanel.tsx` neu (~220 LOC): ColorField mit `<input type="color">` + Hex-Text-Input + optionalem Transparent-Toggle, Select-Wrapper mit inline-SVG-Chevron, Range-Slider auf Radius-Index, Section/Field/Header-Building-Blocks
  - `components/tenant-editor/v2/TopTabs.tsx`: „Design"-Tab `disabled: false` (war als geplant aber tot eingebaut)
  - `components/tenant-editor/v2/EditorShell.tsx`: Body rendert konditional — bei `activeTab === "design"` 2-Spalten-Layout (Canvas + ThemePanel), sonst 3-Pane wie gehabt

  **Wie testen:**
  1. Editor öffnen, „Design"-Tab klicken → StepList weg, ThemePanel rechts
  2. Brand-Farbe ändern → CenterCanvas zeigt sofort den neuen Akzent
  3. Border-Radius-Slider bewegen → Card-Ecken rundlicher/eckiger live
  4. Speichern → Reload → Werte persistieren

- **C.1d — v1-Editor Cutover ✅ (2026-05-28)**

  Vierter Sprint-Schritt. Alter v1-Editor (Single-Pane mit Accordion) komplett entfernt. v2 (3-Pane WYSIWYG) ist seit Aufgabe 32 stabil, der `?v=2`-Flag war nur Übergangs-Schutz.

  **Was raus ist:**
  - 12 v1-Komponenten in `components/tenant-editor/` (FunnelEditorShell, EditorSidebar, PreviewPanel, EmailPreviewMockup, LeadEmailPreviewMockup, HealthCheckPanel, SectionAccordion, SectionFragen, SectionKontakt, SectionTexte, SectionDesign, SlugInput) — ~120 KB / ~3000 LOC
  - 2 v1-Client-Wrapper (`FunnelEditorClient.tsx` in `[slug]/edit` und `new/`)
  - `?v=2`-Routing-Conditional in beiden page.tsx-Files
  - `searchParams: Promise<{ v?: string }>` Props weg

  **Was bleibt:**
  - `components/tenant-editor/defaults.ts` (DEFAULT_EDITOR_STATE, DEFAULT_QUESTION, DEFAULT_CONTACT_FIELDS — werden von v2 + lib/editorUtils genutzt)
  - `components/tenant-editor/DeleteFunnelButton.tsx` (nicht editor-spezifisch, in FunnelCard verwendet)
  - `components/tenant-editor/v2/*` (alles)

  **Rename:** `FunnelEditorClientV2.tsx` → `FunnelEditorClient.tsx` in beiden Routen, damit das v2-Suffix konsistent verschwindet.

- **Aufgabe 37 — Floating-Nav-Bug im Live-Widget gefixt ✅ (2026-05-28)**

  Dritter Sprint-Schritt. Der Bottom-Right Floating-Nav (ChevronUp/Down für zurück/weiter) hat im Live-iFrame nicht wie erwartet gerendert — visuell überlappt sie auf schmalen Embeds den Content-Bereich. Im Builder war's nicht sichtbar, weil die Canvas dort immer ≥ 720px breit ist.

  **Root cause:** Content-Div hatte `p-4 @md:p-8 @md:pb-20` — der 80px-Bottom-Padding wurde erst ab `@md` (~448px Card-Breite via Container-Query) angewendet. Live-Embeds in Sidebars / Mobile sind oft schmaler → kein pb-20, Floating-Nav (absolute bottom-4) klebt auf dem Content.

  **Fix in `components/funnel.tsx`:**
  - Content-Div: `p-4 pb-20 @md:p-8` — `pb-20` greift jetzt immer
  - Floating-Nav-Wrapper: `z-10` hinzu (defensive Stacking-Garantie gegen die framer-motion AnimatePresence-Slide-Layer), unnötiger `@container` raus

- **Aufgabe 36 — Lead-Inbox 3 Tabs (Completed / Abgebrochen-mit-Email / Abgebrochen-ohne-Email) ✅ (2026-05-28)**

  Zweite Aufgabe im Builder-Final-Sprint. Macht die Partial-Submissions-Architektur von Aufgabe 34 im UI sichtbar — vorher liefen abgebrochene Sessions still in der DB ohne sinnvollen Tenant-Zugriff.

  **Was geht jetzt:** `/dashboard/leads` zeigt 3 Tabs mit Badge-Counts pro Bucket. Default-Tab ist „Abgeschlossen". Tenant kann zu „Abgebrochen — mit E-Mail" wechseln und gezielt nachfassen (= wertvollster Lead-Pool laut Pricing-Logik) oder zu „Abgebrochen — ohne E-Mail" um Tracking-Spuren zu sehen.

  **Bucket-Klassifikation** (Server-Side in `app/dashboard/leads/page.tsx`):
  - `completed`: `completed_at IS NOT NULL` (finaler Submit-Klick wurde ausgelöst)
  - `abandoned_with_email`: `completed_at IS NULL` UND `contact.email` befüllt
  - `abandoned_without_email`: `completed_at IS NULL` UND keine Email

  **Konsequente Konsistenz:** weitere Server-Queries gefiltert auf `completed_at IS NOT NULL`, damit Abbrecher nirgendwo als „echte Leads" erscheinen:
  - `app/dashboard/page.tsx`: Recent-Leads-Liste + 14-Tage-Chart
  - `app/dashboard/statistiken/page.tsx`: Monatliche Conversion-Counter
  - `app/dashboard/kontakte/page.tsx`: CRM-Kontakte-Liste
  - `app/dashboard/funnels/page.tsx`: Lead-Count pro Funnel

  **Files:**
  - `app/dashboard/TenantLeadsTable.tsx`: `bucket` + `completed_at` im Type, Tab-State, Bucket-Filter im `filtered`-Memo, Tab-UI mit aktiven/inaktiven Pills + Badge-Counts, Header-Titel reflektiert den aktiven Tab
  - `app/dashboard/leads/page.tsx`: Query ergänzt um `completed_at`, Bucket-Computation pro Row
  - `app/dashboard/page.tsx`: `.not('completed_at','is',null)` auf beiden Submissions-Queries, bucket=`'completed'` in der Mapping
  - `app/dashboard/statistiken/page.tsx`: gleicher Filter auf Monthly-Conversion
  - `app/dashboard/kontakte/page.tsx`: gleicher Filter auf CRM-Liste
  - `app/dashboard/funnels/page.tsx`: gleicher Filter auf Lead-Count-pro-Funnel

  **Wie testen:**
  1. Funnel mit Skip-Mode ohne Submit-Page bauen + Email-Question dabei → halb durchklicken + Tab schließen → in Lead-Inbox-Tab „Abgebrochen — mit E-Mail" auftauchen
  2. Funnel mit Submit-Page → komplett durchklicken → Tab „Abgeschlossen" hat den Lead
  3. Funnel anfangen, ohne Email-Eingabe abbrechen → Tab „Abgebrochen — ohne E-Mail"

- **Aufgabe 35 — Submit-Schritt optional + Skip-Mode mit Auto-Finish ✅ (2026-05-28)**

  Erste von 5 Aufgaben im Builder-Final-Sprint (Branch `feature/builder-final-sprint`). Reihenfolge: 35 → 36 → 37 → C.1d → C.2, alles in einem Branch, ein Merge am Ende.

  **Was geht jetzt:** Tenant kann auf der Submit-Page-Properties einen Toggle „Submit-Schritt aktiviert" ausschalten. Resultat: Widget endet nach der letzten Frage direkt auf der Erfolgsseite, der OK-Button der letzten Frage wird zu „Absenden" und feuert `/api/submit`. Bestehende Funnels bleiben auf Default `false` (= Submit-Page bleibt sichtbar), kein Verhalten-Drift.

  **Pricing-Backstop für Skip-Mode:** Da im Skip-Mode kein Kontaktformular existiert, baut der Tenant Email/Telefon als reguläre Question-Pages ein. Damit die Partial-Submission-Pricing-Logik (`contact->>'email'`) weiter trifft, synthetisiert der Server `contact` per Pattern-Match aus answers (Email-Regex + Telefon-Regex + name-Key-Heuristik). Sowohl `/api/track-progress` als auch `/api/submit` nutzen diesen Backstop nur im Skip-Mode (nicht-Skip bleibt unverändert).

  **Schema:**
  - Migration `aufgabe_35_funnels_skip_submit_step`: `ALTER TABLE funnels ADD COLUMN skip_submit_step boolean NOT NULL DEFAULT false`. Additiv, reversibel via DOWN.
  - Lokal: `supabase/migrations/20260528220000_aufgabe_35_funnels_skip_submit_step.sql` + DOWN.

  **Files:**
  - `types/index.ts`: `EditorState.skipSubmitStep` + `TenantConfig.skipSubmitStep`
  - `components/tenant-editor/defaults.ts`: Default `false`
  - `lib/editorUtils.ts`: Mapping in `editorStateToFunnelRow` + `dbToEditorState`
  - `lib/getTenantConfig.ts`: Spalte in SELECT + Mapping
  - `lib/tracking.ts`: neue Helper `deriveContactFromAnswers(answers)` mit Email/Phone/Name-Pattern-Match
  - `components/tenant-editor/v2/PropertiesPanel.tsx`: Toggle „Submit-Schritt aktiviert" auf Submit-Page-Properties, disabled-Style für TextInput wenn Submit deaktiviert
  - `components/tenant-editor/v2/StepList.tsx`: Submit-StepPill wird `hidden` + Titel „(übersprungen)" wenn skip aktiv
  - `components/tenant-editor/v2/CenterCanvas.tsx`: neuer Placeholder `SubmitSkippedPlaceholder` wenn skip + Submit-Step im Editor ausgewählt
  - `components/funnel.tsx`: neuer Prop `skipSubmitStep`, `totalSteps`/`isContactStep` respektieren Flag, `autoFinish`-Helper, `handleSelect` + `handleNext` feuern Auto-Finish auf letzter Frage, OK-Button-Label wechselt zu „Absenden"
  - `components/TenantFunnelClient.tsx`: `skipSubmitStep` durch zu `<Funnel>`
  - `app/api/submit/route.ts`: skipMode → keine Contact-Field-Validation + effectiveContact via `deriveContactFromAnswers` für Submission-Row + sendAllEmails
  - `app/api/track-progress/route.ts`: gleicher Backstop für Partial-Submissions

  **Wie testen:**
  1. Editor: Funnel öffnen, „Kontaktformular" in der Sidebar wählen → Toggle „Submit-Schritt aktiviert" ausschalten → Canvas zeigt Placeholder, StepPill ist ausgegraut mit „(übersprungen)"
  2. Save, dann „Funnel testen" → durchklicken bis letzte Frage → OK-Button heißt jetzt „Absenden" → Klick zeigt Success-Page
  3. Live: Funnel ohne Submit-Schritt mit Email-Question-Page einbauen, Submit auslösen, in `submissions` prüfen: `contact->>'email'` ist befüllt aus answers

- **Aufgabe 34 — C.1c WYSIWYG-Edit + Widget-Typeform-Redesign + Icons-Cleanup + Type-Cleanup + Partial-Submissions-Infra ✅ (2026-05-28)**

  Größte Aufgabe seit Phase B. Drei parallele Strategie-Stränge in einem Sprint. Zwei Checkpoint-Commits (`60ab73d`, `d5373fd`). +1310 / −1360 LOC netto, 44 Files. 2 DB-Migrationen direkt auf Production appliziert.

  **Strategischer Hintergrund (Stavros-Entscheidungen während des Sprints):**
  1. **Icons radikal raus aus Code + DB** — Begründung: A/B/C/D Letter-Chips als Default decken 90% der Use-Cases, IconPicker mit Lucide-Icons + Custom-Solar-Icons war Branchen-Relikt, Tenants brauchen das nicht. Bestehende Icon-Daten werden aus DB gestrippt (kein Rückkanal — Brand-Decision).
  2. **Email + Tel als Question-Types raus** — waren nur Text-Inputs mit anderem Browser-Keyboard, Validation findet erst beim Submit statt. Bleiben als ContactField-Types auf Submit-Page (`text` / `email` / `tel` / `plz` / `radio`).
  3. **Partial Submissions als Pricing-Hebel** — Submit-Only-Save war Handwerker-Funnel-Relikt aus der Pre-Typeform-Zeit. Neue Architektur: jede User-Session bekommt eine DB-Row mit `session_id` UPSERT-Identität + `completed_at` Flag. Abbrecher mit Email werden zu nutzbaren Leads, statt verloren zu gehen. Tenant-Pricing zählt "Completed + Abandoned-mit-Email" als Lead.
  4. **DSGVO bewusst ignoriert** — kein Engineering, kein Consent-Click. Rechtsgrundlage Art. 6 (1) (b) "Vertragsanbahnung" greift bei Lead-Funnels per default. Tenants verantworten ihre Datenschutzerklärung. Anpassung wenn zahlende Tenants nachfragen.

  ### Checkpoint 1 — `60ab73d` C.1c WYSIWYG-Edit + Widget-Typeform-Redesign + Canvas-Interactions

  **C.1c WYSIWYG-Edit (Builder-side):**
  - Click-Select im CenterCanvas → blauer Outline + PropertiesPanel synct
  - **CSS-Bug-Fix**: `var(--color-primary)` → `var(--funnel-primary)` in `hl()`/`hlEdge()` (Highlight-Outline war seit Anfang unsichtbar)
  - Inline-Edit via `contentEditable` für 8 Stellen (question_title/subtitle, option-labels, contact_form_title/subtitle, submit_button, success_message, response_message). EditableText-Helper: uncontrolled, suppressContentEditableWarning, blur-commit, Esc-revert via skipNextCommit-Ref, Enter=commit (Tag), Plain-Text-Paste via `execCommand("insertText")`.
  - `cursor: text` (I-Beam) in editMode-Branch — override Parent-`cursor: pointer`
  - `parseFieldRef`-Router in `EditorShell.handleTextChange` mapped Field-Identifier → State-Patches via diskriminerte Branches
  - Bidirektionaler Sync: PropertiesPanel-FieldRow-Klick auf Submit-Page setzt `selectedFieldRef = "contact_field_<key>"` → blauer Outline auf entsprechendem Center-Element
  - `editMode`-Short-Circuit in `handleSelect/handleNext/handleBack/handleToggleMultiple` (kein Step-Advance bei Edit-Klick)
  - Option-Wrapper switcht `<button>` → `<div role="button" tabIndex={-1}>` in editMode (Button schluckt contentEditable-Klicks)
  - Submit-Button-`type` switcht `"submit"` → `"button"` in editMode (kein Form-Submit bei Test-Klick)
  - `handlePreviewClick` (in onClickCapture auf Funnel-Root): in editMode KEIN `stopPropagation`/`preventDefault` (sonst feuern Canvas-Buttons wie Duplicate/Delete nicht). Live-Mode behält beide.
  - Esc-Listener in EditorShell deselected
  - Click-into-empty (Canvas-Background) deselected via `e.target === e.currentTarget`-Check

  **Widget-Redesign Typeform-Stil (Live + Builder-Preview, dieselbe Funnel-Komponente):**
  - Step-Counter oben links: monospace `1 →` Bubble in Brand-Color
  - Title `font-light text-2xl/3xl` links-ausgerichtet (statt `font-bold text-center`)
  - Subtitle gefadet, leichter, links
  - Choice-Options HORIZONTAL: A/B/C/D Letter-Chip LINKS + Label RECHTS (statt vertikal Icon-on-Top Bubble). Pro Option: kompakter `border rounded` mit `color-mix` Brand-Color-Background bei Selected.
  - Multi-Choice: Check-Icon-Indicator zusätzlich, Letter rechts gefadet (Tastatur-Hinweis-Pattern)
  - Letter-Fallback in funnel.tsx (vorerst — wurde in Checkpoint 2 komplett entfernt): bei leerem iconKey/iconUrl A/B/C/D im Bubble statt HelpCircle-?-Fallback
  - Text-Inputs (`short_text`, `long_text`, `date`, `number`, `dropdown`) Underline-only, kein Box-Border, `font-light text-xl/2xl`
  - Number-Input mit Unit-Suffix rechts (inline-baseline-aligned)
  - Checkbox Custom-Style mit Check-Icon
  - Slider: text-4xl/5xl font-mono font-bold Number-Readout in Brand-Color über dem Range, Min/Max-Labels mono
  - **1px Progress-Bar oben am Card-Rand** (mit `color-mix(in srgb, ...)` als Track-BG) — animiert mit Step-Progress, ersetzt die alte 8px-dicke Progress-Bar in der Mitte
  - Inline "OK ✓"-Button unter jedem non-single-choice Step (Typeform-Pattern)
  - **Enter im Text-Input committed** direkt → `handleNext()`
  - Single-Choice Auto-Advance 325 → 250ms, `setSlideDirection(1)` für Slide-Richtung
  - Submit-Button kompakter "OK ✓"-Style mit Check-Icon (statt full-width mit Chevron-Arrow)
  - **Bottom-Right Floating-Nav**: kleine Pille mit ChevronUp (zurück) + ChevronDown (weiter), nur in `!editMode` sichtbar. Bekannt: rendert in Live nicht wie erwartet, Layout-Issue offen (eigener Mini-Fix-Sprint).
  - **framer-motion `AnimatePresence` + `motion.div`** mit Spring-Slide zwischen Steps: variants y ±80, opacity-Fade, transition `spring stiffness 300 damping 30`. Slide-Richtung per `slideDirection` State (1=forward, -1=backward) in handlers gesetzt.
  - Per-Tenant-Theme bleibt vollfunktional (Brand-Color, Background, Font, Radius via CSS-Custom-Properties `--funnel-primary` etc.)
  - Card-Wrapper bekommt `position: relative` für absolute Bottom-Nav-Positioning
  - Live-iFrame-Compat: `editMode` default false → alle editMode-conditional Logiken sind tot in Production, kein Verhalten-Drift.

  **Polish:**
  - Right PropertiesPanel 320 → 420 px (matched links, mehr Edit-Komfort)
  - **Pin-Edge-Insert** in StepList: zwischen je zwei Step-Pills (und oberhalb der ersten Frage) hover-revealed Edge-Zone mit `+`-Button → öffnet `AddElementModal` mit Insert-Position. `handleAddQuestion/handleAddVorlage` haben jetzt optionales `atIndex`-Argument.

  **Canvas-Interactions (Choice-Options im Editor):**
  - DndContext + SortableContext um Choice-Options in editMode → Drag-Reorder per `@dnd-kit/sortable` (auf Hover sichtbare GripVertical-Handle links)
  - Duplicate + Delete-Buttons rechts pro Option (auf Hover sichtbar). Delete schützt vor letzter Option.
  - "+ Option hinzufügen"-Link direkt unter Optionen in editMode
  - 4 neue Handler in `EditorShell`: `handleAddOption`, `handleReorderOptions`, `handleDuplicateOption`, `handleDeleteOption` — alle über `selected.questionIndex`
  - `buildQuestions` in `lib/editorUtils.ts`: neue Option `{ keepEmpty?: boolean }`. CenterCanvas ruft mit `keepEmpty: true` (außer in TestMode) → leere Optionen erscheinen sofort im Canvas mit Placeholder-Rendering. Live-Widget unverändert (`keepEmpty` default false).
  - Wert-Eindeutigkeit in `buildQuestions`: bei Duplicate kollidierende Values werden mit `_2`, `_3` etc. suffixed → keine React-Key-Collision

  **Neue Dependency:**
  - `framer-motion ^12.40.0` (~50kb gzipped, MIT, für Slide-Animations zwischen Steps)

  ### Checkpoint 2 — `d5373fd` Icons-Cleanup + Type-Cleanup + Partial-Submissions-Infra

  **Icons komplett raus (Code + DB):**
  - **DB-Migration `aufgabe_34_strip_icon_keys_from_field_options`**: UPDATE auf `fields.options` jsonb mit `jsonb_agg(o - 'icon_key' - 'icon_url' ORDER BY sort_order)` für Rows wo `EXISTS(... WHERE o ? 'icon_key' OR o ? 'icon_url')`. Vor Migration: 45 Fields, 175 Option-Einträge mit Icon-Daten. Nach Migration: 0. DO-Block-Assertion am Ende der Migration verifiziert.
  - `types/index.ts`: `EditorOption` + `Option` ohne `iconKey`/`iconUrl`
  - `funnel.tsx`: `renderIcon`-Import + Aufruf komplett entfernt, Choice-Render zeigt immer A/B/C/D Letter-Chip
  - `lib/editorUtils.ts`, `lib/getTenantConfig.ts`: `icon_key`/`icon_url` aus jsonb-Mapping raus
  - Vorlagen + defaults: stop setting iconKey/iconUrl
  - v1 `SectionFragen`: `IconPicker`-Import + Usage raus, `handleOptionIconChange` gelöscht
  - **Files komplett gelöscht (22 Files, −1060 LOC):** `components/icons.tsx` (renderIcon), `components/dashboard/IconPicker.tsx` (302 LOC IconPicker), `components/icons/` (16 Solar-Custom-Icons + _base + index + Lucide-Anleitung), `app/icons/page.tsx` (Lucide-Browser-Dev-Tool)

  **Type-Cleanup (Code-only, KEINE DB-Migration nötig):**
  - DB-Check vor Cleanup: alle 12 email- + 12 tel-Fields liegen auf submit-Pages (= ContactFields), NULL auf Question-Pages. Daher keine Daten zu migrieren.
  - `types/index.ts QuestionType`: 11 → 9 Types entfernt (`email`, `tel`)
  - `lib/editorUtils.ts`: `VALID_QUESTION_TYPES`, `TEXTISH_TYPES`, `buildQuestionConfig`-Switch bereinigt
  - `components/tenant-editor/v2/fieldMeta.ts QUESTION_META`: email + tel entfernt
  - `components/tenant-editor/v2/vorlagen.ts` Kontakt-Vorlage: email/tel-questionType → `short_text` (Auto-Placeholder bleibt)
  - `components/tenant-editor/SectionFragen.tsx` QUESTION_TYPE_LABELS + isText
  - `components/funnel.tsx` render-Branches: short_text-Branch deckt jetzt nur noch short_text (email/tel-Sub-Branches entfernt)
  - `components/tenant-editor/PreviewPanel.tsx` `buildMockAnswers`: email/tel-Mock-Antworten raus
  - `components/tenant-editor/v2/properties/FieldProperties.tsx` `isText`-Check entschlackt
  - **ContactField-Types unverändert** (`text`/`email`/`tel`/`plz`/`radio`) für Submit-Page — die haben echte Bedeutung im Lead-Daten-Mapping

  **Partial-Submissions Infrastruktur:**

  **DB-Migration `aufgabe_34_partial_submissions_schema`:**
  - `submissions.session_id uuid NOT NULL UNIQUE` (UPSERT-Identität)
  - `submissions.completed_at timestamptz NULL` (NULL = abgebrochen / in Bearbeitung, gesetzt = finaler Submit)
  - Backfill: 26 bestehende Rows haben `session_id = id`, `completed_at = COALESCE(created_at, NOW())` (alle als completed markiert)
  - Indices: `(tenant_id, completed_at NULLS FIRST)` + partial `(tenant_id, created_at DESC) WHERE completed_at IS NULL AND contact->>'email' nicht leer` für Lead-Inbox-Tabs

  **`lib/tracking.ts`:**
  - Neue `upsertSubmissionProgress({sessionId, ..., completed?})`: UPSERT auf session_id via `.upsert(row, { onConflict: 'session_id' })`. Setzt optional `completed_at = NOW().toISOString()`. Idempotent bei Reload/Race.
  - Bestehender `logSubmission` bleibt für Backwards-Compat (Insert-Only, nicht mehr von `/api/submit` aufgerufen — könnte später entfernt werden)

  **Neuer Endpoint `/api/track-progress/route.ts`:**
  - Akzeptiert `{sessionId, tenant, answers, contact, honeypot, sourceUrl, userAgent}`
  - sessionId-Validierung gegen UUID-v4-Regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
  - Honeypot-Bot-Filter (kein DB-Schreiben bei Treffer)
  - **Bewusst KEIN Rate-Limit** (würde tippenden User mit 30 Keystrokes blocken — Rate-Limit gibt's nur in `/api/submit`)
  - **Bewusst KEINE Validation** (Final-Validation passiert in `/api/submit`)
  - UPSERT mit `completed: false` → `completed_at` bleibt NULL
  - Fehler werden geschluckt, Endkunde bekommt immer `success: true`

  **`/api/submit/route.ts` angepasst:**
  - Nutzt jetzt `upsertSubmissionProgress` statt `logSubmission`
  - Akzeptiert optionalen `sessionId`-Field, fällt auf neue `crypto.randomUUID()` zurück wenn fehlt (Legacy-Client-Kompat)
  - Setzt `completed: true` → `completed_at = NOW()`
  - Restlicher Flow unverändert (Validation, `lead_price` server-side aus tenantConfig, Mails via `sendAllEmails`, Email-Status-Update)

  **`components/TenantFunnelClient.tsx`:**
  - `getOrCreateSessionId(slug)`: nutzt `sessionStorage` mit Key `lp_session_<slug>` (Tab-scope, neue Tab = neue Session). Fallback auf flüchtige UUID bei Private-Mode/Storage-Gesperrt.
  - Neuer `handleAnswersChange`-Callback fires nach Funnel-Debounce auf `/api/track-progress`
  - `lastSentRef`-Deduplizierung: skippt identische Payloads via JSON-Stringify-Vergleich
  - `handleSubmit` sendet jetzt zusätzlich `sessionId` an `/api/submit`
  - Fehler beim track-progress werden geschluckt (finaler Submit ist Garant)

  **`components/funnel.tsx` neue Prop + Effect:**
  - Neuer Prop `onAnswersChange?: (data: { answers, contact }) => void`
  - useEffect mit 600ms-Debounce auf `[answers, contactData]` feuert Callback (außer in `editMode` / `isSubmitted`)
  - Editor-Mode bekommt `onAnswersChange` nicht → kein Tracking im Builder

  ### Verifikation

  - `npx tsc --noEmit` durchgehend exit 0 nach jedem Block
  - `npm run build` ohne Errors am Ende beider Checkpoints
  - DB-Migrations: Read-Only-Verify-Queries nach Apply: 0 verbleibende icon_key/icon_url Einträge, 26/26 Rows mit session_id + completed_at
  - SSR-Probes: v2-Builder-Route 307 (Login-Redirect = Compile sauber), Live-Widget 200
  - Visuelle Tests durch Stavros: Drag-Reorder + Duplicate + Delete im Canvas funktionieren nach Propagation-Fix (Capture-Phase stopPropagation eat'te Button-Clicks — wurde in editMode entfernt)

  ### Bekannte offene Punkte für Folge-Aufgaben

  1. **Aufgabe 35 (klein, ~1.5 Std):** Submit-Button als Default off / Auto-Finish nach letzter Frage. Neue Spalte `funnels.skip_submit_step boolean DEFAULT false`. Editor v2 PropertiesPanel-Toggle. Widget honoriert Flag → kein isContactStep-Render. Optional Vorlage „Bestätigungs-Schritt".
  2. **Aufgabe 36 (mittel, ~2-3 Std):** Lead-Inbox 3 Tabs (Completed / Abgebrochen-mit-Email / Abgebrochen-ohne-Email). Schema-Indices stehen bereits. UI-Arbeit am Dashboard.
  3. **Aufgabe 37 (klein, ~1 Std):** Bottom-Right Floating-Nav-Bug in Live-Widget — rendert nicht wie erwartet trotz `!editMode`. Vermutlich Layout-/Position-Issue im iFrame-Context.

  ### Bewusst NICHT angefasst in diesem Sprint

  - **Multi-Field-auf-Question-Page** (Auslegung B) — bleibt explizit Future-Feature. Vorlage „Kontakt" erzeugt weiter mehrere separate Steps.
  - **DSGVO-Engineering** (Consent-Click am Anfang, Cookie-Banner, etc.) — bewusst auf Phase-D-Launch verschoben oder erst wenn zahlende Tenants fragen.
  - **Lokale Migration-Files für die 2 DB-Migrationen** — werden mit dem Doku-Commit ergänzt.

  *Branch:* `feature/aufgabe-34-wysiwyg-edit` (noch nicht in main gemerged zum Commit-Zeitpunkt der zwei Checkpoints).

  *Checkpoints:*
  - `60ab73d` feat(builder+widget): Aufgabe 34 Checkpoint 1 — C.1c WYSIWYG-Edit + Widget-Typeform-Redesign + Canvas-Interactions
  - `d5373fd` feat(builder+widget+api): Aufgabe 34 Checkpoint 2 — Icons-Cleanup + Type-Cleanup + Partial-Submissions-Infra
  - (+ kommender Doku-Commit + Merge-Commit)

- **Aufgabe 33 — Phase C.1b (Vorlagen + Field-Level-Properties + Submit-Multi-Field-UI) ✅ (2026-05-28)**

  Macht den v2-Editor zum tatsächlichen Builder. Bis C.1a war's nur das Gerüst mit Page-Level-Settings; C.1b ergänzt Vorlagen für Quick-Start, type-spezifische Field-Properties für alle 11 Question-Types, und Multi-Field-Editierung der Submit-Page (Kontaktformular). Code live (Commit `e6640a8`), Production-Smoke-Test grün.

  **Auslegung A bekräftigt:** Vorlagen erzeugen mehrere separate Steps im Funnel (Typeform-Stil "eine Frage pro Bildschirm"), nicht eine Multi-Field-Karte. Multi-Field-auf-Question-Page (echte FormFlow-Multi-Field-Card mit funnel.tsx-Touch) bleibt explizit Future-Feature on-demand, kein C.1b-Scope.

  **Plan-Reorder vor Implementierung:** Ursprünglicher C.1b war "WYSIWYG-Click-Select + Inline-Edit"; ursprünglicher C.1c "Multi-Field + Vorlagen". Nach Iteration mit Stavros umgetauscht — Multi-Field-Foundation muss vor WYSIWYG-Polish kommen, sonst Inline-Edit halbgar. Neu: C.1b = Multi-Field + Vorlagen, C.1c = WYSIWYG-Polish.

  **Vorlagen (Quick-Start-Sets):**
  - `components/tenant-editor/v2/vorlagen.ts` neu. `Vorlage`-Interface mit `build(): EditorQuestion[]` für Fresh-IDs pro Aufruf.
  - 3 initiale Vorlagen: **Kontakt** (Name short_text + E-Mail + Telefon, 3 Steps), **Adresse** (Straße + PLZ als short_text mit maxLength=5 + Stadt + Land als dropdown mit DE/AT/CH, 4 Steps), **Ja-Nein** (single_choice mit 2 Options, 1 Step).
  - `AddElementModal.tsx` zweisektionig: oben "Vorlagen" als Icon-Kachel-Grid mit Beschreibung, unten "Einzelne Felder" gruppiert in Text-Eingabe / Auswahl / Numerisch & Datum.
  - Zwei Modal-Callbacks: `onSelectType(QuestionType)` (Einzelfeld → 1 Page) + `onSelectVorlage(Vorlage)` (Vorlage → N Pages).
  - `StepList`-Prop neu: `onAddVorlage`. `EditorShell.handleAddVorlage(vorlage)` ruft `vorlage.build()` und appended an `state.questions[]`, selektiert die erste neue Frage.

  **Field-Level-Properties (Question + Submit gemeinsamer Pattern):**
  - `components/tenant-editor/v2/properties/FieldRow.tsx` neu (107 LOC) — gemeinsame expandierbare Field-Zeile. Props: icon, pillClass, label, typeLabel, expandable (toggelbar), expanded, onToggle, optional dragHandleProps, optional onDelete, children (= FieldProperties wenn expanded).
  - `components/tenant-editor/v2/properties/FieldProperties.tsx` neu (335 LOC) — discriminated Union `kind: "question" | "contact"`. Pro Field-Type passende Inputs:
    - Text/Long/Email/Tel: Placeholder + MaxLength.
    - Single/Multi-Choice/Dropdown: OptionsEditor (Drag-Reorder + Add + Delete + IconPicker).
    - Slider: Min/Max/Step/Default + Einheit.
    - Number: Min/Max/Step/Default + Einheit.
    - Date: Min/Max/Default (ISO YYYY-MM-DD).
    - Checkbox: CheckboxLabel.
    - Contact-text/email/tel/plz: Label + Placeholder + Required + Visible.
    - Contact-radio: Label + Required + Visible + SimpleStringList (string[]-Options inline).
  - `components/tenant-editor/v2/properties/OptionsEditor.tsx` neu (156 LOC) — @dnd-kit/sortable für `EditorOption[]`-Reorder, plus IconPicker pro Option (aus `components/dashboard/IconPicker.tsx` wiederverwendet).
  - Question-Page: FieldRow ist permanent expandiert (`expandable={false}`, `expanded={true}`) — 1 Field pro Page, keine Toggle-Logik nötig.
  - Submit-Page: FieldRows kollabierbar, lokaler `expandedKey`-State in `SubmitProps`.

  **Submit-Page Multi-Field-UI:**
  - `contactFields[]` jetzt als FieldRow-Liste mit @dnd-kit/sortable Drag-Reorder rendert. Reorder-Handler synchronisiert `sort_order` zur neuen Array-Position.
  - `components/tenant-editor/v2/properties/AddContactFieldPicker.tsx` neu (115 LOC) — kleines Modal mit den 5 erlaubten Submit-Types (text/email/tel/plz/radio), NICHT der vollen Question-Type-Palette (Submit hat eigenes Type-Schema).
  - `EditorShell` neue Handler: `handlePatchContactField(key, patch)`, `handleAddContactField(type)`, `handleDeleteContactField(key)`, `handleReorderContactFields(next)`. Plus `defaultContactField(type, existingFields)`-Helper: generiert eindeutigen `custom_<base36>_<rand>`-Key, befüllt label/required/visible/sort_order + Default-Options bei radio.
  - Delete pro Feld erlaubt — kein System-Field-Schutz, identisch zum v1-Verhalten in SectionKontakt.

  **PropertiesPanel.tsx refactor (315 LOC → 411 + 200 ≈ 600 LOC):**
  - 4 neue Props neben den bestehenden 5: `onPatchContactField`, `onAddContactField`, `onDeleteContactField`, `onReorderContactFields`.
  - `QuestionProps`: Section "Seite" (Fragetyp/Titel/Untertitel/Sichtbarkeit unverändert) + neue Section "Feld dieser Seite" (1 permanent-expandierter FieldRow mit FieldProperties) + Action-Section (Löschen).
  - `SubmitProps`: Section "Seite" (Überschrift/Untertitel/Button-Text) + Section "Felder dieser Seite" (DndContext + SortableContext + N kollabierbare FieldRows + "+ Feld hinzufügen"-Button + AddContactFieldPicker-Modal) + Hinweis-Section.
  - `SuccessProps`: unverändert (kein Feld).
  - Eigener `useEffect` resettet expandedKey wenn das expandierte Field gelöscht wurde.

  **Verifikation:**
  - `npx tsc --noEmit` exit 0.
  - `npm run build` ohne Errors.
  - Lokaler Smoke-Test im Browser auf `?v=2`: Vorlagen-Klick erzeugt erwartete Step-Counts (3/4/1), Field-Properties editierbar pro Type (Options-Reorder/Add, Slider-Range, Date-ISO, Checkbox-Label), Submit-Page Multi-Field Drag-Reorder + Add + Edit + Delete funktional, Save persistiert, Reload zeigt alles persistiert. Alter Editor ohne `?v=2` unverändert.

  **Bekannte Trade-offs:**
  - Submit-Page-Field-Types unterscheiden sich strukturell von Question-Page-Field-Types (eigenes 5er-Schema vs 11er-Schema, options als string[] vs EditorOption[]). FieldProperties.tsx hat zwei interne Sub-Komponenten ohne Code-Sharing — bewusst, da die Type-Sets nicht überlappen.
  - Question-Page-FieldRow ist immer expandiert — wenn später Multi-Field-auf-Question-Page kommt, muss `expandable` umgeschaltet werden und das FieldRow-Pattern wird zur kollabierbaren Liste wie heute auf Submit-Page. Architektur ist forward-compatible.
  - SimpleStringList für Contact-radio-Options hat keinen Drag-Reorder (nur Add/Edit/Delete) — bewusst kleiner Scope, kann bei Bedarf später nachgezogen werden.

  **Nicht in dieser Aufgabe (eigene Sprints):**
  - WYSIWYG Click-Select im Center-Preview + Inline-Edit + A/B/C/D-Letter-Prefixes + Floating-Toolbar → **C.1c (nächste Aufgabe)**. Typeform-Style-Adaption wird hier reingezogen (kein separater Widget-Refactor-Sprint).
  - Pin-Edge-Insert zwischen Steps → C.1c (optional, evtl. später)
  - Slide-Animationen zwischen Steps → C.7, von Stavros am 2026-05-28 als „noch nicht final" markiert, bleibt eigener Sprint on-demand
  - Design-Tab-Inhalt (Theme-Panel) → C.2

  **Korrektur am Roadmap-Eintrag dieser Aufgabe (2026-05-28):** Nach dem ersten Smoke-Test bekam Claude den Eindruck, Stavros wolle einen 1-2-Wochen Widget-Komplettrefactor. Roadmap + Memory wurden in dieser Richtung angepasst. Stavros korrigierte direkt danach: Style-Richtung (Typeform light/clean, A/B/C/D-Prefixes) ist klar, aber Animationen sind nicht final und kein Komplettrefactor gewollt. Roadmap zurück auf C.1c als nächsten Schritt, Typeform-Patterns werden in C.1c direkt im CenterCanvas-Render adaptiert.

  *Branch:* `feature/aufgabe-33-builder-multifield` mit `--no-ff` in main gemerged.

  *Commits:*
  - `e6640a8` feat(builder): Aufgabe 33 (Phase C.1b) — Vorlagen, Field-Level-Properties, Submit-Multi-Field-UI
  - Merge-Commit auf main (Vercel-Auto-Deploy)

- **Aufgabe 32 — Phase C.1a (Editor-Shell v2: 3-Pane Builder hinter ?v=2) ✅ (2026-05-28)**

  Erster der drei C.1-Sub-Sprints für den neuen Builder. Parallel-Build des Typeform-Stil 3-Pane-Shells unter `/dashboard/funnels/[slug]/edit?v=2` und `/dashboard/funnels/new?v=2`. Alter Editor unverändert ohne Searchparam. Zero-Risk-Rollback: v2/-Folder + 2 zusätzliche Client-Files + 2 Routing-Conditionals lassen sich isoliert entfernen.

  **Strategischer Hintergrund:**
  - CLAUDE.md §5 "kein Visual Builder" wurde mit Stavros explizit überstimmt — Builder ist *das* Verkaufsargument im Demo-Gespräch und muss ≥ 70% Typeform-Niveau erreichen (laut Fokus-Roadmap).
  - "Kein 2D-Canvas" bleibt — Funnel bleibt linear. WYSIWYG-Edit ist im Center-Pane, nicht in einem freien React-Flow-Canvas.
  - C.1 wurde in 3 mergbare Sub-Sprints zerlegt: C.1a (Shell + Reorder + Page-Level-Properties), C.1b (Multi-Field-pro-Page + Vorlagen + Field-Level-Properties), C.1c (WYSIWYG-Click-Select + Inline-Edit). Reihenfolge nach Iteration mit Stavros umgestellt — Multi-Field war ursprünglich C.1c, ist jetzt C.1b.

  **Layout (alle drei Panes auf einer Höhe, escaping des Dashboard-`max-w-7xl`-Wrappers via `fixed inset-x-0 bottom-0; top: 64px`):**
  - Links (420px): StepList mit allen Pages des Funnels — farbcodierte Pillen pro Field-Type (Text=blau, Choice=violett, Dropdown=lila, Numeric=mint, Submit=pink, Success=grün). Drag-Reorder via `@dnd-kit/sortable`. "+ Frage hinzufügen" öffnet das AddElementModal.
  - Mitte (flex-1): CenterCanvas rendert das bestehende `<Funnel>`-Widget (read-only in C.1a) mit Theme/Funnel/Questions-Adapter aus `lib/editorUtils.ts`. Desktop/Mobile-Toggle + "Funnel testen"-Toggle analog v1.
  - Rechts (320px): PropertiesPanel mit Page-Level-Settings — Fragetyp-Dropdown (alle 11 Types), Titel, Untertitel, Sichtbarkeit-Toggle, Löschen für Question-Pages. Submit-Page: Überschrift + Untertitel + Button-Text + statische Kontaktfeld-Liste. Success-Page: Erfolgs-Texte. Field-Level-Properties (Optionen, Min/Max, Placeholder etc.) sind explizit in C.1b.

  **Top-Tabs als Stubs:** `Inhalt` aktiv, `Design`/`Logik`/`E-Mails`/`Einbinden` disabled mit Tooltip "Bald verfügbar". Tab-Slot ist jetzt da, kein Re-Layout in späteren Phasen nötig.

  **AddElementModal:** Modal-Overlay mit Grid aller 11 Fragetypen, gruppiert in "Text-Eingabe" (short_text, long_text, email, tel) / "Auswahl" (single_choice, multi_choice, dropdown) / "Numerisch & Datum" (number, slider, date, checkbox). Klick → `defaultQuestion(type)` erzeugt eine question-Page mit type-spezifischen Defaults (Options nur wenn type single/multi/dropdown). In C.1b kommt darüber die "Vorlagen"-Sektion (Kontakt, Adresse, Ja/Nein als pre-built Multi-Field-Pages).

  **State-Mgmt mirror v1 (kritisch wegen Dirty-State-Vertrag):**
  - `JSON.stringify(state) !== JSON.stringify(initialState)` — exakt gleicher Vergleich wie v1, keine Sub-Object-Rekonstruktion (Key-Order-Drift würde Dirty-State false-positiv triggern).
  - `window.__editorGuard` mit identischer Signatur `(href: string) => void` — konsumiert von `TabNav.tsx:17`, `DashboardHeader.tsx:27`, `UserMenu.tsx:15`. Exit-Modal triggert bei dirty-state-Nav.
  - Save-Flow identisch: POST `/api/tenant/funnels` (create) oder PUT `/api/tenant/funnels/[slug]` (edit) mit `{ state }` body. `?v=2` wird bei Redirect nach Save erhalten (`withV2Flag()`).
  - NamePrompt-Modal und Exit-Modal analog v1 reimplementiert (kein Code-Sharing weil parallel-Build).

  **Neue Files (alle unter `components/tenant-editor/v2/`):**
  - `EditorShell.tsx` (444 LOC) — Top-Level, State-Mgmt, Save, Exit-Guard, Modals
  - `TopTabs.tsx` (71) — Tab-Leiste mit Stubs
  - `StepList.tsx` (164) — DndContext + SortableContext + Fragen + Abschluss-Sektion
  - `StepPill.tsx` (80) — einzelner Listen-Eintrag (sortable + non-sortable)
  - `CenterCanvas.tsx` (171) — Funnel-Wrapper, Desktop/Mobile/Test-Toggle, Placeholder für Hidden/Empty
  - `PropertiesPanel.tsx` (411) — Page-Level-UI, alle drei Page-Types
  - `AddElementModal.tsx` (109) — Fragetyp-Grid mit Kategorien
  - `fieldMeta.ts` (83) — Farben/Icons/Labels pro Field-Type (single source)
  - `types.ts` (16) — SelectedStep diskriminerter Union

  **Neue Files (Routing-Bridges):**
  - `app/dashboard/funnels/[slug]/edit/FunnelEditorClientV2.tsx` — Server→Client-Bridge für Edit
  - `app/dashboard/funnels/new/FunnelEditorClientV2.tsx` — Server→Client-Bridge für Create

  **Modifizierte Files:**
  - `app/dashboard/funnels/[slug]/edit/page.tsx` — `searchParams: Promise<{ v?: string }>` Prop, `useV2`-Branch
  - `app/dashboard/funnels/new/page.tsx` — analog
  - `package.json` — neue Deps `@dnd-kit/core ^6.3.1` + `@dnd-kit/sortable ^10.0.0` (~30kb gzipped, MIT, React-Community-Standard, vom User explizit freigegeben)

  **NICHT angefasst (per Plan):**
  - `components/funnel.tsx` — Widget unverändert (CLAUDE.md §11 hands-off)
  - Alle v1-Editor-Files (FunnelEditorShell, EditorSidebar, SectionFragen, PreviewPanel etc.) — bleiben funktional bis nach C.1c
  - `lib/editorUtils.ts` — 1:1 wiederverwendet, kein Edit
  - `types/index.ts` — EditorState-Shape identisch zu v1
  - API-Routes — kein Schema/Endpoint-Touch
  - Kein DB-Migration

  **Iterations-History innerhalb der Aufgabe:**
  1. Erste Version mit 280px-Sidebar — Step-Titel wurden abgeschnitten.
  2. Fix: 280 → 420px (Stavros wollte ursprünglich 420, ich war zu schüchtern mit 320 dazwischen).
  3. Fragetyp-Switch ursprünglich nicht im Properties-Panel — als Lücke identifiziert und nachgezogen.
  4. AddElementModal ursprünglich nur ein generischer Button — durch FormFlow-inspirierten Fragetyp-Grid ersetzt.
  5. C.1b/C.1c-Scope-Umordnung am Ende der Aufgabe — Multi-Field + Vorlagen-Konzept wurde von Stavros als fundamentaler erkannt als WYSIWYG-Click-Select. Click-Select rückte nach C.1c, Multi-Field + Vorlagen werden C.1b.

  **Verifikation:**
  - `npx tsc --noEmit` exit 0.
  - `npm run build` ohne Errors.
  - SSR-Probe der v2-Route (`curl /dashboard/funnels/some-slug/edit?v=2`) → 307 Login-Redirect (= kein Import/Compile-Crash).
  - Visueller Smoke-Test im Browser durch Stavros — Layout-Verhältnisse passen nach 420px-Fix, Drag-Reorder funktioniert, PropertiesPanel-Edit + Save-Persist funktioniert.

  **Bekannte Lücken / Folge-Sprints:**
  - **C.1b (nächste Aufgabe, Multi-Field + Vorlagen):** Properties zeigt Felder einer Page als editierbare Liste mit "+ Feld hinzufügen". Field-Level-Properties pro Type. AddElementModal wird zweisektionig (Vorlagen + Einzelne Felder). 3 initiale Vorlagen: Kontakt (Name+Email+Telefon), Adresse (Straße+PLZ+Stadt+Land), Ja/Nein. **Submit-Page-Refactor:** state.contactFields[] wird zu normalen fields[] auf der submit-Page, gleiches Multi-Field-System wie Question-Pages. Mapping zu submissions.contact bleibt key-basiert.
  - **C.1c (danach, WYSIWYG-Polish):** Click-Select im Center, Inline-Edit, Floating-Toolbar, Pin-Edge-Insert.
  - **Danach Löschen des v1-Editors** wenn v2 vollständig (FunnelEditorShell + EditorSidebar + alle Sections + PreviewPanel + ?v=2-Routing-Code).

  *Branch:* `feature/aufgabe-32-builder-shell-v2` mit `--no-ff` in main gemerged.

  *Commits:*
  - `a3a9457` feat(builder): Aufgabe 32 (Phase C.1a) — neuer 3-Pane Editor-Shell hinter ?v=2
  - Merge-Commit auf main (Vercel-Auto-Deploy)

- **Aufgabe 31 — Phase C.3 (6 neue Question-Field-Types + multi_choice rename) ✅ (2026-05-28)**

  Erste Phase-C-Aufgabe. Builder kann jetzt 11 Field-Types statt 5: alte 5 (single_choice, multi_choice, short_text, long_text, slider) + 6 neue (email, tel, date, number, dropdown, checkbox). Submit-Page (Kontaktformular) unverändert — neue Types sind ausschließlich auf Question-Pages. Code live (Commit `3db419a`), Production-Smoke-Test grün.

  **Keine DB-Migration:** field_type-Enum war seit Aufgabe 30a schon vollständig (alle 11 + radio + plz reserved).

  **Rename multiple_choice → multi_choice** durchgängig — DB hatte es seit Aufgabe 30a schon richtig (mapping in Migration), App-Code zog nach. 15 Stellen über 8 Files, sauber konsistent DB ↔ EditorState ↔ UI.

  **Was gestrichen wurde:** URL (niche für DACH-Solar-Funnels), File Upload (steht explizit im Post-Launch on-demand-Bucket der Fokus-Roadmap), Address (PLZ reicht für Region-Routing — vollständige Adresse ist Versand-Use-Case, nicht Lead-Erfassung).

  **App-Code-Refactor (9 Files):**
  - `types/index.ts`: QuestionType-Union 5 → 11. EditorQuestion erweitert um dateMin/Max/Default, numberMin/Max/Step/Default/Unit, checkboxLabel (alle top-level, konsistent mit slider-Pattern). QuestionConfig.config-Union um DateConfig, NumberConfig, CheckboxConfig erweitert.
  - `components/tenant-editor/defaults.ts`: DEFAULT_QUESTION + newQuestion-Helper in SectionFragen.tsx mit neuen Feldern initialisiert.
  - `components/tenant-editor/SectionFragen.tsx`: QUESTION_TYPE_LABELS mit 11 deutschen Labels (Einfachauswahl, Mehrfachauswahl, Kurztext, Langtext, Schieberegler, E-Mail, Telefon, Datum, Zahl, Dropdown, Checkbox). `isChoice` deckt jetzt single_choice + multi_choice + dropdown ab; `isText` deckt short_text + long_text + email + tel ab. 3 neue Config-UI-Blocks (Date mit Min/Max/Default + Required, Number mit Min/Max/Step/Unit/Default + Required, Checkbox mit Label + Required). handleTypeChange initialisiert Default-Optionen auch für dropdown. isQuestionField erweitert um date_*/number_*/checkbox_*-Prefixe.
  - `components/funnel.tsx`: text-Block deckt jetzt short_text + email + tel ab (gemeinsamer Renderer mit dynamischem `type=…`). Date: HTML5 `<input type=date>` mit min/max/default. Number: `<input type=number>` mit min/max/step + optionalem Unit-Suffix rechts. Dropdown: native `<select>` mit "Bitte wählen…" als leerer Default-Option. Checkbox: Single-Boolean als Klick-Label mit primary-Border bei aktiviert. `isWeiterDisabled`-Sonderfall: checkbox required → value === "true". multi_choice rename in 3 Vergleichen + 1 Kommentar.
  - `lib/editorUtils.ts`: zentraler `buildQuestionConfig`-Helper für alle Type-spezifischen config-jsonb. OPTION_BASED_TYPES + TEXTISH_TYPES Sets. questionTypeToFieldType + fieldTypeToQuestionType vereinfacht zu 1:1 (VALID_QUESTION_TYPES als Whitelist; `radio` + `plz` sind Submit-Page-only und fallen auf single_choice zurück). editorStateToPagesAndFields: `userControlsRequired` und `hasPlaceholder` Sets steuern wann required/placeholder vom User kommen vs. hardcoded true sind. dbToEditorState: Date/Number/Checkbox-Felder werden Type-spezifisch aus DB-config befüllt (z.B. dateMin nur wenn questionType==='date').
  - `lib/getTenantConfig.ts`: gleiche Vereinfachung für Widget-Read.
  - `lib/resolveAnswer.ts`: Date lokalisiert auf de-DE (DD.MM.YYYY), Checkbox "Ja"/"Nein"-Anzeige. Choice-Pfad deckt jetzt auch dropdown ab (options-basiert).
  - `components/tenant-editor/PreviewPanel.tsx`: buildMockAnswers für alle neuen Types (Email: "max@beispiel.de", Tel: "+49 123 456789", Date: heutiges Datum, Number: 42, Dropdown: erste option, Checkbox: "true").
  - `components/tenant-editor/HealthCheckPanel.tsx`: Choice-Optionen-Check (≥2 Optionen, kein leerer Label) gilt jetzt auch für dropdown.

  **Verifikation:**
  - TypeScript: `tsc --noEmit` exit 0.
  - Grep nach multiple_choice in .ts/.tsx: 0 Treffer.
  - Production-Smoke-Test: `https://app.leadplug.de/demo-solar` rendert mit erster Frage "Worauf soll die Anlage installiert werden?" + Optionen, kein Regression auf Bestandsfunnels.

  **Bekannte Trade-offs (für Folge-Sessions):**
  - Dropdown-Optionen zeigen IconPicker in SectionFragen — Icons werden im Widget aber ignoriert. Fix in C.6 (Antwortoptionen-UX-Polish).
  - Email/Tel keine clientside Format-Validation (Submit via JS, kein HTML5-Form-Submit-Trigger). Pflichtfeld-Check via isWeiterDisabled reicht für minimal-funktional. Echte Email-Format-Validation könnte später hinzukommen.
  - Custom-Picker für Date (statt Browser-native) wäre nice — UX-Polish-Sache, kommt wenn explizit gefordert.
  - Question-Page-Field-Types email/tel/date landen in `submissions.answers`, NICHT in `submissions.contact`. Submit-Page bleibt Single-Source-of-Truth für Lead-Kontakt. Wenn Stavros' Vision "Kontaktformular optional, Email vorne abfragen" kommt → eigene Aufgabe (datenmodell-Migration nötig).
  - components/funnel.tsx ist auf ~1170 Zeilen gewachsen. CLAUDE.md §11 hands-off-Regel bleibt. Auslagerung in `components/funnel/fields/*` kommt wenn Datei wirklich unhandhabbar wird (eher bei 1800-2000 Zeilen oder bei Pro-Plan-Custom-Renderern).

  **Nicht in dieser Aufgabe (eigene Sessions):**
  - Editor-Layout-Refactor (3-Spalten WYSIWYG mit Pages-Liste links / Canvas-Editor mittig / Properties rechts — von Stavros visualisiert) → eigene Aufgabe (vermutlich 2-3 Wochen)
  - Multi-Field-Pages → bleibt 1 Field je Question-Page
  - Logic Jumps / FlowSplit / Conditional Split → Phase C.4
  - Page-Builder-Elemente (Image, Text-Block aus Stavros' Screenshot 2 "Page Builder") → später
  - File Upload, URL, Address, Signature, Hidden Field → bewusst raus, im Post-Launch on-demand-Bucket der Fokus-Roadmap

  *Branch:* `feature/aufgabe-31-new-field-types` mit `--no-ff` in main gemerged.

  *Commits:*
  - `df7e2e2` feat(builder): Aufgabe 31 (Phase C.3) — 6 neue Question-Field-Types + multi_choice rename
  - `3db419a` Merge auf main (Vercel-Auto-Deploy getriggert)
  - + finaler Doku-Commit (Roadmap auf C.3 ✅)

- **Aufgabe 30 — Phase B.5 (pages + fields Schema-Foundation) ✅ (2026-05-28)**

  Beide Migrationen auf Production appliziert (30a additive + Daten-Migration in einer Transaktion, 30b DROP), Code-Refactor live auf Vercel (Commit `048d56b`), Production-Smoke-Test grün (`https://app.leadplug.de/demo-solar` rendert sauber via neuen pages→fields-Join), supabase-schema.md regeneriert, Roadmap auf ✅. **Phase B damit abgeschlossen** — B.7 (updated_at-Trigger-Konsistenz) wurde mit B.5 erledigt (pages + fields bekamen den Trigger direkt in 30a).

  **Migrationen (in Reihenfolge appliziert):**
  - `20260528180000_aufgabe_30a_pages_fields_add.sql` — Phase 1 additive. Neue Enums `page_type` + `field_type`, neue Tabellen `pages` + `fields` mit 8 RLS-Policies, 5 Indices, 2 updated_at-Trigger. Daten-Migration in einer Transaktion: 58 funnel_questions → 58 question-Pages mit je 1 Field, 52 contact_fields-Einträge aus 12 funnels.contact_fields-jsonb → 12 submit-Pages mit insgesamt 52 Fields, 12 leere success-Pages. **Total: 82 pages, 110 fields.** DO-Block-Assertions verifizieren Counts vor COMMIT.
  - **Vercel-Deploy** dazwischen (Commit `048d56b` auf main, Merge des Branches `feature/aufgabe-30-pages-fields`).
  - `20260528190000_aufgabe_30b_drop_funnel_questions_and_contact_fields.sql` — Phase 2. DROP der 4 funnel_questions-Policies, DROP TABLE funnel_questions, DROP TYPE question_type, ALTER TABLE funnels DROP COLUMN contact_fields.

  **Architektur-Entscheidungen:**
  - **EditorState bleibt strukturell unverändert** (`questions[]` + `contactFields[]`) — Mapping-Layer in `lib/editorUtils.ts` übersetzt zwischen EditorState und pages/fields. Editor-Sektionen (SectionFragen, SectionKontakt), HealthCheckPanel, EmailMockups, FunnelEditorShell und Widget (`components/funnel.tsx`) bleiben byte-identisch. Phase C.1 baut den Pages/Layers-UI-Tab darauf auf.
  - **field_type-Mapping** beim Daten-Migration: `multiple_choice → multi_choice` (Roadmap-Schreibweise), `text → short_text` (Konsolidierung), alle anderen 1:1. `radio` + `plz` bleiben als eigene Enum-Werte erhalten — sonst würde Widget-Rendering brechen (radio = kleine Buttons, plz = 5-stellige Numerik-Validierung). Konsolidierung evtl. in Phase C.3.
  - **Page-Struktur pro Funnel:** N × question-Pages (sort_order 0..N-1, je 1 Field) → 1 × submit-Page (sort_order N, alle ContactFields als Fields) → 1 × success-Page (sort_order N+1, leer). External rendert das Widget identisch zu vorher.
  - **Funnel-spezifische Texte** (contact_form_title, success_message, response_message, answers_overview_label, footer_*, etc.) **bleiben auf funnels-Tabelle** — pages.config jsonb ist in B.5 leer, Future-Use für Per-Page-Overrides.
  - **Two-Phase-Migration analog B.2/B.4** — additive Phase erlaubt sauberen Rollback via DOWN-Migration (alte Daten unverändert), DROP-Phase nach grünem Vercel-Deploy. Editing-Lücke während Deploy (~1-2 min) gewollt, Single-User-Risiko akzeptabel.
  - **B.7 mit B.5 erledigt:** kein eigener Sprint mehr, pages + fields haben `updated_at`-Trigger bei der Anlage in 30a bekommen.

  **App-Code-Refactor (9 Files):**
  - `lib/editorUtils.ts`: neuer Helper `editorStateToPagesAndFields(state, funnelId)` mit `crypto.randomUUID()` für vorab-allozierte Page-IDs. `dbToEditorState` neue Signatur `(funnelRow, pages, fields)`. `editorStateToFunnelRow` ohne `contact_fields`-Property. `editorQuestionsToDbRows` ersetzt durch neues Helper-Pattern.
  - `lib/getTenantConfig.ts`: Supabase-Select join auf `pages!pages_funnel_id_fkey(fields!fields_page_id_fkey(...))` nested. Mapper baut weiterhin `TenantConfig.questions[]` + `TenantConfig.contactFields[]` aus question-Pages + submit-Page für stabile Widget-API. Rückmapping `field_type → ContactFieldConfig.type` (short_text→text, etc.) hält Widget unangetastet.
  - `app/api/tenant/funnels/route.ts` POST: INSERT funnel → INSERT pages → INSERT fields (3-stufig).
  - `app/api/tenant/funnels/[slug]/route.ts` GET + PUT + DELETE: GET lädt pages+fields, PUT macht `DELETE pages WHERE funnel_id` (CASCADE räumt Fields) + INSERT neu. DELETE-Kommentar zu CASCADE-Reichweite aktualisiert.
  - `app/dashboard/funnels/[slug]/edit/page.tsx`: lädt pages+fields statt funnel_questions.
  - `app/dashboard/page.tsx` + `app/dashboard/leads/page.tsx`: Lead-Resolver-Metadaten aus question-Pages + deren Fields statt funnel_questions. TenantSubmission-Shape unverändert.
  - `app/api/admin/create-funnel/route.ts`: **gelöscht** (toter Code seit /admin-Cleanup in Aufgabe 26, schrieb noch direkt in funnel_questions).
  - `types/index.ts` + `app/api/submit/route.ts`: nur Kommentar-Updates auf neuen pages+fields-Kontext.

  **Verifikation:**
  - DB Phase 30a (vor App-Deploy): 82 pages (58 question + 12 submit + 12 success), 110 fields (58 question + 52 contact). field_type-Verteilung: 42 single_choice, 15 short_text, 12 radio, 12 tel, 12 email, 8 slider, 4 plz, 3 multi_choice, 2 long_text — Summe 110 ✅. Stichproben für demo-solar (8 Fragen, 4 ContactFields) zeigten 1:1-Match mit alten Daten und korrektes type-Mapping. DO-Block-Assertions in der Migration sind durchgelaufen (kein RAISE EXCEPTION).
  - TypeScript: `tsc --noEmit` exit 0.
  - Production-Smoke-Test nach Vercel-Deploy: `https://app.leadplug.de/demo-solar` rendert mit erster Frage "Worauf soll die Anlage installiert werden?" + 4 Optionen, Header korrekt, keine Errors. Beweist dass getTenantConfig → pages → fields-Join funktioniert.
  - DB Phase 30b: funnel_questions-Tabelle weg, funnels.contact_fields-Spalte weg, question_type-Enum weg, pages/fields unverändert (82/110).
  - Letzter Smoke-Test nach Phase 2 (cache-busted curl): HTTP 200, ~22KB HTML — App referenziert die gedroppte Tabelle nirgends mehr.

  **Bekannte Trade-offs (für Folge-Sessions):**
  - `pages.config` jsonb ist in B.5 leer — Per-Page-Theme-Overrides oder per-Page-Texte sind Future-Work (Phase C/E).
  - `radio` + `plz` field_types bleiben separate Enum-Werte. Konsolidierung auf single_choice + short_text mit Widget-Renderer-Hinweis erst dann sinnvoll, wenn das Widget neue Field-Types braucht (Phase C.3).
  - Editing-Lücke während Vercel-Deploy (~1-2 min zwischen Phase-1-Migration und neuem Code live) — keine Sync-Trigger, weil Single-User. Bei zukünftigem Multi-User-Workflow wäre BEFORE-INSERT-Trigger pro Tabelle ein Pattern (analog B.2).

  *Branch:* `feature/aufgabe-30-pages-fields` mit `--no-ff` in main gemerged.

  *Commits:*
  - `20f114f` feat(db): Aufgabe 30 (Phase B.5) — pages + fields Schema-Foundation
  - `048d56b` Merge auf main (Vercel-Auto-Deploy getriggert)
  - + finaler Doku-Commit nach Phase-2-Migration (Schema regeneriert, Roadmap auf ✅)

- **Aufgabe 29 — Phase B.6 (Webhook-Schema, nur DDL) ✅ (2026-05-27)**

  Migration auf Production appliziert. Schema-Foundation für späteren Webhook-Tier-Launch (Phase C.5). **Kein App-Code-Touch** — Editor/Dashboard/Submit-Flow byte-identisch. Tabellen sind initial leer (additive Migration, kein Backfill nötig).

  **Migration:**
  - `20260528170000_aufgabe_29_webhook_schema.sql` — single-step additive Migration. DOWN-File parallel.

  **2 neue Tabellen:**
  - `webhook_subscriptions(id, tenant_id, url, secret, event_types[], is_active, created_at, updated_at)` — pro Tenant 1..N Webhooks. CHECK-Constraints: `url LIKE 'http%' AND length >= 10`, `length(secret) >= 16`. FK auf `tenants` mit ON DELETE CASCADE. `updated_at`-Trigger.
  - `webhook_delivery_attempts(id, subscription_id, submission_id, attempt_count, status, last_error, delivered_at, created_at)` — Append-only Audit-Trail jedes Versuchs. CHECK-Constraints: `status IN (pending|retrying|success|failed)`, `attempt_count >= 1`, `delivered_when_success` (delivered_at NOT NULL bei status='success'). FK auf `webhook_subscriptions` mit ON DELETE CASCADE, FK auf `submissions(id)` mit ON DELETE SET NULL (Audit bleibt erhalten auch wenn Submission gelöscht).

  **5 RLS-Policies (Defense-in-Depth-Pattern aus B.1 fortgesetzt):**
  - `webhook_subscriptions_select`: alle Tenant-Member sehen eigene Subscriptions
  - `webhook_subscriptions_insert/update`: owner+admin
  - `webhook_subscriptions_delete`: owner only (CASCADE entfernt alle delivery_attempts mit)
  - `webhook_delivery_attempts_select`: User-Client kann eigene Subscription-Logs lesen
  - **Kein INSERT/UPDATE/DELETE auf delivery_attempts via User-Client** — Sender (Phase C.5) schreibt via Service-Key

  **7 Indices:**
  - `idx_webhook_subscriptions_tenant_id` (Tenant-Lookup)
  - `idx_webhook_subscriptions_active` partial `WHERE is_active = true` (Sender skipt inaktive)
  - `idx_webhook_delivery_attempts_subscription(subscription_id, created_at DESC)` (Latest-N pro Subscription)
  - `idx_webhook_delivery_attempts_submission` partial `WHERE submission_id IS NOT NULL` ("Welche Webhooks haben diese Submission delivered?")
  - `idx_webhook_delivery_attempts_retry_queue` partial `WHERE status IN ('pending','retrying')` (Retry-Worker scannt nur Open-Items)

  **Architektur-Entscheidungen:**
  - `event_types` als `text[]` (kein Enum) — flexibler bei neuen Events, keine Schema-Migration nötig. Initial relevant: `submission.created`. App-Code wird die Liste der gültigen Event-Types als Konstante pflegen, wenn Sender kommt.
  - `status` als text + CHECK statt Enum — analog zu `submissions.status`-Pattern, leichter erweiterbar.
  - `secret` als text mit min-length 16 — App generiert beim Create (Random Base64, ≥32 Zeichen), UI darf Wert nur 1× anzeigen. Format-Kontrolle bleibt im App-Code, DB enforced nur Minimal-Länge.
  - `submission_id` FK mit ON DELETE SET NULL — Delivery-Audit bleibt erhalten auch wenn Submission gelöscht (gleiches Pattern wie `submissions.tenant_id` seit Aufgabe 26).
  - `subscription_id` FK mit ON DELETE CASCADE — wenn Tenant Subscription löscht, gehen die Delivery-Logs mit; Logs sind nur für DIESE Subscription relevant.
  - `delivered_at NOT NULL`-Invariante bei `status='success'` — DB enforced Daten-Integrität (Sender muss `delivered_at` bei Erfolg setzen).
  - `updated_at`-Trigger nur auf `subscriptions`. `delivery_attempts` ist append-only, kein Update durch User; bei Retry wird ein NEUER Eintrag mit höherem `attempt_count` geschrieben (saubere Audit-History).

  **Verifikation:**
  - DB: 2 neue Tabellen, 5 Policies (alle korrekt mit `current_tenant_ids()`/`current_tenant_role()` Helper), 7 Indices, 1 Trigger, beide Tabellen RLS-enabled (via `rls_auto_enable` Event-Trigger automatisch).
  - Kein TypeScript-/Build-Touch nötig (Schema-only).

  **Nicht in dieser Aufgabe (Phase C.5):**
  - Sender-Code: HTTP-POST + HMAC-Signatur + JSON-Body
  - Retry-Worker: Cron-Scan auf Retry-Queue-Index, Exponential-Backoff
  - Dashboard-UI: Subscription-CRUD, Secret-1x-Anzeige, Delivery-Log-Viewer
  - `lib/webhookEvents.ts`: konstanten-Liste der gültigen Event-Types

  *Branch:* `feature/aufgabe-29-webhook-schema` mit `--no-ff` in main gemerged.

- **Aufgabe 28 — Phase B.4 (tenants als reine Agentur-Account-Tabelle) ✅ (2026-05-27)**

  Beide Migrationen auf Production appliziert (28a Backfills + Constraints, 28b DROP), Code-Refactor live auf Vercel (Commit d741902), Production-Smoke-Test grün (`https://app.leadplug.de/demo-solar` rendert sauber), supabase-schema.md regeneriert, Roadmap auf ✅.

  **Migrationen (in Reihenfolge appliziert):**
  - `20260528150000_aufgabe_28a_tenants_cleanup_phase1.sql` — Phase 1 (zero-downtime). Backfills: 11/12 funnels bekamen `notification_email` aus `tenants.notification_email`; leere `funnels.footer_{company_name,email,phone}` backfillt aus `tenants.{company_name,public_email,public_phone}`. `funnels.notification_email` auf NOT NULL gesetzt. `tenants.{notification_email,public_email}` NOT NULL gedroppt (damit layout.tsx-Auto-Anlage die Felder weglassen kann vor Phase 2).
  - **Vercel-Deploy** dazwischen (Commit `d741902` auf main, Merge des Branches `feature/aufgabe-28-tenants-cleanup`).
  - `20260528160000_aufgabe_28b_tenants_drop_endcustomer_columns.sql` — Phase 2. Drop von `tenants.notification_email`, `tenants.public_email`, `tenants.public_phone`, `tenants.address`. `tenants` ist jetzt nur noch: `id, company_name, is_active, website, billing_model, lead_price, billing_price, stripe_*, created_at, updated_at`.

  **Architektur-Entscheidungen:**
  - `funnels.notification_email` ist die alleinige Quelle für Lead-Benachrichtigungen (NOT NULL, Default beim Anlegen = `user.email`).
  - Endkunden-Daten (Footer-Display) leben ausschließlich in `funnels.footer_company_name`/`footer_email`/`footer_phone`. Kein Override-Hierarchie mehr.
  - `TenantConfig.address` komplett aus dem Type-System entfernt (wurde nirgends gerendert — pure Pass-Through-Property).
  - Footer-Template-Strings `{{public_email}}` etc. bleiben unverändert in der DB (12 funnels) — nur die Resolution-Source wechselt von Tenant- auf Funnel-Level. Spart Daten-Migration.
  - Auto-Tenant-Anlage in `app/dashboard/layout.tsx` schreibt `notification_email`/`public_email` nicht mehr (defensive Default war obsolet, brach NOT-NULL nicht weil Phase 1 die Constraints relaxed).
  - Stripe-Customer-Anlage in `/api/stripe/checkout` nutzt `user.email` statt `tenant.notification_email` (auch ein Sub-Effekt: bei späteren Multi-User-Tenants ist der Stripe-Customer trotzdem auf den Initiator-User adressiert — sinnvolles Verhalten).

  **App-Code-Refactor (14 Files):**
  - `lib/getTenantConfig.ts`: Override-Kette `row.footer_email || tenant.public_email` etc. aufgelöst zu `row.footer_email || ''`. SELECT-Query reduziert auf nur tenant-spezifische Spalten (`company_name, website, is_active, billing_model, lead_price, billing_price`). `TenantConfig.publicEmail` wird jetzt aus `funnels.footer_email` befüllt, `phone` aus `footer_phone`.
  - `lib/editorUtils.ts`: `editorStateToFunnelRow(state, tenantId, slug, fallbackNotificationEmail)` — neue Pflicht-Param. Schreibt `state.notificationEmail?.trim() || fallbackNotificationEmail` (kein null-Fallback mehr).
  - `app/api/tenant/funnels/route.ts` POST + `[slug]/route.ts` PUT: Validierung `state.notificationEmail?.trim() || user.email`, 400 wenn beide leer.
  - `app/api/tenant/funnels/[slug]/route.ts` GET: Response ohne `publicEmail`/`publicPhone` (nur `companyName`).
  - `app/api/stripe/checkout/route.ts`: `tenant.notification_email` raus aus SELECT + Customer-Anlage nutzt `user.email`.
  - `app/dashboard/layout.tsx`: Auto-Tenant-Insert ohne `notification_email`/`public_email`.
  - `app/dashboard/funnels/new/page.tsx`: Tenant-SELECT nur noch `id, company_name`; `initialState.notificationEmail = user.email` als Pre-Fill.
  - `app/dashboard/funnels/[slug]/edit/page.tsx`: Tenant-SELECT nur noch `id, company_name`.
  - `FunnelEditorClient.tsx` (×2) + `FunnelEditorShell.tsx` + `PreviewPanel.tsx`: `publicEmail`/`publicPhone`-Props komplett entfernt. `PreviewPanel` fällt zurück auf Hardcode-Placeholder (`"info@muster.de"`, `"+49 123 456789"`).
  - `SectionTexte.tsx`: Tooltip "Pflichtfeld. Neue Leads werden an diese Adresse gesendet." statt "Leer lassen = Adresse aus deinen Account-Einstellungen wird verwendet.".
  - `types/index.ts`: `TenantConfig.address` entfernt.

  **Verifikation:**
  - DB Phase 1: 0 NULL/empty `notification_email` in funnels (alle 12 backfilled), `funnels.notification_email` NOT NULL, `tenants.{notification_email,public_email}` nullable.
  - DB Phase 2: tenants-Spaltenliste = `id, company_name, is_active, website, billing_model, lead_price, billing_price, stripe_*, created_at, updated_at` — exakt wie geplant.
  - TypeScript: `tsc --noEmit` sauber.
  - DB-Smoke-Test während der Refactor-Phase: getTenantConfig-Join + Tenant-Insert ohne notification_email/public_email laufen sauber.
  - Production-Smoke-Test nach Vercel-Deploy: `https://app.leadplug.de/demo-solar` rendert, HTTP 200, Widget vollständig sichtbar.

  **Bekannte Trade-offs (für Folge-Sessions):**
  - `lib/getTenantConfig.ts` hat noch eine spezielle Logik (`mapDbRow`-Fallbacks für `companyName || ''`) — bei wirklich leeren Funnels könnten Email-Mockups dann "" rendern. In der UI greift PreviewPanel die Placeholder ab, in echten E-Mails könnte das aber unschön sein. Für MVP akzeptabel; sauberer Fix bei B.5 (pages+fields).
  - `funnels.notification_email` validiert keine Email-Format. Server-side Regex-Check könnte später hinzu — out of scope für B.4.

  *Branch:* `feature/aufgabe-28-tenants-cleanup` mit `--no-ff` in main gemerged.

  *Commits:*
  - `02e5f97` feat(db): Aufgabe 28 Code-Refactor + Migration 28a
  - `d741902` Merge auf main (Vercel-Auto-Deploy getriggert)
  - + finaler Doku-Commit nach Migration 28b (Schema regeneriert, Roadmap auf ✅)

- **Aufgabe 26 + 27 — Phase B.2 (UUID-FKs) + Phase B.3 (submissions.contact_*-Cleanup) ✅ (2026-05-27)**

  Alle 3 Migrationen sind auf Production appliziert, Code ist live auf Vercel, Smoke-Test grün, supabase-schema.md regeneriert, Roadmap auf ✅.

  **Migrationen (in Reihenfolge appliziert):**
  - `20260528120000_aufgabe_26a_uuid_fks_add.sql` — Phase 1 ADD-only (zero-downtime). Neue UUID-Spalten + Backfill + Sync-Trigger + neue v2-Policies parallel zu alten. Slug-Spalten NULLABLE.
  - **Vercel-Deploy** dazwischen (Commit `210c69c` auf main, Merge des Branches `feature/aufgabe-26-uuid-fks`).
  - `20260528130000_aufgabe_26b_uuid_fks_drop.sql` — Phase 2 DROP-only. Alte Policies + Sync-Trigger + Slug-FKs + Slug-Spalten + tenants.slug + tenants.auth_user_id gedroppt. v2-Policies umbenannt auf finale Namen.
  - `20260528140000_aufgabe_27_drop_submissions_contact_legacy.sql` — 4 Legacy-Spalten in submissions gedroppt (`contact_anrede/name/email/phone`).

  **Strategische Entscheidungen (aus User-Beratung):**
  - **submissions tenant_id mit ON DELETE SET NULL** + Slug-Spalten als Snapshot: getrennte Verantwortung "wer darf das sehen?" (tenant_id) vs. "wo kam das her?" (tenant_slug/funnel_slug historisch).
  - **tenants.auth_user_id komplett gedroppt** — tenant_members ist Single Source of Truth. layout.tsx baut Tenant-Lookup auf tenant_members-Join um.
  - **tenants.slug komplett gedroppt** — wurde nirgendwo öffentlich genutzt.
  - **/admin/* gelöscht** — 19 Files, veraltet aus Pre-Self-Signup-Phase. Re-Build als Phase-E-Eintrag in roadmap.md geplant ("Plattform-Owner-Dashboard v2"). 3 noch-genutzte Komponenten (DailyLeadsChart, EmbedBlock, IconPicker) nach `components/dashboard/` verschoben.
  - **B.3 (contact_*-Cleanup) zusammen mit B.2 in einen Deploy gezogen** — Backfill war clean (alle 26 Zeilen hatten contact-jsonb), App-Refactor ~30 Min.

  **App-Code-Refactor (15 Files + 19 admin-Files gelöscht + 3 verschoben):**
  - `lib/getTenantConfig.ts`: tenantSlug-Feld raus, Supabase-Join mit expliziten FK-Namen (`tenants!funnels_tenant_id_fkey`, `funnel_questions!funnel_questions_funnel_id_fkey`) — war während Phase 1 nötig wegen FK-Ambiguität (zwei FKs zwischen funnels und tenants).
  - `lib/tracking.ts`: `logSubmission(...)` nimmt `tenantId`, schreibt `tenant_id` + `contact` jsonb (nicht mehr die 4 contact_*-Spalten).
  - `lib/editorUtils.ts`: `editorStateToFunnelRow(state, tenantId, slug)` + `editorQuestionsToDbRows(questions, funnelId)`.
  - `app/api/submit/route.ts`: übergibt `tenantId = tenantConfig.id`.
  - `app/api/track-view/route.ts`: liest + schreibt UUIDs direkt (funnel.id + tenant_id).
  - `app/api/tenant/funnels/route.ts` GET+POST: tenant_id-Filter; POST returnt insertedFunnel.id für questions-Insert.
  - `app/api/tenant/funnels/[slug]/route.ts`: Funnel-Lookup für funnel.id, questions via funnel_id; DELETE vereinfacht (FK-Cascade übernimmt view_logs+questions).
  - `app/api/stripe/checkout/route.ts`: metadata.tenant_slug raus, supabase_tenant_id bleibt.
  - `app/dashboard/layout.tsx`: Tenant-Lookup via `tenant_members.tenant_id` join `tenants` (admin-Client, 2 Queries statt 1 wegen Supabase-JS-Join-Type-Issue), Auto-Anlage ohne auth_user_id/slug.
  - `app/dashboard/{funnels,kontakte,leads,page,funnels/[slug]/edit}/page.tsx`: tenant_id-Filter; questions via funnel_id (Index funnel_id → slug für Display-Mapping); contact-Daten aus jsonb extrahiert auf Server-Seite.
  - `app/page.tsx`: Root-Redirect von `/admin` auf `/dashboard`.
  - `proxy.ts`: admin-Gating entfernt, Matcher nur noch `/dashboard/:path*`.
  - `types/index.ts`: TenantConfig.tenantSlug raus.

  **Verifikation:**
  - DB Phase 1: 0 NULL-Werte in UUID-Spalten (alle 367 Zeilen backfilled — 12 funnels + 58 questions + 271 view_logs + 26 submissions), 13 v2-Policies + 20 v1-Policies + 4 Sync-Trigger.
  - DB Final: 20 Policies (alle UUID-basiert mit finalen Namen), keine Sync-Trigger mehr, keine alten Slug-Spalten (außer submissions.tenant_slug+funnel_slug als Snapshot + honeypot_triggers.funnel_slug), kein tenants.slug+auth_user_id.
  - TypeScript: `tsc --noEmit` sauber.
  - Lokaler Smoke-Test: Public-Widget `/demo-solar` rendert, keine Console-Errors, neuer funnel_view_log mit UUIDs verifiziert.
  - Production-Smoke-Test: `https://app.leadplug.de/demo-solar` rendert, 0 Console-Errors.

  **Bekannte Trade-offs (für Folge-Sessions):**
  - submissions.tenant_slug wird durch neuen Code NICHT mehr populated (tenants.slug existiert nicht mehr). Bestehende 26 Zeilen behalten ihre Werte. Falls je human-readable Snapshot gewünscht: aus tenants.company_name slugifizieren beim Insert.
  - `idx_submissions_tenant` (auf tenant_slug) ist noch da, aber inaktiv da kein Code mehr darauf filtert — kann später entfallen.
  - Race-Condition bei Auto-Tenant-Anlage in layout.tsx: ohne UNIQUE(tenants.auth_user_id) könnte Doppel-Klick beim First-Login 2 Tenants anlegen. Im MVP akzeptabel; Lösung wäre SECURITY-DEFINER-RPC für atomare Anlage. Phase-E-Punkt.

  *Branch:* `feature/aufgabe-26-uuid-fks` mit `--no-ff` in main gemerged.

  *Commits:*
  - `ab7de97` feat(db): Aufgabe 26 + 27 Code-Refactor
  - `f2bee8e` docs: Zwischenstand (vor DROP-Migrationen)
  - `210c69c` Merge auf main (Vercel-Auto-Deploy getriggert)
  - + finaler Doku-Commit nach DROP-Migrationen (Schema regeneriert, Roadmap auf ✅)

- **Aufgabe 25 — `tenant_members` + komplette RLS-Refactor (Phase B.1, 2026-05-27)** — Junction-Table für Multi-User pro Tenant eingeführt und Defense-in-Depth-RLS auf alle CRUD-Operationen erweitert.

  *DB-Migrationen (2 Stück, direkt auf Production appliziert):*
  - `20260527120000_aufgabe_25_tenant_members_and_full_rls.sql`: Enum `tenant_member_role` (`owner|admin|member`), Tabelle `tenant_members(id, tenant_id, auth_user_id, role, created_at, updated_at)` mit FK-Cascade auf tenants/auth.users, UNIQUE(tenant_id, auth_user_id), 2 Indices, `set_updated_at`-Trigger. Backfill: für jeden Tenant mit `auth_user_id` ein `tenant_members(role='owner')` (3 Zeilen). Helper-Funktionen `current_tenant_ids() RETURNS SETOF uuid` und `current_tenant_role(uuid) RETURNS tenant_member_role` als SECURITY DEFINER, STABLE, mit gepinntem search_path; EXECUTE granted nur an authenticated. Alle 5 alten SELECT-only Policies gedroppt, **19 neue Policies** über 6 Tabellen (SELECT/INSERT/UPDATE/DELETE pro Tabelle, je nach sinnvoller Operation — kein INSERT auf tenants/submissions/funnel_view_logs, kein UPDATE auf funnel_view_logs).
  - `20260527130000_aufgabe_25_add_funnel_view_logs_delete_policy.sql` (Hotfix): DELETE-Policy auf `funnel_view_logs` für Cascade-Cleanup beim Funnel-Löschen. Wurde im UP-Migration übersehen, fiel beim App-Code-Refactor des DELETE-Routes auf.

  *Branch-Workflow:* Eigentlich sollte Phase B in einem Supabase-Branch gebündelt laufen (CLAUDE.md §13.1). Branch wurde manuell angelegt, blieb aber im `MIGRATIONS_FAILED`-Status und das MCP-Tooling konnte Migrationen nicht gezielt gegen den Branch-Project-Ref applizieren. Daher: **bewusst akzeptierter Ein-mal-Ausnahmefall** — direkt auf Production appliziert mit dokumentierter DOWN-Migration ([`supabase/migrations/20260527120000_..._DOWN.sql`](../supabase/migrations/20260527120000_aufgabe_25_tenant_members_and_full_rls_DOWN.sql)) als Safety-Net plus tägliche Auto-Backups. Branch hat User selbst gelöscht.

  *App-Code-Refactor (12 Files: 7 API-Routes + 5 Server-Components):* Pattern überall identisch — `createAdminClient` + `.eq('auth_user_id', user.id)` → `createClient()` user-Client + RLS-Filter implizit. API: [funnels/route.ts](app/api/tenant/funnels/route.ts), [funnels/[slug]/route.ts](app/api/tenant/funnels/[slug]/route.ts) (verifyOwnership-Helper gedroppt, RLS übernimmt), [slug-check/route.ts](app/api/tenant/slug-check/route.ts) (admin-Client bleibt, dokumentiert wegen globaler Slug-Uniqueness), [leads/[id]/route.ts](app/api/leads/[id]/route.ts), [stripe/checkout/route.ts](app/api/stripe/checkout/route.ts), [stripe/portal/route.ts](app/api/stripe/portal/route.ts). Server-Components: [billing/page.tsx](app/dashboard/billing/page.tsx), [kontakte/page.tsx](app/dashboard/kontakte/page.tsx), [funnels/page.tsx](app/dashboard/funnels/page.tsx), [funnels/new/page.tsx](app/dashboard/funnels/new/page.tsx), [funnels/[slug]/edit/page.tsx](app/dashboard/funnels/[slug]/edit/page.tsx). Stripe Webhook bleibt admin-Client (System-Event).

  *Auto-Tenant-Anlage:* [app/dashboard/layout.tsx](app/dashboard/layout.tsx) ergänzt — nach erfolgreicher Tenant-Insert wird zusätzlich `tenant_members(role='owner')` geschrieben. Admin-Client bleibt hier nötig (User hat vor Anlage noch keine Membership → RLS würde alles blockieren). Bei Member-Insert-Fehler: log + redirect trotzdem (admin-Client-Reads funktionieren auch ohne Membership, kein Lockout).

  *Admin-Client-Allowlist erweitert* in CLAUDE.md §13.2 + project-overview.md §8: `/api/tenant/slug-check`, `generateRandomSlug` in `/api/tenant/funnels` POST, und `app/dashboard/layout.tsx` Auto-Anlage sind als legitim dokumentiert.

  *Bekannte Trade-offs (für Folge-Aufgaben):* (1) RLS-Policies für funnels/funnel_questions/submissions/funnel_view_logs nutzen Slug-Walks `tenant_slug IN (SELECT t.slug FROM tenants t WHERE t.id IN current_tenant_ids())` — wird in B.2 durch direkte UUID-Joins ersetzt. (2) `tenant_members_delete` erlaubt Self-Remove (User kann eigene Membership löschen) — könnte letzten Owner aussperren. Owner-Constraint kommt mit Multi-User-Invite-UI in Phase E. (3) Security-Advisor-Warnings für `current_tenant_ids`/`current_tenant_role` (SECURITY-DEFINER von authenticated aufrufbar) sind gewollt — sonst funktioniert RLS nicht.

  *Verifikation:* TypeScript-Build sauber (nur 2 pre-existing Stripe-Errors aus Aufgabe 23). Smoke-Test via next-devtools MCP + Playwright: `/demo-solar` und `/leadplug` (Public-Widgets, admin-Client via getTenantConfig) rendern korrekt. `/dashboard`, `/dashboard/funnels`, `/dashboard/billing`, `/dashboard/kontakte` redirecten alle korrekt zu `/login?from=...`. Keine Compile-Errors, keine Console-Errors. DB-Verifikation: `tenant_members` enthält 3 Owner-Einträge (`leadplug`, `ssingoudis`, `stavros`), 19 Policies wie geplant, Helper-Funktionen STABLE+SECURITY DEFINER.

  *Branch:* `feature/aufgabe-25-tenant-members`.

  (`supabase/migrations/20260527120000_aufgabe_25_tenant_members_and_full_rls.sql` (neu), `supabase/migrations/20260527120000_aufgabe_25_tenant_members_and_full_rls_DOWN.sql` (neu), `supabase/migrations/20260527130000_aufgabe_25_add_funnel_view_logs_delete_policy.sql` (neu), `app/dashboard/layout.tsx`, `app/api/tenant/funnels/route.ts`, `app/api/tenant/funnels/[slug]/route.ts`, `app/api/tenant/slug-check/route.ts`, `app/api/leads/[id]/route.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/portal/route.ts`, `app/dashboard/billing/page.tsx`, `app/dashboard/kontakte/page.tsx`, `app/dashboard/funnels/page.tsx`, `app/dashboard/funnels/new/page.tsx`, `app/dashboard/funnels/[slug]/edit/page.tsx`, `CLAUDE.md`, `context/project-overview.md`, `context/supabase-schema.md`, `context/roadmap.md`, `context/current-feature.md`)

- **Phase A — Dokumentations- & Architektur-Reset (2026-05-26)** — Strategische Neu-Aufstellung des Projekts vor MVP-Sprint. Keine Code-Änderung, reine Doku- und Architektur-Arbeit (keine Aufgaben-Nummer vergeben, da kein Branch).

  *Strategische Entscheidungen (in CLAUDE.md verankert):* Zielgruppe pivotiert von "Handwerksbetriebe als Endnutzer" auf "Agenturen/Marketer als Plattform-User". Tenant-Modell neu definiert: Tenant = Agentur-Workspace mit Multi-User (Junction-Table `tenant_members` mit Rollen). Pricing-Strategie konkretisiert: 3 Tiers (Webhook ~29€ / Standard ~99€ / Pro ~249€) pro Tenant. GTM via strategische Partnerschaften mit Domain-Marktführern. Builder-Richtung festgelegt: linear, **kein** Node-Canvas (React Flow explizit abgelehnt nach Diskussion FormFlow-Vergleich).

  *DB-Architektur-Entscheidungen:* RLS-Pattern auf vollständige Policies (SELECT/INSERT/UPDATE/DELETE) erweitert — Service-Key nur noch für anonyme/system-Endpoints. UUID-FKs überall, Slugs nur für öffentliche URLs. `tenants` wird zur reinen Agentur-Account-Tabelle, `funnels` trägt alle endkunden-spezifischen Daten. `tenant_members` minimal halten (kein Profile-Layer, YAGNI).

  *Doku-Neuaufstellung:* [`CLAUDE.md`](../CLAUDE.md) komplett neu geschrieben (15 Sektionen, Single Source of Truth). [`context/project-overview.md`](project-overview.md) neu geschrieben (echtes DB-Schema, alle 10 API-Routes, 12-Schritt Submission-Flow inkl. Rate-Limiting). [`context/supabase-schema.md`](supabase-schema.md) als technische Vollreferenz aus Live-DB regeneriert (Enums, Tables, Constraints, Indices, RLS-Policies, Functions, Triggers). [`context/roadmap.md`](roadmap.md) als granulare Aufgaben-Quelle erstellt (Phasen A-E, Sub-Nummern B.1-B.7 für anstehenden Schema-Refactor, Phase E mit allen v2/Pro-Features). Aufgaben-Nummerierung bleibt sequenziell — nächste Code-Aufgabe ist **Aufgabe 25** (= Phase B.1 `tenant_members` + RLS-Refactor).

  *Veraltete Files entfernt:* 8 Files aus `context/` gelöscht — `supabase-schema.sql`, `.svg`, `Ablaufdiagramm.png`/`.txt`, `datenbank-schema.html`, `submission-flow.html`, `admin-funnel-creator.html`, `saas-architektur.html`. Grund: zeigten nicht-existente Tabellen (`industries`, `funnel_options`, `themes`), nicht-existente Spalten (`industry`, `lead_price_base`, `flat_monthly_price`, `funnel_title`, `tenants.contact_email`) oder waren strukturell redundant zur neuen MD-Doku.

  *Behalten + Rollen geklärt:* `tenant-funnel-editor.html` (Editor-Struktur), `funnel-funktionsweise.html` (UI-Konzept, wird Phase B.5 obsolet), `workflows.html` (Auth-Flows, Korrektheit verifiziert — `proxy.ts` ist Next-16-Standard), `resize-erklaerung.html` (postMessage), `saas-phasenplan.html` (visuelle High-Level Phasen-Übersicht — bleibt parallel zu `roadmap.md` als User-gepflegtes Status-Visual).

  *Nächster Schritt:* Phase B startet mit **Aufgabe 25 — `tenant_members` + komplette RLS-Refactor**. Eigene Planungs-Session, Supabase-Branch via MCP, dann Code auf Feature-Branch `feature/aufgabe-25-tenant-members`.

  (`CLAUDE.md`, `context/project-overview.md` (rewrite), `context/supabase-schema.md` (rewrite), `context/roadmap.md` (neu), `context/current-feature.md`, Memory-Files in `C:\Users\Stavros\.claude\projects\c--Programmieren-leadplug-saas\memory\`)

- **Aufgabe 24 – Funnels-Übersicht-Polish & Roadmap-Wiederbelebung** – Mehrere kleinere UX-Verbesserungen rund um Funnel-Verwaltung und Einbindung, plus Roadmap-Erweiterung.

  *Funnels-Übersicht:* Inaktive Funnels werden ans Ende der Liste sortiert (neue `order("is_active", desc)`-Klausel vor dem `created_at`-Sort in [page.tsx](app/dashboard/funnels/page.tsx)). Inaktive Karten erscheinen mit `opacity-75`, Color-Bar oben auf `opacity 0.35` gedimmt, Hover hebt Opacity wieder voll an. "Öffnen"-Button verschwindet bei `!isActive` komplett — verhindert Klicks die zu nicht erreichbaren URLs führen.

  *Saubere 404-Behandlung:* `TenantInactiveError` in [lib/getTenantConfig.ts](lib/getTenantConfig.ts) als `export class` markiert. In [app/[slug]/page.tsx](app/[slug]/page.tsx) wird der Error gefangen und in `notFound()` umgemünzt — direkter Aufruf einer inaktiven Funnel-URL (Bookmark, alter Embed) gibt jetzt sauberes 404 statt generischer Next.js-Server-Error-Page. Auch in `generateMetadata` gefangen.

  *Embed-Tab umbenannt:* "Embed-Code" → "Einbinden" in [TabNav.tsx](app/dashboard/TabNav.tsx). Laienfreundlicherer Begriff für die Zielgruppe (Handwerker ohne Tech-Background).

  *Editor-Shortcut Code kopieren:* Neuer Block im Sidebar-Footer von [EditorSidebar.tsx](components/tenant-editor/EditorSidebar.tsx) — Copy-Button mit Lucide `Copy`/`Check`-Icon, Toast-Feedback ("Kopiert" für 2s, grüner Border). Nur sichtbar bei `originalSlug && state.isActive` (kein Code für unspeicherte oder inaktive Funnels). Snippet-Generierung in neue [lib/embedSnippet.ts](lib/embedSnippet.ts) ausgelagert — Single Source of Truth, von EmbedBlock und Sidebar gleichermaßen verwendet. Base-URL aus `NEXT_PUBLIC_BASE_URL` mit `window.location.origin`-Fallback.

  *Platzhalter für Phase-5-Features:* Zwei "Bald verfügbar"-Sektionen auf der Embed-Seite ([embed/page.tsx](app/dashboard/embed/page.tsx)): "Anleitung für deine Plattform" (Sparkles-Icon) und "Conversion-Tracking für Google Ads & Facebook" (BarChart3-Icon). Sichtbare Roadmap für Tenants, hält die Erkenntnis aus dem Gemini-Tracking-Gespräch fest.

  *Health-Check-Panel entwirrt:* Im [HealthCheckPanel.tsx](components/tenant-editor/HealthCheckPanel.tsx) wurde der Header "Funnel-Status" verwirrend doppelt verwendet (Panel zeigte "Bereit" auch bei inaktivem Funnel, während der Footer "Inaktiv" zeigte). Header umbenannt zu "Konfiguration". Status-Logik in drei Zustände aufgeteilt: `issues` (amber "X Hinweise"), `inactive` (grau "Inaktiv" — Konfiguration ok aber Funnel nicht öffentlich), `ready` (grün "Vollständig"). Bei `inactive` zeigt das aufgeklappte Panel einen klickbaren Hinweis "Konfiguration vollständig, aber Funnel ist deaktiviert — jetzt aktivieren", der via `onJumpTo("funnel_status_toggle")` zum Aktiv/Inaktiv-Button im Footer scrollt + flasht. `data-field="funnel_status_toggle"` auf dem Toggle in [EditorSidebar.tsx](components/tenant-editor/EditorSidebar.tsx).

  *Navbar-Polish:* Mehrere Verbesserungen am Dashboard-Header. **Brand-Logo links eingebaut:** Zap-Icon in primary-Box + Wordmark "LeadPlug" als Link zu `/dashboard`. Gibt der Navbar einen visuellen Anker und macht das Produkt sofort erkennbar. **Theme-Toggle als simpler Hell/Dunkel-Toggle** ([ThemeToggle.tsx](components/ui/ThemeToggle.tsx)): Button zeigt das jeweilige Gegen-Icon (Sun im Dark, Moon im Light) — auf einen Blick erkennbar was passiert. Beim ersten Besuch wird OS-Setting (`prefers-color-scheme`) als Default verwendet, danach merkt sich `localStorage` die User-Wahl. (Vorher kurz mit 3-Modi-Dropdown experimentiert — verworfen, weil das `Monitor`-Icon für "System" zu unklar war.) Inline-Script in [app/layout.tsx](app/layout.tsx) entsprechend angepasst. **Account + Logout konsolidiert** zu neuem [UserMenu.tsx](components/ui/UserMenu.tsx): Avatar-Button mit Initialen aus `tenant.company_name` (Fallback: User-Icon) + Chevron, Hover/Klick öffnet Dropdown mit User-Name + E-Mail, Account-Einstellungen, Abmelden (rotes Label). `userName` + `userEmail` werden vom Dashboard-Layout aus `tenant.company_name` und `user.email` zugespielt. **Tabs als Pills** statt Underline: aktiver Tab bekommt `bg-primary/10` mit primary-Text, Hover-States subtil grau. Mobile-Variante (nur aktiver Tab sichtbar) ebenfalls als Pill. **Border subtiler:** `border-b-2 border-primary` → `border-b border-gray-200 dark:border-gray-800`. Primary bleibt nur als aktiver Tab-Indikator. Mobile-Hamburger-Menü erbt das neue rote Abmelden-Styling. **Navigation mittig zentriert** (Desktop): Tab-Pills sind absolut positioniert (`inset-x-0 top/bottom-0 + justify-center`), unabhängig von Logo- und Action-Spalten-Breite. Logo links, Actions rechts, Nav exakt in der Mitte — klassisches SaaS-Layout (Linear, Notion).

  *Erkenntnis Tenant-Architektur:* `tenants` ist aktuell 1:1 mit `auth_user_id` verknüpft — ein User = ein Tenant. Für Agenturen (Phase-5-Zielgruppe) reicht das nicht: Geschäftsführer + Bürokraft müssen denselben Workspace verwalten können. Saubere Lösung wäre Junction-Table `tenant_members(tenant_id, user_id, role)` mit Rollen `owner/editor/viewer`. Plus: Whitelabel-Logo (`tenants.brand_logo_url` + `brand_name`) als Premium-Plan-Feature, sodass Agenturen ihren Endkunden ihre eigene Marke statt "LeadPlug" präsentieren können. Beide Punkte als eigene Tasks in Phase 5 der Roadmap eingetragen ([saas-phasenplan.html](context/saas-phasenplan.html)).

  *Mobile-Header-Bugs:* Drei Bugs gefixt. (1) Aktueller Tab wurde doppelt angezeigt — als Pill in der Menüleiste und im Hamburger-Menü; Mobile-Pill komplett aus [TabNav.tsx](app/dashboard/TabNav.tsx) entfernt, TabNav rendert jetzt nur noch Desktop-Pills. (2) Billing fehlte in `TAB_ICONS`-Mapping → Eintrag im Hamburger-Menü ohne Icon; `CreditCard` aus Lucide ergänzt. (3) Hamburger-Menü blieb beim Klick außerhalb offen; `useEffect` mit `mousedown`- + `keydown`-Listener (Escape) in [DashboardHeader.tsx](app/dashboard/DashboardHeader.tsx) ergänzt, schließt das Menü zuverlässig. Bonus: aktiver Eintrag im Hamburger-Menü bekommt jetzt `bg-primary/10` + primary-Text-Markierung — konsistent zu den Desktop-Tab-Pills.

  *Vision-Erweiterung der Roadmap (Phase 6):* Acht zusätzliche Vision-Punkte aus den heutigen Architektur-Gesprächen festgehalten: Lead-Pipeline (Kanban statt Liste), Termin-Booking direkt im Funnel, KI-Features (Lead-Scoring, Auto-Funnels, Smart-Templates), Onboarding-Wizard, Audit-Log/Änderungshistorie (besonders relevant mit Team-Workspaces), visueller E-Mail-Template-Editor, Mehrsprachigkeit (DE/EN). Macht die zukünftige Richtung des Produkts dokumentiert greifbar — keine "verlorenen Ideen" mehr.

  *Roadmap-Wiederbelebung:* [`context/saas-phasenplan.html`](context/saas-phasenplan.html) war zuvor reines Logbuch (Phase 1–3, alle "abgeschlossen"). Erweitert um drei neue Phasen mit eigenem Farbcode (Blau/Teal/Slate), Status-Badges (In Arbeit / Geplant / Vision) und neuen Task-Varianten (`task-progress`, `task-todo`, `task-vision`). **Phase 4** (in Arbeit): die heutigen Punkte + offener Editor-Mikropolish. **Phase 5** (geplant, Zielgruppe Agenturen): Conversion-Tracking via postMessage als erwachsene Antwort auf Geminis Skript-Embed-Vorschlag (80% Nutzen, 10% Komplexität), Plattform-Anleitungen mit Screenshots, Webhook/Zapier, Tenant-Subaccounts für Agenturen, Funnel-Vorlagen, Server-Side Conversion API. **Phase 6** (Vision): A/B-Testing, Verzweigungs-Logik, White-Label-Domain, öffentliche API.

  *Erkenntnis aus dem Architektur-Gespräch:* Skript-Embed (Web Component) vs. iframe wurde diskutiert — für Lead-Gen-Forms ist iframe weiterhin die richtige Wahl (Sandbox, kein CSS/JS-Konflikt, geringerer Support-Aufwand). Tracking-Lücke wird stattdessen über postMessage-Events + optionalen Bridge-Snippet gelöst (Phase 5). Branche-Vergleich: Typeform/Calendly/Tally sind alle iframe-basiert.

  (`app/dashboard/funnels/page.tsx`, `components/dashboard/FunnelCard.tsx`, `app/[slug]/page.tsx`, `lib/getTenantConfig.ts`, `app/dashboard/TabNav.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/layout.tsx`, `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/HealthCheckPanel.tsx`, `components/ui/ThemeToggle.tsx`, `components/ui/UserMenu.tsx` (neu), `lib/embedSnippet.ts` (neu), `app/admin/[slug]/EmbedBlock.tsx`, `app/dashboard/embed/page.tsx`, `app/layout.tsx`, `context/saas-phasenplan.html`, `context/current-feature.md`, `CLAUDE.md`)

- **Aufgabe 23 – Editor-Verlinkung, Test-Modus & UX-Polish** – Umfangreiche Editor-Verbesserung in mehreren Phasen.

  *Bidirektionale Sidebar↔Preview-Verlinkung (vollständig):* `hl()`-Helper in [`funnel.tsx`](components/funnel.tsx) auf variadische Keys umgebaut (mehrere Highlight-Trigger pro Element). `var(--color-primary)` statt hartem `#3b82f6` (Tailwind-v4-Token, kein hartcodiertes Indigo). Hinzugefügte Highlight-Marker: Slider-Bereiche (`slider_min/max/step/unit/default`), Text-Inputs (`text_input/placeholder/required`), Footer (`footer`), Header-Banner (`header_banner`), Theme-Felder (alle Design-Keys), Page-Background, individuelle Kontaktfelder (`contact_field_${key}`), Footer-Items pro Position (`footer_company/email/phone`). Bug gefixt in [`SectionFragen.tsx`](components/tenant-editor/SectionFragen.tsx): Slider-Inputs hatten alle `data-field="question_title"` (Copy-Paste-Bug) → jetzt korrekt `slider_min/max/step/unit/default`. `SectionDesign`, `SectionKontakt`, `SectionTexte` mit `data-field` + spezifischen `onFocus`-Calls vervollständigt.

  *Preview→Sidebar Klick-Navigation (neu):* Optionales `onFieldClick`-Prop in `funnel.tsx` + beiden Email-Mockups; `data-edit-field`-Attribute auf allen highlightbaren Elementen. `onClickCapture` am äußeren Wrapper fängt Klicks ab, `preventDefault + stopPropagation` verhindert dass Option-Buttons den Funnel weiterschalten. `commandFocus`-State in [`FunnelEditorShell.tsx`](components/tenant-editor/FunnelEditorShell.tsx) (Field + QuestionIndex + Timestamp), Sidebar reagiert via `useEffect` → öffnet richtige Akkordeon-Section + Question-Card + scrollt + fokussiert Input. Bei nicht-fokussierbaren Targets (Divs wie Kontaktfeld-Zeilen): CSS-Flash-Animation `editor-field-flash` (1.2s ease-out). `header_banner` aliased zu `footer_company` (Banner = Firmenname).

  *Outline-Strategie:* Zwei `hl()`-Varianten — `hl()` mit `outlineOffset: 3px` (außen, mit Abstand vom Element) für Mittel-Elemente; `hlEdge()` mit `outlineOffset: -2px` (innen) für Elemente an der Card-Kante (Header-Banner, Footer, Card selbst, Page-BG), die sonst durch `overflow:hidden` der Card geclippt würden.

  *Test-Modus:* Toggle-Button im PreviewPanel (`▶ Funnel testen` / `🖊 Editor öffnen`, Primär bzw. Amber). Im Test-Modus: `onFieldClick=undefined` + `activeField=""` → Funnel verhält sich wie Live-Widget; Funnel-Key remountet (`${previewMode}-test` ohne `previewIndex`) damit interner State während Test erhalten bleibt; Step-Navigation am oberen Rand läuft mit via neues `onStepChange`-Callback in `funnel.tsx` (`useEffect` auf `currentStep/isContactStep/isSubmitted`). Step-Nav-Buttons im Test-Modus disabled (Navigation nur über interne Weiter/Zurück-Buttons). Sidebar wird gedimmt (Overlay mit `backdrop-blur`, zentriertes Modal: "Test-Modus aktiv — Bearbeitung pausiert" + CTA "Editor öffnen").

  *Sidebar Resize:* Drag-Handle (1px breit, primary on hover, `cursor: col-resize`) zwischen Sidebar und Preview. Breite per `useState` + Pointer-Events global (funktioniert auch wenn Cursor das Handle verlässt). Min 320px, Max 560px, Default 480px. Persistiert in `localStorage` (Key: `editorSidebarWidth`). CSS via `md:w-(--sidebar-w)` + Inline-CSS-Custom-Property.

  *Mobile-Preview-Toggle:* Segmented Control (Monitor/Smartphone) rechts neben Test-Button. Mobile schnürt Inhalt auf `max-width: 375px` (iPhone-Standard) mit smooth Transition.

  *Health-Check Panel (neu):* [`HealthCheckPanel.tsx`](components/tenant-editor/HealthCheckPanel.tsx) als Komponente direkt unter Sidebar-Header. Status-Badge (grün "Bereit" / amber "N Hinweise"). Geprüft: Funnel-Name vorhanden, ≥1 sichtbare Frage, jede Frage hat Titel, Choice-Fragen haben ≥2 Optionen mit Text, ≥1 sichtbares Kontaktfeld, ≥1 Pflichtfeld. **Bewusst nur echte blockierende Hinweise** — keine "info"-Severität mit grauen Punkten, da unklar für User. Jeder Hinweis ist klickbar → springt via `commandFocus` (gleicher Mechanismus wie Preview-Klick) direkt zum betroffenen Feld.

  *Frage duplizieren:* Copy-Button auf jeder Question-Card (zwischen Akkordeon-Toggle und Trash). `duplicateQuestion()` klont mit frischen `_id`s für Frage + alle Options, hängt direkt nach dem Original an, Titel-Suffix "(Kopie)", Auto-Open der neuen Karte.

  *Bulk-Import Options:* Bei Choice-Fragen neuer Outline-Button "📋 Mehrere auf einmal" → Textarea (eine Option pro Zeile) + zwei Aktionen: "Anhängen" / "Ersetzen". Trim + leere Zeilen filtern. `newOption(label)` mit Label-Argument.

  *Defaults & Platzhalter:* Neue Choice-Frage startet mit 3 vorgefüllten Optionen ("Option 1/2/3") statt leeren Feldern. Frage-Titel zeigt "Ihre Frage?" als italic-grauer Platzhalter im Editor-Modus wenn leer. Untertitel-`<p>` wird im Editor zusätzlich gerendert wenn `previewHighlight === "question_subtitle"` (zeigt "Untertitel (optional)" als Platzhalter).

  *Modal beim Neuer Funnel:* Bei `mode === "create"` und leerem Namen wird vor dem Editor ein 1-Schritt-Modal eingeblendet ("Wie soll dein neuer Funnel heißen?") mit Autofocus + Enter-Submit + Escape-Cancel. Cancel routet zurück zu `/dashboard/funnels`. So entsteht die "Funnel-Name fehlt"-Warnung nie bei neuen Funnels.

  *UI-Polish:* (1) Speichern-Button im Outline-Style wenn `!isDirty` (transparent + Border, hover primary), voll-primary mit amber Dot bei Änderungen. (2) Save-Status-Badge gekürzt von Satz auf "● Gespeichert" / "● Ungespeichert" mit farbigem Dot. (3) "Option hinzufügen" + "Mehrere auf einmal" als Outline-Buttons statt Text-Links (visuell gleichwertig). (4) Fragen-Sektion mit subtilem 2px Primärfarben-Akzent links via neues `emphasized`-Prop in `SectionAccordion`. (5) Question-Card Border in Dark-Mode von `gray-700` auf `gray-600` (kontrastreicher). (6) Funnel-Name-Input in Sidebar-Header mit sichtbarer Border + Background + Padding (vorher: nur Underline on Hover). (7) Frage-Titel im Editor mit italic-grauem "Ihre Frage?" Platzhalter wenn leer. (8) `editor-field-flash` Keyframe in [`globals.css`](app/globals.css) für visuelles Feedback auf nicht-fokussierbare Sidebar-Ziele. (9) `app/dashboard/layout.tsx`: `max-w-5xl` → `max-w-7xl` (1216px Content-Breite).

  *Architektonische Hinweise (für nächste Iteration):* `funnel.tsx` macht weiterhin doppelt Dienst als Runtime-Widget und Editor-Preview. Erkannt durch `previewHighlight`/`onFieldClick`/`onStepChange` als Editor-only Props (im Live-Widget undefined → No-Ops). `TenantFunnelClient` setzt keine Editor-Props → Live-Widget byte-identisch zum Stand vor dieser Aufgabe. Stripe-Type-Errors im TS-Build sind pre-existing (nicht durch diese Aufgabe verursacht).

  (`components/funnel.tsx`, `components/tenant-editor/FunnelEditorShell.tsx`, `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/PreviewPanel.tsx`, `components/tenant-editor/SectionAccordion.tsx`, `components/tenant-editor/SectionFragen.tsx`, `components/tenant-editor/SectionKontakt.tsx`, `components/tenant-editor/SectionTexte.tsx`, `components/tenant-editor/SectionDesign.tsx`, `components/tenant-editor/EmailPreviewMockup.tsx`, `components/tenant-editor/LeadEmailPreviewMockup.tsx`, `components/tenant-editor/HealthCheckPanel.tsx` (neu), `app/globals.css`, `app/dashboard/layout.tsx`)

- **Aufgabe 22 – Stripe Billing Integration** – Vollständige Stripe-Integration für monatliche Abonnements. DB: `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`, `stripe_price_id` zu `tenants` hinzugefügt. `lib/stripe.ts`: Server-seitiger Stripe-Client (API v2026-04-22.dahlia). `lib/billing.ts`: `isBillingActive()` Feature-Gate (free → immer aktiv; sonst Stripe-Status prüfen), `getSubscriptionStatus()`, `STATUS_LABELS`, `STATUS_COLORS`. API-Routen: POST `/api/stripe/checkout` (Checkout Session + auto-create Customer), POST `/api/stripe/webhook` (Signatur-Verifikation, subscription created/updated/deleted → DB), POST `/api/stripe/portal` (Customer Portal Session). Dashboard `/dashboard/billing`: zeigt Plan, Status-Badge, Upgrade-Button (→ Checkout), Abo-verwalten-Button (→ Portal), kostenlos-Hinweis bei free-Status; Billing-Tab in TabNav. Stripe Test-Produkt: `prod_UZ6u1GcNJgolwY` "LeadPlug Standard", 49€/Monat `price_1TZygpQ5RyuRWopIg2SVj4PD`. Erweiterungsanleitung für neue Pläne in `current-feature.md` dokumentiert. (`lib/stripe.ts`, `lib/billing.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/stripe/portal/route.ts`, `app/dashboard/billing/page.tsx`, `app/dashboard/billing/BillingClient.tsx`, `app/dashboard/TabNav.tsx`, `.env.example`)

- **Aufgabe 21 – Navigation & Leads/Kontakte-Umbau** – Navbar-Umbau: Account + Logout als Icon-only Buttons (Breakpoint `lg`/1024px für Hamburger-Menü), Icons für alle Tabs ergänzt (Leads: Inbox, Kontakte: Users, Funnels: Layers), Account-Farbe im Mobile-Menü korrigiert. Neue Tab-Struktur: "Leads" (detaillierte Ansicht mit aufklappbaren Antworten + Funnel-Filter/Von-Bis/Sort) + "Kontakte" (einfache Kontaktliste Name/E-Mail/Telefon/Funnel/Angelegt). TenantLeadsTable erweitert: Funnel-Filter, Von/Bis-Datum, Sortierung, Suche mit Icon, gruppierter Datumsbereich-Container. LeadsTable (Kontakte) vereinfacht: kein Status, keine PATCH-API, nur Lesezugriff. Beide Komponenten: Zähler nur bei aktivem Filter sichtbar, einheitliche Spalten-Styles, mobile Kartenreihenfolge korrigiert. DB: `notes`-Spalte gedroppt. (`app/dashboard/TabNav.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/TenantLeadsTable.tsx`, `app/dashboard/leads/page.tsx`, `app/dashboard/kontakte/page.tsx` (neu), `components/leads/LeadsTable.tsx`, `app/api/leads/[id]/route.ts`)

- **Aufgabe 19 – Editor Responsive, Navigation & E-Mail-Preview** – Responsiver Editor: Sidebar full-width auf Mobile, Preview-Panel `hidden md:block`, Live-Button (`ExternalLink`, `md:hidden`) im Sidebar-Header bei vorhandenem `originalSlug`. Status-Badge in PreviewPanel: grün "Alles gespeichert" / amber "Ungespeicherte Änderungen" für alle Modi inkl. E-Mail-Previews (nur Success+noQuestions bleibt amber). `isDirty` als berechneter Wert (`JSON.stringify(state) !== JSON.stringify(initialState)`) statt boolean-State — Zurücktippen hebt Dirty-Flag automatisch auf. Exit-Modal statt Browser-`beforeunload`: `window.__editorGuard` Global-Callback wird bei `isDirty` gesetzt; `TabNav` + `DashboardHeader` fangen alle Nav-Link-Klicks ab und zeigen das Modal mit `pendingHref` — nach Speichern/Verwerfen wird zum ursprünglichen Ziel navigiert. Header max-width-Fix: `max-w-5xl mx-auto` aus DashboardHeader-Inner-Div entfernt → full-width passend zum Editor-Layout. Account-Breadcrumb in `TabNav`: auf `/dashboard/account` erscheint `← Dashboard / Account`. E-Mail-Previews: `EmailPreviewMockup` nutzt `state.emailSenderLocal + "@anfragebestaetigung.de"` für Von-Feld; `LeadEmailPreviewMockup` + `TenantLeadNotification.tsx` auf neues Design umgestellt (farbiger Header-Banner, Kontaktfelder dynamisch aus `state.contactFields`/`tenantConfig.contactFields`, CTA-Button "Lead im Dashboard ansehen →", Footer "Übermittelt von leadplug.de"). (`components/tenant-editor/FunnelEditorShell.tsx`, `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/PreviewPanel.tsx`, `components/tenant-editor/EmailPreviewMockup.tsx`, `components/tenant-editor/LeadEmailPreviewMockup.tsx`, `emails/TenantLeadNotification.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/TabNav.tsx`)

> Ältere Einträge (Aufgaben 6–18 sowie Zwischenarbeiten) in [`history-archive.md`](history-archive.md).
