# LeadPlug — Projekt-Architektur

> **Technische Architektur, Code-Struktur und DB-Schema.**
> Strategische Entscheidungen (Positioning, Pricing, Tenant-Modell, GTM, Builder-Richtung) stehen in [`../CLAUDE.md`](../CLAUDE.md). Dieses File ist die rein technische Bauplan-Beschreibung.

---

## 1. Architektur-Überblick

LeadPlug ist eine **einzige Next.js-App** (Vercel-Deployment) mit drei logisch getrennten Bereichen:

### A. Öffentliches Widget — `app/[slug]/`
- iFrame-Endpoint pro Funnel: `https://app.leadplug.de/[slug]`
- Lädt `TenantConfig` via `getTenantConfig(slug)` (Server-Side)
- Rendert `<Funnel/>` (komplett eigenständige Komponente in `components/funnel.tsx`)
- Submission → `POST /api/submit`
- `frame-ancestors *` + `X-Frame-Options: ALLOWALL` für maximale Embed-Kompatibilität

### B. Admin-Bereich — `app/admin/`
- **Nur für Stavros** (Plattform-Owner)
- Globale Funnel-Übersicht, Leads aller Tenants, monatliche Statistik
- Tools zum manuellen Funnel-Anlegen, Icon-Picker, Email/Success-Previews
- Schutz via Supabase Auth + Server-Side-Check auf Owner-Identität

### C. Tenant-Dashboard — `app/dashboard/`
- Für **Agentur-User** (eingeloggt via Supabase Auth)
- Eigene Funnels CRUD (Liste, Editor, Embed-Code, Löschen)
- Lead-Posteingang (Status-Workflow: `offen` → `kontaktiert` → `abgeschlossen`)
- Statistiken, Account-Settings, Billing (Stripe Customer Portal)
- RLS sorgt dafür, dass Tenant nur seine eigenen Daten sieht

---

## 2. Tech-Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Runtime (API) | Node.js (`runtime = 'nodejs'`) — wegen Supabase Service Key |
| Sprache | TypeScript (strict) |
| Styling | TailwindCSS |
| DB / Auth / RLS | Supabase (Postgres) |
| Billing | Stripe (Subscription, Webhook-Sync) |
| E-Mail | Resend + React Email |
| Fonts | Self-hosted .woff2 in `public/fonts/` (DSGVO-konform) |
| Deployment | Vercel |

---

## 3. Ordnerstruktur (aktueller Stand)

### `app/` — Routes & Pages

```
app/
├── [slug]/                          # Öffentliches Funnel-Widget
│   ├── page.tsx                     # SSR-Page, lädt Config, rendert <Funnel/>
│   └── layout.tsx                   # Minimales Layout für iFrame
│
├── admin/                           # Owner-Bereich (Stavros)
│   ├── page.tsx                     # Dashboard
│   ├── layout.tsx
│   ├── AdminHeader.tsx
│   ├── FunnelGrid.tsx
│   ├── DailyLeadsChart.tsx
│   ├── MonthlyStats.tsx
│   ├── leads/                       # Globale Lead-Übersicht
│   │   ├── page.tsx
│   │   └── LeadsView.tsx
│   ├── new/                         # Manuelles Anlegen eines Funnels
│   │   ├── page.tsx
│   │   └── IconPicker.tsx
│   ├── preview/                     # Funnel-Preview-Tool
│   │   └── page.tsx
│   └── [slug]/                      # Einzelner Funnel: Detail/Preview
│       ├── page.tsx
│       ├── SubmissionsTable.tsx
│       ├── EmbedBlock.tsx
│       ├── EmailPreviewBlock.tsx, SuccessPreviewBlock.tsx
│       ├── DynamicIframe.tsx, FunnelPreviewIframe.tsx
│       ├── contact-preview/page.tsx
│       ├── email-preview/route.tsx
│       ├── lead-preview/route.tsx
│       └── success-preview/page.tsx
│
├── dashboard/                       # Tenant-Bereich (Agentur)
│   ├── page.tsx, layout.tsx
│   ├── DashboardHeader.tsx, TabNav.tsx
│   ├── TenantLeadsTable.tsx
│   ├── funnels/
│   │   ├── page.tsx                 # Funnel-Liste
│   │   ├── new/                     # Neuer Funnel
│   │   │   ├── page.tsx
│   │   │   └── FunnelEditorClient.tsx
│   │   └── [slug]/edit/             # Funnel bearbeiten
│   │       ├── page.tsx
│   │       └── FunnelEditorClient.tsx
│   ├── leads/page.tsx
│   ├── kontakte/page.tsx
│   ├── statistiken/
│   │   ├── page.tsx
│   │   ├── MonthlyLeadsChart.tsx, MonthlyTable.tsx, DonutChart.tsx
│   ├── account/page.tsx
│   ├── billing/
│   │   ├── page.tsx
│   │   └── BillingClient.tsx
│   └── embed/page.tsx
│
├── api/                             # Server-Routes
│   ├── submit/route.ts              # Funnel-Submission (das Herzstück)
│   ├── track-view/route.ts          # Funnel-View-Tracking
│   ├── admin/create-funnel/route.ts # Admin: Funnel anlegen
│   ├── tenant/
│   │   ├── funnels/route.ts         # Tenant: Funnel-CRUD (Liste)
│   │   ├── funnels/[slug]/route.ts  # Tenant: einzelner Funnel
│   │   └── slug-check/route.ts      # Slug-Verfügbarkeit
│   ├── leads/[id]/route.ts          # Lead-Update (Status)
│   └── stripe/
│       ├── checkout/route.ts        # Stripe Checkout-Session erstellen
│       ├── portal/route.ts          # Stripe Customer-Portal-Link
│       └── webhook/route.ts         # Subscription-Status-Sync
│
├── auth/                            # Supabase Auth Flow
│   ├── callback/page.tsx
│   └── confirm/route.ts
│
├── login/page.tsx, signup/page.tsx, logout/route.ts
├── icons/page.tsx                   # Icon-Picker-Anzeige (intern)
├── page.tsx, layout.tsx              # Landing / Root
```

### `lib/` — Server-Side Logic

```
lib/
├── supabase/
│   ├── server.ts                    # Supabase Client (Server Components, RLS-respektierend)
│   ├── client.ts                    # Supabase Client (Browser, RLS-respektierend)
│   └── admin.ts                     # Supabase Service-Key-Client (RLS-umgehend)
├── getTenantConfig.ts               # Funnel-Config-Loader (joins funnels + tenants + questions)
├── sendEmails.ts                    # 2-Mail-Versand via Resend (Promise.all)
├── tracking.ts                      # logSubmission, isRateLimited, updateEmailStatus, logHoneypot
├── billing.ts                       # Billing-/Plan-Logik
├── stripe.ts                        # Stripe-Client-Setup, Price-IDs
├── embedSnippet.ts                  # iFrame-Embed-Code-Generator
├── resolveAnswer.ts                 # Antwort-Wert → Label-Auflösung (für E-Mails)
├── validateContactField.ts          # Server-side Kontakt-Feld-Validierung
├── editorUtils.ts                   # Funnel-Editor Helper
└── utils.ts                         # Allgemeine Utilities (cn, etc.)
```

### `components/` — UI

```
components/
├── funnel.tsx                       # ⚠️ Widget-UI (eigenständig, nur in Absprache anfassen)
├── TenantFunnelClient.tsx           # Client-Wrapper (startedAt, referrer, userAgent)
├── icons.tsx                        # SVG Icon-Map (icon_key → Component)
├── icons/
│   ├── _base.tsx
│   ├── index.ts
│   └── custom-*.tsx                 # Custom-Icons (Solar, Dach, Zeitfenster, etc.)
│
├── ui/                              # Dashboard / Tenant-Portal Komponenten
│   ├── Button.tsx, Card.tsx, Badge.tsx
│   ├── Input.tsx, StatTile.tsx
│   ├── ThemeToggle.tsx, UserMenu.tsx
│
├── tenant-editor/                   # Funnel-Editor (Dashboard /funnels/.../edit)
│   ├── FunnelEditorShell.tsx        # Editor-Container
│   ├── EditorSidebar.tsx            # Navigation zwischen Sektionen
│   ├── PreviewPanel.tsx             # Live-Preview rechts
│   ├── SectionAccordion.tsx
│   ├── SectionFragen.tsx            # Fragen-Editor
│   ├── SectionTexte.tsx             # Text-Editor
│   ├── SectionKontakt.tsx           # Kontaktformular-Editor
│   ├── SectionDesign.tsx            # Theme-Editor (Farben, Font, Radius)
│   ├── SlugInput.tsx, DeleteFunnelButton.tsx
│   ├── EmailPreviewMockup.tsx, LeadEmailPreviewMockup.tsx
│   ├── HealthCheckPanel.tsx
│   └── defaults.ts
│
├── dashboard/FunnelCard.tsx
└── leads/LeadsTable.tsx
```

### `emails/`, `types/`

```
emails/
├── CustomerConfirmation.tsx         # Mail 1 – Endkunde (Danke)
└── TenantLeadNotification.tsx       # Mail 2 – Tenant (Lead-Daten)

types/
└── index.ts                         # Alle TypeScript-Interfaces
```

---

## 4. Datenbank-Schema (Stand 2026-05-27, nach Aufgabe 29 / Phase B.6)

Alle Tabellen haben **RLS aktiviert** (25 Policies über 8 Tabellen, `honeypot_triggers` policy-frei). Service-Key-Zugriffe umgehen RLS (nur server-side). Die maschinelle Voll-Referenz mit Indices, Triggers, Policies und Functions steht in [`supabase-schema.md`](supabase-schema.md).

### `tenants` (Stammdaten der Agentur-Accounts — reine Account-Tabelle nach B.4, 9 Zeilen aktuell)

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `company_name` | text | Anzeigename der Agentur |
| `is_active` | bool | Default `true` |
| `website` | text, nullable | Optionale Firmenwebseite |
| `billing_model` | enum `billing_model_type` | `per_lead` \| `per_month` \| `per_year` \| `free` |
| `lead_price` | numeric, default `3.00` | Preis pro Lead bei `per_lead` |
| `billing_price` | numeric, nullable | Pauschalpreis bei `per_month`/`per_year` |
| `stripe_customer_id` | text | Stripe Customer (`cus_...`) |
| `stripe_subscription_id` | text | Stripe Subscription (`sub_...`) |
| `stripe_subscription_status` | text | `active`/`trialing`/`past_due`/`canceled`/`unpaid`/`incomplete` |
| `stripe_price_id` | text | Stripe Price-ID des aktiven Plans |
| `created_at`, `updated_at` | timestamptz | `updated_at` via Trigger |

> **In Aufgabe 26 gedroppt:** `slug`, `auth_user_id` (User↔Tenant via `tenant_members`).
>
> **In Aufgabe 28 gedroppt:** `notification_email`, `public_email`, `public_phone`, `address` — alle endkunden-spezifischen Daten leben jetzt ausschließlich in `funnels` (`funnels.notification_email` ist NOT NULL, Footer-Display via `footer_company_name`/`footer_email`/`footer_phone`).

### `tenant_members` (3 Zeilen aktuell, eingeführt mit Aufgabe 25 / Phase B.1)

Junction N:M zwischen `tenants` und `auth.users` mit Rolle pro Mitgliedschaft.

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `tenant_id` | uuid, FK → `tenants.id` ON DELETE CASCADE | |
| `auth_user_id` | uuid, FK → `auth.users.id` ON DELETE CASCADE | |
| `role` | enum `tenant_member_role` | `owner` \| `admin` \| `member` |
| `created_at`, `updated_at` | timestamptz | `updated_at` via Trigger |

UNIQUE `(tenant_id, auth_user_id)` — kein User doppelt im selben Tenant. Owner-Eintrag wird beim ersten Login durch `app/dashboard/layout.tsx` (admin-Client) auto-erzeugt. Multi-User-UI (Invites) kommt in Phase E.

### `funnels` (12 Zeilen aktuell)

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | |
| `slug` | text, unique | **URL-Slug**, z.B. `https://app.leadplug.de/[slug]` — nach Anlage unveränderlich |
| `tenant_id` | uuid, FK → `tenants.id` ON DELETE CASCADE | Zugehöriger Agentur-Account |
| `is_active` | bool, default `true` | |
| `funnel_name` | text, nullable | Anzeigename in der Dashboard-Übersicht |
| `contact_form_title` | text, nullable | Titel über dem Kontaktformular |
| `contact_form_subtitle` | text, nullable | |
| `submit_button_label` | text, nullable | |
| `success_message`, `response_message` | text, nullable | Erfolgs-Texte |
| `answers_overview_label` | text, nullable | |
| `privacy_text`, `privacy_policy_url` | text, nullable | |
| `footer_text`, `footer_company_name`, `footer_email`, `footer_phone` | text, nullable | Funnel-spezifischer Footer (überschreibt Tenant-Werte) |
| `notification_email` | text, nullable | Pro-Funnel Override für Lead-Benachrichtigung |
| `email_sender_local` | text, nullable | Local-Part der Sender-Adresse (z.B. `info` für `info@example.com`) |
| `contact_fields` | jsonb, nullable | Inline-Definition der Kontaktformular-Felder (siehe unten) |
| `primary_color`, `text_color`, `background_color`, `page_background_color` | text, nullable | Theme |
| `font` | text, nullable | `system`/`inter`/`poppins`/`roboto` |
| `border_radius`, `max_width` | text, nullable | Theme |
| `total_views` | int, default `0` | Inkrementiert via `track-view` |
| `created_at`, `updated_at` | timestamptz | |

**`contact_fields` jsonb-Struktur** (per `ContactFieldConfig`):
```typescript
{ key: string, type: 'radio'|'text'|'email'|'tel', label: string,
  placeholder?: string, options?: string[],
  required: boolean, visible: boolean, sort_order: number }
```

### `funnel_questions` (58 Zeilen aktuell)

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | |
| `funnel_id` | uuid, FK → `funnels.id` ON DELETE CASCADE | |
| `question_key` | text | Key im `answers`-JSONB der Submission. UNIQUE(funnel_id, question_key) |
| `title`, `subtitle` | text | |
| `question_type` | enum `question_type` | `single_choice`/`multiple_choice`/`short_text`/`long_text`/`slider` |
| `options` | jsonb, default `[]` | **Inline** — KEINE separate Tabelle |
| `config` | jsonb, default `{}` | Frei strukturierbar (z.B. Slider-Range) |
| `sort_order` | int, default `0` | Reihenfolge im Funnel |
| `visible` | bool, default `true` | |

**`options` jsonb-Struktur:**
```typescript
[{ label: string, value: string, icon_key?: string, icon_url?: string }]
```

> **Architektur-Hinweis:** Aktuell ist **eine Frage = ein Schritt** im Funnel. Schema-Refactor zu **Page → 1:N Fields** ist als kommende Aufgabe geplant (siehe CLAUDE.md §5).

### `submissions` (das wichtigste CRM-Feld!)

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | |
| `session_id` | uuid, NOT NULL UNIQUE | **Neu seit Aufgabe 34.** Client-generierte UUID per `sessionStorage`. UPSERT-Identität für Partial-Submissions. |
| `completed_at` | timestamptz, nullable | **Neu seit Aufgabe 34.** NULL = User in Bearbeitung / abgebrochen, gesetzt = finaler Submit (`/api/submit`). Filter-Pivot für Lead-Inbox „Completed vs Abandoned". |
| `tenant_id` | uuid, nullable, FK → `tenants.id` ON DELETE SET NULL | RLS-Filter; bei Tenant-Löschung wird NULL (Submission bleibt für Audit erhalten) |
| `funnel_slug` | text, nullable | **Snapshot** für Display + Funnel-URL-Lookup (kein FK — bleibt auch wenn Funnel gelöscht) |
| `tenant_slug` | text, nullable | **Snapshot** historisch; neue Inserts setzen das Feld nicht mehr (`tenants.slug` existiert seit Aufgabe 26 nicht mehr) |
| `contact` | jsonb, nullable | Komplettes Kontakt-Objekt — einzige Quelle seit Aufgabe 27 |
| `answers` | jsonb | `{ question_key: value }` |
| `lead_price` | numeric, default `0` | Server-side gesetzt, Snapshot zum Submission-Zeitpunkt |
| `source_url` | text, nullable | URL der einbettenden Seite |
| `user_agent`, `ip_address` | text, nullable | |
| `customer_email_sent`, `tenant_email_sent` | bool | Nach Email-Versand gesetzt |
| `status` | text, check (`offen`/`kontaktiert`/`abgeschlossen`) | **CRM-Status-Workflow** (orthogonal zu `completed_at` — `status` ist „was der Agent damit gemacht hat") |
| `created_at` | timestamptz | |

**Indices (Aufgabe 34):**
- `submissions_completed_at_idx` auf `(tenant_id, completed_at NULLS FIRST)` — Lead-Inbox-Filter „Completed vs Abandoned"
- `submissions_abandoned_with_email_idx` partial auf `(tenant_id, created_at DESC) WHERE completed_at IS NULL AND contact->>'email' nicht leer` — schneller Filter für „Abgebrochen mit Email" Tab

> **In Aufgabe 27 gedroppt:** `contact_anrede`, `contact_name`, `contact_email`, `contact_phone` — alle ersetzt durch das `contact`-jsonb.
>
> **In Aufgabe 34 ergänzt:** `session_id` + `completed_at` für Partial-Submissions-Architektur.

### `funnel_view_logs` (277 Zeilen, View-Tracking)

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | bigint, PK | `nextval()` (einzige Nicht-UUID-PK im Schema) |
| `funnel_id` | uuid, FK → `funnels.id` ON DELETE CASCADE | |
| `tenant_id` | uuid, FK → `tenants.id` ON DELETE CASCADE | |
| `viewed_at` | timestamptz | default `now()` |

### `webhook_subscriptions` (0 Zeilen — Schema-Foundation, eingeführt in Aufgabe 29 / Phase B.6)

Pro Tenant 1..N Webhook-Endpoints. Sender-Code kommt erst mit Webhook-Tier-Launch in Phase C.5. Schema-Details: [`supabase-schema.md`](supabase-schema.md) §3.7.

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | |
| `tenant_id` | uuid, FK → `tenants.id` ON DELETE CASCADE | |
| `url` | text | HTTPS-Endpoint (http nur für Tests). CHECK `LIKE 'http%' AND length >= 10` |
| `secret` | text | HMAC-Signing-Secret. CHECK `length >= 16`. App-generated, UI zeigt 1× |
| `event_types` | text[], default `'{}'` | z.B. `{"submission.created"}` |
| `is_active` | bool, default `true` | |
| `created_at`, `updated_at` | timestamptz | `updated_at` via Trigger |

### `webhook_delivery_attempts` (0 Zeilen — Audit-Trail, eingeführt in Aufgabe 29 / Phase B.6)

Append-only Log jedes Webhook-Versandsversuchs.

| Spalte | Typ | Hinweise |
|---|---|---|
| `id` | uuid, PK | |
| `subscription_id` | uuid, FK → `webhook_subscriptions.id` ON DELETE CASCADE | |
| `submission_id` | uuid, nullable, FK → `submissions.id` ON DELETE SET NULL | Audit bleibt erhalten |
| `attempt_count` | int, default `1` | CHECK >= 1 |
| `status` | text, default `'pending'` | CHECK IN (`pending`, `retrying`, `success`, `failed`) |
| `last_error` | text, nullable | |
| `delivered_at` | timestamptz, nullable | CHECK: muss gesetzt sein bei `status='success'` |
| `created_at` | timestamptz | |

### `honeypot_triggers` (0 Zeilen, Bot-Hits)

| Spalte | Typ |
|---|---|
| `id` | uuid, PK |
| `funnel_slug`, `ip_address` | text, nullable |
| `created_at` | timestamptz |

### Aktuelle Migrationen (chronologisch, 23 insgesamt)

```
20260513064118 — add_funnel_text_columns
20260513064141 — add_funnel_contact_fields
20260513172651 — add_total_views_to_funnels
20260513172720 — add_increment_funnel_views_function
20260516184043 — add_subtitle_to_funnel_questions
20260518064921 — add_auth_user_id_and_rls_policies
20260518073725 — add_funnel_view_logs
20260518114633 — add_free_billing_model
20260521175813 — add_footer_contact_columns_to_funnels
20260521181741 — add_funnel_name_column
20260521183515 — add_notification_email_to_funnels
20260521190855 — rename_funnel_title_to_contact_form_title
20260522121300 — add_crm_columns_to_submissions
20260522124347 — drop_notes_from_submissions
20260522192429 — add_stripe_fields_to_tenants
20260527120000 — aufgabe_25_tenant_members_and_full_rls         ← Phase B.1
20260527130000 — aufgabe_25_add_funnel_view_logs_delete_policy  ← B.1 Hotfix
20260528120000 — aufgabe_26a_uuid_fks_add                       ← Phase B.2 (ADD, zero-downtime)
20260528130000 — aufgabe_26b_uuid_fks_drop                      ← Phase B.2 (DROP)
20260528140000 — aufgabe_27_drop_submissions_contact_legacy     ← Phase B.3
20260528150000 — aufgabe_28a_tenants_cleanup_phase1             ← Phase B.4 (Backfills + Constraints)
20260528160000 — aufgabe_28b_tenants_drop_endcustomer_columns   ← Phase B.4 (DROP)
20260528170000 — aufgabe_29_webhook_schema                      ← Phase B.6 (additive)
20260528180000 — aufgabe_30a_pages_fields_add                   ← Phase B.5 (additive + Daten-Migration)
20260528190000 — aufgabe_30b_drop_funnel_questions_and_contact_fields ← Phase B.5 (DROP)
20260528200000 — aufgabe_34_strip_icon_keys_from_field_options  ← Aufgabe 34 (Icons-Cleanup, forward-only)
20260528210000 — aufgabe_34_partial_submissions_schema          ← Aufgabe 34 (session_id + completed_at)
```

---

## 5. API-Routes (Übersicht)

| Route | Methode | Zweck |
|---|---|---|
| `/api/submit` | POST | **Finaler Submit** — UPSERT mit `completed_at=NOW()` + Mails (Aufgabe 34) |
| `/api/track-progress` | POST | **Partial-Submission** — UPSERT mit `completed_at=NULL` (Aufgabe 34, debounced vom Widget) |
| `/api/track-view` | POST | Funnel-View-Tracking inkrementieren |
| `/api/tenant/funnels` | GET / POST | Tenant: Funnel-Liste / neuen anlegen |
| `/api/tenant/funnels/[slug]` | GET / PUT / DELETE | Tenant: einzelner Funnel |
| `/api/tenant/slug-check` | POST | Slug-Verfügbarkeit prüfen |
| `/api/leads/[id]` | PUT | Lead-Status updaten (`offen`/`kontaktiert`/`abgeschlossen`) |
| `/api/stripe/checkout` | POST | Stripe Checkout-Session erstellen |
| `/api/stripe/portal` | POST | Stripe Customer-Portal-Link |
| `/api/stripe/webhook` | POST | Stripe-Webhook-Handler (Subscription-Sync) |

---

## 6. Submission-Flow (Partial + Final seit Aufgabe 34)

**Strategie-Shift weg vom Submit-Only-Save hin zu fortlaufender Persistenz** (Aufgabe 34, 2026-05-28).

### Session-Identität

Das Widget generiert beim Mount eine UUID via `crypto.randomUUID()`, speichert sie in `sessionStorage` unter `lp_session_<funnel-slug>` (Tab-scope). Diese `session_id` ist die UPSERT-Identität für `submissions.session_id` (UNIQUE-Constraint).

### `/api/track-progress` (Partial-Save, debounced)

Wird vom Widget bei jeder Antwort-Änderung gefeuert (Funnel.tsx hat 600ms-debounce-useEffect auf `[answers, contactData]`). Reihenfolge:

1. **JSON-Parse + IP**
2. **Honeypot-Check** — Bot-Filter, kein DB-Schreiben
3. **Struktur-Check** — `sessionId` muss UUID-Regex matchen, `tenant`/`answers`/`contact` Pflicht
4. **Tenant-Config laden** — bei null 404
5. **`lead_price` server-side** ableiten (`per_lead`-Tenants only)
6. **`upsertSubmissionProgress({completed: false})`** — UPSERT auf `session_id`, `completed_at` bleibt NULL
7. Response: `{success:true}` — auch bei DB-Fehler

**Bewusst weggelassen** (gegenüber `/api/submit`):
- Kein Rate-Limit (würde tippenden User mit 30 Keystrokes blockieren)
- Keine Validation der Pflichtfelder (Final-Validation passiert beim Submit)

### `/api/submit` (Final-Submit + Mails)

Wird vom Widget beim expliziten Submit-Button-Klick gefeuert. Reihenfolge ist **kritisch**:

1. **JSON-Parse + IP**
2. **Honeypot-Check** — wenn `honeypot`-Feld gefüllt: `logHoneypot()` + sofort `{success:true}`
3. **Rate-Limiting** — max. 3 Submissions pro IP in 10 Minuten
4. **Struktur-Check** — `tenant`/`answers`/`contact` Pflicht. `sessionId` optional (Legacy-Client-Kompat — fällt sonst auf neue UUID zurück)
5. **Tenant-Config laden** — bei null 404
6. **Dynamische Feldvalidierung** — alle sichtbaren + required `contactFields` via `validateContactField()`. Bei Fehler 400
7. **`lead_price` server-side ableiten**
8. **`upsertSubmissionProgress({completed: true})`** — UPSERT mit `completed_at = NOW()`. Wenn Partial-Row schon existiert (sessionId match), wird sie completed; wenn nicht, neue Row.
9. **`sendAllEmails()` in try/catch** — Fehler loggen, **nicht werfen**. Endkunde bekommt immer `{success:true}`
10. **`updateEmailStatus()`** — `customer_email_sent` / `tenant_email_sent` Booleans
11. Response: `{success:true}`

**Wichtig:** Schritte 8 → 9 → 10 in dieser Reihenfolge. Billing (Schritt 8) darf nie durch E-Mail-Fehler (Schritt 9) verloren gehen.

### Lead-Zähl-Logik (für Pricing)

Pricing-Modell zählt zwei Lead-Klassen als „echter Lead":
- **Completed** — `completed_at IS NOT NULL`
- **Abandoned-mit-Email** — `completed_at IS NULL AND contact->>'email' IS NOT NULL AND <> ''`

Nicht gezählt: **Abandoned-ohne-Email** (reine Tracking-Sessions ohne nutzbare Kontaktdaten).

---

## 7. E-Mail-Flow

2 Mails pro Submission, parallel via `Promise.all` in [`lib/sendEmails.ts`](../lib/sendEmails.ts).

**Mail 1 — Endkunde** (Empfänger: `contact.email`)
- Komponente: [`emails/CustomerConfirmation.tsx`](../emails/CustomerConfirmation.tsx)
- Betreff: `Ihre Anfrage bei [companyName]`
- Inhalt: Danke + `responseMessage`
- **Kein PDF, keine Preisschätzung**

**Mail 2 — Tenant** (Empfänger: `notificationEmail` aus Funnel/Tenant)
- Komponente: [`emails/TenantLeadNotification.tsx`](../emails/TenantLeadNotification.tsx)
- Betreff: `Neue Anfrage von [contact.name]`
- Inhalt: Kontaktdaten (klickbar via `mailto:`/`tel:`) + Antworten als Tabelle
- `replyTo = contact.email` (Tenant kann direkt antworten)

**Sender-Adresse:** `[funnels.email_sender_local]@[Domain aus EMAIL_FROM]`. Wenn `email_sender_local` leer → Default aus `EMAIL_FROM`.

---

## 8. Auth & RLS

### Supabase Auth
- Provider: E-Mail/Passwort
- Sign-up: [`app/signup/page.tsx`](../app/signup/page.tsx) → erstellt User in `auth.users` + Tenant-Eintrag in `public.tenants` mit `auth_user_id`
- Login: [`app/login/page.tsx`](../app/login/page.tsx)
- Callback: [`app/auth/callback/page.tsx`](../app/auth/callback/page.tsx), [`app/auth/confirm/route.ts`](../app/auth/confirm/route.ts)
- Logout: [`app/logout/route.ts`](../app/logout/route.ts)

### Drei Supabase-Clients (in `lib/supabase/`)
- **`server.ts`** — für Server Components, **respektiert RLS** (User-Session-Token aus Cookies)
- **`client.ts`** — für Client Components, **respektiert RLS**
- **`admin.ts`** — Service-Key-Client, **umgeht RLS** (nur in API-Routes für `/api/submit`, `/api/stripe/webhook`, Admin-Endpoints)

### RLS-Policies (seit Aufgabe 25 / Phase B.1)
Alle 7 Tabellen haben `rls_enabled: true`. **19 Policies** decken SELECT/INSERT/UPDATE/DELETE pro Tabelle ab (Defense-in-Depth, nicht mehr nur SELECT). Tenant-Identity wird via Junction-Table `tenant_members` über zwei Helper-Funktionen aufgelöst: `current_tenant_ids()` (SETOF uuid) und `current_tenant_role(uuid)` — beide `SECURITY DEFINER, STABLE, search_path` gepinnt. Details: [`supabase-schema.md`](supabase-schema.md) §2 + §4.5.

**Admin-Client (RLS-Bypass, `lib/supabase/admin.ts`) ist nur noch zulässig für:**
- `/api/submit`, `/api/track-view` — anonymer Endbenutzer
- `/api/stripe/webhook` — System-Event ohne User-Kontext
- `/api/tenant/slug-check` + `generateRandomSlug` in `/api/tenant/funnels` POST — globale Slug-Uniqueness
- `app/dashboard/layout.tsx` Auto-Tenant-Anlage beim ersten Login — System-Provisioning
- Admin-Operationen (Stavros / Plattform-Owner)

---

## 9. Billing & Stripe

### Aktueller Stand (Test-Modus)
- Stripe Test-Keys in Vercel-ENV (`sk_test_...`)
- Webhook-Endpoint: `https://app.leadplug.de/api/stripe/webhook`
- Lauscht auf: `customer.subscription.created`, `.updated`, `.deleted`
- Portal-Config: `bpc_1TZypEQ5RyuRWopI3iAIq9DL` (Test, sofortige Kündigung)

### Flow
1. Tenant klickt "Plan abonnieren" → `/api/stripe/checkout` erstellt Checkout-Session
2. Stripe leitet zurück nach erfolgreichem Payment → Tenant landet auf `/dashboard/billing`
3. Stripe-Webhook trigger → `/api/stripe/webhook` aktualisiert `stripe_subscription_status` und `stripe_price_id` in `tenants`
4. Tenant kann via "Plan verwalten" das Stripe Customer Portal öffnen (`/api/stripe/portal`)

### Wechsel auf Production (TODO bei Launch)
1. Stripe-Dashboard: Toggle von Test- auf Live-Modus
2. Live-Product + -Price anlegen (49€/Monat oder die aktuellen Tiers — Webhook/Standard/Pro, siehe CLAUDE.md §3)
3. ENV-Vars in Vercel ersetzen: `STRIPE_SECRET_KEY` → `sk_live_...`, `STRIPE_PRICE_ID_*` → Live-IDs
4. Live-Webhook in Stripe anlegen, `STRIPE_WEBHOOK_SECRET` updaten
5. Live-Portal-Config anlegen, ID in `lib/stripe.ts` ersetzen
6. Redeploy

### `billing_model` Enum
- `per_lead` — Tenant zahlt pro Submission (`tenants.lead_price`)
- `per_month` — Monatspauschale (`tenants.billing_price`)
- `per_year` — Jahrespauschale
- `free` — kein Billing

Bei `per_lead`: `lead_price` wird **bei jeder Submission** als Snapshot in `submissions.lead_price` gespeichert (historisch korrekt — Preisänderungen wirken nicht rückwirkend).

---

## 10. Theme-System (Widget-Rendering)

Das öffentliche Funnel-Widget rendert via CSS-Variablen in [`components/funnel.tsx`](../components/funnel.tsx):

```css
--funnel-primary       /* primary_color */
--funnel-primary-hover
--funnel-text          /* text_color */
--funnel-text-muted
--funnel-bg            /* background_color */
--funnel-border
--funnel-input-bg
--funnel-radius        /* border_radius */
```

Plus `fontFamily`, `maxWidth`, `borderRadius` direkt als inline-Styles auf dem Container.

**Defaults** (wenn DB-Werte null):
```
primary_color:        #22c55e
text_color:           #1f2937
background_color:     #ffffff
page_background:      transparent
border_radius:        0.5rem
max_width:            720px
font:                 'system'
```

**Fonts:** Self-hosted in `public/fonts/` (DSGVO-konform — LG München 2022). Enum: `system | inter | poppins | roboto`. Neuen Font hinzufügen:
1. `.woff2` in `public/fonts/<name>/` ablegen
2. `@font-face` in `app/globals.css`
3. Key in `FunnelFont` und `FONT_STACKS` in `funnel.tsx`

---

## 11. iFrame & postMessage

### Embed-Snippet (für Tenant zum Einbau auf Kunden-Webseite)

```html
<iframe
  src="https://app.leadplug.de/[slug]"
  id="funnel-widget"
  style="width:100%;border:none;display:block;height:500px;"
  scrolling="no"
  loading="lazy"></iframe>
<script>
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'funnel-resize') return;
    var h = parseInt(e.data.height, 10);
    if (h > 0) document.getElementById('funnel-widget').style.height = h + 'px';
  });
</script>
```

Wird in [`lib/embedSnippet.ts`](../lib/embedSnippet.ts) generiert und im Dashboard unter `/dashboard/embed` angezeigt.

### postMessage-Logik im Widget
- `ResizeObserver` misst den äußeren Container nach jedem Render
- Sendet `window.parent.postMessage({type:'funnel-resize', height: scrollHeight}, '*')`
- Ohne Listener im Parent: Widget funktioniert weiter mit fester iFrame-Höhe — kein Fehler

> **Geplante Erweiterung** (CLAUDE.md §5): Script-/Web-Component-Embed als nahtlose Alternative für Pro-Plan.

---

## 12. Bot-Schutz

### Honeypot
- Unsichtbares Input-Feld im Formular (`visibility:hidden` + `position:absolute`)
- Bots füllen es aus, Menschen nicht
- Server-Side in `/api/submit`: wenn gefüllt → `logHoneypot()` + `{success:true}` ohne DB-Eintrag
- Bots dürfen keinen 400 sehen, sonst lernen sie das Muster

### Rate-Limiting
- Max. **3 Submissions pro IP in 10 Minuten**
- Bei Überschreitung: `{success:true}` ohne DB-Eintrag
- Implementiert in `lib/tracking.ts` (`isRateLimited(ip)`)

### Slug-Validierung
- `getTenantConfig` lehnt Slugs ab, die nicht dem Pattern `/^[a-z0-9][a-z0-9-_]*$/` entsprechen
- Slugs mit `_`-Prefix sind reserviert (interne Nutzung)

---

## 13. TypeScript-Typen

Alle Domain-Typen in [`types/index.ts`](../types/index.ts). Wichtigste:

- `TenantConfig` — was `getTenantConfig()` zurückgibt (alles was das Widget zum Rendern braucht)
- `ContactFieldConfig` — Definition eines Kontaktformular-Feldes (jsonb in DB)
- `FunnelFont` — Font-Enum (`'system' | 'inter' | 'poppins' | 'roboto'`)
- `FunnelTheme` — Theme-Werte mit Defaults
- `QuestionType` — DB-Enum (`'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'slider'`)
- `BillingModel` — DB-Enum (`'per_lead' | 'per_month' | 'per_year' | 'free'`)

---

## 14. Geplante Schema-Änderungen (Phase B/C)

Detaillierte Roadmap: siehe [`roadmap.md`](roadmap.md). Kurzüberblick der noch ausstehenden DB-Migrationen:

| Aufgabe | Phase | Schema-Impact |
|---|---|---|
| **Page → 1:N Fields** | B.5 | Neue Tabellen `pages` (FK auf funnels) + `fields` (FK auf pages). `funnel_questions` + `funnels.contact_fields` jsonb wandern in `fields`. Daten-Migration für 58 Fragen + 12 funnels.contact_fields. |
| **updated_at-Trigger-Konsistenz** | B.7 | `update_updated_at()`-Trigger auf `submissions`, `pages`, `fields` (nach B.5), `webhook_subscriptions` (hat bereits). |
| **Logic Jumps** | C.4 | Neue Spalte/Junction `field_jump_rules` (per Frage: `if answer = X then go to field Y`). Aufbauend auf B.5-Foundation. |

**Workflow** (siehe [`roadmap.md`](roadmap.md) Phase-B-Workflow-Section): per-Aufgabe-Feature-Branch + DOWN-Migration als Safety-Net, direkt auf Production appliziert mit User-Bestätigung pro Migration. Zwei-Phasen-Pattern für nicht-additive Schema-Änderungen (Phase 1 ADD + Vercel-Deploy + Phase 2 DROP).

**Bereits abgeschlossen (Mai 2026):** B.1 (`tenant_members` + RLS), B.2 (UUID-FKs), B.3 (`submissions.contact_*`-Cleanup), B.4 (tenants schlanker), B.6 (Webhook-Schema).

---

## 15. Design-Entscheidungen (kondensiert)

| Entscheidung | Begründung |
|---|---|
| Funnel-Slug ≠ Tenant-Slug | Ein Tenant kann mehrere Funnels haben; Funnel-Slug ist die öffentliche URL |
| Eine Next.js-App für alle 3 Bereiche (Widget/Admin/Dashboard) | Shared Code, simples Deployment, gleiche Auth |
| Supabase als primäre Config | Tenant-Management ohne Code-Deployment |
| Service-Key-Client nur server-side | RLS-Bypass darf nie zum Browser gelangen |
| Supabase ZUERST loggen, dann E-Mail | Billing darf nicht durch E-Mail-Fehler verloren gehen |
| 2 Mails via `Promise.all` | Paralleler Versand, minimale Latenz |
| Honeypot statt CAPTCHA | Null Conversion-Verlust; unsichtbar für Nutzer |
| Rate-Limiting per IP zusätzlich | Zweite Verteidigungslinie gegen automatisierte Submissions |
| postMessage für iFrame-Höhe | Eltern-Frame kann iFrame dynamisch anpassen |
| Generischer Funnel (eine Datei) | Neue Branche = neue DB-Einträge, keine neue Komponente |
| `icon_key` + optionale `icon_url` | 80% mit Built-in-Icons abgedeckt; Custom-Bilder möglich |
| Konfigurierbare Texte mit Defaults | Keine Branche hardcoded; Tenant kann anpassen, muss aber nicht |
| iFrame statt Web Component (Standard) | Maximale Kompatibilität (WordPress, Jimdo, Squarespace). Web-Component kommt als Pro-Feature in v2 |
| Kuratierter Font-Enum | Self-Hosting DSGVO-konform (LG München 2022) |
| `lead_price` Snapshot pro Submission | Preisänderungen wirken nicht rückwirkend auf alte Leads |
| `submissions.status` als CRM-Workflow | Lead-Posteingang ist bereits angelegt — `offen` → `kontaktiert` → `abgeschlossen` |
