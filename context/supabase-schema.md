# Supabase Schema — Technische Vollreferenz

> **Auto-generierte Maschinen-Wahrheit** der aktuellen DB-Struktur.
> Generiert direkt aus `pg_catalog` / `information_schema` via Supabase MCP.
>
> Für architektonisches Verständnis und Zweck der Tabellen: siehe [`architecture.md`](architecture.md) §4.
> Bei jeder neuen Migration: dieses File neu regenerieren.

- **Stand:** 2026-06-11 (nach Aufgabe 58 — Logik-Sprünge)
- **Letzte angewendete Migration:** `aufgabe_58_funnel_logic_rules` (2026-06-11)
- **Tabellen:** 13 in `public` (alle mit RLS aktiviert)

> **Aufgaben 54–57 Migrationen (2026-06-09/10):**
> - `aufgabe_54_replace_funnel_content_rpc` (54): RPC `replace_funnel_content(p_funnel_id, p_pages, p_fields)` — atomares Funnel-Speichern mit Page-UUID-Upsert (SECURITY INVOKER, EXECUTE nur authenticated). Plus partial Index `idx_submissions_ip_completed` (Rate-Limiter zählt nur completed).
> - `aufgabe_54b_advisor_hardening` (54b): EXECUTE auf `rls_auto_enable()` für public/anon/authenticated revoked; `update_updated_at()` mit gepinntem `search_path`.
> - `aufgabe_56_design_toggles` (56): `funnels` + `show_progress_bar` / `show_step_badge` (boolean NOT NULL DEFAULT true) + `title_alignment` (text NOT NULL DEFAULT 'left', CHECK left/center).
> - `aufgabe_57a_drop_submit_button_label` (57A): `funnels.submit_button_label` GEDROPPT (tot seit 52D; DOWN mit Snapshot-Restore der 2 Werte).
> - `aufgabe_57b_email_test_logging` (57B): `email_delivery_attempts.is_test boolean NOT NULL DEFAULT false` — Test-Sends aus dem Editor landen als Row (submission_id NULL, Status terminal) in der Versand-Historie.
> - `aufgabe_57d_hide_contact_warning` (57D): `funnels.hide_contact_warning boolean NOT NULL DEFAULT false` — Kontaktierbarkeits-Warnung im Editor pro Funnel quittierbar (PATCH `/contact-warning`).
> - `aufgabe_58_funnel_logic_rules` (58, 2026-06-11): **neue Tabelle `funnel_logic_rules`** — Logik-Sprünge pro Step. Spalten: `id`, `funnel_id` (FK CASCADE), `tenant_id` (FK CASCADE, für billige RLS), `source_page_id` (FK pages CASCADE), `sort_order`, `is_fallback`, `conditions` jsonb (`[{field_key, op (eq|neq|includes|contains|gt|gte|lt|lte), value}]` UND-verknüpft, Ops app-seitig whitelisted; Vergleich trim/ci/numerisch-tolerant), `target_type` (CHECK page/end), `target_page_id` (FK pages SET NULL), `created_at`/`updated_at` (+Trigger). 3 Indizes (funnel · source+sort_order · UNIQUE partial: max 1 Fallback pro Step), 4 tenant-scoped RLS-Policies, CHECKs (fallback ohne conditions, conditions ist Array). Plus RPC `replace_page_logic_rules(uuid, uuid, jsonb)` — SECURITY INVOKER, atomares Ersetzen der Regeln eines Steps, EXECUTE nur authenticated. Nur Vorwärts-Sprünge (app-seitig erzwungen).

> **Aufgabe 52 Migrationen (2026-06-06):**
> - `aufgabe_52_drop_footer_columns` (52B): `funnels.footer_company_name/email/phone/text` GEDROPPT (Footer abgeschafft).
> - `aufgabe_52d_delete_orphaned_submit_pages` (52D): `DELETE FROM pages WHERE page_type='submit'` — 12 orphaned Submit-Pages + 52 Fields (via `fields.page_id` ON DELETE CASCADE). Reines Data-Cleanup; Kontaktformular abgeschafft, der Code ignoriert submit-Pages.
> - `aufgabe_52d_drop_skip_submit_step` (52D): `ALTER TABLE funnels DROP COLUMN skip_submit_step` — **angewendet 2026-06-06 nach dem Code-Deploy** (verifiziert: Spalte weg, Widget lädt auf Prod sauber). UP+DOWN im Repo.

> **Aufgabe 46 Migration `aufgabe_46_submissions_notes` (2026-06-01):** `submissions.notes text NULL` — freie interne CRM-Notiz pro Lead. Additiv, kein Backfill, kein CHECK (Längen-Cap app-seitig). Status-Workflow (`submissions.status`) unverändert, nur UI-Relabel auf Neu/Kontaktiert/Erledigt.
> _(Hinweis: Header-Migrationsliste in §5 ist nicht lückenlos nachgepflegt — `aufgabe_43_funnel_tracking` + dieses 46 sind in den Tabellen-Sektionen erfasst.)_
- **Enums:** 4 (`billing_model_type`, `page_type`, `field_type`, `tenant_member_role`)
- **Functions:** 5 — **Triggers:** 7 — **Views:** 0

> **Aufgabe 41 Polish-Migration `aufgabe_41_custom_recipient` (2026-05-31 abends):**
> - `email_subscriptions.recipient_type` CHECK-Constraint erweitert auf `IN ('customer','tenant','custom')`.
> - Neue Spalte `email_subscriptions.recipient_value text NULL` für Custom-Adressen (comma-separated, bis 3 Adressen, App-side enforced).
> - Neuer CHECK `email_subscriptions_custom_has_recipient`: bei `recipient_type='custom'` muss `recipient_value` gefüllt sein (`length(trim) > 0`).
> - Additive Migration, kein Backfill (24 Bestands-Subs hatten recipient_type ∈ customer/tenant, bleiben unverändert gültig).
>
> **Aufgabe 41 Initiale Migration `aufgabe_41_email_subscriptions` (2026-05-31 morgens):**
> - **Neue Tabelle `email_subscriptions`** — pro Funnel N Drip-Mails. Spalten: `id`, `funnel_id` (FK funnels ON DELETE CASCADE), `tenant_id` (FK tenants ON DELETE CASCADE), `name`, `recipient_type`, `delay_minutes` (CHECK >= 0, Default 0), `subject`, `body_html` (TipTap-Output), `from_local`, `is_active`, `created_at`, `updated_at`. Plus CHECK-Constraints für subject/body/name nicht-leer, 2 partial Indices (`funnel_id`, `funnel_active` WHERE is_active), updated_at-Trigger, 4 RLS-Policies (Select/Insert/Update/Delete).
> - **Neue Tabelle `email_delivery_attempts`** — Drip-Queue + Audit. Spalten: `id`, `subscription_id` (FK ON DELETE CASCADE), `submission_id` (FK ON DELETE SET NULL), `scheduled_at` NOT NULL (= completed_at + delay), `attempt_count` (Default 0), `status` (CHECK pending/retrying/success/failed), `last_error`, `resend_message_id`, `recipient_address`, `delivered_at`, `next_retry_at`, `created_at`. 4 Indices (subscription, submission, **due-pending** WHERE status=pending, **due-retrying** WHERE status=retrying), 1 SELECT-Policy.
> - **Backfill:** 24 Default-Subscriptions für 12 bestehende Funnels (Customer-Confirmation + Tenant-Notification, beide delay=0). Reproduziert das alte hartkodierte Mail-Verhalten 1:1.
>
> **Aufgabe 40 Erweiterungen (2026-05-29):**
> - `webhook_subscriptions` jetzt funnel-scoped (3 neue Spalten: `funnel_id NOT NULL`, `trigger_type` default `'on_submit'`, `trigger_page_id`) + CHECK + 2 neue Indices
> - `webhook_delivery_attempts` Inspector + Backoff (4 neue Spalten: `next_retry_at`, `response_status_code`, `response_body`, `event_type`) + 1 neuer partial Index `idx_webhook_delivery_retry_due`
> - `submissions.abandoned_webhook_fired_at` Cooldown-Marker für Cron + partial Index `idx_submissions_abandoned_pending`
>
> **Aufgabe 40 Polish-Migrationen (2026-05-29):**
> - `aufgabe_40_name_field_types`: 3 neue Enum-Values im `field_type` Enum (`first_name`, `last_name`, `full_name`) — Server mapped diese verlässlich ins contact-jsonb. Plus Aggregation: wenn first + last beide gesetzt → `contact.name = "first last"`.
> - `fix_submissions_tenant_slug_nullable`: `submissions.tenant_slug` von NOT NULL → NULLABLE. Latent-Bug seit Aufgabe 26 (Drop `tenants.slug`) — App-Code hatte keine Quelle mehr für die Spalte, alle Inserts schlugen mit Constraint-Violation fehl. Fix forward-only.

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
'question' | 'submit' | 'success' | 'custom' | 'welcome'
```
Verwendung: `pages.page_type`. Eingeführt mit `aufgabe_30a_pages_fields_add`; `custom` (Aufgabe 38) + `welcome` (Aufgabe 39) ergänzt. **`'submit'` ist seit Aufgabe 52D deprecated** — es werden keine Submit-Pages mehr erzeugt, bestehende wurden per Migration gelöscht. Der Enum-Wert selbst bleibt erhalten (kein Enum-Value-Drop).

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
> **Deprecated (Aufgabe 46 Phase 3)** — wird zusammen mit `funnels.total_views` per `aufgabe_46b_drop_total_views` nach dem Deploy gedroppt. `track-view` ruft sie nicht mehr auf.

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

### `replace_funnel_content(p_funnel_id uuid, p_pages jsonb, p_fields jsonb) → void`
**Atomares Funnel-Speichern (Aufgabe 54).** Wird von PUT `/api/tenant/funnels/[slug]` über den User-Client aufgerufen — ersetzt das frühere nicht-transaktionale delete-then-insert. `SECURITY INVOKER` (Default): alle Statements laufen unter den RLS-Policies des Aufrufers. `EXECUTE` granted für `authenticated`, revoked für `anon`/`public`. `search_path = public`.

Ablauf (eine Transaktion — jeder Fehler rollt alles zurück):
1. RLS-Backstop: Funnel muss für den Aufrufer sichtbar sein (sonst Exception).
2. Pages löschen, die im neuen Stand fehlen (CASCADE räumt deren Fields).
3. Pages **upserten** (`ON CONFLICT (id) DO UPDATE`) — bestehende Page-UUIDs bleiben über Saves stabil → `webhook_subscriptions.trigger_page_id`-Bindings (FK SET NULL) überleben das Speichern. `funnel_id` wird hart auf `p_funnel_id` gesetzt (Payload-Wert ignoriert).
4. Fields der verbleibenden Pages: delete + insert (keine Inbound-FKs auf `fields`; umgeht `UNIQUE(page_id, field_key)` bei Key-Renames).

Volltext: [`supabase/migrations/20260609120000_aufgabe_54_replace_funnel_content_rpc.sql`](../supabase/migrations/20260609120000_aufgabe_54_replace_funnel_content_rpc.sql) (DOWN-File daneben — beim Rollback erst den App-Code zurückrollen, der PUT ruft die Funktion).

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
| `billing_model` | `billing_model_type` | NO | `'per_month'` | Comment: "Abrechnungsmodell" |
| `lead_price` | numeric | YES | `3.00` | Comment: "Preis pro Lead in €" |
| `billing_price` | numeric | YES | — | Comment: "Preis pro Monat fix in €" |
| `stripe_customer_id` | text | YES | — | Comment: "Stripe Customer ID (cus_...)" |
| `stripe_subscription_id` | text | YES | — | Comment: "Stripe Subscription ID (sub_...)" |
| `stripe_subscription_status` | text | YES | — | CHECK (siehe unten) — Comment: "Letzter bekannter Subscription-Status von Stripe" |
| `stripe_price_id` | text | YES | — | Comment: "Stripe Price ID des aktiven Plans (price_...)" |
| `created_at` | timestamptz | YES | `now()` | |
| `updated_at` | timestamptz | YES | `now()` | wird via Trigger aktualisiert |

> **In Aufgabe 26 gedroppt:** `slug`, `auth_user_id`. **In Aufgabe 28 gedroppt:** `notification_email`, `public_email`, `public_phone`, `address`. **In Aufgabe 46c gedroppt:** `website`.

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
| `success_message` | text | YES | — |
| `response_message` | text | YES | — |
| `answers_overview_label` | text | YES | — |
| `privacy_text` | text | YES | — |
| `privacy_policy_url` | text | YES | — |
| `show_answers_overview` | bool | NO | `false` (Aufgabe 51) |
| `show_progress_bar` | bool | NO | `true` (Aufgabe 56: Anzeige-Schalter) |
| `show_step_badge` | bool | NO | `true` (Aufgabe 56: Anzeige-Schalter) |
| `title_alignment` | text | NO | `'left'` (Aufgabe 56, CHECK `left`/`center`) |
| `hide_contact_warning` | bool | NO | `false` (Aufgabe 57D: Editor-Warnung quittiert) |
| `redirect_url` | text | YES | — (Aufgabe 39: Redirect nach Submit statt Success-Page) |
| `meta_pixel_id` | text | YES | — (Aufgabe 43: Conversion-Tracking) |
| `google_ads_conversion` | text | YES | — (Aufgabe 43: Conversion-Tracking) |
| `notification_email` | text | NO | — |
| `email_sender_local` | text | YES | — |
| `primary_color` | text | YES | — |
| `text_color` | text | YES | — |
| `background_color` | text | YES | — |
| `page_background_color` | text | YES | — |
| `font` | text | YES | — |
| `border_radius` | text | YES | — |
| `max_width` | text | YES | — |
| `meta_pixel_id` | text | YES | — |
| `google_ads_conversion` | text | YES | — |
| `total_views` | int4 | NO | `0` | **Deprecated (Aufgabe 46 Phase 3).** App liest/schreibt nicht mehr — Aufrufe kommen jetzt ausschließlich aus `funnel_view_logs`. Wird per Migration `aufgabe_46b_drop_total_views` **nach dem Deploy** gedroppt (mit `increment_funnel_views`). |
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

Page-Hierarchie pro Funnel. Eingeführt mit Migration `aufgabe_30a_pages_fields_add` (Phase B.5). Pro Funnel (seit Aufgabe 52D): N × question/custom/welcome-Pages + 1 × success-Page — **keine submit-Page mehr** (Kontaktformular abgeschafft; orphaned Submit-Pages in 52D per Migration gelöscht). Aktuell 75 Zeilen.

**Columns:**

| Spalte | Typ | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `funnel_id` | uuid | NO | — | FK → `funnels.id` ON DELETE CASCADE |
| `page_type` | `page_type` | NO | — | question / custom / welcome / success (`submit` deprecated seit 52D) |
| `sort_order` | int4 | NO | — | CHECK >= 0. Step-Pages (question/custom/welcome) 0..N-1, Success-Page N |
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
| `abandoned_webhook_fired_at` | timestamptz | YES | NULL | **Aufgabe 40.** Cooldown-Marker für `/api/cron/webhook-retry`. NULL = abandoned-Webhook noch nicht gefeuert. Cron picked Rows wo `completed_at IS NULL AND abandoned_webhook_fired_at IS NULL AND created_at < NOW() - 10min`. |
| `notes` | text | YES | NULL | **Aufgabe 46.** Freie interne CRM-Notiz des Tenants zu diesem Lead. Editierbar über `/api/leads/[id]` PATCH (User-Client + RLS). Kein CHECK — Längen-Cap (~5000) app-seitig. |
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
- `idx_submissions_abandoned_pending` — **partial** btree(created_at) WHERE completed_at IS NULL AND abandoned_webhook_fired_at IS NULL (Aufgabe 40, Cron-Pick-Query)
- `idx_submissions_ip_completed` — **partial** btree(ip_address, created_at) WHERE completed_at IS NOT NULL (Aufgabe 54, Rate-Limiter-Query in `/api/submit` — zählt nur completed Submissions pro IP)

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

**Funnel-scoped Webhook-Endpoints** (Aufgabe 40, 2026-05-29 — vorher tenant-globale Subscriptions aus B.6). Pro Funnel 1..N Webhooks mit eigener Trigger-Konfiguration. Sender-Code live in [`lib/webhooks.ts`](../lib/webhooks.ts).

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints / Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `tenant_id` | uuid | NO | — | FK → `tenants.id` ON DELETE CASCADE. Bleibt für RLS-Performance (vermeidet Join via funnels) |
| `funnel_id` | uuid | **NO** | — | **Aufgabe 40.** FK → `funnels.id` ON DELETE CASCADE. App-Code muss tenant_id == funnel.tenant_id sicherstellen. |
| `name` | text | YES | — | **Aufgabe 49.** Anzeigename (z.B. „Pipedrive CRM"). Beim Insert aus URL-Host abgeleitet wenn leer (`deriveWebhookName`). Backfill bestehender Rows mit Host. |
| `url` | text | NO | — | CHECK: `LIKE 'http%' AND length(url) >= 10`. HTTPS empfohlen, http nur für lokale Tests. |
| `secret` | text | NO | — | CHECK: `length(secret) >= 16`. HMAC-Signing-Secret, app-generated. Format `whsec_<64-hex>`. |
| `event_types` | text[] | NO | `'{}'` | z.B. `{"submission.completed","submission.abandoned"}` für on_submit oder `{"step.advanced"}` für after_page. |
| `trigger_type` | text | **NO** | `'on_submit'` | **Aufgabe 40.** CHECK IN (`on_submit`, `after_page`). on_submit = bei /api/submit + Cron-Abbrecher. after_page = nach Step-Advance über `trigger_page_id`. |
| `trigger_page_id` | uuid | YES | — | **Aufgabe 40.** FK → `pages.id` ON DELETE SET NULL. Bei NULL und trigger_type='after_page': Sender skipped (UI zeigt „Trigger-Page entfernt, bitte neu konfigurieren"). |
| `is_active` | bool | NO | `true` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | via Trigger |

**Foreign Keys:**
- `tenant_id` → `tenants.id` ON DELETE CASCADE
- `funnel_id` → `funnels.id` ON DELETE CASCADE
- `trigger_page_id` → `pages.id` ON DELETE SET NULL

**Check Constraints:**
- `webhook_subscriptions_url_check`: `url LIKE 'http%' AND length(url) >= 10`
- `webhook_subscriptions_secret_min_length`: `length(secret) >= 16`
- `webhook_subscriptions_trigger_type_check`: `trigger_type IN ('on_submit','after_page')`

**Indices:**
- `webhook_subscriptions_pkey` — UNIQUE btree(id)
- `idx_webhook_subscriptions_tenant_id` — btree(tenant_id)
- `idx_webhook_subscriptions_active` — btree(tenant_id, is_active) **WHERE is_active = true** (partial)
- `idx_webhook_subscriptions_funnel_id` — btree(funnel_id) **(Aufgabe 40)**
- `idx_webhook_subscriptions_trigger_page` — btree(trigger_page_id) **WHERE trigger_page_id IS NOT NULL** (partial, Aufgabe 40)

**Triggers:**
- `webhook_subscriptions_updated_at` — BEFORE UPDATE → `update_updated_at()`

**RLS-Policies:**
- `webhook_subscriptions_select` (SELECT, `authenticated`): `tenant_id IN (SELECT current_tenant_ids())`
- `webhook_subscriptions_insert` (INSERT, `authenticated`): `current_tenant_role(tenant_id) IN ('owner','admin')`
- `webhook_subscriptions_update` (UPDATE, `authenticated`): `current_tenant_role(tenant_id) IN ('owner','admin')` (USING + WITH CHECK)
- `webhook_subscriptions_delete` (DELETE, `authenticated`): `current_tenant_role(tenant_id) = 'owner'` (nur Owner — Delete entfernt via CASCADE auch alle delivery_attempts)

---

### 3.9 `webhook_delivery_attempts`

Audit-Trail jeder Webhook-Zustellungs-Versuche. Append-only (kein UPDATE durch User-Client; Sender updated via Service-Key). Inspector-Felder aus Aufgabe 40.

**Columns:**

| Spalte | Typ | Nullable | Default | Constraints / Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK. Wird als `delivery_id` im Payload an Tenant geschickt → Dedup-Schutz auf Tenant-Seite. |
| `subscription_id` | uuid | NO | — | FK → `webhook_subscriptions.id` ON DELETE CASCADE |
| `submission_id` | uuid | YES | — | FK → `submissions.id` ON DELETE SET NULL (Audit bleibt erhalten) |
| `attempt_count` | int | NO | `1` | CHECK >= 1 |
| `status` | text | NO | `'pending'` | CHECK IN (`pending`, `retrying`, `success`, `failed`) |
| `last_error` | text | YES | — | Kurztext für UI-Inspector |
| `delivered_at` | timestamptz | YES | — | NULL bis erfolgreich |
| `next_retry_at` | timestamptz | YES | — | **Aufgabe 40.** Cron picked Rows mit `next_retry_at <= NOW()`. Stripe-Backoff: 1m/5m/30m/2h/6h. NULL bei success oder finalem failed. |
| `response_status_code` | int | YES | — | **Aufgabe 40.** HTTP-Code des letzten Versuchs (für Inspector). |
| `response_body` | text | YES | — | **Aufgabe 40.** Response-Body, app-side truncated auf 4000 Zeichen. |
| `event_type` | text | YES | — | **Aufgabe 40.** `submission.completed` / `submission.abandoned` / `step.advanced` / `webhook.test`. |
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
- `idx_webhook_delivery_attempts_retry_queue` — btree(created_at) **WHERE status IN ('pending','retrying')** (partial) — Legacy aus B.6, redundant zu neuem Index
- `idx_webhook_delivery_retry_due` — btree(next_retry_at) **WHERE status IN ('pending','retrying') AND next_retry_at IS NOT NULL** (partial, Aufgabe 40) — Cron-Retry-Queue

**Triggers:** keine (Append-only)

**RLS-Policies:**
- `webhook_delivery_attempts_select` (SELECT, `authenticated`): `subscription_id IN (SELECT id FROM webhook_subscriptions WHERE tenant_id IN (SELECT current_tenant_ids()))`
- **Kein INSERT/UPDATE/DELETE-Policy** — Schreibzugriff nur via Service-Key durch [`lib/webhooks.ts`](../lib/webhooks.ts) (Sender + Cron-Retry).

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
- `pages.config` — Page-spezifische Config jsonb. `welcome`: `{title, subtitle, page_key, button_label, visible}` · `custom`: `{title, subtitle, page_key, visible}` · `question`/`success`: leer. **`visible` seit Aufgabe 59** (Bugfix: Sichtbarkeit von Welcome-/Custom-Pages wurde vorher nie persistiert — Questions speichern sie am Field; Alt-Rows ohne Key gelten als sichtbar)
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
