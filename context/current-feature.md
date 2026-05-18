# Current Feature

Funnel Widget Platform – generischer Multi-Tenant iFrame Sales-Funnel für Handwerksbetriebe aller Branchen.

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

## History

- **SaaS Phase 2 – Schritt 4: Tenant-Portal /dashboard** – `app/dashboard/layout.tsx` (Auth-Guard via Supabase Session, "Kein Zugang"-Fallback, Header mit Firmenname), `TabNav.tsx` (aktiver Tab via usePathname), `page.tsx` (StatTiles: Leads 30 Tage/Aufrufe/Conversion; Leads-Tabelle via RLS), `embed/page.tsx` (Embed-Code mit EmbedBlock aus Admin wiederverwendet). Alle Queries nutzen anon-key + RLS — Tenant sieht automatisch nur eigene Daten. (`app/dashboard/**`)
- **SaaS Phase 2 – Schritt 3: DB-Migration auth_user_id + RLS** – `tenants.auth_user_id` (UUID, nullable, unique index) hinzugefügt. RLS war bereits aktiv. 4 SELECT-Policies angelegt: `tenant_own_record` (tenants), `tenant_own_funnels` (funnels), `tenant_own_funnel_questions` (funnel_questions — im ursprünglichen Plan vergessen, gefixt), `tenant_own_submissions`. Superadmin-Code nutzt Service Key → umgeht RLS automatisch. Migration via Supabase MCP (`add_auth_user_id_and_rls_policies`).
- **SaaS Phase 2 – Schritt 2: Supabase Auth** – `@supabase/ssr` installiert. `lib/supabase/client.ts` (Browser) + `server.ts` (SSR) erstellt. `middleware.ts` ersetzt `proxy.ts` — schützt `/admin` (Superadmin-Email via `SUPERADMIN_EMAIL`) + `/dashboard` (jeder eingeloggte User). `app/login/page.tsx` (Email/Passwort + Google OAuth), `app/auth/callback/route.ts` (OAuth-Code-Exchange), `app/logout/route.ts` auf Supabase `signOut()` umgestellt. `proxy.ts` + `app/locked/` gelöscht. Neue Env-Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPERADMIN_EMAIL`. (`middleware.ts`, `lib/supabase/**`, `app/login/**`, `app/auth/**`, `app/logout/route.ts`, `.env.example`)
- **SaaS Phase 2 – Schritt 1: /dashboard → /admin** – Superadmin-Bereich von `/dashboard` nach `/admin` umgezogen. Alle 18 Dateien in `app/dashboard/` nach `app/admin/` verschoben (git erkennt Renames), interne Links angepasst, `app/page.tsx` + `app/locked/page.tsx` + `proxy.ts` + `app/api/track-view/route.ts` aktualisiert. `/dashboard` ist jetzt frei für das Tenant-Portal (Schritt 4). (`app/admin/**`, `app/page.tsx`, `app/locked/page.tsx`, `proxy.ts`, `app/api/track-view/route.ts`)

- **Aufgabe 15 – Design System** – `components/ui/` mit Card, Badge, Button, Input/Select, StatTile. Design-Token und Verwendungsregeln in `CLAUDE.md` (Abschnitt "Design System"). (`components/ui/Card.tsx`, `components/ui/Badge.tsx`, `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/StatTile.tsx`, `CLAUDE.md`)

- **Aufgabe 14 – Globale Leads-Übersicht** – Neue Seite `/dashboard/leads`: alle Submissions aller Tenants. Tab-Navigation im Header (Funnels | Leads). Tenant-Filter, Freitextsuche, Standard-CSV-Export, einklappbare Detailzeilen. (`app/dashboard/leads/page.tsx`, `app/dashboard/leads/LeadsView.tsx`, `app/dashboard/page.tsx`)

- **DB-Cleanup Tenant-Konsolidierung** – Alle Demo-Funnels unter einen `demo`-Tenant zusammengeführt. `klartext-demo` → `demo-klartext` umbenannt + von `leadplug` zu `demo` verschoben (inkl. Submission-Snapshot). `singotec-demo`-Funnel + `singotec`-Tenant gelöscht. 7 leere Einzel-Demo-Tenants (`bad-demo`, `dach-demo` etc.) gelöscht. Nur noch 2 Tenants in der DB: `demo` + `leadplug`.

- **Aufgabe 13 – Dashboard-Previews, DB-Cleanup & Billing-Enum** – `/dashboard/[slug]`: Funnel/Kontaktformular/Success-Vorschau als einklappbare Blöcke. `initialSubmitted` + `initialStep` Props in `funnel.tsx`. `plz`-Typ + Validierung. DB: `billing_model` als PostgreSQL-Enum, `billing_price`, `lead_price`, `contact` JSONB in `submissions`. (`components/funnel.tsx`, `lib/`, `types/index.ts`, `app/api/submit/route.ts`, `app/dashboard/[slug]/`)

- **Aufgabe 12 – Shadow-System (Widget)** – Kacheln: zweischichtiger Shadow, Farbglow bei Selected. Outer Card: weiches Shadow-Prinzip. Progress Bar `h-2`. Slider-Thumb mit Farbring. (`components/funnel.tsx`, `app/globals.css`)
