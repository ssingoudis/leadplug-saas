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
| **C** | Builder-MVP-Sprint — fortgeschritten (C.1a-c + C.3 + Final-Sprint 35→C.2 + Aufgabe 38/39 + Polish + Aufgabe 40 Webhook-Actions ✅, offen: C.4 Logic Jumps + E-Mails-Tab dynamisch) | 🟡 laufend |
| **D** | Launch-Vorbereitung (Stripe Live, Conversion-Tracking, Demo-Templates) | ⚪ ~1 Wo nach Phase C |
| **E** | Post-Launch on demand — nur bauen wenn 5+ zahlende Kunden fragen | ⚪ open-ended |

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

### Fertige Sub-Aufgaben (History)

| Schritt | Was | Aufwand |
|---|---|---|
| C.1a ✅ | Editor-Shell v2 — 3-Pane Layout — Aufgabe 32 (2026-05-28) | 1 Tag |
| C.1b ✅ | Vorlagen + Field-Level-Properties + Submit-Multi-Field-UI — Aufgabe 33 (2026-05-28) | 1 Tag |
| C.1c ✅ | WYSIWYG-Edit + Widget-Typeform-Redesign + Canvas-Interactions + Icons-Cleanup + Type-Cleanup + Partial-Submissions-Infra — Aufgabe 34 (2026-05-28). Massiver Sprint, ging weit über ursprünglichen Scope hinaus. **C.6 + C.7 darin absorbiert.** | 2 Tage |
| C.3 ✅ | Mehr Feldtypen im Builder — Aufgabe 31 (2026-05-28). Plus E-Mail + Telefon in Aufgabe 34 wieder rausgenommen (waren nur kosmetisch). | 3-5 Tage |
| ~~C.6~~ | Antwortoptionen-UX-Polish + Icon-Layout — durch Aufgabe 34 erledigt (Icons komplett raus, A/B/C/D ist Default). | — |
| ~~C.7~~ | Smooth Slide-Übergänge zwischen Fragen — durch Aufgabe 34 erledigt (framer-motion AnimatePresence + Spring-Slide live). | — |

### Aktueller Sprint: Builder-Final (5 Aufgaben in einem Rutsch)

**Reihenfolge fix:** 35 → 36 → 37 → C.1d → C.2. Branch: `feature/builder-final-sprint`. Nach Abschluss wird die Roadmap erneut evaluiert (C.5 + C.4 + Phase D als nächster Block).

| Schritt | Was | Aufwand |
|---|---|---|
| **35** | **Submit-Button als Default-off + optionale Vorlage „Bestätigungs-Schritt".** Neue Spalte `funnels.skip_submit_step boolean DEFAULT false`. Editor v2 PropertiesPanel-Toggle auf Submit-Page. Widget honoriert Flag → Auto-Finish nach letzter Frage (ruft `/api/submit` mit `completed=true` aus dem letzten Step-Advance auf). Bestehende Funnels bleiben auf `false` (Backwards-Compat). | 1.5 Std |
| **36** | **Lead-Inbox 3 Tabs:** Completed / Abgebrochen-mit-Email / Abgebrochen-ohne-Email. Schema-Indices stehen seit Aufgabe 34. UI-Arbeit am `/dashboard/leads` mit Filter-Tabs + Badge-Counts. | 2-3 Std |
| **37** | **Bottom-Right Floating-Nav-Bug** in Live-Widget — rendert nicht wie erwartet trotz `!editMode`. Vermutlich Layout/Position-Issue im iFrame-Context. Debugging + Fix. | 1 Std |
| **C.1d** | **Cutover:** Alten v1-Editor + Routing-Conditional + ?v=2-Flag entfernen. ~1500 LOC tote Komponenten weg. | 0.5 Tag |
| **C.2** | **Theme-Panel im Editor + Logo-Upload.** UI für Brand-Color, Font, Border-Radius (exponiert vorhandene CSS-Vars). Logo-Upload via Supabase-Storage → Funnel-Header-Rendering. | 2-3 Tage |

### Danach

| Schritt | Was | Aufwand |
|---|---|---|
| **Aufgabe 40** ✅ | **Webhook-Actions (Action-Element-Modell, 2026-05-29)** — Backend (Sender, HMAC, Cron, Retry, abandoned-Trigger) + Editor-Tab „Webhooks" mit Liste/Add-Modal/Test/Logs/Verify-Snippet + Step-Pill-Badges. Schema-Erweiterung `webhook_subscriptions.funnel_id` + `trigger_type` + `trigger_page_id`. Branch `feature/aufgabe-40-webhook-actions`. Ersetzt den ursprünglichen C.5-Scope, der „1 globaler Tenant-Webhook am Ende" plante. **Bedingung für 29€-Webhook-Tier erfüllt.** | ~6 Tage |
| C.4 | **Logic Jumps** („wenn Antwort = X springe zu Page Y"). Fokus-Roadmap sagt „kann v1.1" — Launch geht auch ohne. Folgt demselben Action-Element-Pattern wie Webhooks (eigener „Logik"-Tab). | 3-4 Tage |
| **E-Mails-Tab dynamisch** | Existierender disabled „E-Mails"-Tab im Editor wird funktional. Pattern wiederverwenden: Liste pro Funnel + Trigger-Config (on_submit / after_page / on_abandoned) + Inhalts-Editor (Reuse React-Email). Bestehender hartkodierter Auto-Mail-Versand in `/api/submit` wird entfernt. | 2-3 Tage |

---

## Phase D — Launch-Vorbereitung (mini, ~1 Woche)

Pflicht-Tasks bevor zahlende Kunden draufdürfen. **Kein Onboarding-Wizard** — bei Direct-Sales bist du selbst der Onboarding-Flow.

| Schritt | Was | Aufwand |
|---|---|---|
| D.1 | Stripe von Test- auf Live-Modus umstellen (Anleitung: `project-overview.md` §9) | 1 Tag |
| **D.2** | **Conversion-Tracking via postMessage + Script-Loader-Embed** (Typeform-Stil). Zwei Stränge zusammen, weil derselbe Mechanismus: ① Widget sendet bei Submit ein `postMessage`; parent-Seite ruft `fbq('track','Lead')` / `gtag('event','conversion')` auf. ② Tenant kopiert ab jetzt `<div data-leadplug="slug"></div><script src="https://app.leadplug.de/embed.js"></script>` statt full iframe-Snippet — unser Script lädt iframe + verdrahtet postMessage + Conversion-Hook. **Vorteil:** Embed-Bugs/Verbesserungen werden zentral deployed (Tenants müssen nicht neu kopieren). Aktuelles iframe-Snippet (`lib/embedSnippet.ts`) bleibt als Fallback. **Performance-Marketing-Blocker — ohne das kaufen Performance-Agenturen nicht.** | 2-3 Tage |
| D.3 | 3-5 Demo-Funnels als Templates (Solar, Anwalt, Coach, Versicherung, …). Reine Content-Arbeit, kein Engineering. Anker für Sales-Pitch + Startpunkt für neue Tenants. | 2-3 Tage |

Direkt nach D.3: **Launch** + Direct-Sales an DACH-Marketing-Agenturen (siehe `builder-fokus-roadmap.html`).

---

## Phase E — Post-Launch on demand (nicht jetzt bauen)

> **Regel:** Erst wenn 5+ zahlende Kunden explizit nach einem Feature fragen, kommt es in den nächsten Sprint. Reihenfolge entscheidet der Markt.

| Feature | Geschätzt | Trigger |
|---|---|---|
| Custom-Domain pro Funnel (`funnel.kunde.de` via CNAME) | ~3 Tage | erster Premium-Tier-Schmerz |
| A/B-Tests (2 Varianten + Conversion-Counter) | ~1 Woche | Performance-Agenturen fragen |
| Multi-User-Invite-UI (Backend steht seit B.1) | 2-3 Tage | „wie lade ich Kollegen ein?" |
| Calculator-Feld (Antworten aufsummieren → Preis-Schätzung) | ~3 Tage | Solar/Versicherung wird Vertical-Anker |
| File-Upload-Feld (Foto bei Solar-Anfrage) | ~3 Tage | Solar-Kunden fragen |
| `contacts`-Tabelle + Dedup-Logik (gleiche Email = 1 Kontakt + Historie) | ~1 Woche | wenn CRM-Glaubwürdigkeit gefragt wird |

---

## Bewusst gestrichen (nicht mehr planen)

> Diese Features sind aus der Roadmap raus. Bei Versuchung „kommt das nicht doch?": **nein.** Siehe `builder-fokus-roadmap.html` für Begründungen.

**Telefonie/Voice:**
- Twilio-Integration · Call-Dialer · Audio-Aufzeichnung / Auto-Summaries → „verbinde dein Twilio per Webhook"

**CRM-Layer:**
- Kanban-Board → Pipedrive/Trello machen's besser, Webhook-Anwendungsfall
- Whitelabel-Endkunden-Portal → Komplexität-Explosion, Endkunden wollen kein Login

**Plattform-Tooling:**
- Plattform-Owner-Dashboard v2 → bei 0-50 Tenants reicht direkter Supabase-SQL-Zugriff
- `user_profiles`-Tabelle → war nur für Twilio nötig
- Public REST-API → Enterprise-Nische
- Audit-Log → Enterprise-only
- Team-Workspaces / Sub-Tenants → GoHighLevel-Komplexität, Multi-User pro Tenant reicht

**Builder-Cosmetic:**
- Per-Page-Theme-Override · Signature-Feld · Script-/Web-Component-Embed → Cosmetic, Webhook-Anwendungsfälle

**Marketing/Content:**
- Mehrsprachige Funnels (DE/EN/…) → DACH-Fokus
- E-Mail-Drip / Nurture-Sequenzen → ActiveCampaign/ConvertKit machen's besser, Deliverability-Hölle
- Slack-/Discord-Integration für Lead-Notifications → Webhook-Anwendungsfall
- Onboarding-Wizard für neue Tenants → bei Direct-Sales bist du selbst der Onboarding-Flow

---

## Wartungs-Notiz

Dieses File wird **manuell gepflegt**. Bei jeder abgeschlossenen Aufgabe:

1. Status auf ✅ setzen
2. Erkenntnisse oder Scope-Änderungen am Ende der Aufgabe dokumentieren
3. Strategische Wahrheit bleibt `builder-fokus-roadmap.html` — bei Konflikt wiegt sie stärker.
4. Neue Ideen während eines Sprints: nicht hier eintragen, mit Stavros besprechen. Wenn relevant → in „Post-Launch on demand" oder Sprint-Backlog.
