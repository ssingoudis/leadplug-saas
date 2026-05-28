# LeadPlug Roadmap — granulare Aufgaben-Liste

> **Rolle dieser Datei:** detaillierte Aufgabe-X.Y-Beschreibungen + Phase-B-History für die konkrete Coding-Arbeit.
>
> **Scope-Wahrheit ist die Fokus-Roadmap.** Strategische Frage „was bauen wir bis Launch?" beantwortet [`builder-fokus-roadmap.html`](builder-fokus-roadmap.html), nicht diese Datei. Bei Widerspruch wiegt die Fokus-Roadmap stärker — Stand hier ist evtl. nur noch History.
>
> Strategische Entscheidungen (Tenant-Modell, Pricing, Builder-Richtung): siehe [`../CLAUDE.md`](../CLAUDE.md).

---

## Übersicht der Phasen

| Phase | Fokus | Status |
|---|---|---|
| **A** | Doku-Reset (CLAUDE.md, project-overview, schema, HTML-Files) | ✅ abgeschlossen (Mai 2026) |
| **B** | Schema-Refactor & Architektur-Foundation | ✅ abgeschlossen — B.1 ✅, B.2 ✅, B.3 ✅, B.4 ✅, B.5 ✅, B.6 ✅, B.7 ✅ (mit B.5 erledigt) — Mai 2026 |
| **C** | Builder-MVP-Sprint (Logic Jumps, Feldtypen, Polish) | ⚪ nach Phase B |
| **D** | MVP-Launch + Partner-Pitches | ⚪ Ziel |
| **E** | Pro-Plan-Features (Twilio, Web-Component-Embed, Kanban, …) | ⚪ Post-MVP |

---

## Phase A — Doku-Reset (laufend)

Ziel: alle Dokumente entsprechen der aktuellen Realität, bevor neue Architektur-Arbeit beginnt.

| Schritt | Was | Status |
|---|---|---|
| 1 | `CLAUDE.md` neu schreiben | ✅ |
| 2 | `context/project-overview.md` neu schreiben | ✅ |
| 3 | `context/supabase-schema.md` aus DB regenerieren | ✅ |
| 4 | HTML-Files in `context/` inspizieren und klassifizieren | 🟡 in Arbeit |

---

## Phase B — Schema-Refactor & Architektur-Foundation

> Ein einziger großer Refactor in einem Supabase-Branch. Pre-MVP. ~8-12 Tage Vollzeit.

Strategischer Hintergrund: Wir sind heute auf einem Schema, das für das alte Tenant-Modell (Tenant = Handwerker) gewachsen ist. Vor MVP bauen wir es auf das neue Modell um (Tenant = Agentur, Multi-User, sauberes RLS, UUID-FKs).

### B.1 — `tenant_members` + komplette RLS-Refactor ✅ (Aufgabe 25, Mai 2026)

**Status:** abgeschlossen am 2026-05-27 als Aufgabe 25. Migration `aufgabe_25_tenant_members_and_full_rls` + Hotfix `aufgabe_25_add_funnel_view_logs_delete_policy` direkt auf Production appliziert (Branch-Workflow übersprungen wegen MCP-Tooling-Limit + bewusst akzeptierter Ausnahmefall mit dokumentierter DOWN-Migration).

**Tatsächliche Umsetzung:**
- Enum `tenant_member_role`, Tabelle `tenant_members` mit UNIQUE(tenant_id, auth_user_id), 2 Indices, updated_at-Trigger
- Backfill: 3 Owner-Einträge (`leadplug`, `ssingoudis`, `stavros`)
- Helper-Funktionen `current_tenant_ids()` und `current_tenant_role(uuid)` — SECURITY DEFINER, STABLE, search_path gepinnt
- 19 neue Policies über 6 Tabellen (alte 5 SELECT-Policies gedroppt)
- 12 App-Code-Files umgestellt von admin-Client + manueller Auth → user-Client + RLS (7 API-Routes, 5 Server-Components)
- `app/dashboard/layout.tsx` erweitert: Auto-Tenant-Anlage schreibt jetzt zusätzlich Owner-Membership
- Slug-Walks (`tenant_slug IN (SELECT t.slug FROM tenants t WHERE t.id IN current_tenant_ids())`) bleiben in B.1 — werden in B.2 durch UUID-Joins ersetzt
- Type-Check sauber, Smoke-Test (Public-Widget rendert, geschützte Routen redirecten zu Login) sauber

### B.2 — UUID-FKs überall ✅ (Aufgabe 26, 2026-05-27)

**Status:** abgeschlossen am 2026-05-27. Alle 3 Migrationen appliziert (26a ADD-only, 26b DROP-only nach Vercel-Deploy), Code-Refactor live auf Production, Smoke-Test grün, supabase-schema.md regeneriert. Details: [`current-feature.md`](current-feature.md) Aufgabe 26.

**Tatsächliche Umsetzung (über ursprünglichen Scope hinaus):**
- Neue UUID-Spalten: `funnels.tenant_id`, `funnel_questions.funnel_id`, `funnel_view_logs.funnel_id+tenant_id`, **zusätzlich** `submissions.tenant_id` (ON DELETE SET NULL) — RLS via tenant_id, slug-Spalten bleiben als Snapshot.
- `tenants.slug` UND `tenants.auth_user_id` droppen — tenant_members ist Single Source of Truth, layout.tsx baut Tenant-Lookup auf tenant_members um.
- `funnels.slug` bleibt für öffentliche URLs, **wird nach Anlage unveränderlich** (UI-Enforcement existiert bereits).
- **/admin/* (Plattform-Owner-Cockpit) komplett gelöscht** — veraltet aus Pre-Self-Signup-Phase. Neuer Build als Phase-E-Eintrag geplant.
- Zweiphasen-Migration (Zero-Downtime): Phase 1 ADD-only mit BEFORE-Triggern für Slug→UUID-Sync, Phase 2 DROP-only.
- 11 alte RLS-Policies durch UUID-Versionen (`*_v2_*`) ersetzt (in Phase 2 werden alte gedroppt + v2-Suffix entfernt).

### B.3 — Legacy `submissions.contact_*`-Spalten droppen ✅ (Aufgabe 27, 2026-05-27)

**Status:** abgeschlossen am 2026-05-27. In denselben Deploy wie B.2 gezogen (gemeinsamer Commit, gemeinsamer Vercel-Deploy, Migration 27 direkt nach 26b appliziert).

**Umsetzung:**
- Backfill-Check ✅: alle 26 Submissions haben `contact` jsonb befüllt (verifiziert per SQL).
- App-Code: 6 Files refactored — lesen aus `contact` jsonb auf Server-Seite, Client-Komponenten unverändert (LeadRow + TenantSubmission types behalten ihre Shape).
- `lib/tracking.ts`: `logSubmission` schreibt nur noch `contact` jsonb, nicht mehr die 4 Spalten.
- Migration `20260528140000_aufgabe_27_drop_submissions_contact_legacy.sql` dropt die 4 Spalten — wartet auf Apply nach Vercel-Deploy.

### B.4 — `tenants` zur reinen Agentur-Account-Tabelle ✅ (Aufgabe 28, 2026-05-27)

**Status:** abgeschlossen am 2026-05-27. Beide Migrationen appliziert (28a Backfills + Constraints, 28b DROP), Code-Refactor live auf Production, Smoke-Test grün, supabase-schema.md regeneriert. Details: [`current-feature.md`](current-feature.md) Aufgabe 28.

**Tatsächliche Umsetzung:**
- Drop aus `tenants`: `notification_email`, `public_email`, `public_phone`, `address`. `company_name` bleibt als Anzeigename der Agentur.
- Backfill vor Drop: 11/12 funnels bekamen `notification_email` aus `tenants.notification_email`; alle leeren `footer_company_name`/`footer_email`/`footer_phone` aus `tenants.{company_name,public_email,public_phone}`.
- `funnels.notification_email` ist jetzt NOT NULL. Default beim Anlegen via /new/page.tsx: `user.email` (aus `auth.users`). Server-side Fallback in POST + PUT: `state.notificationEmail || user.email`. Tooltip im Editor auf "Pflichtfeld" aktualisiert.
- `getTenantConfig()` Override-Hierarchie aufgelöst — kein `|| tenant.public_email`-Fallback mehr; `TenantConfig.address`-Feld komplett entfernt (nirgends gerendert).
- Auto-Tenant-Anlage in `app/dashboard/layout.tsx` schreibt `notification_email`/`public_email` nicht mehr (Defensive Default-Setzung war obsolet).
- Stripe-Checkout nutzt `user.email` statt `tenant.notification_email` für Customer-Anlage.
- Zwei-Phasen-Migration (zero-downtime): Phase 1 backfillt + setzt funnels.notification_email NOT NULL + dropt tenants.{notification_email,public_email} NOT NULL. Vercel-Deploy dazwischen. Phase 2 dropt die 4 Spalten.

### B.5 — `pages` + `fields` (Page → 1:N Refactor) ✅ (Aufgabe 30, 2026-05-28)

**Status:** abgeschlossen am 2026-05-28 als Aufgabe 30. Beide Migrationen appliziert (30a additive + Daten-Migration, 30b DROP), Code-Refactor live auf Vercel (Commit 048d56b), Production-Smoke-Test grün, supabase-schema.md regeneriert.

**Tatsächliche Umsetzung:**
- Neue Enums: `page_type` (`question | submit | success`), `field_type` (`single_choice | multi_choice | short_text | long_text | email | tel | number | date | dropdown | checkbox | slider | radio | plz`). `radio` + `plz` als eigene Werte für Widget-Kompatibilität (radio = kleine Buttons, plz = 5-stellige Numerik-Validierung).
- Neue Tabellen `pages(id, funnel_id, page_type, sort_order, config, created_at, updated_at)` + `fields(id, page_id, field_key, field_type, label, subtitle, placeholder, visible, required, sort_order, options, config, created_at, updated_at)` mit `UNIQUE(page_id, field_key)`, FK-Cascades, 8 RLS-Policies, 2 updated_at-Trigger.
- **Daten-Migration in einer Transaktion:** 58 funnel_questions → 58 question-Pages mit je 1 Field (`field_key = question_key`, `field_type` = mapping mit `multiple_choice → multi_choice`); 52 contact_fields-Einträge aus den 12 funnels.contact_fields-jsonb → 12 submit-Pages mit insgesamt 52 Fields (`text → short_text`, `radio → radio`, `email/tel/plz` 1:1); 12 leere success-Pages. **Total: 82 pages, 110 fields.** DO-Block-Assertions verifizieren Counts vor COMMIT.
- **App-Code-Refactor** unter Wahrung der externen API: EditorState bleibt strukturell (`questions[]` + `contactFields[]`), neuer Mapping-Layer in `lib/editorUtils.ts` (`editorStateToPagesAndFields`, neue `dbToEditorState`-Signatur) übersetzt zwischen EditorState und pages/fields. `lib/getTenantConfig.ts` macht jetzt Service-Key-Read über `pages.fields`-Join statt `funnel_questions + contact_fields`. POST/PUT-API-Routen schreiben jetzt 3-stufig (funnel → pages → fields). DELETE pages WHERE funnel_id räumt Fields per CASCADE.
- **Widget unverändert:** `components/funnel.tsx` byte-identisch zu vor B.5 (CLAUDE.md §11, hands-off).
- **Tote Admin-Route entfernt:** `app/api/admin/create-funnel/route.ts` (schrieb noch direkt in `funnel_questions`) — letzte Reste aus dem in Aufgabe 26 entfernten /admin/* UI.
- **Zwei-Phasen-Migration (analog B.2/B.4):** Phase 30a additive (alte Tabelle bleibt), App-Code-Deploy via Vercel, dann Phase 30b DROP (funnel_questions + funnels.contact_fields + question_type-Enum). Editing-Lücke während des Vercel-Deploys (~1-2 min) gewollt, Single-User-Risiko akzeptabel.

### B.7 — `updated_at` Trigger Konsistenz ✅ (mit B.5 erledigt)

In Phase 30a wurden `updated_at`-Trigger direkt für pages + fields mitangelegt — kein eigener B.7-Sprint mehr nötig. `funnel_view_logs`, `submissions`, `webhook_delivery_attempts`, `honeypot_triggers` bleiben weiterhin ohne (alle append-only).

### B.6 — Webhook-Schema (nur Struktur, kein Code) ✅ (Aufgabe 29, 2026-05-27)

**Status:** abgeschlossen am 2026-05-27. Migration auf Production appliziert, Tabellen + RLS + Indices angelegt. Sender-Code kommt mit Webhook-Tier-Launch in Phase C.5.

**Tatsächliche Umsetzung:**
- `webhook_subscriptions(id, tenant_id, url, secret, event_types[], is_active, created_at, updated_at)` — pro Tenant 1..N Webhooks. CHECK-Constraints: `url LIKE 'http%' AND length >= 10`, `length(secret) >= 16`. `updated_at`-Trigger.
- `webhook_delivery_attempts(id, subscription_id, submission_id, attempt_count, status, last_error, delivered_at, created_at)` — Append-only Audit-Trail. CHECK-Constraints: `status IN (pending|retrying|success|failed)`, `attempt_count >= 1`, `delivered_at IS NOT NULL` wenn `status='success'`. FK auf `submissions(id)` mit ON DELETE SET NULL (Audit bleibt erhalten).
- **5 RLS-Policies:** subscriptions SELECT (alle Member), INSERT+UPDATE (owner+admin), DELETE (owner only). delivery_attempts SELECT only — keine User-Client-Writes (System schreibt via Service-Key).
- **7 Indices:** `tenant_id`, partial `is_active=true`, `(subscription_id, created_at DESC)`, partial `submission_id IS NOT NULL`, partial Retry-Queue (`status IN (pending,retrying)`).
- Schema additive — keine bestehenden Daten, kein Backfill nötig. Einzelner Migration-Schritt (kein zwei-Phasen-Pattern).
- App-Code: **kein Touch.** Editor/Dashboard/Submit-Flow unverändert.

### Phase-B-Workflow (verbindlich — aktuell gelebt)

Ursprünglich war ein einziger großer Supabase-Branch für die ganze Phase B geplant. **In der Praxis hat sich der per-Aufgabe-Branch-Workflow durchgesetzt** (B.1 bis B.6) — Branch-Tooling war bei Aufgabe 25 unzuverlässig, kleinere Reviews und klarere Rollback-Pfade sprachen dagegen.

**Aktueller Workflow pro Aufgabe:**

1. **Feature-Branch lokal**: `git checkout -b feature/aufgabe-XX-kurzname`
2. **Migration + DOWN-Migration schreiben** unter `supabase/migrations/`
3. **App-Code refactoren** (falls Aufgabe Code-Touch enthält) + `tsc --noEmit` lokal grün
4. **User-Bestätigung holen** vor Production-Migration
5. **Migration auf Production applizieren** via `mcp__supabase__apply_migration`
6. **Verifikations-SQL** auf Production (Spalten/Policies/Indices vorhanden, Backfills komplett)
7. **Commit auf Feature-Branch → Merge `--no-ff` auf main → Push** → Vercel-Auto-Deploy
8. **Production-Smoke-Test** (WebFetch auf öffentliche Widget-URL, ggf. interner Login-Smoke)
9. Bei Zwei-Phasen-Migrationen (B.2 / B.4): **Phase-2-Migration erst nach grünem Vercel-Deploy**
10. **Doku-Final**: `supabase-schema.md` + `project-overview.md` + `roadmap.md` + `CLAUDE.md §13.5` + `current-feature.md`

**Safety-Net:** DOWN-Migrationen liegen parallel im Repo. Tägliche Supabase-Auto-Backups bleiben der letzte Fallback bei Daten-Rollback.

---

## Phase C — Builder MVP-Sprint

> Nach Phase B. Sichtbares Feature-Building, das den MVP "demo-tauglich" macht.

Reihenfolge laut [`../CLAUDE.md`](../CLAUDE.md) §5:

| Schritt | Was | Geschätzter Aufwand |
|---|---|---|
| C.1 | Pages + Layers Tabs im Editor (Hierarchie-Sicht) | 4-6 Tage |
| C.2 | Theme-Panel im Editor (exponiert vorhandene CSS-Vars + Logo-Upload) | 2-3 Tage |
| C.3 ✅ | ~~Mehr Feldtypen im Builder (Email, Tel, Date, Number, Dropdown, Checkbox)~~ — Aufgabe 31, 2026-05-28. URL/File-Upload/Address bewusst gestrichen, `multi_choice`-Rename mit drin. | 3-5 Tage |
| C.4 | **Logic Jumps** (per Frage: "springe zu X wenn Antwort = Y") — neue Tabelle oder JSONB | 3-4 Tage |
| C.5 | Webhook-Export Code (Delivery, Retry, Signatur) — nutzt B.6-Schema | 3-5 Tage |
| C.6 | Antwortoptionen-UX-Polish + icon_url Layout-Anpassung (Bild oben vs. SVG zentriert) | 1-2 Tage |
| C.7 | Smooth Slide-Übergänge zwischen Fragen im Widget (Typeform-Stil) via framer-motion `LazyMotion` — postMessage-Resize erst nach `onAnimationComplete`, `prefers-reduced-motion` respektieren | 2-3 Tage |

**Total Phase C realistisch: 18-28 Tage Vollzeit.**

---

## Phase D — MVP-Launch & Partner-Pitches

- Stripe von Test- auf Live-Modus umstellen (Anleitung: `project-overview.md` §9)
- Domain `app.leadplug.de` final konfigurieren
- Mindestens 1 Demo-Funnel pro Branche als Showcase (Solar, Anwalt, etc.)
- Onboarding-Flow für neue Tenants
- Domain-Marktführer kontaktieren für Partner-Pitches (laut CLAUDE.md §4)

---

## Phase E — Pro-Plan-Features (Post-MVP)

Nicht-MVP-Features, sortiert nach strategischer Priorität sobald Pre-Launch-Validierung steht:

### Hohe Priorität (wenn Pro-Plan-Nachfrage kommt)

- **Multi-User-UI**: Invite-Flow, Role-Management, User-Avatare im Header. Backend ist schon in Phase B fertig.
- **`contacts`-Tabelle + Dedup-Logik**: gleiche E-Mail-Adresse über mehrere Submissions = 1 Kontakt mit Historie. CRM-Voraussetzung.
- **Script- / Web-Component-Embed**: nahtlose Integration ohne iFrame-Sandbox. Differenzierungs-Feature für Pro-Plan.
- **`user_profiles`-Tabelle**: falls Phone für Twilio gebraucht wird.
- **Plattform-Owner-Dashboard v2**: sauberer Re-Build des in Aufgabe 26 gelöschten `/admin/*`. Klares Feature-Set: Liste aller Tenants mit Stripe-Status/MRR/Leads-Volumen, "in Tenant hineinschauen" für Support, Cross-Tenant-Suche, manuelles Tenant-Anlegen/Deaktivieren/Free-Schalten, System-Health (fehlgeschlagene Webhooks, Stripe-Mismatches). SUPERADMIN_EMAIL-Gating via proxy.ts wiederherstellen.

### Mittlere Priorität

- **Twilio-Integration**: Telefonie aus dem Dashboard, Audio-Aufzeichnung, Auto-Summaries via Claude API
- **Kanban-Board**: Lead-Pipeline visualisieren (offen → kontaktiert → abgeschlossen).
- **Call-Dialer**: Lead-Liste durchtelefonieren mit Notizen.
- **Whitelabel-Endkunden-Portal**: Endkunden der Agentur können sich einloggen und ihre eigenen Leads sehen.
- **A/B-Testing**: zwei Funnel-Varianten gegeneinander, Conversion-Tracking.

### Builder-Erweiterungen

- **Per-Page-Theme-Override**: einzelne Pages können vom Funnel-Theme abweichen (z.B. dunklere Erfolgsseite).
- **File-Upload-Feld** (z.B. Foto-Upload bei Solar-Anfragen).
- **Signature-Feld** (DSGVO-Einwilligungsunterschrift).
- **Calculator/Scoring-Felder**: Antworten aufsummieren, basierend auf Score weiterleiten oder routen.
- **Erweiterte Logic Jumps**: Mehrere Bedingungen mit AND/OR-Verknüpfung.

### Skalierung / Plattform

- **Custom-Domain-Support**: Tenants können eigene Domain für Funnels einbinden (`funnel.solar-betrieb.de`).
- **API für Drittsysteme**: REST-API zum externen Anlegen/Auslesen von Funnels.
- **Audit-Log**: alle Änderungen an Funnels/Settings/Leads protokolliert.
- **Team-Workspaces**: für sehr große Agenturen mit getrennten Bereichen (vs. heutiger Single-Workspace-Tenant).

---

## Ideenliste (unsortiert, noch nicht eingeplant)

> Hier landen spontane Ideen, bis sie strategisch bewertet werden.

- Funnel-Vorlagen-Galerie pro Branche (Solar-Template, Anwalt-Template, etc.) als Quick-Start
- Slack-/Discord-Integration für Lead-Notifications
- E-Mail-Vorlage pro Funnel anpassbar (statt globaler Resend-Templates)
- Mehrsprachige Funnels (DE/EN/...)
- Lead-Magnet-Anhänge (z.B. PDF-Ratgeber nach Submission)
- Re-engagement-Sequenzen für nicht-konvertierte Funnel-Starter (E-Mail-Drip)

---

## Wartungs-Notiz

Dieses File wird **manuell gepflegt**. Bei jeder abgeschlossenen Phase:

1. Status der abgeschlossenen Aufgabe auf ✅ setzen
2. Erkenntnisse oder Scope-Änderungen am Ende der Aufgabe dokumentieren
3. Bei neuen Ideen → Ideenliste oder passende Phase einsortieren
4. Bei neuen v2-Features → Phase E erweitern
