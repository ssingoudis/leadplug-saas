# CLAUDE.md — LeadPlug

> **Single Source of Truth.** Dieses File ist die verbindliche Wahrheit über Produkt, Architektur, Regeln. Memory-Files ergänzen, ersetzen es aber nicht.

---

## 1. Produkt & Positionierung

LeadPlug ist ein **SaaS-Funnel-Builder mit integriertem CRM** für **Agenturen und Marketer**, die Funnels für ihre Endkunden bauen (branchenoffen, z. B. Solar, Anwälte, Coaches). Das Funnel-Erlebnis ist Typeform-artig (linear, schlank), die Differenzierung ist der **nachgelagerte Lead-Posteingang + Sales-Stack** (CRM, Webhooks, Drip-Mails, Conversion-Tracking) — gebaut für Agenturen mit vielen Endkunden.

**Was LeadPlug NICHT ist:**

- **Kein Tool für die Endbetriebe selbst** — Zielgruppe sind Agenturen/Marketer. Endbetriebe könnten es technisch zwar nutzen, sind aber nicht der Fokus (Produkt + Werbung zielen auf Agenturen mit vielen Endkunden).
- Kein AI-Funnel-Generator (kein Race-to-the-Bottom im austauschbaren AI-Hype)
- Kein Website-Builder. Branding läuft über **funnel-weite Theme-Variablen** (Brand-Color, Font, Border-Radius, Background) — nicht über Per-Element-Styling-Editoren wie bei FormFlow/Webflow

**Architektur-Kern:**

- Einbettbares iFrame-Widget pro Funnel (`https://app.leadplug.de/[slug]`) als Standard-Einbindung
- Einbindung per Script-Loader (`embed.js`): 2-Zeilen-Snippet (Container-DIV + `<script>`), das das iFrame automatisch einfügt, die Höhe anpasst und Conversion-Tracking feuert
- Multi-Tenant Editor + Dashboard für Agenturen
- Lead-Posteingang mit Status-Workflow (`offen` → `kontaktiert` → `abgeschlossen`)
- Webhook-Export für externe CRMs (HubSpot, Pipedrive, Close, etc.)

**Tech-Stack:**

| Layer      | Technologie                    |
| ---------- | ------------------------------ |
| Framework  | Next.js 16 (App Router)        |
| Sprache    | TypeScript (strict)            |
| Styling    | TailwindCSS                    |
| DB / Auth  | Supabase (Postgres, RLS, Auth) |
| Billing    | Stripe (Subscription)          |
| E-Mail     | Resend + React Email           |
| Deployment | Vercel                         |

---

## 2. Zielgruppe & Tenant-Modell

```
Tenant (= Agentur, zahlender Account)
├── N User (Team-Mitglieder via tenant_members)
└── N Funnels (für die Endkunden der Agentur)
```

**Regeln:**

- **Tenant = Konto (zahlender Account).** Alle Funnels hängen heute flach am Tenant — kein separater Gruppierungs-Layer. Der Begriff **„Workspace" ist reserviert** für ein späteres White-Label-Feature (Agentur-Arbeitsbereiche, in die mehrere User und ggf. Endkunden eingeladen werden) — heute nicht als Synonym für „Tenant" verwenden.
- **Multi-User-Backend ist vorbereitet** (Junction-Table `tenant_members` mit Rollen `owner | admin | member`); die Invite-/Team-UI fehlt noch, kommt nach der Beta.
- **Endkunden der Agenturen haben keinen Login.** Ein Whitelabel-Endkunden-Portal ist ein späteres Feature (post-Beta).


---

## 3. Pricing-Strategie

Während der **offenen Beta ist LeadPlug kostenlos** — alle Konten laufen auf `billing_model='free'`, kein Zahlungs-Gate. Konkrete Pläne und Preise werden **erst nach der Beta** festgelegt und bis dahin bewusst nicht dokumentiert (vermeidet veraltete Annahmen).

---

## 4. GTM-Strategie & Status

**Wo wir stehen:** MVP erreicht, **beta-reif**. Offen bis Launch: nur noch D.1 (Stripe Test→Live).

**Wo's hingeht:** kostenlose Beta → **direkte Akquise von 5–10 Agenturen** (echte Funnels/Leads = Validierung + Conversion-Daten) → danach Launch + Direct-Sales. Domain-Partnerschaft ist willkommen, falls sie sich ergibt — kein Muss, nicht der Fokus.

**Nach der Beta:** Stripe live, dann Ausbau Richtung Workspaces / White-Label (eigene Mail-Absender-Domain, Team-Invite-UI, später Endkunden-Portal) — Details erst bei belegter Nachfrage.

---

## 5. Builder-Richtung (Architektur-Entscheidung)

**Builder bleibt linear / Typeform-Stil.** KEIN Node-Canvas, KEIN React Flow. Bei „lass uns Canvas einbauen"-Impulsen: an diese Entscheidung erinnern und nach konkretem Kundenbedarf fragen. (Wie Builder/Widget technisch gebaut sind → [`context/architecture.md`](context/architecture.md).)

**Action-Element-Modell (Kern-Prinzip):** Alle Output-Mechanismen (Webhooks, E-Mails, …) sind **dynamisch konfigurierbare Builder-Elemente mit eigenem Editor-Tab** — NIE als hartkodierter Trigger in der Submit-Pipeline. Trigger passend zum Use-Case: Webhooks pushen **Events** (`on_submit` / `after_page` / abandoned-Cron), E-Mails sind **Sequenzen** (`delay_minutes` nach Submit). Neue Outputs (Slack, Discord, …) folgen demselben Muster. Detail-Docs: [`webhook-architecture.md`](context/webhook-architecture.md), [`email-drip-architektur.md`](context/email-drip-architektur.md), [`conversion-tracking.md`](context/conversion-tracking.md).

**Logik-Sprünge** = bewusste Ausnahme: kein Output, sondern der Funnel-Fluss selbst — Regeln an der Frage, **nur Vorwärts-Sprünge** (Zyklen per Konstruktion unmöglich), Auswertung geteilt Widget↔Server ([`lib/logic/funnelLogic.ts`](lib/logic/funnelLogic.ts)).

**Weitere feste Prinzipien:**
- Keine Submit-Page — Lead-Erfassung = Kontaktdaten-Karte am Funnel-Ende (`autoFinish`), Consent = Checkbox-Feld mit Markdown-Link.
- Defaults vorausgefüllt in `DEFAULT_EDITOR_STATE`, nicht als Render-Fallback im Widget (leer = aus).
- Conversion-Tracking ist **Embed-Mechanik** (Widget → `postMessage` → `embed.js` feuert GTM/Meta/Google), kein Action-Element.

**Bewusst NICHT gebaut** (nicht ohne konkreten Kundenbedarf bauen): Twilio/Call-Dialer · Mehrsprachigkeit · Slack/Discord · Onboarding-Wizard · Per-Page-Theme · Per-Element-CSS-Editor · Signature-Feld · iFrame-freie Web-Component-Einbindung · Public REST-API · Audit-Log.

**Post-Launch on demand** (erst bei belegter Nachfrage): Custom-Domain · A/B-Tests · Workspaces + White-Label (Team-Invite-UI, eigene Mail-Absender-Domain, später Endkunden-Portal) · Calculator-Feld · File-Upload-Feld · `contacts`-Dedup-Tabelle.

---

## 6. Doku-Index

> **Pre-Go-Live-Stand (2026-06-07):** Die Fahrpläne (`roadmap.md`, `builder-fokus-roadmap.html`, `saas-phasenplan.html`) wurden entfernt — die Anwendung ist launch-reif, Planungs-Dokumente sind obsolet. Strategische Wahrheit lebt in dieser CLAUDE.md (§1-5).

- [`context/architecture.md`](context/architecture.md) — **technische Karte des Produkts**: wie ist die App gebaut, wo lebt was, welche Komponente macht welchen Job. Builder + Widget + Mapping + Submission-Pipeline. **Erste Anlaufstelle für „wo ist X im Code".**
- [`Anleitungen/Ordnerstruktur.md`](Anleitungen/Ordnerstruktur.md) — **Ordnerstruktur menschenverständlich erklärt** (3-Welten-Modell, oberste Ordner, components/ + lib/ Aufbau, Namens-Regeln, „Wo finde ich X"-Spickzettel). **Beim Anlegen neuer Dateien hier die Platzierungs-Logik befolgen** (feature-Ordner, Daten→lib/, PascalCase-Komponenten).
- [`context/struktur-plan.md`](context/struktur-plan.md) — **Ordner-Aufräum-Plan** (Aufgaben 70–72 erledigt: editor/ · dashboard nav+funnels · lib logic/hooks/email). Phase C (funnel.tsx-Umzug) bewusst gestrichen — Begründung dort.
- [`context/architektur-diagramme.md`](context/architektur-diagramme.md) — **7 Architektur-Diagramme als Diagram-as-Code** (Cloud/Infra · App-Komponenten · Sequenz · ER · Funnel-Journey · Produkt-Überblick · Capability-Map) + Eraser-Link. Versioniert + regenerierbar; die „schöne" interaktive Ansicht liegt in Eraser.
- [`context/webhook-architecture.md`](context/webhook-architecture.md) — **Webhook-Subsystem vollständig** (Aufgabe 40): DB-Schema, Code-Layout, Sequence-Diagramme (completed/abandoned/retry/test), Payload-Format, HMAC, ENV-Vars, UI-Verkabelung, Known-Issues. **Erste Anlaufstelle für „wie funktioniert der Webhook-Sender".**
- [`context/webhook-architecture.html`](context/webhook-architecture.html) — **dieselbe Architektur visuell** (Stavros-Style): Tabellen-Karten, Sequence-Diagramme als Lanes, Payload-Highlighting, Status-Cards.
- [`context/webhook-erklaert.md`](context/webhook-erklaert.md) — **Webhooks von Anfang an erklärt** für Lernende mit Programmier-Grundkenntnissen. Konzept-Einstieg mit Analogien, Use-Case, DB-Tabellen, End-to-End-Flow, HMAC, Backoff, Cron, Dedup, Glossar. **Erste Anlaufstelle wenn jemand das System komplett neu kennenlernt.**
- [`context/email-drip-architektur.md`](context/email-drip-architektur.md) — **E-Mail-Drip-Subsystem vollständig** (Aufgabe 41): DB-Schema, Code-Layout (Sender, Queue, Cron), TipTap-Editor + Custom-Nodes, Template-Substitutions-Regex, UI-Architektur (3-Pane mit Draft-Lift), Sequence-Diagramme (immediate/delayed/retry/test). **Erste Anlaufstelle für „wie funktioniert der E-Mail-Drip-Sender".**
- [`context/conversion-tracking.md`](context/conversion-tracking.md) — **Conversion-Tracking + `embed.js`-Script-Loader vollständig** (Aufgabe 42 / D.2): postMessage-Bridge (iFrame→Parent), `embed.js`-Loader, Code-Layout, Tenant-Einbettung, 3 Abgreif-Wege (GTM-`dataLayer` / data-Attribute / `onLead`-Callback), Sicherheits-/PII-Modell. **Erste Anlaufstelle für „wie kommen Funnel-Leads als Conversion zu Meta/Google".**
- [`context/architecture.html`](context/architecture.html) — **dieselbe Architektur visuell** (vom Stavros gepflegt) — 3-Worlds-Map, DB-Tree, Page-Flow, Field-Types-Grid, Komponenten-Baum, Decisions-Legend.
- [`context/vorlagen-kochbuch.md`](context/vorlagen-kochbuch.md) — **Funnel-Vorlagen bauen** (Aufgaben 61–63): Recherche-Prozess + Troll-Filter, Design-Regeln inkl. **„Drei Regel-Typen"** (Skips immer · Fast-Track nur bei Nutzer-Absicht/B2B · Disqualifikations-Weiche als letzte Frage vor der Kontaktkarte, nie als früher Sprung), SQL-Anlage-Muster, Veröffentlichen via `snapshot_funnel_to_template`. **Erste Anlaufstelle für „neue Vorlagen erstellen" (Stand: 37 live, Ziel 25 übertroffen).**
- [`context/supabase-schema.md`](context/supabase-schema.md) — vollständige technische DB-Referenz (Enums, Tables, RLS, Indices, Functions)
- [`context/current-feature.md`](context/current-feature.md) — laufende Arbeit + Aufgaben-History (chronologisch)
- [`context/history-archive.md`](context/history-archive.md) — ältere Aufgaben (archiviert)
- [`context/design-system.md`](context/design-system.md) — UI-Komponenten Dashboard + Tenant-Portal
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

| Prinzip            | Was es konkret heißt                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sicherheit**     | Alle User-Inputs am API-Boundary validieren. Auth, Tenant-Zugehörigkeit und Aktiv-Status (`is_active`) nie aus dem Client lesen/ableiten. Supabase Service Key nur server-side, nie mit `NEXT_PUBLIC_`-Prefix. |
| **Robustheit**     | Kein `any` / `as` ohne Begründung. Fehler in Tracking/E-Mail loggen, **nicht werfen**. Defensive Defaults bei externen APIs.                                                     |
| **Skalierbarkeit** | Kein Hardcode — alles Tenant-/Funnel-spezifische kommt aus Supabase. Dynamisch, nicht hartcodiert.                                                                               |
| **Performance**    | DB-Indexe für alle gefilterten Spalten. Keine N+1 Queries. Server Components default, Client Components nur wo nötig.                                                            |
| **Best Practice**  | Immer aktuelle Patterns nutzen (Next 16 App Router, RSC, Server Actions wo passend). Next-Docs proaktiv konsultieren — siehe §14. |
| **Wartbarkeit**    | Lesbarer, einfacher Code im Stil des umgebenden Codes (Naming, Patterns). Keine unnötige Komplexität, kein Copy-Paste (DRY). Lieber klar als clever — der/die Nächste (Mensch oder KI) muss es schnell verstehen.                           |

---

## 10. Code-Regeln (technisch konkret)

- **Kein Hardcode** — alle Tenant-/Funnel-spezifischen Werte (Texte, Farben, Fragen) aus Supabase (`tenants`, `funnels`, `pages`, `fields`).
- **Primärquelle ist Supabase.** `getTenantConfig()` lädt ausschließlich aus der DB — kein JSON-Fallback.
- **Supabase Service Key nur server-side**, niemals mit `NEXT_PUBLIC_`-Prefix.
- **Partial-Submissions seit Aufgabe 34 (2026-05-28):** `/api/track-progress` macht UPSERT auf `submissions.session_id` (debounced vom Widget), `/api/submit` macht denselben UPSERT mit `completed_at = NOW()` + Mails. **NIE wieder Insert in `submissions` ohne `session_id`** — die Spalte ist UNIQUE + NOT NULL. `logSubmission` in `lib/tracking.ts` ist deprecated, neue Code-Pfade nutzen `upsertSubmissionProgress`.
- **Reihenfolge in `/api/submit`:** erst `upsertSubmissionProgress(completed=true)` (Supabase, setzt completed_at), dann `triggerOnSubmit` (Webhooks) + `triggerEmailsOnSubmit` (Drip-Mails) via `after()`. Billing darf nie durch Webhook-/Mail-Fehler verloren gehen.
- **E-Mails dynamisch via Drip-System** — kein hartkodierter Versand. Pro Funnel 1..N Mails in `email_subscriptions`; Versand-Pfad `triggerEmailsOnSubmit` in [`lib/email/emails.ts`](lib/email/emails.ts) (sofort fällige via `after()`, verzögerte via Cron). Detail: [`context/email-drip-architektur.md`](context/email-drip-architektur.md).
- **Fehler in Tracking / E-Mail:** loggen, **nicht werfen**. Endkunde bekommt immer `{success:true}`.
- **Bot-Schutz:** Honeypot-Feld im Formular (server-side prüfen). Bei ausgelöstem Honeypot: 200 zurückgeben, aber nicht in DB speichern. Gilt sowohl für `/api/submit` als auch `/api/track-progress`.
- **postMessage Höhe:** Widget sendet nach jedem Render `window.parent.postMessage({type:'funnel-resize', height: X}, '*')`.
- **Abrechnung = Abo** (`billing_model`); **kein Per-Lead-Billing.** `lead_price`/`per_lead` sind vestigial (server-side gelesen, aber nicht abgerechnet) — optional für ein evtl. späteres Modell. (Security-Prinzip „billing-Werte nie vom Client" → §9.)
- **Icons sind raus (Aufgabe 34):** `EditorOption` + `Option` haben kein `iconKey`/`iconUrl` mehr (Glyphen-/IconPicker-System endgültig weg). `components/icons.tsx`, `components/icons/`, `components/dashboard/IconPicker.tsx` sind gelöscht. Choice-Options rendern standardmäßig A/B/C/D Letter-Chip. **Ausnahme seit Aufgabe 76 (Bild-Funnels):** optionales `imageUrl` (DB-jsonb-Key `image_url`) **pro Option (`single_choice` + `multi_choice`)** — aktiviert über den Options-Marker `'image'` („Markierung der Optionen → Bild"); additiv, „leer = aus" → Letter-Chip-Fallback. Das Widget rendert dann ein responsives Karten-Grid (Bild oben) ↔ Reihen-Liste (Bild links) per Container-Query, ohne Letter-Chip; Auswahl = Brand-Rahmen (bei Mehrfachauswahl zusätzlich dezenter Haken auf gewählten Karten). Bilddarstellung pro Frage umschaltbar (`imageFit`): `contain` = Symbol/Icon mit Rahmen (Default), `cover` = Foto randlos füllend. URL aktuell **betreiber-gesetzt** (kein In-App-Upload, kein Storage-Bucket); Upload/Storage erst bei Self-Service-Bedarf. `dropdown` bleibt textbasiert.
- **Frage- vs. Kontaktfeld-Typen:** Die `QuestionType`-Werte sind Single-Source-of-Truth in [`types/index.ts`](types/index.ts) — dort pflegen, **nicht hier duplizieren**. Regel: `email` + `tel` sind **keine** Frage-Typen (waren nur kosmetische Text-Inputs), sondern **Kontaktfeld-Types** (echte Lead-Daten).
- **DSGVO-Strategie:** bewusst nicht engineered (Stavros-Entscheidung 2026-05-28). Rechtsgrundlage Art. 6 (1) (b) „Vertragsanbahnung" greift bei Lead-Funnels. Tenants verantworten ihre Datenschutzerklärung. Kein Consent-Click am Anfang. Anpassung erst wenn zahlende Tenants nachfragen.
- **Umgebungsvariablen:** `.env.local` (Vorlage `.env.example`).

---

## 11. Design System (Dashboard & Tenant-Portal)

**Vor dem Erstellen oder Anpassen einer UI-Komponente zwingend lesen: [`context/design-system.md`](context/design-system.md)**

Enthält: Design-Token (Light + Dark Mode), Komponenten-API, Dark-Mode-Implementierung, Layout-Patterns, Verbote.

**Für jeden nutzer-sichtbaren Text gilt der [`context/wording-styleguide.md`](context/wording-styleguide.md)** — Single Source of Truth für Copy: Begriffs-Glossar (Funnel, Lead, Konto/Kontoname, Aufrufe, Anmelden …), **neutrale Anrede als Default** (kein du/Sie im App-UI; **Funnel-Widget = „Sie"**), schlichte Formulierung (sagt, was es tut), keine Hybrid-Wörter, keine Doppel-Benennung. **Begriffe NICHT verbrauchen:** „Workspace" ist für ein späteres Whitelabel-Feature reserviert; ein Tenant heißt im UI „Konto" (kann Agentur, Firma **oder Einzelperson** sein → nie „Firmenname").

### Kurzübersicht Komponenten

| Komponente                                          | Verwendung                             |
| --------------------------------------------------- | -------------------------------------- |
| `<Card title="…">`                                  | Jede Inhalts-Box im Dashboard          |
| `<Badge variant="green\|red\|amber\|purple\|gray">` | Status-Anzeigen                        |
| `<Button variant="primary\|secondary\|ghost">`      | Alle klickbaren Aktionen               |
| `<Input value onChange placeholder>`                | Texteingaben, Suche                    |
| `<Select value onChange options>`                   | Dropdowns                              |
| `<StatTile value label>`                            | Kennzahlen-Kacheln                     |
| `<ThemeToggle>`                                     | Dark-Mode-Schalter (nur 1× pro Header) |

### Zwei getrennte Design-Welten

- **`components/ui/`** → Dashboard & Tenant-Portal (das obige System)
- **`components/editor/ui/`** → **Editor-Design-System**: geteilte Primitive (`Panel.tsx`: PanelShell/Section/Field/SectionCard/EmptyState · `Controls.tsx`: EditorButton/TextInput/Textarea/Select/Toggle · `EditorModal.tsx`: Modal-Chrome). **Neue Editor-Panels damit bauen, nicht lokal duplizieren.** Speichern: globaler Top-Save nur auf „Bearbeiten", Ressourcen-Tabs (E-Mails/Webhooks/Einbinden) pro Eintrag. Autosave (Namen/Settings): `lib/hooks/useSaveStatus.ts` + `components/ui/SaveStatus.tsx` (on-blur, sichtbarer Status).
- **`components/funnel.tsx`** → Widget-UI (Farben aus DB, eigenständig). **Nur in Absprache anfassen — keine spontanen KI-Edits.** Erweiterungen/Refactors (neue Feldtypen, Design) brauchen explizite Freigabe + klaren Grund. Default-Haltung: hands off, frag nach. (Große, zentrale Datei; Teile sind bereits nach `components/funnel/*` ausgelagert.)

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

> Bei neuen API-Routes oder DB-Zugriffen: **erst prüfen, ob RLS reicht** (default), Service-Key nur in obigen Ausnahmefällen.

### 13.3 FK-Konvention

- **Alle Foreign-Key-Beziehungen über UUIDs** (z.B. `funnels.tenant_id → tenants.id`).
- **Slugs sind nur für öffentliche URLs** (`funnels.slug` als iFrame-Endpoint) — niemals als FK-Target.
- Ein Funnel-Slug ist **nach Anlage unveränderlich** (sonst brechen Embeds bei Tenants). Das wird im Builder-UI durchgesetzt.
- Tenant-Slug existiert nicht mehr (in Aufgabe 26 gedroppt — wurde nirgendwo öffentlich angezeigt).
- `submissions` hat als Sonderfall: `tenant_id uuid` (RLS-Filter, ON DELETE SET NULL) **plus** `tenant_slug text` + `funnel_slug text` als Snapshot (für Display + Funnel-URL-Lookup; bleiben erhalten wenn Funnel/Tenant gelöscht). Neue Inserts via App-Code setzen `tenant_slug = NULL` (Source weg seit tenants.slug drop), nur `funnel_slug` wird weiter befüllt.

### 13.4 Tabellen-Verantwortlichkeiten

Klare Trennung — keine Override-Hierarchien zwischen Tabellen:

| Tabelle                                        | Verantwortlich für                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenants`                                      | **Nur Agentur-Account-Daten:** Stripe-Felder, billing_model, billing_price, lead_price, is_active. Optional Anzeigename der Agentur             |
| `tenant_members`                               | N:M-Junction Tenant ↔ User mit `role` (`owner` / `admin` / `member`). **Minimal — keine Profile-Felder** (kein display_name, kein phone). YAGNI |
| `funnels`                                      | **Alle endkunden-spezifischen Daten:** notification_email, Theme (Farben, Font, Radius, max. Breite), Funnel-Texte, Anzeige-Toggles (Fortschrittsbalken/Schritt-Nummer/Ausrichtung), Slug, Redirect-URL, Mail-Absender-Lokalteil, Conversion-Tracking-IDs (`meta_pixel_id`, `google_ads_conversion`) |
| `pages` + `fields`                             | Funnel-Inhalt. Pro Funnel (seit 52D): N × question/custom/welcome-Pages + 1 × success-Page (leer). **Keine submit-Page mehr** (Kontaktformular abgeschafft; orphaned Submit-Pages in 52D per Migration gelöscht) |
| `submissions`                                  | Lead-Daten (Snapshot-Pattern — keine FK auf Funnel/Tenant, damit auch nach Löschen erhalten)                                                    |
| `funnel_templates`                             | Kuratierte Funnel-Vorlagen (Aufgabe 62): jsonb-Snapshot + Galerie-Metadaten. Plattform-Asset, kein Tenant-Bezug; Pflege nur Owner/Service       |

**`user_profiles`** (eigene Tabelle 1:1 mit `auth.users`) wird angelegt, **falls je echte Profile-Daten** (Phone für Twilio-Pro, Avatar, etc.) gebraucht werden. Aktuell nicht nötig.

---

## 14. Next.js 16

- **Next-Docs via MCP — proaktiv, nicht reaktiv:** Bei JEDER Next.js-spezifischen Arbeit (Caching, Server Actions, RSC vs. Client, Route Handlers, Middleware, Rendering, Data-Fetching, `next.config`) **zuerst** `mcp__next-devtools__nextjs_docs` konsultieren. Grund: Next 16 ist neu, das Trainingswissen kann veraltet sein — **Docs schlagen Gedächtnis, nicht raten.** (Bei trivialen Edits ohne Next-Bezug nicht nötig.)
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

**Diese CLAUDE.md ist das göttliche File — Änderungen NUR in Absprache mit Stavros.** Die KI editiert sie nie eigenmächtig oder still: erst **vorschlagen + begründen**, dann auf explizites OK warten. Fällt beim Arbeiten auf, dass hier etwas **veraltet, falsch oder anpassungsbedürftig** ist (auch durch eine strategische Architektur-Entscheidung), **Stavros darauf hinweisen** statt selbst zu ändern — die Entscheidung trifft er.

(Gilt nur für diese CLAUDE.md. Den Aufgaben-Eintrag in `context/current-feature.md` pflegt die KI weiterhin selbstständig.)
