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

## History

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
