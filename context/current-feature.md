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

## Aufgabe 57 — Restposten-Sprint (2026-06-10, laufend)

Plan: Block A Hygiene → Block B Test-Mails in Versand-Historie → Block C Karten-Felder im Canvas verkabeln. Danach Block D (Demo-Templates / Logik-Tab / Config-Cache) als je eigene Aufgaben.

- **Block B — Test-Mails in der Versand-Historie** (Branch `feature/aufgabe-57b-test-mail-logging`): Konsistenz zu Webhook-Tests (Stavros-Befund aus 56). Migration `aufgabe_57b_email_test_logging` (`email_delivery_attempts.is_test boolean NOT NULL DEFAULT false`, additiv, auf Prod mit User-Go). `sendTestEmail` ([lib/emails.ts](../lib/emails.ts)) loggt jeden tatsächlichen Send als Attempt-Row (submission_id NULL, Status terminal, delivered_at bei success wegen CHECK `delivered_when_success`; Log-Fehler: loggen statt werfen). Früh-Returns (Sub fehlt, Empfänger fehlt) loggen nicht — wie beim Webhook-Test. Logs-Route liefert `is_test` mit, `LogsSection` (EmailsPanel) zeigt violettes „Test"-Badge. Cron/Aggregation nachweislich unberührt (terminal + submission_id-Filter). Schema-Referenz dabei entdriftet: fehlende 54/54b/56-Migrationen + 56er-funnels-Spalten in [supabase-schema.md](supabase-schema.md) nachgetragen.
- **Block A — `funnels.submit_button_label` gedroppt** (Branch `feature/aufgabe-57a-drop-submit-button-label`): Code war seit dem 56er-Deploy referenzfrei (in 56 Runde 4 entfernt), Migration `aufgabe_57a_drop_submit_button_label` nach Verifikation direkt auf Prod appliziert (mit User-Go, skip_submit_step-Pattern). Datenlage beim Drop: nur 2 Funnels mit Wert (beide Standard-Label) — exakter Snapshot-Restore im DOWN-File. Prod-Widget nach Drop verifiziert (200). Doku bereinigt: `supabase-schema.md`, `architektur-diagramme.md` (ER), `architecture.md` (EditorState-Liste), `Anleitungen/Funnel-Konfigurationsreferenz.md`. **Befund nebenbei:** die Funnel-Konfigurationsreferenz in `Anleitungen/` ist insgesamt veraltet (beschreibt Vor-52D-Kontaktformular-Felder) — Kandidat für Doku-Cleanup.

---

## Aufgabe 56 — Dark-Mode-Sweep: Flächen-Kanon vereinheitlicht (2026-06-10)

**Status:** Branch `feature/aufgabe-56-dark-mode-sweep`, Type-Check + Build grün, visuelles Review durch Stavros ausstehend.

Auslöser: Stavros-Befund „Einbinden-Seite passt nicht ins Farbschema, Dashboard ist die Referenz". Inventar ergab 4 konkurrierende Dunkel-Quellen (gray-Palette, `background`-Token #0f172a, hartkodiertes #0d1117, gray-950 ad hoc). Kernproblem: `CodeBlock` hardcodete `#0f172a` = **exakt die Seiten-Hintergrundfarbe** → Code-Blöcke wirkten wie Löcher in den Karten.

- **Flächen-Kanon verbindlich in [`design-system.md`](design-system.md)** (Graustufen-Hierarchie-Sektion neu geschrieben): Seiten-/Bühnen-BG = `dark:bg-background`-Token · Karte gray-900 · Inputs/Insets gray-800 · Code-Flächen `bg-[#0f172a] dark:bg-gray-950` · Scrims black/40-50. Verbote: kein Flächen-Hex-Hardcoding, kein gray-950 außerhalb Code. Die frühere Doku-Ausnahme („#0d1117 bewusst") aufgehoben — das Dashboard hat sie nie benutzt, daher die Drift.
- **Migriert:** 7× `dark:bg-[#0d1117]` → Token (error/login/signup/not-found, CenterCanvas-Bühne, EditorShell-Root) · CodeBlock + 2× SharePanel-`<pre>` → Code-Kanon (Inline-Styles raus, `text-slate-300`) · E-Mail-Vorschau-Bühne gray-950 → Token · 3× Inline-Rename-Fokus gray-950 → gray-800 · „Erweitert"-Inset (FieldProperties) gray-950/30 → gray-800/40 (Insets gehen im Dark Mode heller, nicht dunkler).
- **Runde 2 (Stavros-Review: „Webhook-JSON-Modal = Gold-Standard, Logs/Einbinden = Katastrophe, Aufklapp-Zustand unsichtbar, Light Mode bitte auch"):**
  - **Code-Kanon final = Modal-Look:** `bg-[#0f172a] ring-1 ring-white/10 font-mono` (immer dunkel, light + dark). Erkenntnis: Modal und Logs hatten dieselbe Farbe — das Modal wirkte nur durch Syntax-Farben + Scrim; auf Karten tarnte sich `#0f172a` als Seiten-BG. Die white/10-Kante löst das. gray-950 (Runde 1) war zu schwarz → komplett raus (0 Vorkommen). Angewendet auf: CodeBlock (full-bleed: `border-y`), 2× SharePanel-GTM-`<pre>`, 2× Webhook-Log-`<pre>` (Inline-Styles raus), JSON-Modal (Ring dazu), E-Mail-Log-`<pre>`.
  - **Aufklapp-Pattern = Leads-Rezept:** offener Header `bg-gray-100 dark:bg-gray-800` (via `group-open:` bzw. conditional). Angewendet auf: PlatformGuides, SharePanel-GTM-Details, iFrame-Fallback-Toggle, FieldProperties „Erweitert", EmailsPanel Test-Mail + Versand-Historie.
  - **Light Mode vereinheitlicht:** Editor-Stages `bg-gray-50` → `bg-gray-100` (= Dashboard, 8 Stellen); Karten-Rezept `border-gray-100 + shadow-sm` (= ui/Card) auf SectionCard/SharePanel-Details/PlatformGuides. Hover-Konvention war bereits konsistent (weiß→gray-50, gray-900→gray-800).
- **Runde 3 (Stavros-Review):** Code-Flächen waren mit `#0f172a` „kaum als Code wahrnehmbar" (zu nah an Karte #111827) → neuer **Token `--color-code-surface` (#0b1220)** in [`globals.css`](../app/globals.css), alle 7 Code-Flächen auf `bg-code-surface` (kein Flächen-Hex mehr im JSX). Statistik-Monats-Header bekam das Aufklapp-Rezept (offen = gray-100/gray-800).
- **Bewusst belassen:** `dark:bg-black/40`-Scrim (Hidden-Page-Overlay), EmailsPanel-innere Collapsibles behalten border-gray-200 (sitzen auf weißer Spalte, nicht auf der Stage).
- **Runde 4 (Pre-Go-Live-Feinschliff):** (a) **Slider-Polish** (User-Go für funnel.tsx): Brand-Fill bis zum Daumen via `--slider-fill`-CSS-Var ([`globals.css`](../app/globals.css) `.funnel-slider`), Rest = Brand-Tint, Track 6px; Karten-Slider von nativem accent-color auf dieselbe Klasse vereinheitlicht. (b) **Live-Preview**: `?preview=1` skippt NUR den View-Zähler ([`TenantFunnelClient`](../components/TenantFunnelClient.tsx)) — Submits/Mails/Webhooks bleiben echt (E2E-Test-Feature); Links: ↗-Icon in der Editor-Topbar + „Live"-Button an der Canvas-Bühne (zeigt gespeicherten Stand). (c) **`submitButtonLabel` komplett entfernt** (tot seit 52D — nichts renderte ihn; verifiziert): aus `FunnelConfig`/`EditorState`/defaults/editorUtils/getTenantConfig/EmailsPanel-Mock. **DB-Spalte `funnels.submit_button_label` bleibt vorerst — Drop-Migration nach Deploy** (skip_submit_step-Pattern). (d) **Inline-Edit-Lücken geschlossen** (Audit im Chat): Antworten-Übersicht-Überschrift, Welcome-Button-Text (Button im editMode nicht mehr disabled — disabled schluckte alle Klicks), Checkbox-Frage-Label (mit Toggle-Guard im editMode) jetzt echte EditableTexts + Routes; Untertitel ohne Content = Hover-Ghost-Slot (`group/title`, opacity 0→60% bei Hover). **Bewusst nicht inline:** Platzhalter (sieht aus wie Antworten), Slider-Zahlen (Format+Einheit), Consent-Markdown-Label, Dropdown-Options. **Offen:** Karten-Felder haben weiterhin keine Canvas-Verkabelung (Klick-Selektion → Panel-Expand als eigener Block).
- **Runde 5 — Design-Schalter + Lead-Gate (Stavros-Entscheidungen nach test.html-Vorfall):**
  - **3 Anzeige-Schalter** (Migration `aufgabe_56_design_toggles`, additiv mit Defaults, auf Prod): `funnels.show_progress_bar` / `show_step_badge` (boolean, Default true) / `title_alignment` ('left'|'center', CHECK). Kette: types → defaults → editorUtils (buildFunnelConfig/Row/dbToEditorState) → getTenantConfig → Widget → neue „Anzeige"-Sektion im [`ThemePanel`](../components/tenant-editor/v2/ThemePanel.tsx). Badge-Zeile rendert weiter, wenn nur der Zurück-Pfeil sie braucht; bei `center` wird auch die Badge-Zeile zentriert.
  - **Lead-Gate gelockert** (Vorfall: Stavros' Test-Submission ohne E-Mail-Feld war „unsichtbar"): **Completed-Submissions erscheinen IMMER** im Posteingang + Dashboard-Pipeline (ermöglicht anonyme Quiz-Funnels); Abbrecher weiterhin nur mit E-Mail/Telefon ([`leads/page.tsx`](../app/dashboard/leads/page.tsx) + [`dashboard/page.tsx`](../app/dashboard/page.tsx) konsistent). Kontaktlose Zeilen zeigen „Keine Kontaktdaten" statt Leere.
  - **Editor-Warnung Kontaktierbarkeit** ([`CenterCanvas`](../components/tenant-editor/v2/CenterCanvas.tsx)): Amber-Banner über der Bühne, wenn kein sichtbares Pflichtfeld E-Mail/Telefon auf einer sichtbaren Karte existiert.
  - Befund derselben Session: Mail-Versand funktionierte korrekt (4× Kunden-Mail sauber „Lead hat keine E-Mail" gefailed, Tenant-Mails success via Resend) — Ursache war ausschließlich das fehlende E-Mail-Feld + Test-Subscriptions mit Wegwerf-Adressen.
- **Runde 6 — dezentes Validierungs-Feedback in Karten** ([`funnel.tsx`](../components/funnel.tsx), Stavros-Wunsch „subtil, Ausrufezeichen rechts"): Invalide Karten-Felder (Text/E-Mail/Tel/PLZ/Name, Zahl, Lang-Text) zeigen ein amber `CircleAlert` rechts im Feld — **erst nachdem das Feld einmal den Fokus verlor** (touched-Set; frische Karte bleibt ruhig), verschwindet live beim Korrigieren, Meldung aus [`validateContactField`](../lib/validateContactField.ts) als nativer Tooltip (`title`). editMode: nie. Bewusst nicht bei Einzel-Frage-Steps (ein leeres Feld + deaktivierter Button ist selbsterklärend) und nicht bei Interaktions-Widgets (Radio/Checkbox/Slider/…).
- **Notierter Folgepunkt (nicht in 56):** Test-Mails erscheinen — anders als Test-Webhooks — bewusst NICHT in der Versand-Historie (Aufgabe-41-Design: Tests laufen außerhalb der Drip-Queue). Stavros empfindet das als Inkonsistenz zu Webhooks → Angleichung (Attempt-Row `email.test` ohne Submission + Filter in `aggregateEmailStatusForSubmission` + Logs-UI) als kleiner eigener Task.

---

## Aufgabe 55 — Editor-Uplift: Undo/Redo + Builder-Bühne + Slider-Fix (2026-06-10)

**Status:** Branch `feature/aufgabe-55-editor-uplift`, Type-Check + `next build` grün, **manuell getestet durch Stavros („funktioniert alles")**, gemerged + deployed. Logic Jumps bewusst verschoben (Konzept steht, Chat 2026-06-10). Leaked-Password-Protection: Stavros-Entscheidung = bewusst aus (Beta, kein CIA).

**Feedback-Runde (gleiche Session):**
6. **StepPill-Bugfix:** `min-w-0` am Titel-Button — bei langen (Auto-)Titeln schob der nicht-schrumpfende Flex-Button die Hover-Actions aus dem `overflow-hidden`-Pill (Mülleimer unsichtbar).
7. **Theme-Toggle-Platzierung** ([`Sidebar.tsx`](../components/dashboard/Sidebar.tsx)): Menü-Ansatz nach Stavros-Feedback verworfen → wiederverwendete [`ThemeToggle`](../components/ui/ThemeToggle.tsx)-Komponente **oben rechts in der Logo-Zeile** (Stavros-Spot, `mr-3` Abstand zum Zuklapp-Pfeil). Eingeklappter Rail zeigt bewusst KEINEN Toggle (reine Navigation; Mount-Apply des Themes übernimmt das CSS-versteckte MobileNav-`ThemeToggle`). Footer = nur noch Workspace-Karte.
8. **E-Mail-Tab-Kontrast:** Eingabeflächen (Betreff/TipTap-Body/Link-Popover/Test-Empfänger/Name-Inline) von `dark:bg-gray-950` auf App-Standard `dark:bg-gray-800` — Vorschau-Bühne + Error-Log-`<pre>` bewusst dunkel belassen.

1. **Undo/Redo im Editor** (neu [`lib/useHistoryState.ts`](../lib/useHistoryState.ts), [`EditorShell`](../components/tenant-editor/v2/EditorShell.tsx)): Snapshot-Modell — Drop-in-Ersatz für das eine `useState<EditorState>`, kein Handler angefasst. Pause-Coalescing 600ms (Tipp-Burst = 1 Undo-Schritt), Stack-Limit 50, StrictMode-sicher (pure Updater). Strg+Z / Strg+Shift+Z / Strg+Y (Input/contentEditable-Fokus ausgenommen → natives Text-Undo), ↶/↷-Buttons in der Topbar (nur Bearbeiten-Tab — Ressourcen-Tabs speichern server-seitig, UI-Undo wäre dort eine Lüge). **`applyToAll`** für den dbId-Merge nach Save: gilt in present+past+future OHNE History-Eintrag — sonst würde Undo über den Save-Punkt die Page-UUIDs verlieren und der nächste Save würde after_page-Webhook-Bindings zerstören (Aufgabe-54-Invariante). Selection-Clamp-Effect gegen out-of-range nach Undo.
2. **Builder-Bühne** ([`CenterCanvas`](../components/tenant-editor/v2/CenterCanvas.tsx)): Karte vertikal zentriert (`my-auto` im Flex-Scroll — degradiert sauber zu Scroll), Stage-Hintergrund = `pageBackgroundColor` des Funnels (echtes WYSIWYG; bei transparent: Punktraster statt toter Fläche), Ambient-Glow hinter der Karte im Dark Mode (nur Default-Bühne), sanfter framer-motion-Auftritt beim Step-Wechsel (Test-Modus: stabiler Key, keine Re-Animation).
3. **StepList-Uplift**: Auto-Titel für unbenannte Steps (Karten → Feld-Labels „Name · E-Mail …", Fragen → Options-Labels; [`StepList`](../components/tenant-editor/v2/StepList.tsx) `derivedStepTitle`), neutraler „Unbenannt"-Fallback statt kursivem „Ohne Titel" ([`StepPill`](../components/tenant-editor/v2/StepPill.tsx)), **Hover-Quick-Actions Duplizieren/Löschen** pro Step-Pill (ohne Confirm — Undo ist das Sicherheitsnetz). **Step-Duplizieren ist neu** (`handleDuplicateQuestion`: Deep-Copy mit frischen `_id`/`_clientId`s, `dbId` bewusst nicht kopiert → neue Page-UUID beim Save; questionKey-Dedup macht der Save-Pfad via ensureUniqueKey).
4. **Fragetyp als Icon-Galerie** ([`PropertiesPanel`](../components/tenant-editor/v2/PropertiesPanel.tsx) `TypeSelect`): 2-spaltiges Popover mit denselben Typ-Chips (Icon + Pill-Farbe) wie StepList statt nacktem `<select>`. Verhalten identisch (onChange → questionType-Patch).
5. **Widget: Slider-Default-Commit** ([`funnel.tsx`](../components/funnel.tsx), mit User-Go): Step-Entry-Effect committet fehlende Slider-Werte in `answers` — exakt mit der Anzeige-Fallback-Kette (Frage-Slider: `default ?? min`; Karten-Slider: `sliderDefault ?? Mitte`). Vorher übermittelte „Default akzeptiert + weitergeklickt" keinen Wert. editMode/isSubmitted ausgenommen.

---

## Aufgabe 54 — Pre-Launch-Fixes: 5 Sicherheits-/Robustheits-Befunde aus Codebase-Audit (2026-06-09)

**Status:** Auf Branch `feature/aufgabe-54-pre-launch-fixes`. Migration **auf Produktion angewendet** (additiv: 1 RPC + 1 Index, mit Stavros-Go), RPC SQL-seitig mit Wegwerf-Funnel getestet (3 Läufe inkl. Atomicity-Rollback, danach gelöscht). Type-Check + `next build` grün, Framing-Header per `curl` gegen alle Routen-Typen verifiziert, echter Funnel-Slug rendert weiter mit `frame-ancestors *`.

Auslöser: vollständige Codebase-Analyse (Architektur/Security/Performance/toter Code). Die 5 Launch-Blocker wurden gefixt, Stripe-Webhook-Fix (200-bei-DB-Fehler) auf User-Wunsch zurückgestellt (Beta läuft kostenlos):

1. **E-Mail-Bug `recipient_value`** ([`lib/emails.ts`](../lib/emails.ts)): 3 SELECTs (processAttempt, sendTestEmail, scheduleAttemptsForSubmission) luden `recipient_value` nicht → Custom-Empfänger-Mails wären beim nächsten echten Lead als „Custom-Empfänger leer" gefailed, `@me`-Erkennung (From/Reply-To) lief im Versandpfad falsch. Prod-Check: 2 custom-Subs existieren, 0 Attempts betroffen (latent). Fix: Spalte in alle 3 Selects.
2. **Rate-Limiter-Lead-Verlust** ([`lib/tracking.ts`](../lib/tracking.ts), [`/api/submit`](../app/api/submit/route.ts)): zählte auch Partial-Rows → 3 parallele Nutzer hinter geteilter IP (Büro-NAT, Mobilfunk-CGNAT) blockten sich gegenseitig still die Submits. Jetzt: nur completed zählen, eigene `session_id` ausgenommen, Schwelle 3→10/10min, Rate-Check nach Shape-Check. Neuer partial Index `idx_submissions_ip_completed`.
3. **Clickjacking** ([`next.config.mjs`](../next.config.mjs)): `frame-ancestors *` + ungültiges `X-Frame-Options: ALLOWALL` galten für ALLE Pfade inkl. `/dashboard`/`/login`/`/admin`. Jetzt: Widget-Default bleibt (Slug-Embedding unverändert), App-Bereiche überschreiben mit `frame-ancestors 'none'` + `X-Frame-Options: DENY` (Next-Header-Override-Semantik), ALLOWALL entfernt.
4. **Submit-Idempotenz** ([`lib/tracking.ts`](../lib/tracking.ts), [`/api/submit`](../app/api/submit/route.ts)): doppelter POST (Doppelklick/Netzwerk-Retry) feuerte Webhooks + Drip-Mails doppelt. `upsertSubmissionProgress` gibt jetzt `{ id, alreadyCompleted }` zurück (Race-Guard für beide Pfade); bei `alreadyCompleted` antwortet `/api/submit` mit success **ohne** erneute Trigger und ohne Daten-Überschreiben.
5. **Atomares Funnel-Speichern + stabile Page-UUIDs** ([`app/api/tenant/funnels/[slug]/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/route.ts), [`lib/editorUtils.ts`](../lib/editorUtils.ts), Migration `aufgabe_54_replace_funnel_content_rpc`): PUT machte delete-then-insert ohne Transaktion (Insert-Fehler = Funnel leer, Datenverlust) **und** rotierte alle Page-UUIDs pro Save → `webhook_subscriptions.trigger_page_id` (FK SET NULL) wurde genullt = `after_page`-Webhooks starben still beim Speichern (Prod-Check: noch keine after_page-Subs betroffen, latent). Jetzt: RPC `replace_funnel_content(p_funnel_id, p_pages, p_fields)` — eine Transaktion, Pages werden **upserted** (bestehende `dbId` aus dem EditorState wird wiederverwendet, nur entfernte Pages gelöscht, Fields delete+insert), SECURITY INVOKER → RLS gilt vollständig. Außerdem: PUT validiert `req.json()` + `state.questions` jetzt (400 statt 500). **Nachfix (2026-06-10):** auch brandneue Steps haben ab dem ersten Save eine stabile UUID — `editorStateToPagesAndFields` gibt `pageIdByClientId` (EditorQuestion._id → Page-UUID) zurück, der PUT reicht es als `pageIds` an den Editor, [`EditorShell`](../components/tenant-editor/v2/EditorShell.tsx) mergt die dbIds identisch in State + Snapshot (isDirty-JSON-Vergleich bleibt korrekt). Webhook-Binding auf neue Steps geht damit ohne Editor-Reload, keine UUID-Rotation bei Folge-Saves mehr.

**Rollback:** Code via Branch-Revert; Migration via `..._DOWN.sql` (erst Code zurückrollen, dann Funktion droppen — Reihenfolge im DOWN-File dokumentiert).

**Nachschlag 54b (2026-06-10, gleicher Branch) — restliche Korrektheits-/Härtungs-Befunde aus dem Audit gefixt:**

1. **Stripe-Webhook** ([`app/api/stripe/webhook/route.ts`](../app/api/stripe/webhook/route.ts)): DB-Fehler → jetzt 500 (Stripe retried mit Backoff; Updates sind idempotent). Entdeckt dabei: das alte try/catch war wirkungslos — der Supabase-Client wirft nicht, Fehler kamen im Result-Objekt und wurden komplett verschluckt (nicht mal geloggt). Jetzt explizite `{ error }`-Checks.
2. **Cron** ([`app/api/cron/webhook-retry/route.ts`](../app/api/cron/webhook-retry/route.ts)): (a) **Claim-first** — `abandoned_webhook_fired_at` wird VOR dem Trigger gesetzt (mit `.is(NULL)`-Guard, race-sicher); vorher konnte ein Function-Kill zwischen Trigger und Marker Doppel-Webhooks erzeugen. At-most-once statt at-least-once (bewusst: lieber selten einen Abandoned-Hook verlieren als Tenant-CRMs Duplikate schicken). (b) **Zeitbudget 45s** — alle 4 Loops (Webhook-Retry, Abandoned, Mail-Pending, Mail-Retry) brechen sauber ab statt in den 60s-maxDuration-Kill zu laufen (Worst-Case war 200 × 10s-Timeout); Rest holt der nächste 5-Min-Run, Response meldet `budget_exhausted`.
3. **Webhook-URL-Härtung (SSRF)**: neuer `validateWebhookUrl` in [`lib/webhooks.ts`](../lib/webhooks.ts) — nur https, blockt localhost/.local/.internal, private/Loopback/Link-Local/CGNAT-IPv4-Ranges, IPv6- + numerische Literale. In POST + PATCH ([`webhooks/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/webhooks/route.ts), [`webhooks/[id]/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/webhooks/%5Bid%5D/route.ts)) verdrahtet; Client-Check im [`WebhookAddModal`](../components/tenant-editor/v2/WebhookAddModal.tsx) auf https angeglichen. Bestehende Subs unberührt (Prod-Check: alle https). Best-Effort (DNS-Rebinding bleibt theoretisch).
4. **JSON-Robustheit**: ungefangene `req.json()` in leads-PATCH + beiden Webhook-Routes → 400 statt 500.
5. **`maybeSingle()`-Zukunftssicherheit**: Tenant-/Membership-Lookups ([`funnels/[slug]/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/route.ts), [`funnels/route.ts`](../app/api/tenant/funnels/route.ts) GET+POST, [`dashboard/layout.tsx`](../app/dashboard/layout.tsx)) mit `order(created_at) + limit(1)` — maybeSingle errort bei >1 Row, wäre bei Multi-Membership (Phase E) hart gebrochen.
6. **Hygiene**: `typescript.ignoreBuildErrors` entfernt (Build-Typecheck läuft jetzt scharf — Build grün), tote `logSubmission` gelöscht, `email`/`tel` aus `VALID_QUESTION_TYPES` raus (DB-verifiziert: 0 solcher Fields), `package.json`-Name `solar-funnel-widget` → `leadplug-saas`.
7. **Widget-Robustheit (54c, mit User-Go für funnel.tsx):** (a) `normalizeHex` in [`funnel.tsx`](../components/funnel.tsx) — Theme-Farben aus der DB werden vor der Color-Math validiert (3-stellig expandiert, Ungültiges → Default; vorher hätte ein kaputter DB-Wert alle abgeleiteten Farben zu NaN zerschossen). (b) Submit-Retry in [`TenantFunnelClient`](../components/TenantFunnelClient.tsx) — 1 Retry nach 1,5s bei Netzwerkfehler/5xx (nicht bei 4xx), `keepalive: true` (POST überlebt redirectUrl-Navigation); safe weil `/api/submit` seit 54 idempotent. **Bewusst verschoben:** Slider-Default-Commit (braucht Klick-Test), Inline-Validierungs-Fehlermeldungen (Design-Aufgabe mit visueller Abnahme), Undo/Redo (eigene Aufgabe, Konzept steht im Chat 2026-06-10).
8. **Migration `aufgabe_54b_advisor_hardening`** (additiv, auf Prod appliziert, DOWN vorhanden): EXECUTE auf `rls_auto_enable()` für public/anon/authenticated revoked (Event-Trigger braucht keine RPC-Grants), `update_updated_at()` mit gepinntem `search_path` (Trigger danach funktional verifiziert). Advisor-Nachprüfung: beide WARNs weg; verbleibend nur Gewolltes (honeypot_triggers ohne Policy = Service-Key-only; current_tenant_ids/role = RLS-Helper) + **Leaked-Password-Protection = Dashboard-Toggle, manuell aktivieren** (Authentication → Passwords).

**Offen aus dem Audit (bewusst separat, keine Bugs):** `getTenantConfig`-TTL-Cache (heißester Pfad; Produkt-Frage: Widget darf Config bis TTL verspätet sehen) · Dashboard-Pagination/Aggregation (lädt ganze Tabellen; erst bei echtem Traffic) · Service-Key-Client-Konsolidierung (7 Duplikate, reiner Refactor) · Flooding-Schutz für track-progress/track-view (bräuchte IP-Spalte in view_logs bzw. neuen Index — Kosten/Nutzen pre-launch negativ) · [`funnel.tsx`](../components/funnel.tsx)-Aufteilung (2000+ LOC, nur in Absprache).

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
