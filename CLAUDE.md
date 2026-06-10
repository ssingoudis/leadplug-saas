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

- **Tenant = Workspace.** Kein separater Workspace-Layer.
- **Multi-User-Backend wird vorbereitet** (Junction-Table `tenant_members` mit Rollen `owner | admin | member`); UI für Invites kommt nach MVP.
- **Endkunden der Agenturen haben keinen Login** im MVP. Whitelabel-Endkunden-Portal ist v2-Feature für Pro-Plan.

---

## 3. Pricing-Strategie

Drei Tiers pro Tenant (Agentur). Preise sind Richtwerte:

| Plan         | Preis       | Beinhaltet                                                                 |
| ------------ | ----------- | -------------------------------------------------------------------------- |
| **Webhook**  | ~29€/Monat  | Unlimited Funnels, Leads → externes CRM, 1 User                            |
| **Standard** | ~99€/Monat  | Webhook + integrierter Lead-Posteingang + ~3 User                          |
| **Pro**      | ~249€/Monat | Standard + Twilio (Telefonie/Audio/Auto-Summary) + Kanban + unlimited User |

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
- **Robust und production-ready ab Tag 1** — Fehler werden abgefangen, Edge-Cases sind durchdacht, Daten gehen nicht verloren
- Reliability > Feature-Breite
- Builder fühlt sich nicht peinlich an im Vergleich zu Typeform/FormFlow

---

## 5. Builder-Richtung (Architektur-Entscheidung)

**Festgelegt:** Funnel-Builder bleibt **linear / Typeform-Stil**. **KEIN Node-Canvas, KEIN React Flow**. Bei "lass uns Canvas einbauen"-Impulsen: an diese Entscheidung erinnern und nach konkretem Kunden-Bedarf fragen.

**Stand seit Aufgabe 34 (2026-05-28):** Builder v2 (`?v=2`) ist das aktive System. Hat 3-Pane Layout (StepList · WYSIWYG-Canvas · Properties), Vorlagen (Kontakt/Adresse/Ja-Nein), Field-Level-Properties, Click-Select + Inline-Edit im Canvas, Drag-Reorder von Optionen, "+ Option / Duplicate / Delete" Inline-Aktionen, Pin-Edge-Insert zwischen Steps. Widget ist **Typeform-Stil-redesigned**: A/B/C/D Letter-Chips, Underline-Inputs, font-light Titel, framer-motion Slide-Animationen, 1px Progress-Bar oben, Bottom-Right Floating-Nav. v1-Editor ist Legacy, wird in C.1d entfernt.

**Strategische Entscheidungen aus Aufgabe 34:**
- **Icons sind komplett raus** aus Code + DB (siehe §10). A/B/C/D ist Default. Picture-Choice kommt erst on-demand wenn Kunde fragt.
- **Email + Telefon als Question-Types raus** (waren nur kosmetische Text-Inputs). Bleiben als ContactField-Types auf Submit-Page.
- **Partial-Submissions live**: jede User-Session bekommt DB-Row mit `session_id` UPSERT + `completed_at` Flag. Abbrecher mit Email werden zu Leads. Pricing-Modell zählt Completed + Abandoned-mit-Email als Lead.
- **DSGVO ignoriert für jetzt** — Rechtsgrundlage Art. 6 (1) (b) Vertragsanbahnung greift.

**Architektur-Konsens aus Aufgaben 40 + 41 (2026-05-29/31) — Action-Element-Modell:**

LeadPlug ist „eine Art Typeform-Klon". **Alle Output-Mechanismen sind dynamisch konfigurierbare Builder-Elemente, kein impliziter Automatismus:**
- **Webhooks** ✅ live (Aufgabe 40) — Event-Push an externe CRMs. Eigener Editor-Tab „Webhooks". Pro Funnel N Subscriptions, pro Subscription Trigger-Konfig (`on_submit` Default / `after_page:<id>` für Mid-Funnel). Visuelle Step-Pill-Badges im Builder bei `after_page`-Triggern. Sender + HMAC + Cron + Retry: siehe [`lib/webhooks.ts`](lib/webhooks.ts).
- **E-Mails** ✅ live (Aufgabe 41) — **Drip-System für Lead-Nurturing**. Eigener Editor-Tab „E-Mails", 3-Pane In-Place-Editor (Liste · Editor · Live-Vorschau). Pro Funnel N Drip-Mails mit `delay_minutes` (0 = sofort via `after()`, N = N Min nach Submit via Cron-Queue) + `recipient_type ('customer'|'tenant')`. TipTap-WYSIWYG-Editor mit Custom Variable-Chips + Magic-Section-Block-Cards. Live-Vorschau (resizable) mit Mock- oder echten Lead-Daten. Auto-Save mit 1.5 s Debounce. Hartkodierter Mail-Versand in `/api/submit` durch Backfill-Subscriptions ersetzt → Verhalten 1:1 erhalten. Sender + Queue + Cron: siehe [`lib/emails.ts`](lib/emails.ts) + [`context/email-drip-architektur.md`](context/email-drip-architektur.md). **Aufgabe 53 (2026-06-06):** Mail-Variablen sind jetzt **dynamisch aus den Funnel-Feldern** (Picker + `{{answer.<field-key>}}` mit Choice→Label-Auflösung, statt der alten statischen 3er-Liste; `buildFunnelVariables` + `resolveAnswerVar`). Empfänger-UI auf **2 Modi** (Lead | feste Adressen) mit Multi-Adress-Chips + dynamischem **`@me`-Marker** (`RECIPIENT_ME` → `notification_email`, folgt der Account-Adresse; `isInternalRecipient` steuert From/reply-to) — `recipient_type` bleibt {customer,tenant,custom}, **kein DB-Change** (alter Code sieht `@me` nie). Link-Setzer = Inline-Popover (kein `window.prompt` mehr).
- **Logic-Jumps** (C.4) folgen demselben Action-Element-Pattern (eigener „Logik"-Tab).
- **Bei neuen Output-Mechanismen** (Slack, Discord, etc.): folge dem Action-Modell — eigener Tab oder Plugin-System, NIE als hartkodierter Trigger in der Submit-Pipeline.
- **Wichtig — Webhooks ≠ E-Mails im Trigger-Modell:** Webhooks pushen Events (Timing matched dem Event: `on_submit`, `after_page`, abandoned-Cron). E-Mails sind Sequenzen (Timing relativ zum Submit via `delay_minutes`). Bei zukünftigen Actions: passendes Modell pro Use-Case wählen, nicht zwanghaft 1:1-Klon.
- **Submit-Page abgeschafft (Aufgabe 51, 2026-06-06) + restlos rausgerissen (Aufgabe 52D, 2026-06-06)**: Kein hartkodiertes Kontaktformular mehr. Lead-Erfassung = normale Card (Kontaktdaten-Preset), Submit am Funnel-Ende (`autoFinish`) für **alle** Funnels, Consent = Checkbox-Feld mit Markdown-Link (`[Text](url)`). **Seit 52D ist das Submit-Page-Gerüst komplett aus dem Code entfernt** — kein `contactFields` mehr (weder im Widget noch in `TenantConfig`/`EditorState`/`getTenantConfig`/Editor/Webhooks/E-Mails), `enrichContact` + `SubmitProps` + `SelectedStep.submit` + `contact_summary`-Magic gelöscht, `editorStateToPagesAndFields` erzeugt keine Submit-Page mehr. **Honeypot lebt jetzt am Widget-Root** (vorher im Kontaktformular). Lead-Daten kommen ausschließlich aus `deriveContactFromAnswers` (Karten-Antworten); `/api/submit` validiert Pflicht-Card-Felder serverseitig als Backstop. **`skip_submit_step` voll abgebaut:** alle `skipSubmitStep`/`skip_submit_step`-Code-Referenzen entfernt; Spalten-DROP (`aufgabe_52d_drop_skip_submit_step`) **nach Deploy angewendet** (2026-06-06, verifiziert). **DB-Cleanup in 52D** (auf User-Wunsch): orphaned Submit-Pages + Fields gelöscht (Migration `aufgabe_52d_delete_orphaned_submit_pages` — 12 Pages + 52 Fields via Cascade; 0 Webhooks/Leads betroffen, Rollback-DOWN vorhanden). Die 11 Alt-Demo/Test-Funnels (`skip=false`, 0 echte Leads) verlieren ihr Kontaktformular (pre-launch freigegeben).
- **Architektur-Prinzip „keine Render-Fallbacks" (Aufgabe 51):** Defaults für Funnel-Texte gehören **vorausgefüllt in `DEFAULT_EDITOR_STATE`**, NICHT als `?? TEXT_DEFAULTS.X`-Fallback in `getTenantConfig`/`buildFunnelConfig`. Das Widget zeigt was gespeichert ist (leer = aus). Für `successMessage`/`responseMessage` umgesetzt (Titel hat interim einen Default-Fallback weil ein nacktes Häkchen nicht reicht; sauber → Cleanup). Rest der `TEXT_DEFAULTS` folgt im Cleanup.

**Conversion-Tracking** ✅ live (Aufgaben 42 + 43 / D.2, 2026-05-31) — **kein** Action-Element, sondern Embed-Mechanik: das Widget meldet den Submit PII-frei per `postMessage` an die einbettende Seite, der zentral ausgelieferte `embed.js`-Script-Loader feuert daraufhin Conversions (GTM-`dataLayer`-Push `leadplug_lead` + Meta/Google-Auto-Fire + `window.LeadPlug.onLead`-Callback).
- **Aufgabe 42** = event-basiertes Fundament + `embed.js`-Loader (Upgrade des bestehenden `public/embed.js`, abwärtskompatibel zu `data-funnel-slug`/`data-slug`).
- **Aufgabe 43 = Turnkey:** Tenant trägt **Meta-Pixel-ID** + **Google-Ads-Conversion** pro Funnel im Editor-Reiter „Einbinden" ein (DB: `funnels.meta_pixel_id` / `google_ads_conversion`). Die IDs reisen PII-frei in der `funnel-submit`-Message mit; `embed.js` injiziert bei Bedarf den Pixel-Basiscode + feuert automatisch (Format-Whitelist client+server). **Tracking ist pro Funnel** (Agentur nutzt je Endkunde ein anderes Pixel). Die frühere globale `/dashboard/embed`-Seite + `EmbedBlock` wurden entfernt — Embed-Code + Tracking leben jetzt im Editor-Reiter „Einbinden" (konsistent zu Webhooks/E-Mails). Server-CAPI bleibt on-demand.
- Sender + Loader + Turnkey: siehe [`context/conversion-tracking.md`](context/conversion-tracking.md).

**Builder-Final-Sprint** ✅ abgeschlossen + gemerged (Aufgaben 35–37 + C.1d + C.2). Danach gebaut + gemerged: Aufgabe 38 (Custom Multi-Field-Pages), 39 (Welcome/End-Screen + Rating/Scale/Statement), 40 (Webhooks), 41 (E-Mail-Drip), 42 (Conversion-Tracking, oben).

**Offen bis Launch (Phase D-Rest):** D.1 Stripe Test→Live (~1 Tag, aufgeschoben — Testkunden bekommen `free`-Tier), D.3 3-5 Demo-Funnel-Templates (Content). **Optional / v1.1:** C.4 Logic Jumps (eigener „Logik"-Tab, Action-Element-Pattern). Danach: Launch + Direct-Sales.

**Bewusst gestrichen** (nicht mehr im Plan):

- Twilio · Call-Dialer · Kanban-Board · Whitelabel-Endkunden-Portal
- Plattform-Owner-Dashboard v2 · Public REST-API · Audit-Log · Team-Workspaces
- Mehrsprachigkeit · E-Mail-Drip · Slack/Discord-Integration · Onboarding-Wizard
- Per-Page-Theme · Signature-Feld · Script-/Web-Component-Embed
- Per-Element-CSS-Editor

**Post-Launch on demand** (erst bei 5+ zahlenden Kunden-Anfragen): Custom-Domain · A/B-Tests · Multi-User-Invite-UI · Calculator-Feld · File-Upload-Feld · `contacts`-Dedup-Tabelle.

---

## 6. Doku-Index

> **Pre-Go-Live-Stand (2026-06-07):** Die Fahrpläne (`roadmap.md`, `builder-fokus-roadmap.html`, `saas-phasenplan.html`) wurden entfernt — die Anwendung ist launch-reif, Planungs-Dokumente sind obsolet. Strategische Wahrheit lebt in dieser CLAUDE.md (§1-5).

- [`context/architecture.md`](context/architecture.md) — **technische Karte des Produkts**: wie ist die App gebaut, wo lebt was, welche Komponente macht welchen Job. Builder + Widget + Mapping + Submission-Pipeline. **Erste Anlaufstelle für „wo ist X im Code".**
- [`context/architektur-diagramme.md`](context/architektur-diagramme.md) — **7 Architektur-Diagramme als Diagram-as-Code** (Cloud/Infra · App-Komponenten · Sequenz · ER · Funnel-Journey · Produkt-Überblick · Capability-Map) + Eraser-Link. Versioniert + regenerierbar; die „schöne" interaktive Ansicht liegt in Eraser.
- [`context/webhook-architecture.md`](context/webhook-architecture.md) — **Webhook-Subsystem vollständig** (Aufgabe 40): DB-Schema, Code-Layout, Sequence-Diagramme (completed/abandoned/retry/test), Payload-Format, HMAC, ENV-Vars, UI-Verkabelung, Known-Issues. **Erste Anlaufstelle für „wie funktioniert der Webhook-Sender".**
- [`context/webhook-architecture.html`](context/webhook-architecture.html) — **dieselbe Architektur visuell** (Stavros-Style): Tabellen-Karten, Sequence-Diagramme als Lanes, Payload-Highlighting, Status-Cards.
- [`context/webhook-erklaert.md`](context/webhook-erklaert.md) — **Webhooks von Anfang an erklärt** für Lernende mit Programmier-Grundkenntnissen. Konzept-Einstieg mit Analogien, Use-Case, DB-Tabellen, End-to-End-Flow, HMAC, Backoff, Cron, Dedup, Glossar. **Erste Anlaufstelle wenn jemand das System komplett neu kennenlernt.**
- [`context/email-drip-architektur.md`](context/email-drip-architektur.md) — **E-Mail-Drip-Subsystem vollständig** (Aufgabe 41): DB-Schema, Code-Layout (Sender, Queue, Cron), TipTap-Editor + Custom-Nodes, Template-Substitutions-Regex, UI-Architektur (3-Pane mit Draft-Lift), Sequence-Diagramme (immediate/delayed/retry/test). **Erste Anlaufstelle für „wie funktioniert der E-Mail-Drip-Sender".**
- [`context/conversion-tracking.md`](context/conversion-tracking.md) — **Conversion-Tracking + `embed.js`-Script-Loader vollständig** (Aufgabe 42 / D.2): postMessage-Bridge (iFrame→Parent), `embed.js`-Loader, Code-Layout, Tenant-Einbettung, 3 Abgreif-Wege (GTM-`dataLayer` / data-Attribute / `onLead`-Callback), Sicherheits-/PII-Modell. **Erste Anlaufstelle für „wie kommen Funnel-Leads als Conversion zu Meta/Google".**
- [`context/architecture.html`](context/architecture.html) — **dieselbe Architektur visuell** (vom Stavros gepflegt) — 3-Worlds-Map, DB-Tree, Page-Flow, Field-Types-Grid, Komponenten-Baum, Decisions-Legend.
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
| **Sicherheit**     | Alle User-Inputs am API-Boundary validieren. `lead_price`, Auth, Tenant-Zugehörigkeit nie aus Client lesen. Supabase Service Key nur server-side, nie mit `NEXT_PUBLIC_`-Prefix. |
| **Robustheit**     | Kein `any` / `as` ohne Begründung. Fehler in Tracking/E-Mail loggen, **nicht werfen**. Defensive Defaults bei externen APIs.                                                     |
| **Skalierbarkeit** | Kein Hardcode — alles Tenant-/Funnel-spezifische kommt aus Supabase. Dynamisch, nicht hartcodiert.                                                                               |
| **Performance**    | DB-Indexe für alle gefilterten Spalten. Keine N+1 Queries. Server Components default, Client Components nur wo nötig.                                                            |
| **Best Practice**  | Immer aktuelle Patterns nutzen (Next 16 App Router, RSC, Server Actions wo passend). Bei Unsicherheit: `mcp__next-devtools__nextjs_docs` konsultieren.                           |

---

## 10. Code-Regeln (technisch konkret)

- **Kein Hardcode** — alle Tenant-/Funnel-spezifischen Werte (Texte, Farben, Fragen) aus Supabase (`tenants`, `funnels`, `pages`, `fields`).
- **Primärquelle ist Supabase.** `getTenantConfig()` lädt ausschließlich aus der DB — kein JSON-Fallback.
- **Supabase Service Key nur server-side**, niemals mit `NEXT_PUBLIC_`-Prefix.
- **Partial-Submissions seit Aufgabe 34 (2026-05-28):** `/api/track-progress` macht UPSERT auf `submissions.session_id` (debounced vom Widget), `/api/submit` macht denselben UPSERT mit `completed_at = NOW()` + Mails. **NIE wieder Insert in `submissions` ohne `session_id`** — die Spalte ist UNIQUE + NOT NULL. `logSubmission` in `lib/tracking.ts` ist deprecated, neue Code-Pfade nutzen `upsertSubmissionProgress`.
- **Reihenfolge in `/api/submit`:** erst `upsertSubmissionProgress(completed=true)` (Supabase, setzt completed_at), dann `triggerOnSubmit` (Webhooks) + `triggerEmailsOnSubmit` (Drip-Mails) via `after()`. Billing darf nie durch Webhook-/Mail-Fehler verloren gehen.
- **E-Mails seit Aufgabe 41 (2026-05-31) dynamisch via Drip-System** — kein hartkodierter Versand mehr. Pro Funnel sind in `email_subscriptions` 1..N Mails konfigurierbar (Backfill legt 2 Default-Subs an: Customer-Confirmation + Tenant-Notification, beide delay=0). Versand-Pfad: `triggerEmailsOnSubmit` in [`lib/emails.ts`](lib/emails.ts) inserts pending attempts in `email_delivery_attempts`, sofort fällige (delay=0) werden via `after()` versendet, delayed (delay>0) vom Cron alle 5 Min gepickt. **Veraltet & gelöscht:** `lib/sendEmails.ts`, `emails/CustomerConfirmation.tsx`, `emails/TenantLeadNotification.tsx`, `lib/tracking.ts.updateEmailStatus` (jetzt `aggregateEmailStatusForSubmission` in `lib/emails.ts`).
- **Kein PDF, keine Preisschätzung** — `generatePDF.ts` und `priceCalculator.ts` sind deprecated.
- **Fehler in Tracking / E-Mail:** loggen, **nicht werfen**. Endkunde bekommt immer `{success:true}`.
- **Bot-Schutz:** Honeypot-Feld im Formular (server-side prüfen). Bei ausgelöstem Honeypot: 200 zurückgeben, aber nicht in DB speichern. Gilt sowohl für `/api/submit` als auch `/api/track-progress`.
- **postMessage Höhe:** Widget sendet nach jedem Render `window.parent.postMessage({type:'funnel-resize', height: X}, '*')`.
- **`lead_price` server-side** aus `tenants.lead_price` lesen — nicht vom Client vertrauen.
- **Icons sind raus (Aufgabe 34):** `EditorOption` + `Option` haben kein `iconKey`/`iconUrl` mehr. Choice-Options rendern A/B/C/D Letter-Chip. `components/icons.tsx`, `components/icons/`, `components/dashboard/IconPicker.tsx` sind gelöscht. DB: `fields.options` jsonb hat keine `icon_key`/`icon_url`-Felder mehr.
- **`QuestionType` hat 9 Werte (Aufgabe 34):** `single_choice`, `multi_choice`, `short_text`, `long_text`, `slider`, `date`, `number`, `dropdown`, `checkbox`. `email` + `tel` wurden als Question-Types entfernt (waren nur kosmetische Text-Inputs). Bleiben als ContactField-Types (`text`/`email`/`tel`/`plz`/`radio`) auf Submit-Page mit echter Lead-Daten-Bedeutung.
- **DSGVO-Strategie:** bewusst nicht engineered (Stavros-Entscheidung 2026-05-28). Rechtsgrundlage Art. 6 (1) (b) „Vertragsanbahnung" greift bei Lead-Funnels. Tenants verantworten ihre Datenschutzerklärung. Kein Consent-Click am Anfang. Anpassung erst wenn zahlende Tenants nachfragen.
- **Umgebungsvariablen:** `.env.local` (Vorlage `.env.example`).

---

## 11. Design System (Dashboard & Tenant-Portal)

**Vor dem Erstellen oder Anpassen einer UI-Komponente zwingend lesen: [`context/design-system.md`](context/design-system.md)**

Enthält: Design-Token (Light + Dark Mode), Komponenten-API, Dark-Mode-Implementierung, Layout-Patterns, Verbote.

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
- **`components/tenant-editor/v2/ui/Panel.tsx`** → **Editor-Design-System** (Aufgabe 45): geteilte Primitive `PanelShell · PanelHeader · Section · Field · FieldHint` für alle Editor-Tabs. **Neue Editor-Panels/Sektionen damit bauen, nicht lokal duplizieren.** Drei kanonische Layout-Templates: Canvas+Properties (Tab „Bearbeiten" — Inhalt+Design vereint mit Inspektor-Umschalter), Master-Detail (E-Mails, Webhooks), Einzelspalte-Config (Einbinden). Speichern-Modell: globaler Top-Save nur auf „Bearbeiten" (Dokument), Ressourcen-Tabs speichern pro Eintrag. **Aufgabe 49 erweitert:** `Panel.tsx` um `SectionCard` + `EmptyState`, neue `ui/Controls.tsx` (`EditorButton · TextInput · Textarea · Select · Toggle`) + `ui/EditorModal.tsx` (geteilte Modal-Chrome). Alle Ressourcen-Tabs (Webhooks/E-Mails/Einbinden) + Modals laufen jetzt auf diesem Vokabular. **Die Editor-Top-Komponente heißt seit Aufgabe 49 `EditorShell`** (vorher `EditorShellV2`; der Ordner `tenant-editor/v2/` + das `?v=2`-Routing-Flag bleiben bewusst). **Autosave-Pattern** für Namen/Settings projektweit: `lib/useSaveStatus.ts` + `components/ui/SaveStatus.tsx` (on-blur, sichtbarer Status, nie still) — angewendet auf Funnel-Name, Account-Profil, Lead-Notizen; Mehrfeld-Draft-Editoren + Funnel-Inhalt bleiben explizites Speichern.
- **`components/funnel.tsx`** → Widget-UI (Farben aus DB, komplett eigenständig). **Nur in Absprache anfassen** — keine spontanen KI-Edits an dieser Datei. Erweiterungen oder Refactors (neue Feldtypen, Design-Updates, etc.) brauchen explizite Freigabe und einen klaren Grund. Default-Haltung: hands off, frag nach. **Stand seit Aufgabe 34 (2026-05-28):** Datei ist signifikant gewachsen (~1500 LOC) durch Typeform-Redesign, framer-motion-Slide, EditableText-Helper für WYSIWYG-Edit, SortableEditOption für Canvas-Drag, Partial-Submissions-Hook. Auslagerung in `components/funnel/*` ist Option für eine kommende Pause-Aufgabe wenn die Datei unhandhabbar wird.

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

| Tabelle                                        | Verantwortlich für                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenants`                                      | **Nur Agentur-Account-Daten:** Stripe-Felder, billing_model, billing_price, lead_price, is_active. Optional Anzeigename der Agentur             |
| `tenant_members`                               | N:M-Junction Tenant ↔ User mit `role` (`owner` / `admin` / `member`). **Minimal — keine Profile-Felder** (kein display_name, kein phone). YAGNI |
| `funnels`                                      | **Alle endkunden-spezifischen Daten:** Footer (company_name, email, phone), notification_email, Theme (Farben, Font, Radius), Texte, Slug, Conversion-Tracking-IDs (`meta_pixel_id`, `google_ads_conversion`) |
| `pages` + `fields`                             | Funnel-Inhalt. Pro Funnel (seit 52D): N × question/custom/welcome-Pages + 1 × success-Page (leer). **Keine submit-Page mehr** (Kontaktformular abgeschafft; orphaned Submit-Pages in 52D per Migration gelöscht) |
| `submissions`                                  | Lead-Daten (Snapshot-Pattern — keine FK auf Funnel/Tenant, damit auch nach Löschen erhalten)                                                    |

**`user_profiles`** (eigene Tabelle 1:1 mit `auth.users`) wird angelegt, **falls je echte Profile-Daten** (Phone für Twilio-Pro, Avatar, etc.) gebraucht werden. Aktuell nicht nötig.

### 13.5 Schema-Refactor-Status

**Phase B abgeschlossen (Mai 2026).** Alle Schema-Refactor-Tasks vor MVP-Launch erledigt: B.1 (`tenant_members`) ✅, B.2 (UUID-FKs) ✅, B.3 (submissions.contact\_\*-Cleanup) ✅, B.4 (tenants als reine Account-Tabelle) ✅, B.5 (pages + fields, Kontaktfelder als reguläre Field-Types) ✅, B.6 (Webhook-Schema) ✅, B.7 (updated_at-Trigger-Konsistenz, mit B.5 erledigt) ✅.

**Aufgabe 34 Schema-Erweiterungen (2026-05-28):**
- `aufgabe_34_strip_icon_keys_from_field_options`: UPDATE auf `fields.options` jsonb — `icon_key` + `icon_url` aus allen Option-Objekten gestrippt (45 Fields betroffen, 175 Option-Einträge). Forward-only, kein DOWN-Pfad (Brand-Decision).
- `aufgabe_34_partial_submissions_schema`: `submissions.session_id uuid NOT NULL UNIQUE` + `submissions.completed_at timestamptz NULL` + 2 Indices. Backfill: 26 bestehende Rows als completed markiert. UPSERT-Identität für Partial-Submissions.

**Aufgabe 40 Schema-Erweiterungen (2026-05-29):**
- `aufgabe_40_webhook_actions`: `webhook_subscriptions.funnel_id NOT NULL` + `trigger_type DEFAULT 'on_submit'` + `trigger_page_id` (FK pages SET NULL) + CHECK + 2 neue Indices. `webhook_delivery_attempts.next_retry_at` + `response_status_code` + `response_body` + `event_type` + Retry-Queue-Index. `submissions.abandoned_webhook_fired_at` + partial Index für Cron-Cooldown. Additive — kein Backfill (webhook_* Tabellen waren leer).

**Aufgabe 41 Schema-Erweiterungen (2026-05-31):**
- `aufgabe_41_email_subscriptions`: 2 neue Tabellen. `email_subscriptions(id, funnel_id, tenant_id, name, recipient_type, delay_minutes, subject, body_html, from_local, is_active, …)` mit CHECK-Constraints (recipient_type IN customer/tenant, delay_minutes>=0, subject/body/name nicht leer) + 2 partial Indices + updated_at-Trigger + 4 RLS-Policies. `email_delivery_attempts(id, subscription_id, submission_id, scheduled_at, attempt_count, status, recipient_address, resend_message_id, next_retry_at, delivered_at, …)` mit CHECK (status IN pending/retrying/success/failed) + 4 Indices (subscription, submission, due-pending, due-retrying) + 1 SELECT-Policy. **Backfill:** 2 Default-Subscriptions pro existierendem Funnel (Customer-Confirmation + Tenant-Notification, beide delay=0) → 24 Rows für 12 bestehende Funnels. Forward-only mit DOWN-File für Rollback. Additive — keine bestehenden Daten geändert.
- `aufgabe_41_custom_recipient` (2026-05-31 abends): `email_subscriptions.recipient_type` CHECK erweitert um `'custom'` + neue Spalte `recipient_value text NULL` (comma-separated, max 3 Adressen, App-side enforced) + CHECK „bei custom muss recipient_value gefüllt sein". Additive, kein Backfill nötig.

**Aufgabe 43 Schema-Erweiterung (2026-05-31):**
- `aufgabe_43_funnel_tracking`: `funnels` + `meta_pixel_id text NULL` + `google_ads_conversion text NULL` (Turnkey-Conversion-Tracking, pro Funnel). Nullable, additiv, kein Backfill, kein CHECK (Format app-seitig validiert: `^[0-9]{5,20}$` / `^AW-[0-9]+(/[\w-]+)?$`). Direkt auf Produktion appliziert (mit User-Go — Branch-Test für 2 nullable Spalten unverhältnismäßig). DOWN-File vorhanden.

**Aufgabe 49 Schema-Erweiterung (2026-06-03):**
- `aufgabe_50_webhook_name`: `webhook_subscriptions` + `name text NULL` (Anzeigename pro Webhook, Konsistenz zu `email_subscriptions.name`). Backfill bestehender Rows aus dem URL-Host (`substring(url from '://([^/]+)')`). Additiv, direkt auf Produktion appliziert (mit User-Go). Rollback: `ALTER TABLE webhook_subscriptions DROP COLUMN name;`. (Migration-Name trägt aus History-Gründen `50`, gehört aber zum Aufgabe-49-Branch.)

**Aufgabe 51 Schema-Erweiterung (2026-06-06):**
- `aufgabe_51_funnel_show_answers_overview`: `funnels` + `show_answers_overview boolean NOT NULL DEFAULT false` (End-Screen-Antworten-Übersicht optional, Default aus = cleaner Dank). Additiv, kein Backfill-Risiko (Default false), direkt auf Produktion appliziert (mit User-Go). Rollback: `ALTER TABLE funnels DROP COLUMN show_answers_overview;`.

**Aufgabe 52D DB-Cleanup (2026-06-06):**
- `aufgabe_52d_delete_orphaned_submit_pages`: `DELETE FROM pages WHERE page_type='submit'` — 12 orphaned Submit-Pages + 52 Fields (via `fields.page_id` ON DELETE CASCADE). Reines Data-Cleanup, kein Schema-Change. Vorab geprüft: 0 webhook_subscriptions.trigger_page_id darauf, `submissions` ohne FK auf `pages` (Leads unberührt). Rollback: `..._DOWN.sql` (exakte Re-INSERTs der Snapshot-Zeilen) + tägliches Backup. Direkt auf Produktion appliziert (mit User-Go).

- `aufgabe_52d_drop_skip_submit_step` (**angewendet 2026-06-06 nach Deploy**): `ALTER TABLE funnels DROP COLUMN skip_submit_step`. Code-Referenzen in 52D entfernt, Deploy abgewartet (Reihenfolge gegen 500 im alten SELECT), dann gedroppt + verifiziert (Spalte weg, Prod-Widget lädt sauber). UP+DOWN liegen im Repo.

**Aufgabe 53 Migration (2026-06-06):**
- `aufgabe_53_strip_funnel_var_chips`: `UPDATE email_subscriptions` — strippt tote `<span data-variable="funnel.*">`-Chips aus `body_html` + `subject` (15 Mails). Reines Data-Cleanup (funnel.*-Variablen wurden in 52A aus `resolveVar` entfernt, rendern seither ''), per Dry-Run verifiziert (nur funnel.*-Chips weg, contact.*/Magic-Sections intakt). Safe für jede Code-Version. Rollback: `..._DOWN.sql` (exakte Re-UPDATEs der Snapshot-Werte) + Backup.

**Aufgabe 54 Migration (2026-06-09):**
- `aufgabe_54_replace_funnel_content_rpc`: neue RPC `replace_funnel_content(p_funnel_id, p_pages jsonb, p_fields jsonb)` — atomares Speichern des Funnel-Inhalts (eine Transaktion statt delete-then-insert in PUT `/api/tenant/funnels/[slug]`). Pages werden **upserted**, bestehende Page-UUIDs bleiben über Saves stabil (Editor reicht `dbId` wieder mit) → `after_page`-Webhook-Bindings (`trigger_page_id`, FK SET NULL) überleben das Speichern. SECURITY INVOKER (RLS gilt vollständig), EXECUTE nur für `authenticated`. Plus partial Index `idx_submissions_ip_completed` — der Rate-Limiter in `/api/submit` zählt seit 54 nur completed Submissions (10/10min, eigene Session ausgenommen). Additiv, direkt auf Produktion appliziert (mit User-Go), SQL-seitig getestet (3 Läufe inkl. Atomicity-Rollback via ungültigem enum-Cast). DOWN-File vorhanden (Achtung Reihenfolge: erst Code zurückrollen, dann Funktion droppen — der PUT nutzt die RPC).

**Aufgabe 54b Migration (2026-06-10):**
- `aufgabe_54b_advisor_hardening`: EXECUTE auf `rls_auto_enable()` für public/anon/authenticated revoked (Event-Trigger feuert systemseitig, braucht keine RPC-Grants) + `update_updated_at()` mit gepinntem `search_path = public, pg_temp` (Advisor 0011). `current_tenant_ids`/`current_tenant_role` bleiben bewusst für authenticated ausführbar — RLS-Policies rufen sie auf. Additiv, direkt auf Produktion appliziert, Trigger danach funktional verifiziert, DOWN-File vorhanden. **Manuell offen:** Leaked-Password-Protection ist ein Auth-Dashboard-Toggle (Authentication → Passwords), nicht per SQL setzbar.

**Aufgabe 56 Migration (2026-06-10):**
- `aufgabe_56_design_toggles`: `funnels` + `show_progress_bar boolean NOT NULL DEFAULT true` + `show_step_badge boolean NOT NULL DEFAULT true` + `title_alignment text NOT NULL DEFAULT 'left'` (CHECK `'left'|'center'`) — 3 Anzeige-Schalter für das Widget (ThemePanel-Sektion „Anzeige"). Additiv mit Defaults, direkt auf Produktion appliziert (mit User-Go), DOWN-File vorhanden.

**Aufgabe 57A Migration (2026-06-10):**
- `aufgabe_57a_drop_submit_button_label`: `ALTER TABLE funnels DROP COLUMN submit_button_label` — Spalte war tot seit 52D (kein Submit-Button mehr), Code-Referenzen in Aufgabe 56 Runde 4 entfernt, Drop nach Deploy (skip_submit_step-Pattern). Datenlage beim Drop: 2 Funnels mit Standard-Label 'Anfrage absenden' — exakter Snapshot-Restore im DOWN-File. Direkt auf Produktion appliziert (mit User-Go), Prod-Widget danach verifiziert.

**Aufgabe 57B Migration (2026-06-10):**
- `aufgabe_57b_email_test_logging`: `email_delivery_attempts` + `is_test boolean NOT NULL DEFAULT false` — Test-Mails landen seit 57B in der Versand-Historie (Konsistenz zu Webhook-Tests): `sendTestEmail` legt nach jedem tatsächlichen Send eine Attempt-Row an (submission_id NULL, Status terminal success/failed, delivered_at bei success wegen CHECK). Cron-Queues (pending/retrying) + `aggregateEmailStatusForSubmission` (filtert auf submission_id) bleiben unberührt. Additiv, direkt auf Produktion appliziert (mit User-Go), verifiziert (7 Bestands-Rows = false). DOWN-File vorhanden (Reihenfolge: erst Code zurückrollen, dann Spalte droppen).

**Nächste DB-Arbeit:** keine offen. `footer_*`-Spalten, orphaned Submit-Pages, `skip_submit_step` und `submit_button_label` sind weg (52B/52D/57A), tote funnel.*-Chips gestrippt (53), Funnel-Save atomar via RPC (54), Advisor-Härtung (54b), Test-Mail-Logging (57B).

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
