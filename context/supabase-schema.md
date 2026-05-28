# Supabase Schema — Technische Vollreferenz

> **Auto-generierte Maschinen-Wahrheit** der aktuellen DB-Struktur.
> Generiert direkt aus `pg_catalog` / `information_schema` via Supabase MCP.
>
> Für architektonisches Verständnis und Zweck der Tabellen: siehe [`project-overview.md`](project-overview.md) §4.
> Bei jeder neuen Migration: dieses File neu regenerieren.

- **Stand:** 2026-05-28 (nach Aufgabe 30 / Phase B.5)
- **Letzte Migration:** `aufgabe_30b_drop_funnel_questions_and_contact_fields`
- **Tabellen:** 10 in `public` (alle mit RLS aktiviert)
- **Enums:** 4 (`billing_model_type`, `page_type`, `field_type`, `tenant_member_role`)
- **Functions:** 5 — **Triggers:** 6 — **Views:** 0

---

## RLS-Architektur (verbindlich)

Alle Tabellen haben `rls_enabled = true`. **Defense-in-Depth: CRUD läuft über RLS-Policies**, nicht nur SELECT.

- Tenant-Identity wird via Junction-Table aufgelöst: `auth.uid()` → `tenant_members.auth_user_id` → `tenant_members.tenant_id` → Daten.
- Helper-Funktionen `current_tenant_ids()` und `current_tenant_role(uuid)` (`SECURITY DEFINER`, `STABLE`, `search_path` gepinnt) bündeln die Auflösung — alle Policies referenzieren sie.
- Rollen-Enum `tenant_member_role` = `owner | admin | member`. Owner darf Tenant löschen, owner+admin dürfen Tenant-Settings updaten und Members verwalten, Member darf eigene Membership selbst entfernen.
- **33 Policies über 9 Tabellen** (SELECT/INSERT/UPDATE/DELETE — pro Tabelle nur die sinnvollen). `honeypot_triggers` bleibt policy-frei (Bot-Telemetrie, nur Service-Key).
- Seit Aufgabe 26 (Phase B.2): alle Policies referenzieren **direkt UUID-Spalten** (`tenant_id`, `funnel_id`, `page_id`), keine Slug-Walks mehr.

**Service-Key-Client (`lib/supabase/admin.ts`, RLS-Bypass) ist NUR noch zulässig für:**
- `/api/submit` — anonymer Endbenutzer, keine Auth
- `/api/track-view` — anonymer Funnel-View
- `/api/stripe/webhook` — System-Event von Stripe, kein User-Kontext
- `/api/tenant/slug-check` + `generateRandomSlug` in `/api/tenant/funnels` POST — globale Slug-Uniqueness-Prüfung (RLS würde fremde Tenants ausblenden)
- `app/dashboard/layout.tsx` — Tenant-Lookup via `tenant_members`-Join + Auto-Tenant-Anlage beim ersten Login (User hat vor Anlage noch keine Membership)
- Admin-Operationen (Plattform-Owner — `/admin/*` UI wurde in Aufgabe 26 gelöscht, Re-Build in Phase E geplant)

`tenants.auth_user_id` wurde in Aufgabe 26 gedroppt — `tenant_members` ist die alleinige Quelle für die User↔Tenant-Verknüpfung.

---

## 1. Enums

### `billing_model_type`
```
'per_lead' | 'per_month' | 'per_year' | 'free'
```
Verwendung: `tenants.billing_model`.

### `page_type`
```
'question' | 'submit' | 'success'
```
Verwendung: `pages.page_type`. Eingeführt mit Migration `aufgabe_30a_pages_fields_add`.

### `field_type`
```
'single_choice' | 'multi_choice' | 'short_text' | 'long_text'
              | 'email' | 'tel' | 'number' | 'date'
              | 'dropdown' | 'checkbox' | 'slider'
              | 'radio' | 'plz'
```
Verwendung: `fields.field_type`. Eingeführt mit Migration `aufgabe_30a_pages_fields_add`.

**Question-Pages dürfen** seit Aufgabe 34 (2026-05-28) nur noch diese 9 Types verwenden: `single_choice`, `multi_choice`, `short_text`, `long_text`, `slider`, `date`, `number`, `dropdown`, `checkbox`. `email` + `tel` wurden aus dem `QuestionType`-TypeScript-Union entfernt (waren nur kosmetische Text-Inputs mit anderem Browser-Keyboard, Validation passiert erst beim finalen Submit).

**Submit-Pages dürfen** weiter `text`, `email`, `tel`, `plz`, `radio` für Kontaktfelder nutzen (echte Lead-Daten-Mapping-Bedeutung). `radio` + `plz` sind eigene Werte (statt single_choice/short_text-Aliase), weil das Widget sie spezifisch rendert (radio = kleine Buttons, plz = 5-stellige Numerik-Validierung).

Das DB-Enum bleibt vollständig bestehen — nur App-Code-seitig sind die Question-Type-Pfade auf 9 reduziert.

### `tenant_member_role`
```
'owner' | 'admin' | 'member'
```
Verwendung: `tenant_members.role`. Eingeführt mit Migration `aufgabe_25_tenant_members_and_full_rls`.

> **In Aufgabe 30 gedroppt:** `question_type` — wurde nur von der gedroppten `funnel_questions`-Tabelle genutzt.

---

## 2. Functions

### `current_tenant_ids() → SETOF uuid`
**Helper für RLS.** Liefert alle `tenant_id`s, in denen der aktuelle `auth.uid()` Member ist. `SECURITY DEFINER`, `STABLE`, `search_path = public, pg_temp`. `EXECUTE` granted für `authenticated`, revoked für `anon`/`public`.

```sql
CREATE OR REPLACE FUNCTION public.current_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE auth_user_id = auth.uid()
$$;
```

### `current_tenant_role(p_tenant_id uuid) → tenant_member_role`
**Helper für RLS.** Liefert die Rolle des aktuellen Users für einen bestimmten Tenant (oder NULL wenn nicht Member). `SECURITY DEFINER`, `STABLE`, `search_path = public, pg_temp`.

```sql
CREATE OR REPLACE FUNCTION public.current_tenant_role(p_tenant_id uuid)
RETURNS public.tenant_member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.tenant_members
  WHERE tenant_id = p_tenant_id AND auth_user_id = auth.uid()
  LIMIT 1
$$;
```

### `increment_funnel_views(funnel_slug text) → void`
Inkrementiert `funnels.total_views` für einen Funnel. `SECURITY DEFINER` — wird auch ohne RLS-Rechte für `funnels` ausgeführt. Aufrufbar durch jeden (z.B. via `/api/track-view`).

```sql
CREATE OR REPLACE FUNCTION public.increment_funnel_views(funnel_slug text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  UPDATE funnels SET total_views = total_views + 1 WHERE slug = funnel_slug;
$function$
```

### `update_updated_at() → trigger`
Setzt `NEW.updated_at = NOW()` bei jedem UPDATE. Wird von Triggers auf `funnels`, `tenants`, `tenant_members`, `webhook_subscriptions`, `pages`, `fields` verwendet.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
```

### `rls_auto_enable() → event_trigger`
**Event-Trigger** (Supabase-Standard): wenn eine neue Tabelle in `public` erstellt wird, wird automatisch `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` ausgeführt. Bedeutet: **jede neue Tabelle hat RLS aktiv von Geburt an** — Policies müssen explizit hinzugefügt werden, sonst ist die Tabelle für User-Clients komplett blockiert.

```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
    IF cmd.schema_name IN ('public')
       AND cmd.schema_name NOT LIKE 'pg_%'
       AND cmd.schema_name <> 'information_schema' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'rls_auto_enable: failed on %', cmd.object_identity;
      END;
    END IF;
  END LOOP;
END;
$function$
```

---

## 3. Tables

### 3.1 `tenants`

Reine Agentur-Account-Tabelle nach Aufgabe 28 / Phase B.4. Aktuell 9 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints / Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `company_name` | text | NO | — | Comment: "Firmenname" (Anzeigename der Agentur) |
| `is_active` | bool | YES | `true` | Comment: "Legt fest, ob das iFrame aktiv ist oder nicht" |
| `website` | text | YES | — | Comment: "Firmenwebseite" |
| `billing_model` | `billing_model_type` | NO | `'per_month'` | Comment: "Abrechnungsmodell" |
| `lead_price` | numeric | YES | `3.00` | Comment: "Preis pro Lead in €" |
| `billing_price` | numeric | YES | — | Comment: "Preis pro Monat fix in €" |
| `stripe_customer_id` | text | YES | — | Comment: "Stripe Customer ID (cus_...)" |
| `stripe_subscription_id` | text | YES | — | Comment: "Stripe Subscription ID (sub_...)" |
| `stripe_subscription_status` | text | YES | — | CHECK (siehe unten) — Comment: "Letzter bekannter Subscription-Status von Stripe" |
| `stripe_price_id` | text | YES | — | Comment: "Stripe Price ID des aktiven Plans (price_...)" |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | wird via Trigger aktualisiert |

> **In Aufgabe 26 gedroppt:** `slug`, `auth_user_id`. **In Aufgabe 28 gedroppt:** `notification_email`, `public_email`, `public_phone`, `address`.

**Foreign Keys:** keine eigenen FKs — `tenants.id` ist FK-Target für `tenant_members.tenant_id`, `funnels.tenant_id`, `funnel_view_logs.tenant_id`, `submissions.tenant_id`, `webhook_subscriptions.tenant_id`.

**Check Constraints:**
- `tenants_stripe_subscription_status_check`:
  ```
  stripe_subscription_status IN ('active', 'trialing', 'past_due',
                                  'canceled', 'unpaid', 'incomplete')
  ```

**Indices:**
- `tenants_pkey` — UNIQUE btree(id)
- `tenants_stripe_customer_id_unique` — UNIQUE btree(stripe_customer_id) **WHERE stripe_customer_id IS NOT NULL**
- `tenants_stripe_subscription_id_unique` — UNIQUE btree(stripe_subscription_id) **WHERE stripe_subscription_id IS NOT NULL**

**Triggers:**
- `tenants_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies** (seit B.1):
- `tenants_select` (SELECT, `authenticated`): `id IN (SELECT current_tenant_ids())`
- `tenants_update` (UPDATE, `authenticated`): `current_tenant_role(id) IN ('owner','admin')` (USING + WITH CHECK)
- `tenants_delete` (DELETE, `authenticated`): `current_tenant_role(id) = 'owner'`
- **Kein INSERT-Policy** → Tenant-Anlage läuft via Signup-Flow + admin-Client (`app/dashboard/layout.tsx`)

---

### 3.2 `tenant_members`

Junction-Table N:M zwischen `tenants` und `auth.users` mit Rolle pro Mitgliedschaft. Aktuell 3 Zeilen (1 Owner pro existierendem Tenant mit `auth_user_id`). Eingeführt mit Migration `aufgabe_25_tenant_members_and_full_rls`.

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `tenant_id` | uuid | NO | — | FK → `tenants.id` ON DELETE CASCADE |
| `auth_user_id` | uuid | NO | — | FK → `auth.users.id` ON DELETE CASCADE |
| `role` | `tenant_member_role` | NO | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | via Trigger |

**Foreign Keys:**
- `tenant_id` → `tenants.id` ON DELETE CASCADE
- `auth_user_id` → `auth.users.id` ON DELETE CASCADE

**Constraints:**
- UNIQUE `(tenant_id, auth_user_id)` — kein User doppelt im selben Tenant

**Indices:**
- `tenant_members_pkey` — UNIQUE btree(id)
- `tenant_members_tenant_id_idx` — btree(tenant_id)
- `tenant_members_auth_user_id_idx` — btree(auth_user_id)
- UNIQUE-Index aus dem Composite-Constraint

**Triggers:**
- `set_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies:**
- `tenant_members_select` (SELECT, `authenticated`): `tenant_id IN (SELECT current_tenant_ids())`
- `tenant_members_insert` (INSERT, `authenticated`): `current_tenant_role(tenant_id) IN ('owner','admin')`
- `tenant_members_update` (UPDATE, `authenticated`): `current_tenant_role(tenant_id) IN ('owner','admin')`
- `tenant_members_delete` (DELETE, `authenticated`): owner/admin **oder** `auth_user_id = auth.uid()` (Self-Remove)

> Auto-Anlage des Owner-Eintrags beim ersten Login passiert in `app/dashboard/layout.tsx` via admin-Client (System-Provisioning).

---

### 3.3 `funnels`

Das Widget pro Tenant. Ein Tenant kann mehrere haben. Aktuell 12 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `slug` | text | NO | — (UNIQUE — öffentlicher URL-Identifier, nach Anlage unveränderlich) |
| `tenant_id` | uuid | NO | — FK → `tenants.id` ON DELETE CASCADE |
| `is_active` | bool | YES | `true` |
| `funnel_name` | text | YES | — |
| `contact_form_title` | text | YES | — |
| `contact_form_subtitle` | text | YES | — |
| `submit_button_label` | text | YES | — |
| `success_message` | text | YES | — |
| `response_message` | text | YES | — |
| `answers_overview_label` | text | YES | — |
| `privacy_text` | text | YES | — |
| `privacy_policy_url` | text | YES | — |
| `footer_text` | text | YES | — |
| `footer_company_name` | text | YES | — |
| `footer_email` | text | YES | — |
| `footer_phone` | text | YES | — |
| `notification_email` | text | NO | — |
| `email_sender_local` | text | YES | — |
| `primary_color` | text | YES | — |
| `text_color` | text | YES | — |
| `background_color` | text | YES | — |
| `page_background_color` | text | YES | — |
| `font` | text | YES | — |
| `border_radius` | text | YES | — |
| `max_width` | text | YES | — |
| `total_views` | int4 | NO | `0` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

> **In Aufgabe 30 gedroppt:** `contact_fields` jsonb — Kontaktfelder leben jetzt als Fields auf der Submit-Page eines Funnels.

**Foreign Keys:**
- `tenant_id` → `tenants.id` ON DELETE CASCADE

**Check Constraints:** keine

**Indices:**
- `funnels_pkey` — UNIQUE btree(id)
- `funnels_slug_key` — UNIQUE btree(slug)
- `idx_funnels_slug` — btree(slug) **WHERE is_active = true** (partial)
- `idx_funnels_tenant_id` — btree(tenant_id)

**Triggers:**
- `funnels_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies** (seit B.2 UUID-basiert):
- `funnels_select`, `funnels_insert`, `funnels_update`, `funnels_delete` (alle `authenticated`):
  ```sql
  tenant_id IN (SELECT public.current_tenant_ids())
  ```
- **Öffentliche Lesbarkeit für das Widget** läuft NICHT über RLS, sondern über den Service-Key in `getTenantConfig()`. Anonymous Endbenutzer haben keine RLS-Berechtigung — der Server stellt die Daten bereit.

---

### 3.4 `pages`

Page-Hierarchie pro Funnel. Eingeführt mit Migration `aufgabe_30a_pages_fields_add` (Phase B.5). Pro Funnel: N × question-Pages + 1 × submit-Page + 1 × success-Page. Aktuell 82 Zeilen (12 Funnels × (~5 Fragen + submit + success)).

**Columns:**

| Spalte | Typ | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `funnel_id` | uuid | NO | — | FK → `funnels.id` ON DELETE CASCADE |
| `page_type` | `page_type` | NO | — | question / submit / success |
| `sort_order` | int4 | NO | — | CHECK >= 0. Question-Pages 0..N-1, Submit-Page N, Success-Page N+1 |
| `config` | jsonb | NO | `'{}'::jsonb` | Page-spezifische Config. B.5: leer (Texte bleiben auf funnels-Tabelle). Future-use für Per-Page-Overrides |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | via Trigger |

**Foreign Keys:**
- `funnel_id` → `funnels.id` ON DELETE CASCADE

**Check Constraints:**
- `pages_sort_order_nonneg`: `sort_order >= 0`

**Indices:**
- `pages_pkey` — UNIQUE btree(id)
- `idx_pages_funnel_id` — btree(funnel_id, sort_order)

**Triggers:**
- `pages_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies:**
- `pages_select`, `pages_insert`, `pages_update`, `pages_delete` (alle `authenticated`):
  ```sql
  funnel_id IN (
    SELECT id FROM public.funnels
    WHERE tenant_id IN (SELECT public.current_tenant_ids())
  )
  ```

---

### 3.5 `fields`

Felder pro Page. Eingeführt mit Migration `aufgabe_30a_pages_fields_add` (Phase B.5). Question-Page hat heute 1 Field; Submit-Page hat alle Kontaktfelder (name, email, tel, …); Success-Page hat 0 Fields. Aktuell 110 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `page_id` | uuid | NO | — | FK → `pages.id` ON DELETE CASCADE |
| `field_key` | text | NO | — | Stabiler Key (= altes `question_key` / `contact_fields[].key`). Referenz in `submissions.answers` + `submissions.contact` |
| `field_type` | `field_type` | NO | — | siehe Enum §1 |
| `label` | text | NO | — | Frage-Titel oder Field-Label |
| `subtitle` | text | YES | — | nur für question-Fields |
| `placeholder` | text | YES | — | für Text-/Email-/Tel-Fields |
| `visible` | bool | NO | `true` | |
| `required` | bool | NO | `false` | |
| `sort_order` | int4 | NO | `0` | CHECK >= 0 |
| `options` | jsonb | NO | `'[]'::jsonb` | Antwortoptionen |
| `config` | jsonb | NO | `'{}'::jsonb` | Typspezifische Config |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | via Trigger |

**Foreign Keys:**
- `page_id` → `pages.id` ON DELETE CASCADE

**Check Constraints:**
- `fields_sort_order_nonneg`: `sort_order >= 0`

**Indices:**
- `fields_pkey` — UNIQUE btree(id)
- `fields_page_field_key_unique` — **UNIQUE btree(page_id, field_key)** (verhindert doppelte field_keys innerhalb einer Page)
- `idx_fields_page_id` — btree(page_id, sort_order)

**Triggers:**
- `fields_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies** (via Page → Funnel → Tenant):
- `fields_select`, `fields_insert`, `fields_update`, `fields_delete` (alle `authenticated`):
  ```sql
  page_id IN (
    SELECT id FROM public.pages
    WHERE funnel_id IN (
      SELECT id FROM public.funnels
      WHERE tenant_id IN (SELECT public.current_tenant_ids())
    )
  )
  ```

**`options` jsonb-Schema (seit Aufgabe 34):**
- Choice-Types (`single_choice`, `multi_choice`, `dropdown`): Object-Array
  ```typescript
  {
    label: string,
    value: string,
    sort_order?: number,
  }[]
  ```
  **Aufgabe 34 (2026-05-28)** strippt `icon_key` + `icon_url` aus allen Option-Objekten (45 Fields, 175 Einträge). Choice-Options rendern jetzt A/B/C/D Letter-Chips als Default. Migration `aufgabe_34_strip_icon_keys_from_field_options` ist forward-only.
- Radio-Type (z.B. Anrede): String-Array
  ```typescript
  string[]  // z.B. ["Herr", "Frau"]
  ```

**`config` jsonb-Schema:** Frei strukturierbar pro field_type. Beispiele:
- Slider: `{ min: number, max: number, step?: number, unit?: string, default?: number, openMax?: boolean }`
- Text/Long-Text: `{ maxLength?: number, placeholder?: string, required?: boolean }`

---

### 3.6 `submissions`

Eine Zeile pro User-Session (Partial-Submissions seit Aufgabe 34). Das ist die CRM-Quelle.

**Columns:**

| Spalte | Typ | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | |
| `session_id` | uuid | **NO** | — | **Aufgabe 34.** UNIQUE — UPSERT-Identität für Partial-Submissions. Client-generiert via `crypto.randomUUID()` in sessionStorage. |
| `completed_at` | timestamptz | YES | NULL | **Aufgabe 34.** NULL = Session läuft / abgebrochen, gesetzt = finaler Submit erfolgt (`/api/submit`). |
| `tenant_id` | uuid | YES | — | FK → `tenants.id` ON DELETE SET NULL — RLS-Filter |
| `funnel_slug` | text | YES | — | **Snapshot** für Display (kein FK — bleibt auch wenn Funnel gelöscht) |
| `tenant_slug` | text | YES | — | **Snapshot** historisch; neue Inserts via App-Code lassen das Feld leer (`tenants.slug` existiert nicht mehr) |
| `contact` | jsonb | YES | — | Komplettes Kontakt-Objekt — einzige Quelle für Name/Email/Telefon/Anrede |
| `answers` | jsonb | NO | — | "Liste aller Antworten des Anfragers" |
| `lead_price` | numeric | YES | `0` | Snapshot zum Submission-Zeitpunkt |
| `source_url` | text | YES | — | |
| `user_agent` | text | YES | — | |
| `ip_address` | text | YES | — | |
| `customer_email_sent` | bool | YES | `false` | |
| `tenant_email_sent` | bool | YES | `false` | |
| `status` | text | NO | `'offen'` | CRM-Status (siehe Check) — orthogonal zu `completed_at` |
| `created_at` | timestamptz | YES | `now()` | |

**Foreign Keys:**
- `tenant_id` → `tenants.id` ON DELETE SET NULL — bei Tenant-Löschung wird `tenant_id` NULL, Submission bleibt für Audit/Forensik erhalten

**Check Constraints:**
- `submissions_status_check`:
  ```
  status IN ('offen', 'kontaktiert', 'abgeschlossen')
  ```

**Unique Constraints:**
- `submissions_session_id_unique` — UNIQUE(session_id) (Aufgabe 34, für UPSERT)

**Indices:**
- `submissions_pkey` — UNIQUE btree(id)
- `submissions_session_id_unique` — UNIQUE btree(session_id)
- `submissions_completed_at_idx` — btree(tenant_id, completed_at NULLS FIRST) (Aufgabe 34, für Lead-Inbox-Tabs)
- `submissions_abandoned_with_email_idx` — **partial** btree(tenant_id, created_at DESC) WHERE completed_at IS NULL AND contact->>'email' IS NOT NULL AND contact->>'email' <> '' (Aufgabe 34, „Abgebrochen-mit-Email"-Tab)
- `idx_submissions_tenant_id` — btree(tenant_id, created_at) — Haupt-Filter für Lead-Listen
- `idx_submissions_funnel` — btree(funnel_slug, created_at) — für Funnel-spezifische Lookups + DELETE-Pfad
- `idx_submissions_tenant` — btree(tenant_slug, created_at) — Legacy (nicht mehr aktiv genutzt, kann später entfallen)

**Triggers:** keine

**RLS-Policies** (seit B.2 UUID-basiert):
- `submissions_select`, `submissions_update`, `submissions_delete` (alle `authenticated`):
  ```sql
  tenant_id IN (SELECT public.current_tenant_ids())
  ```
- **Kein INSERT-Policy** → INSERT/UPSERT durch `/api/submit` + `/api/track-progress` (anonym, Service-Key)

---

### 3.7 `funnel_view_logs`

View-Tracking pro Funnel-Render. Aktuell 277 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| `id` | int8 | NO | `nextval('funnel_view_logs_id_seq')` |
| `funnel_id` | uuid | NO | — FK → `funnels.id` ON DELETE CASCADE |
| `tenant_id` | uuid | NO | — FK → `tenants.id` ON DELETE CASCADE |
| `viewed_at` | timestamptz | NO | `now()` |

**Foreign Keys:**
- `funnel_id` → `funnels.id` ON DELETE CASCADE
- `tenant_id` → `tenants.id` ON DELETE CASCADE

**Check Constraints:** keine

**Indices:**
- `funnel_view_logs_pkey` — UNIQUE btree(id)
- `idx_funnel_view_logs_tenant_id` — btree(tenant_id, viewed_at) (Monats-Aggregationen)
- `idx_funnel_view_logs_funnel_id` — btree(funnel_id)

**Triggers:** keine

**RLS-Policies** (seit B.2 UUID-basiert):
- `funnel_view_logs_select` (SELECT, `authenticated`): `tenant_id IN (SELECT public.current_tenant_ids())`
- `funnel_view_logs_delete` (DELETE, `authenticated`): gleiche Bedingung (Cascade-Cleanup, FK übernimmt eigentlich automatisch)
- **Kein INSERT/UPDATE-Policy** → INSERT durch `/api/track-view` (anonym, Service-Key)

---

### 3.8 `webhook_subscriptions`

Pro Tenant 1..N Webhook-Endpoints, an die Events geliefert werden. **Schema-Foundation für Webhook-Tier-Launch (Phase C.5)** — Sender-Code existiert noch nicht. Aktuell 0 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints / Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `tenant_id` | uuid | NO | — | FK → `tenants.id` ON DELETE CASCADE |
| `url` | text | NO | — | CHECK: `LIKE 'http%' AND length(url) >= 10`. HTTPS empfohlen, http nur für lokale Tests. |
| `secret` | text | NO | — | CHECK: `length(secret) >= 16`. HMAC-Signing-Secret, app-generated bei Create. |
| `event_types` | text[] | NO | `'{}'` | Liste der abonnierten Event-Types, z.B. `{"submission.created"}`. |
| `is_active` | bool | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | via Trigger |

**Foreign Keys:** `tenant_id` → `tenants.id` ON DELETE CASCADE

**Indices:**
- `webhook_subscriptions_pkey` — UNIQUE btree(id)
- `idx_webhook_subscriptions_tenant_id` — btree(tenant_id)
- `idx_webhook_subscriptions_active` — btree(tenant_id, is_active) **WHERE is_active = true** (partial)

**Triggers:**
- `webhook_subscriptions_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies:**
- `webhook_subscriptions_select` (SELECT, `authenticated`): `tenant_id IN (SELECT current_tenant_ids())`
- `webhook_subscriptions_insert` (INSERT, `authenticated`): `current_tenant_role(tenant_id) IN ('owner','admin')`
- `webhook_subscriptions_update` (UPDATE, `authenticated`): `current_tenant_role(tenant_id) IN ('owner','admin')` (USING + WITH CHECK)
- `webhook_subscriptions_delete` (DELETE, `authenticated`): `current_tenant_role(tenant_id) = 'owner'` (nur Owner — Delete entfernt via CASCADE auch alle delivery_attempts)

---

### 3.9 `webhook_delivery_attempts`

Audit-Trail jeder Webhook-Zustellungs-Versuche. Append-only (kein UPDATE durch User-Client). Aktuell 0 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints / Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `subscription_id` | uuid | NO | — | FK → `webhook_subscriptions.id` ON DELETE CASCADE |
| `submission_id` | uuid | YES | — | FK → `submissions.id` ON DELETE SET NULL (Audit bleibt erhalten) |
| `attempt_count` | int | NO | `1` | CHECK >= 1 |
| `status` | text | NO | `'pending'` | CHECK IN (`pending`, `retrying`, `success`, `failed`) |
| `last_error` | text | YES | — | NULL bei Erfolg |
| `delivered_at` | timestamptz | YES | — | NULL bis erfolgreich |
| `created_at` | timestamptz | NO | `now()` | |

**Check Constraints:**
- `status` ∈ `{pending, retrying, success, failed}`
- `attempt_count >= 1`
- `delivered_when_success`: wenn `status='success'`, muss `delivered_at IS NOT NULL`

**Foreign Keys:**
- `subscription_id` → `webhook_subscriptions.id` ON DELETE CASCADE
- `submission_id` → `submissions.id` ON DELETE SET NULL

**Indices:**
- `webhook_delivery_attempts_pkey` — UNIQUE btree(id)
- `idx_webhook_delivery_attempts_subscription` — btree(subscription_id, created_at DESC) — für "letzte N Versuche pro Subscription"
- `idx_webhook_delivery_attempts_submission` — btree(submission_id) **WHERE submission_id IS NOT NULL** (partial)
- `idx_webhook_delivery_attempts_retry_queue` — btree(created_at) **WHERE status IN ('pending','retrying')** (partial) — Retry-Queue-Scan

**Triggers:** keine (Append-only)

**RLS-Policies:**
- `webhook_delivery_attempts_select` (SELECT, `authenticated`): `subscription_id IN (SELECT id FROM webhook_subscriptions WHERE tenant_id IN (SELECT current_tenant_ids()))`
- **Kein INSERT/UPDATE/DELETE-Policy** — Schreibzugriff nur via Service-Key durch System-Code (Webhook-Sender, kommt in Phase C.5)

---

### 3.10 `honeypot_triggers`

Bot-Hits-Log. Aktuell 0 Zeilen (Honeypot greift selten / Bots sind sauber abgewehrt).

**Columns:**

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `funnel_slug` | text | YES | — |
| `ip_address` | text | YES | — |
| `created_at` | timestamptz | YES | `now()` |

**Foreign Keys:** keine (Bots könnten ungültige Slugs schicken — wir loggen trotzdem)

**Check Constraints:** keine

**Indices:**
- `honeypot_triggers_pkey` — UNIQUE btree(id)

**Triggers:** keine

**RLS-Policies:**
- ⚠️ **KEINE RLS-Policy** → Tabelle ist für alle User-Clients komplett blockiert. Nur Service-Key kann lesen/schreiben. Das ist gewollt: Bot-Logs sind interne Telemetrie.

---

## 4. Übergreifende Patterns & Konventionen

### 4.1 Updated-At-Pattern
- Spalten `created_at` (default `now()`) und `updated_at` (default `now()`) auf `tenants`, `funnels`, `tenant_members`, `webhook_subscriptions`, `pages`, `fields`.
- Trigger `update_updated_at()` setzt `updated_at` bei jedem UPDATE neu (6 Trigger insgesamt).
- `submissions`, `funnel_view_logs`, `webhook_delivery_attempts` und `honeypot_triggers` haben das Pattern **nicht** — alle vier sind append-only (keine UPDATEs erwartet).
- **B.7 ist mit B.5 erledigt:** pages + fields haben den Trigger bei der Anlage in Migration 30a bekommen — kein eigener B.7-Sprint mehr nötig.

### 4.2 Soft-Delete via `is_active`
- `tenants` und `funnels` haben `is_active bool`. Inaktive Funnels/Tenants werden in `getTenantConfig()` (via Service-Key) abgefangen — Widget zeigt dann `notFound()`.
- Partial-Indices `idx_*_slug WHERE is_active = true` optimieren Lookups nur aktive Datensätze.

### 4.3 Snapshot-Felder
- `submissions` hat **zwei Schichten** für die Tenant-Verknüpfung:
  - **`tenant_id` (UUID, ON DELETE SET NULL)** — für RLS und tagesaktuelle Joins. Bei Tenant-Löschung wird NULL.
  - **`tenant_slug` + `funnel_slug` (Text-Snapshot, kein FK)** — bleibt erhalten wenn Tenant/Funnel gelöscht wird. `funnel_slug` wird vom App-Code weiter befüllt; `tenant_slug` wird seit Aufgabe 26 nicht mehr befüllt (`tenants.slug` existiert nicht mehr) — historische Werte bleiben aber.
- `submissions.lead_price` ist ebenfalls Snapshot — Preisänderungen wirken nicht rückwirkend.

### 4.4 JSONB für strukturierte Felder
- `fields.options` — Antwortoptionen pro Field (Choice-Types: Object-Array, Radio: String-Array)
- `fields.config` — Field-Type-spezifische Config (Slider min/max/etc, Text maxLength)
- `pages.config` — Page-spezifische Config (B.5: leer, Future-use)
- `submissions.contact` — komplettes Kontakt-Objekt (einzige Quelle seit Aufgabe 27)
- `submissions.answers` — `{ field_key: value }`

### 4.5 RLS-Schema (komplett, Stand B.5)
- **Alle 10 Tabellen** haben `rls_enabled = true` (via `rls_auto_enable` Event-Trigger automatisch bei CREATE TABLE).
- **33 Policies** über 9 Tabellen (alle außer `honeypot_triggers`). Verteilung: tenants(3) + tenant_members(4) + funnels(4) + pages(4) + fields(4) + submissions(3) + funnel_view_logs(2) + webhook_subscriptions(4) + webhook_delivery_attempts(1). `webhook_delivery_attempts.insert/update/delete` fehlen absichtlich (Append-only via Service-Key — Sender-Code kommt in Phase C.5).
- Alle Policies referenzieren **direkt UUID-Spalten** (`tenant_id`, `funnel_id`, `page_id`) — keine Slug-Walks mehr.
- Helper `current_tenant_ids()` und `current_tenant_role(uuid)` werden in allen Policies referenziert (siehe §2).
- `honeypot_triggers` bleibt policy-frei (Bot-Telemetrie, nur Service-Key zulässig).
- `rls_auto_enable` Event-Trigger sorgt dafür, dass jede neue Tabelle in `public` automatisch RLS aktiv hat.

### 4.6 Sequences
- `funnel_view_logs.id` ist die einzige `bigint`-Tabelle mit `nextval()`. Alle anderen IDs sind UUIDs.

---

## 5. Stand der Schema-Evolution

25 Migrationen seit Projektbeginn:

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
20260527130000 — aufgabe_25_add_funnel_view_logs_delete_policy  ← Hotfix B.1
20260528120000 — aufgabe_26a_uuid_fks_add                       ← Phase B.2 (ADD, zero-downtime)
20260528130000 — aufgabe_26b_uuid_fks_drop                      ← Phase B.2 (DROP)
20260528140000 — aufgabe_27_drop_submissions_contact_legacy     ← Phase B.3
20260528150000 — aufgabe_28a_tenants_cleanup_phase1             ← Phase B.4 (Backfills + Constraints)
20260528160000 — aufgabe_28b_tenants_drop_endcustomer_columns   ← Phase B.4 (DROP)
20260528170000 — aufgabe_29_webhook_schema                      ← Phase B.6 (additive)
20260528180000 — aufgabe_30a_pages_fields_add                   ← Phase B.5 (additive + Daten-Migration)
20260528190000 — aufgabe_30b_drop_funnel_questions_and_contact_fields ← Phase B.5 (DROP)
```

### Geplante Migrationen

Phase B ist abgeschlossen. Nächste DB-Arbeit kommt in Phase C/D nur nach Bedarf (z.B. neue field_types in C.3, oder Logic-Jumps-Tabelle in C.4).

---

## 6. Regenerieren

Bei jeder neuen Migration:

1. Migration applizieren (über Supabase Branch, dann Merge — siehe CLAUDE.md §13)
2. Dieses File neu generieren via Supabase MCP. Queries:
   - `list_tables(verbose=true)` für Spalten + FKs + Comments
   - `execute_sql` gegen `pg_indexes`, `pg_policies`, `pg_proc`, `information_schema.triggers`, `pg_constraint` für den Rest
3. Header (Stand-Datum + letzte Migration) aktualisieren
