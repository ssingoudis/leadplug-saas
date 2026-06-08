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

## Pre-Go-Live UI-Politur: Dashboard-Cockpit, Admin-Cockpit, Leads/Webhooks/Billing-Feinschliff + DB-Cleanup (2026-06-08)

**Status:** Auf Branch `feature/dashboard-ui-politur`, Type-Check durchgehend grün, visuell vom User abgenommen. Reine UI-/Doku-Politur + ein Prod-Daten-Cleanup — keine Schema-Migration.

- **Dashboard-Cockpit** (`app/dashboard/page.tsx`, neu `components/dashboard/Sparkline.tsx`, gelöscht `components/dashboard/DailyLeadsChart.tsx`): aufgeblasenes 14-Tage-Balkendiagramm raus → 4 klickbare KPI-Karten (30-Tage Leads/Aufrufe mit **Mini-Sparkline** · Conversion · aktive Funnels), Begrüßung + „Neuer Funnel"-CTA, klickbare „Neueste Leads", Pipeline (→ gefilterte Leads), neuer „Deine Funnels"-Block (Leads/Aufrufe pro Funnel). Trend lebt als Sparkline; volle Tages-Charts bleiben auf Statistiken.
- **Admin-Cockpit** (neu `components/admin/WorkspacesCockpit.tsx` + `WorkspaceDangerZone.tsx`, `app/admin/page.tsx`, `app/admin/[tenantId]/page.tsx`, `lib/admin/queries.ts`, neu `app/api/admin/workspaces/[id]/route.ts`): 4 Kennzahlen (aktive Workspaces/Formulare/Aufrufe/Leads), durchsuch-/sortierbare Tabelle mit **Status-Spalte** (Kein Funnel/Ohne Traffic/Live/Leads ✓), Plan-Badge, „letzter Lead", Owner-E-Mail-Klick-Kopieren. ⋯-Menü (Details · Anschreiben · Plan · Deaktivieren-mit-Warnung) — Löschen **nicht** im Menü, sondern als **Gefahrenzone** in der Workspace-Einsicht (Deaktivieren-Warnpopup + Löschen im Funnel-Modal-Stil mit Tippe-den-Namen-Sicherung). API superadmin-gated (404 statt 403). `queries.ts` um `viewCount`/`lastLeadAt`/`activeFunnelCount` erweitert.
- **Leads** (`app/dashboard/TenantLeadsTable.tsx`): kompakte 1-Zeilen-Filterleiste (Suche füllt Breite), **Zeitraum-Dropdown mit Presets** statt nativem Kalender (Benutzerdefiniert blendet Datumsfelder ein), Kanban-Spalten mit max-Höhe + Eigenscroll, Liste „erst 25, dann Mehr laden".
- **Webhooks** (`components/tenant-editor/v2/WebhooksPanel.tsx`): „**Beispiel-Daten**"-Popup (funnel-spezifisches JSON mit Syntax-Highlight + Copy, gespiegelt aus `lib/webhooks.ts`), native `confirm()` → `ConfirmModal` (Löschen + Secret-Rotation), „Letzte Versuche" im dunklen Code-Look, Listen-Wording „feuert am Funnel-Ende" → „Am Funnel-Ende".
- **Einbinden** (`SharePanel.tsx`, `components/dashboard/PlatformGuides.tsx`): Unicode-`▶` → lucide-`ChevronDown` (konsistent zum Rest), Header-Trennlinie bei den Plattform-Anleitungen.
- **Statistik** (`StatistikenCockpit.tsx`, `DonutChart.tsx`): 2 „letzte 30 Tage"-Kacheln, Donut dünner + größer.
- **Billing** (`billing/page.tsx`, `BillingClient.tsx`, `lib/billing.ts`, `components/dashboard/navItems.ts`): Open-Beta-Texte (kein Dev-Jargon, keine Angst-Phrasen), Badge „Kostenlos" statt „Kostenlos (Admin)", Überschrift/Nav „Billing" → „Plan & Abrechnung"/„Abrechnung". Free-bei-Registrierung war bereits aktiv (kein Eingriff nötig).
- **Sidebar** (`components/dashboard/Sidebar.tsx`): Dark-Mode-Eintrag „springt" nicht mehr beim Auf-/Einklappen (Label `truncate` wie die Navi-Punkte).
- **DB-Cleanup** (direkt auf Produktion, mit User-Go): 6 ownerlose Alt-/Test-Workspaces gelöscht (5 leer + `demo` mit 9 Funnels/1 Lead; submissions-first, dann Tenant-Cascade). Ursache = Alt-Seed (`per_month`-Default) + manuelle Auth-User-Löschungen — **kein** Bug im Registrierungs-Flow. Danach nur noch 3 echte Accounts.
- **Doku-Fixes** (`architecture.md` §13, `architektur-diagramme.md`): Payload-Beispiel `lead_price` entfernt (echter Sender schickt es nicht — `lead_price`/`per_lead` ist deprecated, siehe Memory), DailyLeadsChart-Diagramm-Label → „Overview-Cockpit (KPIs + Sparkline)".

---

## Aufgabe 53 — E-Mail-Editor-Überhaul: dynamische Variablen, Empfänger, Link, Dark-Mode (2026-06-06)

**Status:** Fertig + gemergt. Build durchgehend grün, vom User live im Editor (Hell + Dunkel) verifiziert + abgenommen. Branch `feature/aufgabe-53-mail-variablen-dynamisch`.

**1. Dynamische Mail-Variablen** (vorher nur statische 3er-Liste Lead-Name/-E-Mail/-Telefon):
- Picker baut sich dynamisch aus den Funnel-Feldern ([funnelVariables.ts](../components/tenant-editor/v2/email/funnelVariables.ts) `buildFunnelVariables`): **„Lead-Kontakt"** (Name/E-Mail/Telefon, gefiltert auf das, was der Funnel erfasst) · **„Weitere Felder"** (alle übrigen, per Feld-Label, dedupliziert — E-Mail/Telefon/voller Name nicht doppelt; Beispiel-Werte rechts; `unbenannt`-Marker bei fehlendem Label) · **„Datum/Zeit"**. Auch im **Betreff**.
- `resolveVar` ([emailTemplates.ts](../lib/emailTemplates.ts)) löst `answer.<field-key>` auf den Anzeige-Wert auf (`resolveAnswerVar` + `resolveCustomFieldDisplay`): Choice → Label (nicht Slug), checkbox → Ja/Nein, date → lokalisiert.
- `VariableNode` ([VariableNode.ts](../components/tenant-editor/v2/email/VariableNode.ts)): dynamische Chip-Labels via `extraLabels`-Option. `buildPreviewConfig` keyt Fragen jetzt nach `field_key` (vorher dbId) — sonst trifft die Vorschau die `answer.<key>`-Variablen nicht.

**2. Tote `funnel.*`-Chips aufgeräumt:** Migration `aufgabe_53_strip_funnel_var_chips` (Dry-Run-verifiziert, UP+DOWN im Repo, angewendet + geprüft: 0 funnel.*-Reste, contact.*/Magic-Sections intakt) strippte die toten Chips aus 15 `email_subscriptions` (body_html + subject). Safe für jede Code-Version. Code-Default `DEFAULT_NEW_BODY`: `funnel.email`-Chip raus.

**3. Link-Setzer:** 3× `window.prompt()` → **Inline-Popover** (`LinkButton` in [EmailEditor.tsx](../components/tenant-editor/v2/email/EmailEditor.tsx), URL + optional Text + Anwenden/Entfernen, URL-Normalisierung, Enter/Esc). Links im Editor sichtbar (blau + unterstrichen via Link-Extension-Klasse); Versand-Mail-Links unterstrichen.

**4. Empfänger-Modell** (vorher single-select customer/tenant/custom, kein Multi bei „an dich") — **KEIN DB-Change, deploy-sicher:**
- **2 Modi:** „An den Lead" (customer) | „An feste Adresse(n)" = Chip-basierte Multi-Adress-Liste (bis 5) + dynamischer **„Mein Postfach"-Marker** `RECIPIENT_ME = '@me'` ([emailTemplates.ts](../lib/emailTemplates.ts)).
- **Sender** ([emails.ts](../lib/emails.ts)): `resolveRecipient` löst `@me` → `notification_email` auf (folgt der Account-Adresse); `isInternalRecipient` (tenant ODER custom-mit-@me) steuert From-Adresse + reply-to=Lead; Test-Versand nutzt jetzt `resolveRecipient` (DRY, @me-aware); Status-Aggregation zählt custom-mit-@me als „Tenant benachrichtigt".
- `recipient_type` bleibt {customer,tenant,custom}; `@me` sieht alter Prod-Code nie → Bestandsmails verschicken 1:1 wie bisher.
- UI: `FixedRecipients` (ersetzt `CustomRecipientList`/`serializeRecipients`) — Mein-Postfach-Box + lila Adress-Chips (×) + „Adresse hinzufügen" (Reveal-Feld, Enter → Chip).

**5. UI-Polish (auf User-Feedback):**
- **Toggle-Knopf-Bug** app-weit gefixt (3× dupliziert: Controls/PropertiesPanel/FieldProperties): An-Zustand sitzt symmetrisch ganz rechts (`translate-x-4.5` statt `-4`). Label dynamisch „aktiv"/„inaktiv".
- **Dark-Mode-Inputs:** rohe DOM-Inputs (CTA-Button, Antworten-Box) → `.lp-node-input`-Klasse ([globals.css](../app/globals.css)) mit klarer Affordance (Rahmen + kontrastierender Hintergrund) in Hell + Dunkel.
- **Dark-Mode-Scrollbars:** Track gedimmt dunkel statt weiß ([globals.css](../app/globals.css), nur unter `.dark`; Widget unberührt).
- **Verzögerungs-Feld:** Layout-Bug (TextInput-`w-full` überschrieb `w-20`) → feste Wrapper-Breiten (Zahl schmal, Einheit-Select breit).

---

## Aufgabe 52 — Firmen-/Footer-Cleanup + Submit-Page-Rip-out (A–D komplett) (2026-06-06)

**Status:** A–C gemergt (Merge-Commit `d46aee3`). **Teil D fertig** — Submit-Page/Kontaktformular restlos aus Code **und DB** entfernt. Type-Check + Production-Build grün, Widget-Smoke-Test bestanden (Honeypot am Root + persistiert über Step-Wechsel, 0 `<form>`, Karten/A-B-C-D rendern, keine Console-Errors).

**Erledigt (A–C):**
- **A — Firmen-E-Mail-Variablen raus:** `{{funnel.name/email/phone}}` aus `AVAILABLE_TOKENS` + `resolveVar` + Default-Templates ([emailTemplates.ts](../lib/emailTemplates.ts), [EmailsPanel.tsx](../components/tenant-editor/v2/EmailsPanel.tsx)). Mails nutzen nur Lead-Daten (`{{contact.*}}`/`{{answer.*}}`).
- **B — Footer-Daten weg:** tote Code-Kette + **DB-Spalten `funnels.footer_company_name/email/phone/text` GEDROPPT** (`aufgabe_52_drop_footer_columns`). `companyName` bleibt (aus `tenant.company_name`).
- **C — Render-Fallbacks:** `footerText`-Fallback weg, `answersOverviewLabel` → Editor-Default; `successMessage` behält „never-bare"-Default.

**Erledigt (D — Submit-Page-Rip-out):** Das inerte Kontaktformular-Gerüst ist restlos entfernt (kein `contactFields` mehr im Code).
- **Widget** ([funnel.tsx](../components/funnel.tsx)): Kontaktformular-Zweig (~465 Zeilen `<form>`) + `isContactStep` + `contactData`/`errors`/`hasTriedSubmit` + `handleContactChange/handleFormSubmit/handleSubmit` + `isValid` + `visibleContactFields` raus. **Honeypot an den Widget-Root relocatet** (immer gerendert, persistiert über Step-Wechsel — Bot-Schutz bleibt). Submit jetzt für ALLE Funnels am Funnel-Ende (`autoFinish`); `skipSubmitStep`-Prop + `contactFields`-Prop entfernt.
- **Geld-Pfad:** `enrichContact` gelöscht ([tracking.ts](../lib/tracking.ts)); `/api/submit` + `/api/track-progress` leiten contact nur noch aus `deriveContactFromAnswers` (Karten-Antworten) ab, Card-Backstop-Validierung bleibt. `resolveAnswerEntries` (webhooks) + `collectFieldMetas` (tracking) ohne contactFields-Loop (Custom-Karten-Pfad `pushContactFieldEntry` bleibt). `contactFields` aus `getTenantConfig` + `TenantConfig`/`EditorState`.
- **Editor:** `SubmitProps` + Submit-Pill + `SelectedStep.submit` + Submit-Branch in CenterCanvas + Contact-Field-Handler in EditorShell + `SUBMIT_META` raus; Submit-Page-Erzeugung aus `editorStateToPagesAndFields` entfernt; `dbToEditorState` liest keine Submit-Page mehr.
- **E-Mails:** `contact_summary`-Magic-Section ersatzlos entfernt (renderContactSummary + Token + Block-Picker-Eintrag + Default-Template). Gespeicherte contact_summary-Blöcke in Alt-Mails degradieren sauber zu `''`. Der reale Funnel (`leadplug`) nutzt `answers_overview` → unberührt.
- **DB-Cleanup (auf User-Wunsch nachgezogen):** orphaned Submit-Pages **gelöscht** — Migration `aufgabe_52d_delete_orphaned_submit_pages` (`DELETE FROM pages WHERE page_type='submit'`, 12 Pages + 52 Fields via `ON DELETE CASCADE`). Vorher geprüft: 0 Webhooks zeigen darauf, `submissions` haben keinen FK auf `pages` → leadplugs 28 Leads unberührt (verifiziert). Rollback: `..._DOWN.sql` (exakte Re-INSERTs) + tägliches Backup. **DSGVO-Bonus:** die Alt-Demo-Submit-Felder (Name/E-Mail/Telefon-Defs, keine echten Leads) sind damit auch weg.
- **`skip_submit_step` voll abgebaut (User-Wunsch):** alle `skipSubmitStep`/`skip_submit_step`-Code-Referenzen raus (Typen, `getTenantConfig` SELECT+Return, `editorStateToFunnelRow`, `dbToEditorState`, `DEFAULT_EDITOR_STATE`, `EmailsPanel`-Preview). **Spalten-DROP als Migration `aufgabe_52d_drop_skip_submit_step` vorbereitet, aber NOCH NICHT angewendet** — Deploy-Reihenfolge: erst 52D mergen+deployen (sonst liest der alte Prod-Code eine gedroppte Spalte → 500), DANN den DROP anwenden. UP+DOWN liegen im Repo.
- **Bewusst gelassen:** Die 11 Alt-Demo/Test-Funnels (0 echte Leads) verlieren ihr Kontaktformular — **pre-launch freigegeben** (User-Entscheidung 2026-06-06).

---

## Aufgabe 51 — Kontaktformular abgeschafft + Success-Seite + Nummerierung (2026-06-06)

**Status:** Branch `feature/aufgabe-51-kontaktformular-abschaffen`. Type-Check durchgehend grün, Production-Build erfolgreich. Iterativ mit Stavros abgenommen. **1 additiver DB-Change** (`funnels.show_answers_overview`, direkt auf Prod mit User-Go). **Alte Funnels dürfen brechen (pre-launch) → keine Migration.**

Das hartkodierte **Kontaktformular** (`page_type='submit'`) ist abgeschafft — Lead-Erfassung läuft als normale Card (Kontaktdaten-Preset), Submit am Funnel-Ende. Tiefenanalyse vorab ergab: der Backend-Pfad war **schon submit-page-agnostisch** (`skip_submit_step` + `deriveContactFromAnswers` + „Absenden"-Button existierten) → reine Editor-/Widget-Änderung, kein Backend-Umbau.

**Kontaktformular raus (für neue Funnels):**
- [`defaults.ts`](../components/tenant-editor/defaults.ts) `DEFAULT_EDITOR_STATE`: `skipSubmitStep: true`, `contactFields: []`.
- [`StepList.tsx`](../components/tenant-editor/v2/StepList.tsx): Submit-Pill nur noch bei Alt-Funnels (`!skipSubmitStep`); „Abschluss" = nur End-Screen.
- [`editorUtils.ts`](../lib/editorUtils.ts) `editorStateToPagesAndFields`: keine Submit-Page mehr im skip-mode. Default-/Delete-Selektion ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx)) fällt auf `success` statt den versteckten `submit`.
- **Server-Backstop** ([`/api/submit`](../app/api/submit/route.ts)): im skip-mode werden Pflicht-Card-Felder serverseitig validiert (gegen Direct-POST; lenient).

**Consent = Checkbox mit Link:** [`funnel.tsx`](../components/funnel.tsx) parst `[Text](https://…)` im Checkbox-Label → klickbarer `<a>` (`renderLabelWithLinks`). Editor-Hint an beiden Checkbox-Feldern ([`FieldProperties.tsx`](../components/tenant-editor/v2/properties/FieldProperties.tsx)).

**Success-/End-Screen ([`funnel.tsx`](../components/funnel.tsx) + [`PropertiesPanel.tsx`](../components/tenant-editor/v2/PropertiesPanel.tsx)):**
- **Header-Banner (Firmenname) + Footer (Kontakt) entfernt** — zogen den Agentur-Account-Namen + Platzhalter, nicht editierbar, inkonsistent. Stattdessen: **gefüllter Marken-Häkchen-Kreis** (weißer Haken) als zentrierter Akzent.
- **Antworten-Übersicht optional** (Default AUS) — neue Spalte `funnels.show_answers_overview`, Widget-gated, Toggle in SuccessProps.
- **Titel** nie leer (interim Default-Fallback „Vielen Dank für Ihre Anfrage!"). **Antwort-Text** optional (leer = zweite Zeile ausgeblendet).
- **Architektur-Prinzip (Stavros, 2026-06-06):** „wenn null → Default einfügen" am Render ist ein Relikt. Defaults gehören **vorausgefüllt in den Editor** (`DEFAULT_EDITOR_STATE`), das Widget zeigt was da ist. Für `responseMessage` umgesetzt (Render-Fallbacks raus). **Offen für den Cleanup:** dasselbe für die restlichen `TEXT_DEFAULTS`-Texte.

**Nummerierung:** nur Fragen/Cards zählen. `StepPill.number` optional → Welcome + Abschluss-Steps ohne Nummer; Fragen via Flow-Position (`pos+1`) → 1. Frage = „1". Im Widget zählt das Badge nur Nicht-Welcome-Steps.

**Offen / nächster Task (eigener Plan):** (1) Firmen-E-Mail-Variablen `{{funnel.name/email/phone}}` raus (E-Mails nutzen nur Lead-Daten) + Default-Templates bereinigen. (2) Orphaned `footer_*`-Spalten + die `companyName/publicEmail/phone`-Kette aus DB + Code. (3) Render-Fallbacks (`TEXT_DEFAULTS`) → Editor-Defaults.

---

## Aufgabe 50 — Editor-Uplift: Bearbeiten-Tab + Karten-Model + Konsistenz (go-live-reif) (2026-06-06)

**Status:** Branch `feature/aufgabe-50-bearbeiten-tab-uplift`. Type-Check durchgehend grün, Production-Build erfolgreich. Iterativ visuell mit Stavros abgenommen. **Kein DB-Change** (Marker-Stil nutzt die bestehende `fields.config`-jsonb-Spalte).

Der finale Pre-Go-Live-Pass über den Editor — funktional **und** optisch. Highlights:

**Save-Modell & Layout-Chrome:**
- **Speichern entkoppelt vom Navigieren** ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx) `handleSave({ leaveAfter })`): Edit-Modus speichert + **bleibt** (Badge „Gespeichert"), nur ExitModal/Create navigieren. Status + Aktion sind EIN Element oben rechts (kein separates Badge mehr).
- **Top-Bar = eine Zeile** (Name · Tabs mittig · Speichern). „Funnel testen" + Geräte-Umschalter **schweben im Canvas** (Schatten, kein Kasten), kein eigener Balken.
- **clamp-Spaltenbreiten** + geteilte `EDITOR_LEFT_COL` (clamp 280–340) → linke Spalte springt beim Tab-Wechsel nicht mehr. Alle Pane-Header einheitlich `h-14`/text-sm via `PanelListHeader` ([`ui/Panel.tsx`](../components/tenant-editor/v2/ui/Panel.tsx)).

**Karten-Model (Kernstück) — siehe [[feature_card_model]]:**
- Add-Menü ([`AddElementModal.tsx`](../components/tenant-editor/v2/AddElementModal.tsx)) = **Frage** (immersiv, eigener Schritt) · **Karten** (Kontaktdaten/Adresse/Eigene Karte) · **Einzelne Felder** (kompakt) · **Start** (Welcome).
- **Felder → in die gewählte Karte** (footer) oder neue Karte (`handleAddCardField` in EditorShell); Spezial-Typen = eigenständige Schritte. **Cards halten nur kompakte Felder** (Slider/Rating/Skala/Multi raus aus dem In-Card-Picker — würden sonst schrumpfen).
- **1-Feld-Karte rendert wie saubere Einzelfrage** (Feld-Label ausgeblendet bei genau 1 Feld + vorhandenem Titel) — `customFieldLabel` in [`funnel.tsx`](../components/funnel.tsx). **Canvas-„+"** auf nicht-leeren Karten. Neue Preset-Card **„Kontaktdaten"** (`makeContactCard` in [`defaults.ts`](../components/tenant-editor/defaults.ts)).

**Widget-Fixes ([`funnel.tsx`](../components/funnel.tsx)):**
- Mehrfachauswahl: doppelter Buchstabe entfernt; Option auch am Letter-Chip ziehbar.
- **Marker-Stil A/B/C · 1/2/3 · ohne** pro Choice-Frage (Inspektor-Segmented-Control), persistiert in `fields.config.optionMarker`, gerendert via `optionMarkerFor`. Mapping in [`editorUtils.ts`](../lib/editorUtils.ts) + [`getTenantConfig.ts`](../lib/getTenantConfig.ts).
- **Bugfix `visibleQuestions`:** im Editor wird NICHT mehr nach `visible` gefiltert (`editMode ? questions : filter`) → Off-by-one behoben, der bei einem deaktivierten Step vor dem selektierten auftrat (z.B. hidden Welcome an Index 0).

**Modals & Inspektor:**
- Alle Editor-Dialoge auf geteiltes [`EditorModal`](../components/tenant-editor/v2/ui/EditorModal.tsx) (+ `dismissible`-Prop für Pflicht-Dialoge) — behebt den Scroll-/Out-of-screen-Bug des Feld-Pickers. Natives `confirm()` → gestyltes [`ConfirmModal`](../components/tenant-editor/v2/ui/ConfirmModal.tsx). Frage-Inspektor flacher (kein „Feld dieser Seite"-Wrapper). Löschen-Buttons full-width zentriert.
- **Webhooks** ([`WebhooksPanel.tsx`](../components/tenant-editor/v2/WebhooksPanel.tsx)): Name **inline im Header editierbar** (on-blur), Config-Name-Feld raus; Detail-Body `max-w-3xl` zentriert; „Aktiv"-Toggle am Content-Rand (nicht mehr „lost").
- **StepList**: Welcome in eigener „Start"-Sektion, Footer-„Frage hinzufügen"-Button, Insert-„+" nach **jeder** Frage (inkl. letzter).
- **Design-Tab** ([`ThemePanel.tsx`](../components/tenant-editor/v2/ThemePanel.tsx)): „Funnel-weit/Design"-Header weg, **Seiten-Hintergrund = Segmented „Transparent | Eigene Farbe"**, Farb-Picker als sauberer Chip (globals.css `.lp-color-chip`), unnötiger Fußnoten-Hinweis weg.
- **Datenschutz editierbar** im Kontaktformular-Inspektor (`privacyText` + `privacyPolicyUrl` — waren im State, nicht im UI). **Bridge-Fix** — das Kontaktformular bleibt aber ein Relikt.

**Linke Nav** ([`Sidebar.tsx`](../components/dashboard/Sidebar.tsx)): Hover-Expand smoother (300ms + 130ms Grace-Delay beim Zuklappen). Overlay-Verhalten im Editor verifiziert (kein Reflow).

**Bewusst NICHT gemacht:** Paket „D" (lokale Inspektor-Controls auf `ui/Controls` vereinheitlichen) — reines DRY, Regressions-Risiko, kein User-Nutzen → gestrichen (Stavros: „UX-Prio 1, keine Konsistenz um der Konsistenz willen").

**Offen / nächster fokussierter Task (NACH Go-Live, in-depth analysieren):** **Kontaktformular card-ifizieren** — den hartkodierten Submit-Schritt abschaffen, Lead-Erfassung als normale Cards, Submit am Funnel-Ende, Consent optional. Go-live-kritisch (Billing-Pfad) → erst nach Validierung mit Sicherheitsnetz. Siehe CLAUDE.md „Submit-Page-Abschaffung geplant".

---

## Aufgabe 49 — Editor-UX-Uplift + Autosave-Pattern + Funnel-Cards + Webhook-Namen (2026-06-03)

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

> _Ältere Einträge (Aufgabe 42 und davor) wurden nach `history-archive.md` ausgelagert (2026-06-07)._
