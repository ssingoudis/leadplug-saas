# Supabase Schema — Technische Vollreferenz

> **Auto-generierte Maschinen-Wahrheit** der aktuellen DB-Struktur.
> Generiert direkt aus `pg_catalog` / `information_schema` via Supabase MCP.
>
> Für architektonisches Verständnis und Zweck der Tabellen: siehe [`project-overview.md`](project-overview.md) §4.
> Bei jeder neuen Migration: dieses File neu regenerieren.

- **Stand:** 2026-05-27 (nach Aufgabe 29 / Phase B.6)
- **Letzte Migration:** `20260528170000_aufgabe_29_webhook_schema`
- **Tabellen:** 9 in `public` (alle mit RLS aktiviert)
- **Enums:** 3 (`billing_model_type`, `question_type`, `tenant_member_role`)
- **Functions:** 5 — **Triggers:** 4 — **Views:** 0

---

## RLS-Architektur (verbindlich)

Alle Tabellen haben `rls_enabled = true`. **Defense-in-Depth: CRUD läuft über RLS-Policies**, nicht nur SELECT.

- Tenant-Identity wird via Junction-Table aufgelöst: `auth.uid()` → `tenant_members.auth_user_id` → `tenant_members.tenant_id` → Daten.
- Helper-Funktionen `current_tenant_ids()` und `current_tenant_role(uuid)` (`SECURITY DEFINER`, `STABLE`, `search_path` gepinnt) bündeln die Auflösung — alle Policies referenzieren sie.
- Rollen-Enum `tenant_member_role` = `owner | admin | member`. Owner darf Tenant löschen, owner+admin dürfen Tenant-Settings updaten und Members verwalten, Member darf eigene Membership selbst entfernen.
- **25 Policies über 8 Tabellen** (SELECT/INSERT/UPDATE/DELETE — pro Tabelle nur die sinnvollen). `honeypot_triggers` bleibt policy-frei (Bot-Telemetrie, nur Service-Key).
- Seit Aufgabe 26 (Phase B.2): alle Policies referenzieren **direkt UUID-Spalten** (`tenant_id`, `funnel_id`), keine Slug-Walks mehr.

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

### `question_type`
```
'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'slider'
```
Verwendung: `funnel_questions.question_type`.

### `tenant_member_role`
```
'owner' | 'admin' | 'member'
```
Verwendung: `tenant_members.role`. Eingeführt mit Migration `aufgabe_25_tenant_members_and_full_rls`.

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
Setzt `NEW.updated_at = NOW()` bei jedem UPDATE. Wird von Triggers auf `funnels` und `tenants` verwendet.

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

> **In Aufgabe 26 gedroppt:** `slug` (Tenant-Slug war nirgendwo öffentlich), `auth_user_id` (User↔Tenant-Mapping läuft jetzt ausschließlich über `tenant_members`).
>
> **In Aufgabe 28 gedroppt:** `notification_email`, `public_email`, `public_phone`, `address` — alle endkunden-spezifischen Daten leben jetzt ausschließlich in `funnels` (`notification_email` Pflichtfeld, `footer_*` für Display).

**Foreign Keys:** keine eigenen FKs — `tenants.id` ist FK-Target für `tenant_members.tenant_id`, `funnels.tenant_id`, `funnel_view_logs.tenant_id`, `submissions.tenant_id`.

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
- `tenant_members_select` (SELECT, `authenticated`): `tenant_id IN (SELECT current_tenant_ids())` — alle Member sehen sich
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
| `notification_email` | text | YES | — |
| `email_sender_local` | text | YES | — |
| `contact_fields` | jsonb | YES | — |
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

**`contact_fields` jsonb-Schema:**
```typescript
ContactFieldConfig[] = {
  key: string,
  type: 'radio' | 'text' | 'email' | 'tel',
  label: string,
  placeholder?: string,
  options?: string[],
  required: boolean,
  visible: boolean,
  sort_order: number
}[]
```

---

### 3.4 `funnel_questions`

Fragen pro Funnel, flach, geordnet via `sort_order`. Aktuell 58 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `funnel_id` | uuid | NO | — FK → `funnels.id` ON DELETE CASCADE |
| `question_key` | text | NO | — |
| `title` | text | NO | — |
| `subtitle` | text | YES | — |
| `question_type` | `question_type` | NO | `'single_choice'` |
| `options` | jsonb | NO | `'[]'::jsonb` |
| `config` | jsonb | NO | `'{}'::jsonb` |
| `sort_order` | int4 | NO | `0` |
| `visible` | bool | YES | `true` |

**Foreign Keys:**
- `funnel_id` → `funnels.id` ON DELETE CASCADE

**Check Constraints:** keine

**Indices:**
- `funnel_questions_pkey` — UNIQUE btree(id)
- `funnel_questions_funnel_id_question_key_key` — **UNIQUE btree(funnel_id, question_key)** (verhindert doppelte question_keys innerhalb eines Funnels)
- `idx_funnel_questions_funnel_id` — btree(funnel_id, sort_order) (Listen-Query in Reihenfolge)

**Triggers:** keine

**RLS-Policies** (seit B.2 UUID-basiert):
- `funnel_questions_select`, `funnel_questions_insert`, `funnel_questions_update`, `funnel_questions_delete` (alle `authenticated`):
  ```sql
  funnel_id IN (
    SELECT id FROM public.funnels
    WHERE tenant_id IN (SELECT public.current_tenant_ids())
  )
  ```

**`options` jsonb-Schema:**
```typescript
{
  label: string,
  value: string,
  icon_key?: string,
  icon_url?: string
}[]
```

**`config` jsonb-Schema:** Frei strukturierbar pro Question-Type. Beispiele:
- Slider: `{ min: number, max: number, step?: number, unit?: string }`
- Text: `{ maxLength?: number, placeholder?: string }`

---

### 3.5 `submissions`

Eine Zeile pro abgeschickte Funnel-Submission. Das ist die CRM-Quelle. Aktuell 26 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | |
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
| `status` | text | NO | `'offen'` | CRM-Status (siehe Check) |
| `created_at` | timestamptz | YES | `now()` | |

> **In Aufgabe 27 gedroppt:** `contact_anrede`, `contact_name`, `contact_email`, `contact_phone` — alle ersetzt durch das `contact`-jsonb.

**Foreign Keys:**
- `tenant_id` → `tenants.id` ON DELETE SET NULL — bei Tenant-Löschung wird `tenant_id` NULL, Submission bleibt für Audit/Forensik erhalten

**Check Constraints:**
- `submissions_status_check`:
  ```
  status IN ('offen', 'kontaktiert', 'abgeschlossen')
  ```

**Indices:**
- `submissions_pkey` — UNIQUE btree(id)
- `idx_submissions_tenant_id` — btree(tenant_id, created_at) — Haupt-Filter für Lead-Listen
- `idx_submissions_funnel` — btree(funnel_slug, created_at) — für Funnel-spezifische Lookups + DELETE-Pfad
- `idx_submissions_tenant` — btree(tenant_slug, created_at) — Legacy (nicht mehr aktiv genutzt, kann später entfallen)

**Triggers:** keine

**RLS-Policies** (seit B.2 UUID-basiert):
- `submissions_select`, `submissions_update`, `submissions_delete` (alle `authenticated`):
  ```sql
  tenant_id IN (SELECT public.current_tenant_ids())
  ```
- **Kein INSERT-Policy** → INSERT durch `/api/submit` (anonym, Service-Key)

---

### 3.6 `funnel_view_logs`

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

### 3.7 `webhook_subscriptions`

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

### 3.8 `webhook_delivery_attempts`

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

### 3.9 `honeypot_triggers`

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
- Spalten `created_at` (default `now()`) und `updated_at` (default `now()`) auf `tenants`, `funnels` und `tenant_members`.
- Trigger `update_updated_at()` setzt `updated_at` bei jedem UPDATE neu.
- Andere Tabellen haben das Pattern (noch) **nicht** — `funnel_questions`, `submissions`, `funnel_view_logs`, `honeypot_triggers` haben keinen Updated-At-Trigger. Wird in Phase B.7 konsolidiert.

### 4.2 Soft-Delete via `is_active`
- `tenants` und `funnels` haben `is_active bool`. Inaktive Funnels/Tenants werden in `getTenantConfig()` (via Service-Key) abgefangen — Widget zeigt dann `notFound()`.
- Partial-Indices `idx_*_slug WHERE is_active = true` optimieren Lookups nur aktive Datensätze.

### 4.3 Snapshot-Felder
- `submissions` hat **zwei Schichten** für die Tenant-Verknüpfung:
  - **`tenant_id` (UUID, ON DELETE SET NULL)** — für RLS und tagesaktuelle Joins. Bei Tenant-Löschung wird NULL.
  - **`tenant_slug` + `funnel_slug` (Text-Snapshot, kein FK)** — bleibt erhalten wenn Tenant/Funnel gelöscht wird. `funnel_slug` wird vom App-Code weiter befüllt; `tenant_slug` wird seit Aufgabe 26 nicht mehr befüllt (`tenants.slug` existiert nicht mehr) — historische Werte bleiben aber.
- `submissions.lead_price` ist ebenfalls Snapshot — Preisänderungen wirken nicht rückwirkend.

### 4.4 JSONB für strukturierte Felder
- `funnels.contact_fields` — Definition der Kontaktformular-Felder
- `funnel_questions.options` — Antwortoptionen pro Frage
- `funnel_questions.config` — Frage-Type-spezifische Config
- `submissions.contact` — komplettes Kontakt-Objekt (einzige Quelle seit Aufgabe 27)
- `submissions.answers` — `{ question_key: value }`

### 4.5 RLS-Schema (komplett, Stand B.6)
- **Alle 9 Tabellen** haben `rls_enabled = true` (via `rls_auto_enable` Event-Trigger automatisch bei CREATE TABLE).
- **25 Policies** über 8 Tabellen (alle außer `honeypot_triggers`). Verteilung: tenants(3) + tenant_members(4) + funnels(4) + funnel_questions(4) + submissions(3) + funnel_view_logs(2) + webhook_subscriptions(4) + webhook_delivery_attempts(1). `webhook_delivery_attempts.insert/update/delete` fehlen absichtlich (Append-only via Service-Key — Sender-Code kommt in Phase C.5).
- Alle Policies referenzieren **direkt UUID-Spalten** (`tenant_id`, `funnel_id`) — keine Slug-Walks mehr.
- Helper `current_tenant_ids()` und `current_tenant_role(uuid)` werden in allen Policies referenziert (siehe §2).
- `honeypot_triggers` bleibt policy-frei (Bot-Telemetrie, nur Service-Key zulässig).
- `rls_auto_enable` Event-Trigger sorgt dafür, dass jede neue Tabelle in `public` automatisch RLS aktiv hat.

### 4.6 Sequences
- `funnel_view_logs.id` ist die einzige `bigint`-Tabelle mit `nextval()`. Alle anderen IDs sind UUIDs.

---

## 5. Stand der Schema-Evolution

23 Migrationen seit Projektbeginn:

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
```

### Geplante Migrationen (siehe roadmap.md Phase B)

1. **B.5 `pages` + `fields`** — Page → 1:N Refactor; Kontaktfelder werden reguläre Field-Types.
2. **B.7 Updated-At-Konsistenz** — Trigger auf alle relevanten Tabellen (`submissions`, `pages`/`fields` nach B.5, etc.).

---

## 6. Regenerieren

Bei jeder neuen Migration:

1. Migration applizieren (über Supabase Branch, dann Merge — siehe CLAUDE.md §13)
2. Dieses File neu generieren via Supabase MCP. Queries:
   - `list_tables(verbose=true)` für Spalten + FKs + Comments
   - `execute_sql` gegen `pg_indexes`, `pg_policies`, `pg_proc`, `information_schema.triggers`, `pg_constraint` für den Rest
3. Header (Stand-Datum + letzte Migration) aktualisieren
