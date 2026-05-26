# Supabase Schema — Technische Vollreferenz

> **Auto-generierte Maschinen-Wahrheit** der aktuellen DB-Struktur.
> Generiert direkt aus `pg_catalog` / `information_schema` via Supabase MCP.
>
> Für architektonisches Verständnis und Zweck der Tabellen: siehe [`project-overview.md`](project-overview.md) §4.
> Bei jeder neuen Migration: dieses File neu regenerieren.

- **Stand:** 2026-05-26
- **Letzte Migration:** `20260522192429_add_stripe_fields_to_tenants`
- **Tabellen:** 6 in `public` (alle mit RLS aktiviert)
- **Enums:** 2 (`billing_model_type`, `question_type`)
- **Functions:** 3 — **Triggers:** 2 — **Views:** 0

---

## ⚠️ RLS-Architektur (kritisch zu verstehen)

Alle Tabellen haben `rls_enabled = true`. Aber:

- **RLS-Policies existieren NUR für `SELECT`-Operationen.**
- **Es gibt KEINE Policies für INSERT, UPDATE, DELETE.**
- Schreibende Operationen laufen ausnahmslos **server-side über den Service-Key-Client** (`lib/supabase/admin.ts`), der RLS umgeht.
- Der reguläre User-Client (`lib/supabase/client.ts`, `lib/supabase/server.ts`) kann nur **lesen**, was die SELECT-Policies erlauben — und das ist immer "Daten des eigenen Tenants" (außer `honeypot_triggers`, das hat gar keine Policy → komplett blockiert für User).

**Daraus folgt:**
- Jeder INSERT/UPDATE/DELETE auf eine dieser Tabellen MUSS in einer API-Route mit Service-Key passieren.
- Auth-Prüfung passiert manuell in den API-Routes (z.B. "ist der eingeloggte User der Owner dieses Tenants?"), nicht durch die DB.
- Tenant-Identity wird über `tenants.auth_user_id = auth.uid()` aufgelöst — dies ist das Herz aller RLS-Policies.

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

---

## 2. Functions

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

**RLS-Policies:**
- `tenant_own_record` (SELECT): `auth.uid() = auth_user_id`
- **Keine INSERT/UPDATE/DELETE Policy** → Schreibzugriff nur via Service-Key

---

### 3.2 `funnels`

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

**RLS-Policies:**
- `tenant_own_funnels` (SELECT):
  ```sql
  tenant_slug = (SELECT slug FROM tenants WHERE auth_user_id = auth.uid())
  ```
- **Öffentliche Lesbarkeit für das Widget**: läuft NICHT über RLS, sondern über den Service-Key in `getTenantConfig()`. Anonymous Endbenutzer haben keine RLS-Berechtigung — der Server stellt die Daten bereit.
- **Keine INSERT/UPDATE/DELETE Policy** → Schreibzugriff nur via Service-Key

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

### 3.3 `funnel_questions`

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

**RLS-Policies:**
- `tenant_own_funnel_questions` (SELECT):
  ```sql
  funnel_slug IN (
    SELECT slug FROM funnels
    WHERE tenant_slug = (SELECT slug FROM tenants WHERE auth_user_id = auth.uid())
  )
  ```
- **Keine INSERT/UPDATE/DELETE Policy** → Schreibzugriff nur via Service-Key

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

### 3.4 `submissions`

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

**RLS-Policies:**
- `tenant_own_submissions` (SELECT):
  ```sql
  tenant_slug = (SELECT slug FROM tenants WHERE auth_user_id = auth.uid())
  ```
- **Keine INSERT/UPDATE/DELETE Policy** → INSERT durch `/api/submit` (Service-Key), UPDATE durch `/api/leads/[id]` (Service-Key)

---

### 3.5 `funnel_view_logs`

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

**RLS-Policies:**
- `tenant_own_view_logs` (SELECT):
  ```sql
  tenant_slug = (SELECT slug FROM tenants WHERE auth_user_id = auth.uid())
  ```
- **Keine INSERT/UPDATE/DELETE Policy** → INSERT durch `/api/track-view` (Service-Key)

---

### 3.6 `honeypot_triggers`

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
- Spalten `created_at` (default `now()`) und `updated_at` (default `now()`) auf `tenants` und `funnels`.
- Trigger `update_updated_at()` setzt `updated_at` bei jedem UPDATE neu.
- Andere Tabellen haben das Pattern (noch) **nicht** — `funnel_questions`, `submissions`, `funnel_view_logs`, `honeypot_triggers` haben keinen Updated-At-Trigger.

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

### 4.5 RLS-Schema (komplett)
- **Alle 6 Tabellen** haben `rls_enabled = true`.
- **5 SELECT-Policies** existieren — alle auflösen auf `auth.uid()` → `tenants.auth_user_id` → `tenants.slug` → Daten.
- **0 INSERT/UPDATE/DELETE-Policies** — schreibender Zugriff geht **ausnahmslos** über Service-Key.
- `rls_auto_enable` Event-Trigger sorgt dafür, dass jede neue Tabelle in `public` automatisch RLS aktiv hat.

### 4.6 Sequences
- `funnel_view_logs.id` ist die einzige `bigint`-Tabelle mit `nextval()`. Alle anderen IDs sind UUIDs.

---

## 5. Stand der Schema-Evolution

15 Migrationen seit Projektbeginn:

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
20260522192429 — add_stripe_fields_to_tenants  ← letzte
```

### Geplante Migrationen (siehe CLAUDE.md §5)

1. **`tenant_members`** — Junction-Table für Multi-User pro Tenant (Rollen: `owner | admin | member`). RLS-Policies umstellen von `auth_user_id` direkt auf `tenant_members`.
2. **`pages` + Refactor von `funnel_questions`** — Page → 1:N Fields. Bestehende 58 Fragen migrieren.
3. **Logic Jumps** — Branching-Logik pro Frage (separate Tabelle oder JSONB).
4. **Webhook-Hardening** — Tabellen `webhook_subscriptions` + `webhook_delivery_attempts` für Retry-fähige Lead-Exporte.

---

## 6. Regenerieren

Bei jeder neuen Migration:

1. Migration applizieren (über Supabase Branch, dann Merge — siehe CLAUDE.md §13)
2. Dieses File neu generieren via Supabase MCP. Queries:
   - `list_tables(verbose=true)` für Spalten + FKs + Comments
   - `execute_sql` gegen `pg_indexes`, `pg_policies`, `pg_proc`, `information_schema.triggers`, `pg_constraint` für den Rest
3. Header (Stand-Datum + letzte Migration) aktualisieren
