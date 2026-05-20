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

- **Icon Picker für Admin Funnel-Creator** – `app/admin/new/IconPicker.tsx` (neu): Dropdown öffnet nach oben via `position: fixed` + `getBoundingClientRect()`. Seitenscroll aktualisiert Position statt zu schließen. 11 Kategorien mit 131 kuratierten Lucide-Icons (nur handwerksrelevante). Kategorie-Filter-Tabs + Freitextsuche. `app/admin/new/page.tsx`: IconPicker je Option eingebunden, `icon_key` wird beim Speichern übergeben. (`app/admin/new/IconPicker.tsx`, `app/admin/new/page.tsx`)

- **Funnel-Kacheln Redesign** – Conversion-optimiertes Kachel-Design: Unselected-State jetzt mit Primärfarbe ausgefüllt (weißes Icon + Label). Hover: Scale-up 1.05 + Active Squish 0.9 (ersetzt alten Border-Hover). Multiple-Choice Selected: weißer Checkmark-Kreis (Primärfarben-Haken) oben rechts, kein Farb-Invert. Subtile Card-Shadow für Abhebung vom weißen Hintergrund. Submit-Button Opacity 0.5→0.65. (`components/funnel.tsx`)

- **Admin Funnel-Creator** – Vollständige Admin-UI zum Anlegen von Tenant + Funnel ohne SQL-Zugriff. `/admin/new`: Formular mit 3 Sektionen (Kunde, Funnel, Fragen). Alle Fragetypen: `single_choice`, `multiple_choice`, `slider`, `short_text`, `long_text`. Pflichtfeld-Toggle für alle Typen. Freitext-Typen mit Placeholder-Config. Vorschau ohne DB-Schreibzugriff via `localStorage` → `/admin/preview`. Slug-Autogenerierung aus Firmennamen. Speichern → Redirect zu `/admin/[slug]`. `POST /api/admin/create-funnel` mit Service Key für atomisches Insert. `app/admin/page.tsx`: "Neuer Kunde"-Button + "Mein Dashboard"-Link (öffnet in neuem Tab). (`app/admin/new/page.tsx`, `app/admin/preview/page.tsx`, `app/api/admin/create-funnel/route.ts`, `app/admin/page.tsx`)

- **SaaS Phase 2 – Signup, Auth-Flow, Account-Seite** – Vollständiger E-Mail-Registrierungs-Flow mit Bestätigungs-Mail via Resend SMTP. `app/signup/page.tsx` (neu): signUp() + Confirmation-Screen. `app/auth/confirm/route.ts` (neu): server-seitiger token_hash-Handler via verifyOtp() — kein PKCE-Verifier nötig, funktioniert geräteübergreifend. `app/auth/callback/page.tsx` (neu, ersetzt route.ts): OAuth-Code-Exchange (Google). `middleware.ts` → `proxy.ts` umbenannt (Next.js 16 Kompatibilität). `lib/supabase/admin.ts` (neu): Service-Key-Client für RLS-Bypass. Dashboard-Layout: Tenant-Anlage automatisch beim ersten Login via Admin-Client (public_email, notification_email, slug-Generierung). Account-Seite neu gebaut: nur auth.users-Daten (E-Mail readonly, Anzeigename, Telefon, Passwort). Account-Button in Navbar verschoben (Zahnrad-Icon, Primärfarbe), Logout als Ghost-Button. `context/saas-architektur.html` komplett überarbeitet. `context/workflows.html` (neu): alle Workflows dokumentiert. (`app/signup/`, `app/auth/confirm/`, `app/auth/callback/page.tsx`, `app/dashboard/account/`, `app/dashboard/layout.tsx`, `app/dashboard/TabNav.tsx`, `lib/supabase/admin.ts`, `lib/supabase/client.ts`, `proxy.ts`, `context/workflows.html`, `context/saas-architektur.html`)

- **Statistiken-Optimierungen + funnel_view_logs** – DB-Tabelle `funnel_view_logs` (funnel_slug, tenant_slug, viewed_at) + RLS-Policy. `track-view`-Route schreibt jetzt pro View einen Log-Eintrag. Statistiken-Seite zeigt nur gefüllte Monate, neuer DonutChart (SVG, Conversion), MonthlyTable mit aufklappbaren Zeilen + Mini-Donut pro Monat. Embed-Seite: Spacing-Fix (`mt-2`). (`app/api/track-view/route.ts`, `app/dashboard/statistiken/page.tsx`, `app/dashboard/statistiken/DonutChart.tsx`, `app/dashboard/statistiken/MonthlyTable.tsx`, `app/dashboard/embed/page.tsx`)
- **Tenant-Portal Erweiterungen** – Admin-Chart 21→14 Tage. TabNav + neuer Statistiken-Tab (`/dashboard/statistiken`): MonthlyLeadsChart (12 Monate), 4 StatTiles (Leads/Aufrufe/Conversion/Ø pro Monat), Monatstabelle. Embed-Seite um 3-Schritt-Anleitung ergänzt (allgemein, nicht tool-spezifisch). (`app/dashboard/TabNav.tsx`, `app/dashboard/statistiken/**`, `app/dashboard/embed/page.tsx`, `app/admin/DailyLeadsChart.tsx`, `app/admin/page.tsx`)
- **SaaS Phase 2 – Schritt 4: Tenant-Portal /dashboard** – `app/dashboard/layout.tsx` (Auth-Guard via Supabase Session, "Kein Zugang"-Fallback, Header mit Firmenname), `TabNav.tsx` (aktiver Tab via usePathname), `page.tsx` (StatTiles: Leads 30 Tage/Aufrufe/Conversion; Leads-Tabelle via RLS), `embed/page.tsx` (Embed-Code mit EmbedBlock aus Admin wiederverwendet). Alle Queries nutzen anon-key + RLS — Tenant sieht automatisch nur eigene Daten. (`app/dashboard/**`)
- **SaaS Phase 2 – Schritt 3: DB-Migration auth_user_id + RLS** – `tenants.auth_user_id` (UUID, nullable, unique index) hinzugefügt. RLS war bereits aktiv. 4 SELECT-Policies angelegt: `tenant_own_record` (tenants), `tenant_own_funnels` (funnels), `tenant_own_funnel_questions` (funnel_questions — im ursprünglichen Plan vergessen, gefixt), `tenant_own_submissions`. Superadmin-Code nutzt Service Key → umgeht RLS automatisch. Migration via Supabase MCP (`add_auth_user_id_and_rls_policies`).
- **SaaS Phase 2 – Schritt 2: Supabase Auth** – `@supabase/ssr` installiert. `lib/supabase/client.ts` (Browser) + `server.ts` (SSR) erstellt. `middleware.ts` ersetzt `proxy.ts` — schützt `/admin` (Superadmin-Email via `SUPERADMIN_EMAIL`) + `/dashboard` (jeder eingeloggte User). `app/login/page.tsx` (Email/Passwort + Google OAuth), `app/auth/callback/route.ts` (OAuth-Code-Exchange), `app/logout/route.ts` auf Supabase `signOut()` umgestellt. `proxy.ts` + `app/locked/` gelöscht. Neue Env-Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPERADMIN_EMAIL`. (`middleware.ts`, `lib/supabase/**`, `app/login/**`, `app/auth/**`, `app/logout/route.ts`, `.env.example`)
- **SaaS Phase 2 – Schritt 1: /dashboard → /admin** – Superadmin-Bereich von `/dashboard` nach `/admin` umgezogen. Alle 18 Dateien in `app/dashboard/` nach `app/admin/` verschoben (git erkennt Renames), interne Links angepasst, `app/page.tsx` + `app/locked/page.tsx` + `proxy.ts` + `app/api/track-view/route.ts` aktualisiert. `/dashboard` ist jetzt frei für das Tenant-Portal (Schritt 4). (`app/admin/**`, `app/page.tsx`, `app/locked/page.tsx`, `proxy.ts`, `app/api/track-view/route.ts`)

- **Aufgabe 15 – Design System** – `components/ui/` mit Card, Badge, Button, Input/Select, StatTile. Design-Token und Verwendungsregeln in `CLAUDE.md` (Abschnitt "Design System"). (`components/ui/Card.tsx`, `components/ui/Badge.tsx`, `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/StatTile.tsx`, `CLAUDE.md`)

- **Aufgabe 14 – Globale Leads-Übersicht** – Neue Seite `/dashboard/leads`: alle Submissions aller Tenants. Tab-Navigation im Header (Funnels | Leads). Tenant-Filter, Freitextsuche, Standard-CSV-Export, einklappbare Detailzeilen. (`app/dashboard/leads/page.tsx`, `app/dashboard/leads/LeadsView.tsx`, `app/dashboard/page.tsx`)

- **DB-Cleanup Tenant-Konsolidierung** – Alle Demo-Funnels unter einen `demo`-Tenant zusammengeführt. `klartext-demo` → `demo-klartext` umbenannt + von `leadplug` zu `demo` verschoben (inkl. Submission-Snapshot). `singotec-demo`-Funnel + `singotec`-Tenant gelöscht. 7 leere Einzel-Demo-Tenants (`bad-demo`, `dach-demo` etc.) gelöscht. Nur noch 2 Tenants in der DB: `demo` + `leadplug`.

- **Aufgabe 13 – Dashboard-Previews, DB-Cleanup & Billing-Enum** – `/dashboard/[slug]`: Funnel/Kontaktformular/Success-Vorschau als einklappbare Blöcke. `initialSubmitted` + `initialStep` Props in `funnel.tsx`. `plz`-Typ + Validierung. DB: `billing_model` als PostgreSQL-Enum, `billing_price`, `lead_price`, `contact` JSONB in `submissions`. (`components/funnel.tsx`, `lib/`, `types/index.ts`, `app/api/submit/route.ts`, `app/dashboard/[slug]/`)

- **Aufgabe 12 – Shadow-System (Widget)** – Kacheln: zweischichtiger Shadow, Farbglow bei Selected. Outer Card: weiches Shadow-Prinzip. Progress Bar `h-2`. Slider-Thumb mit Farbring. (`components/funnel.tsx`, `app/globals.css`)
