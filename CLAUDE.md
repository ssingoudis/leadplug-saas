# CLAUDE.md — LeadPlug

> **Single Source of Truth.** Dieses File ist die verbindliche Wahrheit über Produkt, Architektur, Regeln. Memory-Files ergänzen, ersetzen es aber nicht.

---

## 1. Produkt & Positionierung

LeadPlug ist ein **SaaS-Funnel-Builder mit integriertem CRM** — vergleichbar mit Typeform / FormFlow, aber mit nachgelagertem Lead-Posteingang und Sales-Stack. Verkauft an **Agenturen und Marketer**, die Funnels für ihre eigenen Endkunden (z.B. Solar-Betriebe, Anwälte, Coaches, aber auch jede andere denkbare branche, es gibt keine begrenzung der branchen) bauen.

**Was LeadPlug NICHT ist:**
- Kein Funnel-Tool, das End-Betriebe direkt selbst bedienen
- Kein AI-Funnel-Generator (kein Race-to-the-Bottom im austauschbaren AI-Hype)
- Kein Website-Builder. Branding läuft über **funnel-weite Theme-Variablen** (Brand-Color, Font, Border-Radius, Background, Logo) — nicht über Per-Element-Styling-Editoren wie bei FormFlow/Webflow

**Architektur-Kern:**
- Einbettbares iFrame-Widget pro Funnel (`https://app.leadplug.de/[slug]`) als Standard-Einbindung
- Script- / Web-Component-Embed als **geplantes Pro-Plan-Feature (v2, post-MVP)** — nahtlose Integration ohne iFrame-Sandbox
- Multi-Tenant Editor + Dashboard für Agenturen
- Lead-Posteingang mit Status-Workflow (`offen` → `kontaktiert` → `abgeschlossen`)
- Webhook-Export für externe CRMs (HubSpot, Pipedrive, Close, etc.)

**Tech-Stack:**

| Layer | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Sprache | TypeScript (strict) |
| Styling | TailwindCSS |
| DB / Auth | Supabase (Postgres, RLS, Auth) |
| Billing | Stripe (Subscription) |
| E-Mail | Resend + React Email |
| Deployment | Vercel |

---

## 2. Zielgruppe & Tenant-Modell

```
Tenant (= Agentur, zahlender Account)
├── N User (Team-Mitglieder via tenant_members)
└── N Funnels (für die Endkunden der Agentur)
```

**Regeln:**
- **Tenant = Workspace.** Kein separater Workspace-Layer.
- **Multi-User-Backend wird vorbereitet** (Junction-Table `tenant_members` mit Rollen `owner | admin | member`); UI für Invites kommt nach MVP.
- **Endkunden der Agenturen haben keinen Login** im MVP. Whitelabel-Endkunden-Portal ist v2-Feature für Pro-Plan.

---

## 3. Pricing-Strategie

Drei Tiers pro Tenant (Agentur). Preise sind Richtwerte:

| Plan | Preis | Beinhaltet |
|---|---|---|
| **Webhook** | ~29€/Monat | Unlimited Funnels, Leads → externes CRM, 1 User |
| **Standard** | ~99€/Monat | Webhook + integrierter Lead-Posteingang + ~3 User |
| **Pro** | ~249€/Monat | Standard + Twilio (Telefonie/Audio/Auto-Summary) + Kanban + unlimited User |

**Hintergrund:** Agenturen sitzen oft auf etablierten CRMs (HubSpot/Pipedrive) und wechseln nie — Webhook-Tier eliminiert Migrations-Friction als günstiger Einstieg. Voll-CRM ist Upsell für neue Use-Cases.

---

## 4. GTM-Strategie & MVP-Definition

**Pre-Launch — bevorzugter Einstieg:** Strategische Partnerschaft mit **einem Domain-Marktführer** (z.B. etablierte Solar-Agentur, Anwalts-Funnel-Agentur, Versicherungs-Marketer — egal welche Branche, Hauptsache hat eigene Kunden + Werbebudget).

**Was die Partnerschaft uns bringt:**
- Echte Kunden des Partners testen und validieren das Produkt mit echten Daten
- Werbebudget des Partners liefert uns Conversion-Daten ohne eigene Marketing-Kosten
- Glaubwürdigkeit-Boost über etablierten Kanal

**Langfristige Logik:** Wir bleiben nicht für immer abhängig vom Partner. Ziel ist eigene direkte Akquise auf Basis der gewonnenen Validierungs- und Conversion-Daten. Der Partner ist Türöffner, nicht Dauerlösung.

**Direkte Akquise** ist nicht ausgeschlossen — wenn sich zahlende Kunden auf anderem Weg ergeben, ist das willkommen. Aber sie ist nicht der primäre Pre-Launch-Fokus.

**MVP = "fertig"** wenn folgendes gilt:
- Du kannst mit gutem Gewissen einer etablierten Agentur ein 15-Min-Demo geben
- Größtenteils funktional, nicht perfekt
- Reliability > Feature-Breite
- Builder fühlt sich nicht peinlich an im Vergleich zu Typeform/FormFlow

---

## 5. Builder-Richtung (Architektur-Entscheidung)

**Festgelegt:** Funnel-Builder bleibt **linear / Typeform-Stil**. **KEIN Node-Canvas, KEIN React Flow**. Bei "lass uns Canvas einbauen"-Impulsen: an diese Entscheidung erinnern und nach konkretem Kunden-Bedarf fragen.

**Geplante Verbesserungen (in Reihenfolge):**
1. Schema-Refactor: Page → 1:N Fields (eine Page hat mehrere Felder + Submit)
2. Pages + Layers Tab im Editor (Hierarchie-Sicht)
3. Theme-Panel exponiert vorhandene CSS-Vars (Brand-Color, Font, Radius, Logo)
4. Mehr Feldtypen (Email, Telefon, Date, Number, Dropdown, Checkbox)
5. **Logic Jumps** (per Frage: "springe zu X wenn Antwort = Y") — Branching ohne Canvas
6. Webhook-Export hardening (Retry, Signatur, Dead-Letter)
7. Antwortoptionen-UX-Polish

**Nicht geplant für MVP** (kommt potenziell in v2 / Pro-Roadmap):
- Per-Element-CSS-Editor
- Script- / Web-Component-Embed (nahtlose Integration ohne iFrame)
- File-Upload, Signature, Calculator/Scoring-Felder
- A/B-Tests
- Twilio (Telefonie, Audio-Aufzeichnung, Auto-Summaries), Kanban-Board, Call-Dialer

---

## 6. Doku-Index

- [`context/project-overview.md`](context/project-overview.md) — Architektur, Code-Struktur, DB-Schema, API-Routes
- [`context/supabase-schema.md`](context/supabase-schema.md) — vollständige technische DB-Referenz (Enums, Tables, RLS, Indices, Functions)
- [`context/roadmap.md`](context/roadmap.md) — granulare Code-Aufgaben (Phasen A-E, Sub-Nummern B.1, B.2, …) — primäre Arbeitsquelle für Claude
- [`context/saas-phasenplan.html`](context/saas-phasenplan.html) — visuelle High-Level Phasen-Übersicht mit Status-Badges (Phasen 1-6) — vom User selbst gepflegt
- [`context/current-feature.md`](context/current-feature.md) — laufende Arbeit + Aufgaben-History (chronologisch)
- [`context/history-archive.md`](context/history-archive.md) — ältere Aufgaben (archiviert)
- [`context/design-system.md`](context/design-system.md) — UI-Komponenten Dashboard + Tenant-Portal
- [`context/tenant-funnel-editor.html`](context/tenant-funnel-editor.html) — Editor-Struktur (EditorState, Save-Flow)
- [`context/funnel-funktionsweise.html`](context/funnel-funktionsweise.html) — UI-Konzept des öffentlichen Widgets (vorübergehend — wird in Phase B.5 obsolet)
- [`context/workflows.html`](context/workflows.html) — Auth-Workflows (Signup, Login, Session, Navigation)
- [`context/resize-erklaerung.html`](context/resize-erklaerung.html) — iFrame-postMessage-Mechanik

---

## 7. Git-Workflow

Vor jeder Code-Aufgabe einen eigenen Branch erstellen:
```
git checkout -b feature/aufgabe-[nummer]-[kurzname]
```
Beispiele: `feature/aufgabe-25-schema-refactor`, `feature/aufgabe-26-pages-fields`

**Merges immer mit `--no-ff`** in `main` — erzeugt expliziten Merge-Commit, ermöglicht sauberen Rollback via `git revert -m 1 <merge-commit>`.

**Ausnahme:** Reine Dokumentations-Änderungen (keine Code-Dateien) brauchen keinen eigenen Branch.

---

## 8. Arbeits-Regeln (verbindlich für Claude / AI)

**Top-Prio: Sicherheit des Codes. Das Produkt darf nicht kaputt gehen.**

- 🚫 **Raten ist verboten.** Bei Unsicherheit IMMER nachfragen — egal wie banal sich die Frage anfühlt. Lieber eine Frage zu viel als eine falsche Annahme.
- 🚫 **Nie ungefragt Dependencies hinzufügen.** Neue Pakete brauchen explizite Freigabe.
- 🚫 **Niemals `--force` push, `git reset --hard`, `git branch -D`** ohne explizite Aufforderung.
- 🚫 **Keine Production-DB-Änderungen ohne explizite Bestätigung.** Schema-Migrationen über `mcp__supabase__create_branch` testen, erst dann mergen.
- 🚫 **Stripe-Änderungen immer erst im Test-Modus.** Live-Modus nur auf explizite Aufforderung.
- ✅ **Migrationen liefern immer Rollback-Strategie** (UP + DOWN oder klar dokumentierter manueller Rollback-Pfad).
- ✅ **Nach jeder abgeschlossenen Aufgabe** einen Eintrag in `context/current-feature.md` anfügen.

---

## 9. Code-Qualitäts-Prinzipien

| Prinzip | Was es konkret heißt |
|---|---|
| **Sicherheit** | Alle User-Inputs am API-Boundary validieren. `lead_price`, Auth, Tenant-Zugehörigkeit nie aus Client lesen. Supabase Service Key nur server-side, nie mit `NEXT_PUBLIC_`-Prefix. |
| **Robustheit** | Kein `any` / `as` ohne Begründung. Fehler in Tracking/E-Mail loggen, **nicht werfen**. Defensive Defaults bei externen APIs. |
| **Skalierbarkeit** | Kein Hardcode — alles Tenant-/Funnel-spezifische kommt aus Supabase. Dynamisch, nicht hartcodiert. |
| **Performance** | DB-Indexe für alle gefilterten Spalten. Keine N+1 Queries. Server Components default, Client Components nur wo nötig. |
| **Best Practice** | Immer aktuelle Patterns nutzen (Next 16 App Router, RSC, Server Actions wo passend). Bei Unsicherheit: `mcp__next-devtools__nextjs_docs` konsultieren. |

---

## 10. Code-Regeln (technisch konkret)

- **Kein Hardcode** — alle Tenant-/Funnel-spezifischen Werte (Texte, Farben, Fragen) aus Supabase (`tenants`, `funnels`, `funnel_questions`).
- **Primärquelle ist Supabase.** `getTenantConfig()` lädt ausschließlich aus der DB — kein JSON-Fallback.
- **Supabase Service Key nur server-side**, niemals mit `NEXT_PUBLIC_`-Prefix.
- **Billing-Reihenfolge in `/api/submit`:** erst `logSubmission()` (Supabase), dann E-Mails. Billing darf nie durch E-Mail-Fehler verloren gehen.
- **Nur 2 E-Mails pro Submission:** Danke-Mail an den Anfragenden (kein PDF, keine Preisschätzung) + Lead-Benachrichtigung an den Tenant.
- **Kein PDF, keine Preisschätzung** — `generatePDF.ts` und `priceCalculator.ts` sind deprecated.
- **Fehler in Tracking / E-Mail:** loggen, **nicht werfen**. Endkunde bekommt immer `{success:true}`.
- **Bot-Schutz:** Honeypot-Feld im Formular (server-side prüfen). Bei ausgelöstem Honeypot: 200 zurückgeben, aber nicht in DB speichern.
- **postMessage Höhe:** Widget sendet nach jedem Render `window.parent.postMessage({type:'funnel-resize', height: X}, '*')`.
- **`lead_price` server-side** aus `tenants.lead_price` lesen — nicht vom Client vertrauen.
- **Umgebungsvariablen:** `.env.local` (Vorlage `.env.example`).

---

## 11. Design System (Dashboard & Tenant-Portal)

**Vor dem Erstellen oder Anpassen einer UI-Komponente zwingend lesen: [`context/design-system.md`](context/design-system.md)**

Enthält: Design-Token (Light + Dark Mode), Komponenten-API, Dark-Mode-Implementierung, Layout-Patterns, Verbote.

### Kurzübersicht Komponenten

| Komponente | Verwendung |
|---|---|
| `<Card title="…">` | Jede Inhalts-Box im Dashboard |
| `<Badge variant="green\|red\|amber\|purple\|gray">` | Status-Anzeigen |
| `<Button variant="primary\|secondary\|ghost">` | Alle klickbaren Aktionen |
| `<Input value onChange placeholder>` | Texteingaben, Suche |
| `<Select value onChange options>` | Dropdowns |
| `<StatTile value label>` | Kennzahlen-Kacheln |
| `<ThemeToggle>` | Dark-Mode-Schalter (nur 1× pro Header) |

### Zwei getrennte Design-Welten

- **`components/ui/`** → Dashboard & Tenant-Portal (das obige System)
- **`components/funnel.tsx`** → Widget-UI (Farben aus DB, komplett eigenständig). **Nur in Absprache anfassen** — keine spontanen KI-Edits an dieser Datei. Erweiterungen oder Refactors (neue Feldtypen, Design-Updates, etc.) brauchen explizite Freigabe und einen klaren Grund. Default-Haltung: hands off, frag nach.

---

## 12. Icon-System

Einzige Funnel-Komponente: `components/funnel.tsx` (generisch, nicht branchen-spezifisch). Icons sind SVG-Komponenten in `components/icons.tsx`, referenziert per `icon_key` (String). Neue Icons = neuer Eintrag im `Icons`-Objekt in `icons.tsx`. Wenn `icon_url` in der DB gesetzt ist, wird das externe Bild statt des Icon-Keys gerendert.

> **Hinweis:** Das aktuelle Icon-System (Schlüssel-basiertes ICON_MAP + optionales icon_url) ist eine Übergangs-Lösung. Eine bessere Architektur wird zukünftig erarbeitet — bis dahin reicht der Status quo.

---

## 13. Supabase / Datenbank

### 13.1 Tooling & Prozess

- **Best Practices**: [`.agents/skills/supabase-postgres-best-practices/SKILL.md`](.agents/skills/supabase-postgres-best-practices/SKILL.md) — beim Arbeiten mit dem Supabase MCP Server zwingend anwenden.
- **Backups**: Supabase macht **täglich automatische Backups** (Aufbewahrung abhängig vom Plan). PITR (Point-in-Time-Recovery) erst ab Pro-Plan.
- **Schema-Migrationen**: Vor Anwendung auf Production immer in einem Supabase-Branch testen (`mcp__supabase__create_branch`).
- **Migration-Reversibilität**: Jede Migration muss entweder eine DOWN-Migration haben **oder** einen klar dokumentierten manuellen Rollback-Pfad.
- **Schema-Referenz**: [`context/supabase-schema.md`](context/supabase-schema.md) ist die vollständige technische Vollreferenz. Nach jeder Schema-Änderung neu regenerieren.

### 13.2 RLS-Pattern (verbindliche Architektur-Entscheidung)

**Defense-in-Depth: alle CRUD-Operationen werden über RLS-Policies abgesichert.**

- Jede Tabelle bekommt Policies für **SELECT, INSERT, UPDATE, DELETE** — nicht nur SELECT.
- Tenant-Identity wird via Junction-Table aufgelöst: `auth.uid()` → `tenant_members.auth_user_id` → `tenant_members.tenant_id` → Daten.
- Tenant-isolierte CRUD-Operationen (Funnel anlegen/editieren, Lead-Status updaten, Account-Settings) laufen über **User-Client** (`lib/supabase/server.ts` / `client.ts`) und sind durch RLS abgesichert.

**Service-Key-Client (`lib/supabase/admin.ts`, RLS-Bypass) wird AUSSCHLIESSLICH verwendet für:**
- `/api/submit` — anonymer Endbenutzer, keine Auth
- `/api/track-view` — anonymer Funnel-View
- `/api/stripe/webhook` — System-Event von Stripe, kein User-Kontext
- `/api/tenant/slug-check` + `generateRandomSlug` in `/api/tenant/funnels` POST — globale Slug-Uniqueness (RLS würde fremde Tenants ausblenden)
- `app/dashboard/layout.tsx` — Tenant-Lookup via `tenant_members`-Join + Auto-Tenant-Anlage beim ersten Login (User hat vor Anlage noch keine Membership; Lookup nutzt admin-Client weil verlässlicher als RLS bei Membership-Edge-Cases)
- Admin-Operationen (Stavros / Plattform-Owner — kein UI mehr seit Aufgabe 26, neuer Build geplant für Phase E)

> Bei neuen API-Routes oder DB-Zugriffen: **erst prüfen, ob RLS reicht** (default), Service-Key nur in obigen Ausnahmefällen.

### 13.3 FK-Konvention

- **Alle Foreign-Key-Beziehungen über UUIDs** (z.B. `funnels.tenant_id → tenants.id`).
- **Slugs sind nur für öffentliche URLs** (`funnels.slug` als iFrame-Endpoint) — niemals als FK-Target.
- Ein Funnel-Slug ist **nach Anlage unveränderlich** (sonst brechen Embeds bei Tenants). Das wird im Builder-UI durchgesetzt.
- Tenant-Slug existiert nicht mehr (in Aufgabe 26 gedroppt — wurde nirgendwo öffentlich angezeigt).
- `submissions` hat als Sonderfall: `tenant_id uuid` (RLS-Filter, ON DELETE SET NULL) **plus** `tenant_slug text` + `funnel_slug text` als Snapshot (für Display + Funnel-URL-Lookup; bleiben erhalten wenn Funnel/Tenant gelöscht). Neue Inserts via App-Code setzen `tenant_slug = NULL` (Source weg seit tenants.slug drop), nur `funnel_slug` wird weiter befüllt.

### 13.4 Tabellen-Verantwortlichkeiten

Klare Trennung — keine Override-Hierarchien zwischen Tabellen:

| Tabelle | Verantwortlich für |
|---|---|
| `tenants` | **Nur Agentur-Account-Daten:** Stripe-Felder, billing_model, billing_price, lead_price, is_active. Optional Anzeigename der Agentur |
| `tenant_members` | N:M-Junction Tenant ↔ User mit `role` (`owner` / `admin` / `member`). **Minimal — keine Profile-Felder** (kein display_name, kein phone). YAGNI |
| `funnels` | **Alle endkunden-spezifischen Daten:** Footer (company_name, email, phone), notification_email, Theme (Farben, Font, Radius), Texte, Slug |
| `funnel_questions` (später `pages` + `fields`) | Funnel-Inhalt |
| `submissions` | Lead-Daten (Snapshot-Pattern — keine FK auf Funnel/Tenant, damit auch nach Löschen erhalten) |

**`user_profiles`** (eigene Tabelle 1:1 mit `auth.users`) wird angelegt, **falls je echte Profile-Daten** (Phone für Twilio-Pro, Avatar, etc.) gebraucht werden. Aktuell nicht nötig.

### 13.5 Bevorstehende Schema-Änderungen

Vor MVP-Launch steht ein größerer Schema-Refactor an. Status: B.1 (`tenant_members`) ✅, B.2 (UUID-FKs) ✅, B.3 (submissions.contact_*-Cleanup) ✅, B.4 (tenants als reine Account-Tabelle) ✅ — alle Mai 2026. **Offen:** B.5 (pages + fields), B.6 (Webhook-Schema), B.7 (updated_at-Trigger). Details + Reihenfolge: siehe [`context/roadmap.md`](context/roadmap.md).

---

## 14. Next.js 16

- **Best Practices via MCP**: bei Unsicherheit über aktuelle Next-Patterns (Caching, Server Actions, RSC, etc.) `mcp__next-devtools__nextjs_docs` konsultieren — nicht raten.
- **Browser-Testing**: `mcp__next-devtools__browser_eval` für lokale UI-Verifikation, bevor du eine Aufgabe als "fertig" meldest.
- **App Router**, Server Components default, Client Components nur mit klarer Begründung.
- **API-Routes** mit Supabase Service Key: `runtime = "nodejs"` setzen (kein Edge).

---

## 15. Dokumentationspflicht

Nach jeder abgeschlossenen Aufgabe Eintrag in `context/current-feature.md` anfügen:

```
- [Aufgabenname] – [Was wurde gemacht] ([betroffene Dateien])
```

Bei > ~10 Einträgen die ältesten nach `context/history-archive.md` verschieben.

Bei strategisch wichtigen Architektur-Entscheidungen während einer Aufgabe: **diese CLAUDE.md aktualisieren** — sie ist das göttliche File.
