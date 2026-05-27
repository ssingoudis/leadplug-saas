# Supabase Schema — Technische Vollreferenz

> **Auto-generierte Maschinen-Wahrheit** der aktuellen DB-Struktur.
> Generiert direkt aus `pg_catalog` / `information_schema` via Supabase MCP.
>
> Für architektonisches Verständnis und Zweck der Tabellen: siehe [`project-overview.md`](project-overview.md) §4.
> Bei jeder neuen Migration: dieses File neu regenerieren.

- **Stand:** 2026-05-27 (nach Aufgabe 25 / Phase B.1)
- **Letzte Migration:** `20260527130000_aufgabe_25_add_funnel_view_logs_delete_policy`
- **Tabellen:** 7 in `public` (alle mit RLS aktiviert)
- **Enums:** 3 (`billing_model_type`, `question_type`, `tenant_member_role`)
- **Functions:** 5 — **Triggers:** 3 — **Views:** 0

---

## RLS-Architektur (verbindlich)

Alle Tabellen haben `rls_enabled = true`. **Defense-in-Depth: CRUD läuft über RLS-Policies**, nicht nur SELECT.

- Tenant-Identity wird via Junction-Table aufgelöst: `auth.uid()` → `tenant_members.auth_user_id` → `tenant_members.tenant_id` → Daten.
- Helper-Funktionen `current_tenant_ids()` und `current_tenant_role(uuid)` (`SECURITY DEFINER`, `STABLE`, `search_path` gepinnt) bündeln die Auflösung — alle Policies referenzieren sie.
- Rollen-Enum `tenant_member_role` = `owner | admin | member`. Owner darf Tenant löschen, owner+admin dürfen Tenant-Settings updaten und Members verwalten, Member darf eigene Membership selbst entfernen.
- **19 Policies über 6 Tabellen** (SELECT/INSERT/UPDATE/DELETE — pro Tabelle nur die sinnvollen). `honeypot_triggers` bleibt policy-frei (Bot-Telemetrie, nur Service-Key).

**Service-Key-Client (`lib/supabase/admin.ts`, RLS-Bypass) ist NUR noch zulässig für:**
- `/api/submit` — anonymer Endbenutzer, keine Auth
- `/api/track-view` — anonymer Funnel-View
- `/api/stripe/webhook` — System-Event von Stripe, kein User-Kontext
- `/api/tenant/slug-check` + `generateRandomSlug` in `/api/tenant/funnels` POST — globale Slug-Uniqueness-Prüfung (RLS würde fremde Tenants ausblenden)
- `app/dashboard/layout.tsx` Auto-Tenant-Anlage beim ersten Login (System-Provisioning, vor Membership)
- Admin-Operationen (Stavros / Plattform-Owner)

`tenants.auth_user_id` bleibt als Owner-Shortcut bestehen (kann in Phase B.4 entfallen).

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

Stammdaten der zahlenden Agentur-Accounts. Aktuell 9 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints / Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | UNIQUE — Comment: "Slug für die URL des iFrames, https://app.leadplug.de/slug" |
| `company_name` | text | NO | — | Comment: "Firmenname" |
| `is_active` | bool | YES | `true` | Comment: "Legt fest, ob das iFrame aktiv ist oder nicht" |
| `public_email` | text | NO | — | Comment: "Angezeigte E-Mail Adresse in der Kundenmail" |
| `public_phone` | text | YES | — | Comment: "Angezeigte Telefonnummer in der Kundenmail" |
| `notification_email` | text | NO | — | — |
| `address` | text | YES | — | Comment: "Rechnungsadresse" |
| `website` | text | YES | — | Comment: "Firmenwebseite" |
| `auth_user_id` | uuid | YES | — | FK → `auth.users.id` |
| `billing_model` | `billing_model_type` | NO | `'per_month'` | Comment: "Abrechnungsmodell" |
| `lead_price` | numeric | YES | `3.00` | Comment: "Preis pro Lead in €" |
| `billing_price` | numeric | YES | — | Comment: "Preis pro Monat fix in €" |
| `stripe_customer_id` | text | YES | — | Comment: "Stripe Customer ID (cus_...)" |
| `stripe_subscription_id` | text | YES | — | Comment: "Stripe Subscription ID (sub_...)" |
| `stripe_subscription_status` | text | YES | — | CHECK (siehe unten) — Comment: "Letzter bekannter Subscription-Status von Stripe" |
| `stripe_price_id` | text | YES | — | Comment: "Stripe Price ID des aktiven Plans (price_...)" |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | wird via Trigger aktualisiert |

**Foreign Keys:**
- `auth_user_id` → `auth.users.id`

**Check Constraints:**
- `tenants_stripe_subscription_status_check`:
  ```
  stripe_subscription_status IN ('active', 'trialing', 'past_due',
                                  'canceled', 'unpaid', 'incomplete')
  ```

**Indices:**
- `tenants_pkey` — UNIQUE btree(id)
- `tenants_slug_key` — UNIQUE btree(slug)
- `tenants_auth_user_id_idx` — UNIQUE btree(auth_user_id)
- `idx_tenants_slug` — btree(slug) **WHERE is_active = true** (partial)
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
| `slug` | text | NO | — (UNIQUE) |
| `tenant_slug` | text | NO | — |
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
- `tenant_slug` → `tenants.slug`

**Check Constraints:** keine

**Indices:**
- `funnels_pkey` — UNIQUE btree(id)
- `funnels_slug_key` — UNIQUE btree(slug)
- `idx_funnels_slug` — btree(slug) **WHERE is_active = true** (partial)
- `idx_funnels_tenant` — btree(tenant_slug)

**Triggers:**
- `funnels_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies** (seit B.1, USING+WITH-CHECK Pattern):
- `funnels_select`, `funnels_insert`, `funnels_update`, `funnels_delete` (alle `authenticated`):
  ```sql
  tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  )
  ```
  (B.2 wird das durch direkten UUID-Lookup ersetzen.)
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
| `funnel_slug` | text | NO | — |
| `question_key` | text | NO | — |
| `title` | text | NO | — |
| `subtitle` | text | YES | — |
| `question_type` | `question_type` | NO | `'single_choice'` |
| `options` | jsonb | NO | `'[]'::jsonb` |
| `config` | jsonb | NO | `'{}'::jsonb` |
| `sort_order` | int4 | NO | `0` |
| `visible` | bool | YES | `true` |

**Foreign Keys:**
- `funnel_slug` → `funnels.slug`

**Check Constraints:** keine

**Indices:**
- `funnel_questions_pkey` — UNIQUE btree(id)
- `funnel_questions_funnel_slug_question_key_key` — **UNIQUE btree(funnel_slug, question_key)** (verhindert doppelte question_keys innerhalb eines Funnels)
- `idx_funnel_questions_funnel` — btree(funnel_slug, sort_order) (Listen-Query in Reihenfolge)

**Triggers:** keine

**RLS-Policies** (seit B.1):
- `funnel_questions_select`, `funnel_questions_insert`, `funnel_questions_update`, `funnel_questions_delete` (alle `authenticated`):
  ```sql
  funnel_slug IN (
    SELECT f.slug FROM public.funnels f
    JOIN public.tenants t ON t.slug = f.tenant_slug
    WHERE t.id IN (SELECT public.current_tenant_ids())
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

Eine Zeile pro abgeschickte Funnel-Submission. Das ist die CRM-Quelle. Aktuell 25 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | |
| `funnel_slug` | text | NO | — | |
| `tenant_slug` | text | NO | — | "Zeigt an, aus welchem slug/iFrame die Anfrage eingereicht wurde" |
| `contact_anrede` | text | YES | — | Legacy (vor `contact`-jsonb) |
| `contact_name` | text | NO | — | "Name des Anfragers" |
| `contact_email` | text | NO | — | "E-Mail Adresse des Anfragers" |
| `contact_phone` | text | NO | — | "Telefonnummer des Anfragers" |
| `contact` | jsonb | YES | — | Komplettes Kontakt-Objekt (neue Struktur) |
| `answers` | jsonb | NO | — | "Liste aller Antworten des Anfragers" |
| `lead_price` | numeric | YES | `0` | Snapshot zum Submission-Zeitpunkt |
| `source_url` | text | YES | — | |
| `user_agent` | text | YES | — | |
| `ip_address` | text | YES | — | |
| `customer_email_sent` | bool | YES | `false` | |
| `tenant_email_sent` | bool | YES | `false` | |
| `status` | text | NO | `'offen'` | CRM-Status (siehe Check) |
| `created_at` | timestamptz | YES | `now()` | |

**Foreign Keys:** keine (Snapshot-Design — `funnel_slug` und `tenant_slug` bleiben auch wenn Funnel/Tenant gelöscht wird)

**Check Constraints:**
- `submissions_status_check`:
  ```
  status IN ('offen', 'kontaktiert', 'abgeschlossen')
  ```

**Indices:**
- `submissions_pkey` — UNIQUE btree(id)
- `idx_submissions_funnel` — btree(funnel_slug, created_at)
- `idx_submissions_tenant` — btree(tenant_slug, created_at)

**Triggers:** keine

**RLS-Policies** (seit B.1):
- `submissions_select`, `submissions_update`, `submissions_delete` (alle `authenticated`):
  ```sql
  tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  )
  ```
- **Kein INSERT-Policy** → INSERT durch `/api/submit` (anonym, Service-Key)

---

### 3.6 `funnel_view_logs`

View-Tracking pro Funnel-Render. Aktuell 262 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| `id` | int8 | NO | `nextval('funnel_view_logs_id_seq')` |
| `funnel_slug` | text | NO | — |
| `tenant_slug` | text | NO | — |
| `viewed_at` | timestamptz | NO | `now()` |

**Foreign Keys:**
- `funnel_slug` → `funnels.slug`

**Check Constraints:** keine

**Indices:**
- `funnel_view_logs_pkey` — UNIQUE btree(id)
- `funnel_view_logs_tenant_month` — btree(tenant_slug, viewed_at) (für Monats-Aggregationen)

**Triggers:** keine

**RLS-Policies** (seit B.1 + Hotfix-Migration `20260527130000`):
- `funnel_view_logs_select` (SELECT, `authenticated`):
  ```sql
  tenant_slug IN (
    SELECT t.slug FROM public.tenants t
    WHERE t.id IN (SELECT public.current_tenant_ids())
  )
  ```
- `funnel_view_logs_delete` (DELETE, `authenticated`): gleiche Bedingung — für Cascade-Cleanup beim Funnel-Löschen
- **Kein INSERT/UPDATE-Policy** → INSERT durch `/api/track-view` (anonym, Service-Key)

---

### 3.7 `honeypot_triggers`

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
- `submissions` referenziert `funnel_slug` und `tenant_slug` ohne FK — Snapshot bleibt erhalten, auch wenn Quelle gelöscht wird.
- `submissions.lead_price` ist ebenfalls Snapshot — Preisänderungen wirken nicht rückwirkend.

### 4.4 JSONB für strukturierte Felder
- `funnels.contact_fields` — Definition der Kontaktformular-Felder
- `funnel_questions.options` — Antwortoptionen pro Frage
- `funnel_questions.config` — Frage-Type-spezifische Config
- `submissions.contact` — komplettes Kontakt-Objekt (neue Struktur)
- `submissions.answers` — `{ question_key: value }`

### 4.5 RLS-Schema (komplett, Stand B.1)
- **Alle 7 Tabellen** haben `rls_enabled = true`.
- **19 Policies** über 6 Tabellen (alle außer `honeypot_triggers`). Verteilung: tenants(3) + tenant_members(4) + funnels(4) + funnel_questions(4) + submissions(3) + funnel_view_logs(2) = 20 — aber `funnel_view_logs.update` fehlt absichtlich, daher 19.
- Helper `current_tenant_ids()` und `current_tenant_role(uuid)` werden in allen Policies referenziert (siehe §2).
- `honeypot_triggers` bleibt policy-frei (Bot-Telemetrie, nur Service-Key zulässig).
- `rls_auto_enable` Event-Trigger sorgt dafür, dass jede neue Tabelle in `public` automatisch RLS aktiv hat.

### 4.6 Sequences
- `funnel_view_logs.id` ist die einzige `bigint`-Tabelle mit `nextval()`. Alle anderen IDs sind UUIDs.

---

## 5. Stand der Schema-Evolution

17 Migrationen seit Projektbeginn:

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
20260527120000 — aufgabe_25_tenant_members_and_full_rls    ← Phase B.1
20260527130000 — aufgabe_25_add_funnel_view_logs_delete_policy  ← Hotfix B.1
```

### Geplante Migrationen (siehe roadmap.md Phase B)

1. **B.2 UUID-FKs** — `funnels.tenant_slug`/`funnel_questions.funnel_slug`/`funnel_view_logs.*_slug` → UUID-FKs; RLS-Slug-Walks durch direkte UUID-Joins ersetzen.
2. **B.3 Drop Legacy `submissions.contact_*`** — alles über `contact` jsonb.
3. **B.4 `tenants` schlanker** — `notification_email`, `public_email`, `public_phone`, `address` droppen; `funnels.notification_email` wird Pflicht.
4. **B.5 `pages` + `fields`** — Page → 1:N Refactor; Kontaktfelder werden reguläre Field-Types.
5. **B.6 Webhook-Schema** — `webhook_subscriptions` + `webhook_delivery_attempts` (nur Struktur).
6. **B.7 Updated-At-Konsistenz** — Trigger auf alle relevanten Tabellen.

---

## 6. Regenerieren

Bei jeder neuen Migration:

1. Migration applizieren (über Supabase Branch, dann Merge — siehe CLAUDE.md §13)
2. Dieses File neu generieren via Supabase MCP. Queries:
   - `list_tables(verbose=true)` für Spalten + FKs + Comments
   - `execute_sql` gegen `pg_indexes`, `pg_policies`, `pg_proc`, `information_schema.triggers`, `pg_constraint` für den Rest
3. Header (Stand-Datum + letzte Migration) aktualisieren
