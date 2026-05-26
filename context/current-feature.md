# Current Feature

LeadPlug — SaaS-Funnel-Builder mit integriertem CRM für **Agenturen und Marketer**, die Funnels für ihre Endkunden bauen (branchen-offen). Multi-Tenant iFrame-Widget + Editor + Lead-Posteingang. Strategische Grundlagen siehe [`../CLAUDE.md`](../CLAUDE.md).

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

## Aktueller Status (Stand: 2026-05-22)

**Alle 3 Phasen abgeschlossen.** Das Stripe Billing ist vollständig implementiert und in Vercel deployed — aktuell im **Test-Modus** (Stripe Sandbox, `sk_test_...`).

### Stripe-Setup in Vercel (Production-Umgebung)

Folgende Env-Vars sind in Vercel eingetragen:

| Variable | Inhalt |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_51...` (Test-Key — für Production durch `sk_live_...` ersetzen) |
| `STRIPE_PRICE_ID_STANDARD` | `price_1TZygpQ5RyuRWopIg2SVj4PD` (49€/Monat, Test-Produkt) |
| `STRIPE_PRICE_ID_TEST` | `price_1TZzEyQ5RyuRWopIGMR2h0B4` (1€/Monat, Sofortkündigung — nur dev/staging) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (Signing-Secret des Stripe Webhook-Endpoints) |

Webhook-Endpoint in Stripe (Test-Modus): `https://app.leadplug.de/api/stripe/webhook`
Lauscht auf: `customer.subscription.created`, `.updated`, `.deleted`

### Wechsel auf Production (Live-Betrieb)

Wenn echte Zahlungen aktiviert werden sollen:

1. **Stripe Dashboard → Live-Modus** (Toggle oben links von "Test" auf "Live")
2. Neues Live-Produkt + Price anlegen (49€/Monat)
3. In Vercel ersetzen:
   - `STRIPE_SECRET_KEY` → `sk_live_...` (oder Restricted Key `rk_live_...` empfohlen)
   - `STRIPE_PRICE_ID_STANDARD` → neue `price_live_...`-ID
   - `STRIPE_PRICE_ID_TEST` → **leer lassen** oder entfernen (Test-Kachel verschwindet dann automatisch)
4. Neuen Live-Webhook in Stripe anlegen: `https://app.leadplug.de/api/stripe/webhook`
5. `STRIPE_WEBHOOK_SECRET` → neues `whsec_live_...` aus dem Live-Endpoint
6. Redeploy in Vercel

> **Wichtig:** `STRIPE_PRICE_ID_TEST` nur in Test-/Staging-Umgebungen setzen. Wenn die Env-Var fehlt, wird die Test-Kachel auf der Billing-Seite automatisch ausgeblendet.

### Billing-Portal-Konfiguration

Portal-Config-ID: `bpc_1TZypEQ5RyuRWopI3iAIq9DL` (Test-Modus, `mode: 'immediately'` für sofortige Kündigung).
Für Production eine neue Portal-Config im Live-Modus anlegen.

---

## Stripe Billing — Erweiterungsanleitung

### Neuen Plan hinzufügen (z.B. "LeadPlug Pro")

1. **Stripe Dashboard:** Neues Product + Price anlegen (oder via MCP: `create_product` → `create_price`)
2. **`.env.local` + `.env.example`:** Neue Env-Var eintragen:
   ```
   STRIPE_PRICE_ID_PRO=price_xxxxx
   ```
3. **`lib/stripe.ts`:** Export ergänzen:
   ```ts
   export const STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO ?? ''
   ```
4. **`/api/stripe/checkout/route.ts`:** Request-Body um `plan`-Parameter erweitern und je nach Wert den richtigen Price wählen.
5. **`/dashboard/billing/BillingClient.tsx`:** Upgrade-Button für den neuen Plan ergänzen.
6. Kein DB-Schema-Change nötig — `stripe_price_id` speichert die aktive Price-ID als String.

### Webhook lokal testen

```bash
# Stripe CLI installieren: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Das CLI gibt einen whsec_... Key aus → in .env.local als STRIPE_WEBHOOK_SECRET eintragen
```

### Produktions-Webhook einrichten

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://deine-domain.de/api/stripe/webhook`
3. Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Signing Secret in Produktions-Env als `STRIPE_WEBHOOK_SECRET` eintragen

### Free-Status für Testkunden

Direkt in Supabase (Admin-Client oder SQL):
```sql
UPDATE tenants SET billing_model = 'free' WHERE slug = 'kunde-slug';
```
→ Kein Stripe-Check, voller Funktionsumfang, keine Abrechnung.

---

## History

- **Phase A — Dokumentations- & Architektur-Reset (2026-05-26)** — Strategische Neu-Aufstellung des Projekts vor MVP-Sprint. Keine Code-Änderung, reine Doku- und Architektur-Arbeit (keine Aufgaben-Nummer vergeben, da kein Branch).

  *Strategische Entscheidungen (in CLAUDE.md verankert):* Zielgruppe pivotiert von "Handwerksbetriebe als Endnutzer" auf "Agenturen/Marketer als Plattform-User". Tenant-Modell neu definiert: Tenant = Agentur-Workspace mit Multi-User (Junction-Table `tenant_members` mit Rollen). Pricing-Strategie konkretisiert: 3 Tiers (Webhook ~29€ / Standard ~99€ / Pro ~249€) pro Tenant. GTM via strategische Partnerschaften mit Domain-Marktführern. Builder-Richtung festgelegt: linear, **kein** Node-Canvas (React Flow explizit abgelehnt nach Diskussion FormFlow-Vergleich).

  *DB-Architektur-Entscheidungen:* RLS-Pattern auf vollständige Policies (SELECT/INSERT/UPDATE/DELETE) erweitert — Service-Key nur noch für anonyme/system-Endpoints. UUID-FKs überall, Slugs nur für öffentliche URLs. `tenants` wird zur reinen Agentur-Account-Tabelle, `funnels` trägt alle endkunden-spezifischen Daten. `tenant_members` minimal halten (kein Profile-Layer, YAGNI).

  *Doku-Neuaufstellung:* [`CLAUDE.md`](../CLAUDE.md) komplett neu geschrieben (15 Sektionen, Single Source of Truth). [`context/project-overview.md`](project-overview.md) neu geschrieben (echtes DB-Schema, alle 10 API-Routes, 12-Schritt Submission-Flow inkl. Rate-Limiting). [`context/supabase-schema.md`](supabase-schema.md) als technische Vollreferenz aus Live-DB regeneriert (Enums, Tables, Constraints, Indices, RLS-Policies, Functions, Triggers). [`context/roadmap.md`](roadmap.md) als granulare Aufgaben-Quelle erstellt (Phasen A-E, Sub-Nummern B.1-B.7 für anstehenden Schema-Refactor, Phase E mit allen v2/Pro-Features). Aufgaben-Nummerierung bleibt sequenziell — nächste Code-Aufgabe ist **Aufgabe 25** (= Phase B.1 `tenant_members` + RLS-Refactor).

  *Veraltete Files entfernt:* 8 Files aus `context/` gelöscht — `supabase-schema.sql`, `.svg`, `Ablaufdiagramm.png`/`.txt`, `datenbank-schema.html`, `submission-flow.html`, `admin-funnel-creator.html`, `saas-architektur.html`. Grund: zeigten nicht-existente Tabellen (`industries`, `funnel_options`, `themes`), nicht-existente Spalten (`industry`, `lead_price_base`, `flat_monthly_price`, `funnel_title`, `tenants.contact_email`) oder waren strukturell redundant zur neuen MD-Doku.

  *Behalten + Rollen geklärt:* `tenant-funnel-editor.html` (Editor-Struktur), `funnel-funktionsweise.html` (UI-Konzept, wird Phase B.5 obsolet), `workflows.html` (Auth-Flows, Korrektheit verifiziert — `proxy.ts` ist Next-16-Standard), `resize-erklaerung.html` (postMessage), `saas-phasenplan.html` (visuelle High-Level Phasen-Übersicht — bleibt parallel zu `roadmap.md` als User-gepflegtes Status-Visual).

  *Nächster Schritt:* Phase B startet mit **Aufgabe 25 — `tenant_members` + komplette RLS-Refactor**. Eigene Planungs-Session, Supabase-Branch via MCP, dann Code auf Feature-Branch `feature/aufgabe-25-tenant-members`.

  (`CLAUDE.md`, `context/project-overview.md` (rewrite), `context/supabase-schema.md` (rewrite), `context/roadmap.md` (neu), `context/current-feature.md`, Memory-Files in `C:\Users\Stavros\.claude\projects\c--Programmieren-leadplug-saas\memory\`)

- **Aufgabe 24 – Funnels-Übersicht-Polish & Roadmap-Wiederbelebung** – Mehrere kleinere UX-Verbesserungen rund um Funnel-Verwaltung und Einbindung, plus Roadmap-Erweiterung.

  *Funnels-Übersicht:* Inaktive Funnels werden ans Ende der Liste sortiert (neue `order("is_active", desc)`-Klausel vor dem `created_at`-Sort in [page.tsx](app/dashboard/funnels/page.tsx)). Inaktive Karten erscheinen mit `opacity-75`, Color-Bar oben auf `opacity 0.35` gedimmt, Hover hebt Opacity wieder voll an. "Öffnen"-Button verschwindet bei `!isActive` komplett — verhindert Klicks die zu nicht erreichbaren URLs führen.

  *Saubere 404-Behandlung:* `TenantInactiveError` in [lib/getTenantConfig.ts](lib/getTenantConfig.ts) als `export class` markiert. In [app/[slug]/page.tsx](app/[slug]/page.tsx) wird der Error gefangen und in `notFound()` umgemünzt — direkter Aufruf einer inaktiven Funnel-URL (Bookmark, alter Embed) gibt jetzt sauberes 404 statt generischer Next.js-Server-Error-Page. Auch in `generateMetadata` gefangen.

  *Embed-Tab umbenannt:* "Embed-Code" → "Einbinden" in [TabNav.tsx](app/dashboard/TabNav.tsx). Laienfreundlicherer Begriff für die Zielgruppe (Handwerker ohne Tech-Background).

  *Editor-Shortcut Code kopieren:* Neuer Block im Sidebar-Footer von [EditorSidebar.tsx](components/tenant-editor/EditorSidebar.tsx) — Copy-Button mit Lucide `Copy`/`Check`-Icon, Toast-Feedback ("Kopiert" für 2s, grüner Border). Nur sichtbar bei `originalSlug && state.isActive` (kein Code für unspeicherte oder inaktive Funnels). Snippet-Generierung in neue [lib/embedSnippet.ts](lib/embedSnippet.ts) ausgelagert — Single Source of Truth, von EmbedBlock und Sidebar gleichermaßen verwendet. Base-URL aus `NEXT_PUBLIC_BASE_URL` mit `window.location.origin`-Fallback.

  *Platzhalter für Phase-5-Features:* Zwei "Bald verfügbar"-Sektionen auf der Embed-Seite ([embed/page.tsx](app/dashboard/embed/page.tsx)): "Anleitung für deine Plattform" (Sparkles-Icon) und "Conversion-Tracking für Google Ads & Facebook" (BarChart3-Icon). Sichtbare Roadmap für Tenants, hält die Erkenntnis aus dem Gemini-Tracking-Gespräch fest.

  *Health-Check-Panel entwirrt:* Im [HealthCheckPanel.tsx](components/tenant-editor/HealthCheckPanel.tsx) wurde der Header "Funnel-Status" verwirrend doppelt verwendet (Panel zeigte "Bereit" auch bei inaktivem Funnel, während der Footer "Inaktiv" zeigte). Header umbenannt zu "Konfiguration". Status-Logik in drei Zustände aufgeteilt: `issues` (amber "X Hinweise"), `inactive` (grau "Inaktiv" — Konfiguration ok aber Funnel nicht öffentlich), `ready` (grün "Vollständig"). Bei `inactive` zeigt das aufgeklappte Panel einen klickbaren Hinweis "Konfiguration vollständig, aber Funnel ist deaktiviert — jetzt aktivieren", der via `onJumpTo("funnel_status_toggle")` zum Aktiv/Inaktiv-Button im Footer scrollt + flasht. `data-field="funnel_status_toggle"` auf dem Toggle in [EditorSidebar.tsx](components/tenant-editor/EditorSidebar.tsx).

  *Navbar-Polish:* Mehrere Verbesserungen am Dashboard-Header. **Brand-Logo links eingebaut:** Zap-Icon in primary-Box + Wordmark "LeadPlug" als Link zu `/dashboard`. Gibt der Navbar einen visuellen Anker und macht das Produkt sofort erkennbar. **Theme-Toggle als simpler Hell/Dunkel-Toggle** ([ThemeToggle.tsx](components/ui/ThemeToggle.tsx)): Button zeigt das jeweilige Gegen-Icon (Sun im Dark, Moon im Light) — auf einen Blick erkennbar was passiert. Beim ersten Besuch wird OS-Setting (`prefers-color-scheme`) als Default verwendet, danach merkt sich `localStorage` die User-Wahl. (Vorher kurz mit 3-Modi-Dropdown experimentiert — verworfen, weil das `Monitor`-Icon für "System" zu unklar war.) Inline-Script in [app/layout.tsx](app/layout.tsx) entsprechend angepasst. **Account + Logout konsolidiert** zu neuem [UserMenu.tsx](components/ui/UserMenu.tsx): Avatar-Button mit Initialen aus `tenant.company_name` (Fallback: User-Icon) + Chevron, Hover/Klick öffnet Dropdown mit User-Name + E-Mail, Account-Einstellungen, Abmelden (rotes Label). `userName` + `userEmail` werden vom Dashboard-Layout aus `tenant.company_name` und `user.email` zugespielt. **Tabs als Pills** statt Underline: aktiver Tab bekommt `bg-primary/10` mit primary-Text, Hover-States subtil grau. Mobile-Variante (nur aktiver Tab sichtbar) ebenfalls als Pill. **Border subtiler:** `border-b-2 border-primary` → `border-b border-gray-200 dark:border-gray-800`. Primary bleibt nur als aktiver Tab-Indikator. Mobile-Hamburger-Menü erbt das neue rote Abmelden-Styling. **Navigation mittig zentriert** (Desktop): Tab-Pills sind absolut positioniert (`inset-x-0 top/bottom-0 + justify-center`), unabhängig von Logo- und Action-Spalten-Breite. Logo links, Actions rechts, Nav exakt in der Mitte — klassisches SaaS-Layout (Linear, Notion).

  *Erkenntnis Tenant-Architektur:* `tenants` ist aktuell 1:1 mit `auth_user_id` verknüpft — ein User = ein Tenant. Für Agenturen (Phase-5-Zielgruppe) reicht das nicht: Geschäftsführer + Bürokraft müssen denselben Workspace verwalten können. Saubere Lösung wäre Junction-Table `tenant_members(tenant_id, user_id, role)` mit Rollen `owner/editor/viewer`. Plus: Whitelabel-Logo (`tenants.brand_logo_url` + `brand_name`) als Premium-Plan-Feature, sodass Agenturen ihren Endkunden ihre eigene Marke statt "LeadPlug" präsentieren können. Beide Punkte als eigene Tasks in Phase 5 der Roadmap eingetragen ([saas-phasenplan.html](context/saas-phasenplan.html)).

  *Mobile-Header-Bugs:* Drei Bugs gefixt. (1) Aktueller Tab wurde doppelt angezeigt — als Pill in der Menüleiste und im Hamburger-Menü; Mobile-Pill komplett aus [TabNav.tsx](app/dashboard/TabNav.tsx) entfernt, TabNav rendert jetzt nur noch Desktop-Pills. (2) Billing fehlte in `TAB_ICONS`-Mapping → Eintrag im Hamburger-Menü ohne Icon; `CreditCard` aus Lucide ergänzt. (3) Hamburger-Menü blieb beim Klick außerhalb offen; `useEffect` mit `mousedown`- + `keydown`-Listener (Escape) in [DashboardHeader.tsx](app/dashboard/DashboardHeader.tsx) ergänzt, schließt das Menü zuverlässig. Bonus: aktiver Eintrag im Hamburger-Menü bekommt jetzt `bg-primary/10` + primary-Text-Markierung — konsistent zu den Desktop-Tab-Pills.

  *Vision-Erweiterung der Roadmap (Phase 6):* Acht zusätzliche Vision-Punkte aus den heutigen Architektur-Gesprächen festgehalten: Lead-Pipeline (Kanban statt Liste), Termin-Booking direkt im Funnel, KI-Features (Lead-Scoring, Auto-Funnels, Smart-Templates), Onboarding-Wizard, Audit-Log/Änderungshistorie (besonders relevant mit Team-Workspaces), visueller E-Mail-Template-Editor, Mehrsprachigkeit (DE/EN). Macht die zukünftige Richtung des Produkts dokumentiert greifbar — keine "verlorenen Ideen" mehr.

  *Roadmap-Wiederbelebung:* [`context/saas-phasenplan.html`](context/saas-phasenplan.html) war zuvor reines Logbuch (Phase 1–3, alle "abgeschlossen"). Erweitert um drei neue Phasen mit eigenem Farbcode (Blau/Teal/Slate), Status-Badges (In Arbeit / Geplant / Vision) und neuen Task-Varianten (`task-progress`, `task-todo`, `task-vision`). **Phase 4** (in Arbeit): die heutigen Punkte + offener Editor-Mikropolish. **Phase 5** (geplant, Zielgruppe Agenturen): Conversion-Tracking via postMessage als erwachsene Antwort auf Geminis Skript-Embed-Vorschlag (80% Nutzen, 10% Komplexität), Plattform-Anleitungen mit Screenshots, Webhook/Zapier, Tenant-Subaccounts für Agenturen, Funnel-Vorlagen, Server-Side Conversion API. **Phase 6** (Vision): A/B-Testing, Verzweigungs-Logik, White-Label-Domain, öffentliche API.

  *Erkenntnis aus dem Architektur-Gespräch:* Skript-Embed (Web Component) vs. iframe wurde diskutiert — für Lead-Gen-Forms ist iframe weiterhin die richtige Wahl (Sandbox, kein CSS/JS-Konflikt, geringerer Support-Aufwand). Tracking-Lücke wird stattdessen über postMessage-Events + optionalen Bridge-Snippet gelöst (Phase 5). Branche-Vergleich: Typeform/Calendly/Tally sind alle iframe-basiert.

  (`app/dashboard/funnels/page.tsx`, `components/dashboard/FunnelCard.tsx`, `app/[slug]/page.tsx`, `lib/getTenantConfig.ts`, `app/dashboard/TabNav.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/layout.tsx`, `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/HealthCheckPanel.tsx`, `components/ui/ThemeToggle.tsx`, `components/ui/UserMenu.tsx` (neu), `lib/embedSnippet.ts` (neu), `app/admin/[slug]/EmbedBlock.tsx`, `app/dashboard/embed/page.tsx`, `app/layout.tsx`, `context/saas-phasenplan.html`, `context/current-feature.md`, `CLAUDE.md`)

- **Aufgabe 23 – Editor-Verlinkung, Test-Modus & UX-Polish** – Umfangreiche Editor-Verbesserung in mehreren Phasen.

  *Bidirektionale Sidebar↔Preview-Verlinkung (vollständig):* `hl()`-Helper in [`funnel.tsx`](components/funnel.tsx) auf variadische Keys umgebaut (mehrere Highlight-Trigger pro Element). `var(--color-primary)` statt hartem `#3b82f6` (Tailwind-v4-Token, kein hartcodiertes Indigo). Hinzugefügte Highlight-Marker: Slider-Bereiche (`slider_min/max/step/unit/default`), Text-Inputs (`text_input/placeholder/required`), Footer (`footer`), Header-Banner (`header_banner`), Theme-Felder (alle Design-Keys), Page-Background, individuelle Kontaktfelder (`contact_field_${key}`), Footer-Items pro Position (`footer_company/email/phone`). Bug gefixt in [`SectionFragen.tsx`](components/tenant-editor/SectionFragen.tsx): Slider-Inputs hatten alle `data-field="question_title"` (Copy-Paste-Bug) → jetzt korrekt `slider_min/max/step/unit/default`. `SectionDesign`, `SectionKontakt`, `SectionTexte` mit `data-field` + spezifischen `onFocus`-Calls vervollständigt.

  *Preview→Sidebar Klick-Navigation (neu):* Optionales `onFieldClick`-Prop in `funnel.tsx` + beiden Email-Mockups; `data-edit-field`-Attribute auf allen highlightbaren Elementen. `onClickCapture` am äußeren Wrapper fängt Klicks ab, `preventDefault + stopPropagation` verhindert dass Option-Buttons den Funnel weiterschalten. `commandFocus`-State in [`FunnelEditorShell.tsx`](components/tenant-editor/FunnelEditorShell.tsx) (Field + QuestionIndex + Timestamp), Sidebar reagiert via `useEffect` → öffnet richtige Akkordeon-Section + Question-Card + scrollt + fokussiert Input. Bei nicht-fokussierbaren Targets (Divs wie Kontaktfeld-Zeilen): CSS-Flash-Animation `editor-field-flash` (1.2s ease-out). `header_banner` aliased zu `footer_company` (Banner = Firmenname).

  *Outline-Strategie:* Zwei `hl()`-Varianten — `hl()` mit `outlineOffset: 3px` (außen, mit Abstand vom Element) für Mittel-Elemente; `hlEdge()` mit `outlineOffset: -2px` (innen) für Elemente an der Card-Kante (Header-Banner, Footer, Card selbst, Page-BG), die sonst durch `overflow:hidden` der Card geclippt würden.

  *Test-Modus:* Toggle-Button im PreviewPanel (`▶ Funnel testen` / `🖊 Editor öffnen`, Primär bzw. Amber). Im Test-Modus: `onFieldClick=undefined` + `activeField=""` → Funnel verhält sich wie Live-Widget; Funnel-Key remountet (`${previewMode}-test` ohne `previewIndex`) damit interner State während Test erhalten bleibt; Step-Navigation am oberen Rand läuft mit via neues `onStepChange`-Callback in `funnel.tsx` (`useEffect` auf `currentStep/isContactStep/isSubmitted`). Step-Nav-Buttons im Test-Modus disabled (Navigation nur über interne Weiter/Zurück-Buttons). Sidebar wird gedimmt (Overlay mit `backdrop-blur`, zentriertes Modal: "Test-Modus aktiv — Bearbeitung pausiert" + CTA "Editor öffnen").

  *Sidebar Resize:* Drag-Handle (1px breit, primary on hover, `cursor: col-resize`) zwischen Sidebar und Preview. Breite per `useState` + Pointer-Events global (funktioniert auch wenn Cursor das Handle verlässt). Min 320px, Max 560px, Default 480px. Persistiert in `localStorage` (Key: `editorSidebarWidth`). CSS via `md:w-(--sidebar-w)` + Inline-CSS-Custom-Property.

  *Mobile-Preview-Toggle:* Segmented Control (Monitor/Smartphone) rechts neben Test-Button. Mobile schnürt Inhalt auf `max-width: 375px` (iPhone-Standard) mit smooth Transition.

  *Health-Check Panel (neu):* [`HealthCheckPanel.tsx`](components/tenant-editor/HealthCheckPanel.tsx) als Komponente direkt unter Sidebar-Header. Status-Badge (grün "Bereit" / amber "N Hinweise"). Geprüft: Funnel-Name vorhanden, ≥1 sichtbare Frage, jede Frage hat Titel, Choice-Fragen haben ≥2 Optionen mit Text, ≥1 sichtbares Kontaktfeld, ≥1 Pflichtfeld. **Bewusst nur echte blockierende Hinweise** — keine "info"-Severität mit grauen Punkten, da unklar für User. Jeder Hinweis ist klickbar → springt via `commandFocus` (gleicher Mechanismus wie Preview-Klick) direkt zum betroffenen Feld.

  *Frage duplizieren:* Copy-Button auf jeder Question-Card (zwischen Akkordeon-Toggle und Trash). `duplicateQuestion()` klont mit frischen `_id`s für Frage + alle Options, hängt direkt nach dem Original an, Titel-Suffix "(Kopie)", Auto-Open der neuen Karte.

  *Bulk-Import Options:* Bei Choice-Fragen neuer Outline-Button "📋 Mehrere auf einmal" → Textarea (eine Option pro Zeile) + zwei Aktionen: "Anhängen" / "Ersetzen". Trim + leere Zeilen filtern. `newOption(label)` mit Label-Argument.

  *Defaults & Platzhalter:* Neue Choice-Frage startet mit 3 vorgefüllten Optionen ("Option 1/2/3") statt leeren Feldern. Frage-Titel zeigt "Ihre Frage?" als italic-grauer Platzhalter im Editor-Modus wenn leer. Untertitel-`<p>` wird im Editor zusätzlich gerendert wenn `previewHighlight === "question_subtitle"` (zeigt "Untertitel (optional)" als Platzhalter).

  *Modal beim Neuer Funnel:* Bei `mode === "create"` und leerem Namen wird vor dem Editor ein 1-Schritt-Modal eingeblendet ("Wie soll dein neuer Funnel heißen?") mit Autofocus + Enter-Submit + Escape-Cancel. Cancel routet zurück zu `/dashboard/funnels`. So entsteht die "Funnel-Name fehlt"-Warnung nie bei neuen Funnels.

  *UI-Polish:* (1) Speichern-Button im Outline-Style wenn `!isDirty` (transparent + Border, hover primary), voll-primary mit amber Dot bei Änderungen. (2) Save-Status-Badge gekürzt von Satz auf "● Gespeichert" / "● Ungespeichert" mit farbigem Dot. (3) "Option hinzufügen" + "Mehrere auf einmal" als Outline-Buttons statt Text-Links (visuell gleichwertig). (4) Fragen-Sektion mit subtilem 2px Primärfarben-Akzent links via neues `emphasized`-Prop in `SectionAccordion`. (5) Question-Card Border in Dark-Mode von `gray-700` auf `gray-600` (kontrastreicher). (6) Funnel-Name-Input in Sidebar-Header mit sichtbarer Border + Background + Padding (vorher: nur Underline on Hover). (7) Frage-Titel im Editor mit italic-grauem "Ihre Frage?" Platzhalter wenn leer. (8) `editor-field-flash` Keyframe in [`globals.css`](app/globals.css) für visuelles Feedback auf nicht-fokussierbare Sidebar-Ziele. (9) `app/dashboard/layout.tsx`: `max-w-5xl` → `max-w-7xl` (1216px Content-Breite).

  *Architektonische Hinweise (für nächste Iteration):* `funnel.tsx` macht weiterhin doppelt Dienst als Runtime-Widget und Editor-Preview. Erkannt durch `previewHighlight`/`onFieldClick`/`onStepChange` als Editor-only Props (im Live-Widget undefined → No-Ops). `TenantFunnelClient` setzt keine Editor-Props → Live-Widget byte-identisch zum Stand vor dieser Aufgabe. Stripe-Type-Errors im TS-Build sind pre-existing (nicht durch diese Aufgabe verursacht).

  (`components/funnel.tsx`, `components/tenant-editor/FunnelEditorShell.tsx`, `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/PreviewPanel.tsx`, `components/tenant-editor/SectionAccordion.tsx`, `components/tenant-editor/SectionFragen.tsx`, `components/tenant-editor/SectionKontakt.tsx`, `components/tenant-editor/SectionTexte.tsx`, `components/tenant-editor/SectionDesign.tsx`, `components/tenant-editor/EmailPreviewMockup.tsx`, `components/tenant-editor/LeadEmailPreviewMockup.tsx`, `components/tenant-editor/HealthCheckPanel.tsx` (neu), `app/globals.css`, `app/dashboard/layout.tsx`)

- **Aufgabe 22 – Stripe Billing Integration** – Vollständige Stripe-Integration für monatliche Abonnements. DB: `stripe_customer_id`, `stripe_subscription_id`, `stripe_subscription_status`, `stripe_price_id` zu `tenants` hinzugefügt. `lib/stripe.ts`: Server-seitiger Stripe-Client (API v2026-04-22.dahlia). `lib/billing.ts`: `isBillingActive()` Feature-Gate (free → immer aktiv; sonst Stripe-Status prüfen), `getSubscriptionStatus()`, `STATUS_LABELS`, `STATUS_COLORS`. API-Routen: POST `/api/stripe/checkout` (Checkout Session + auto-create Customer), POST `/api/stripe/webhook` (Signatur-Verifikation, subscription created/updated/deleted → DB), POST `/api/stripe/portal` (Customer Portal Session). Dashboard `/dashboard/billing`: zeigt Plan, Status-Badge, Upgrade-Button (→ Checkout), Abo-verwalten-Button (→ Portal), kostenlos-Hinweis bei free-Status; Billing-Tab in TabNav. Stripe Test-Produkt: `prod_UZ6u1GcNJgolwY` "LeadPlug Standard", 49€/Monat `price_1TZygpQ5RyuRWopIg2SVj4PD`. Erweiterungsanleitung für neue Pläne in `current-feature.md` dokumentiert. (`lib/stripe.ts`, `lib/billing.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/stripe/portal/route.ts`, `app/dashboard/billing/page.tsx`, `app/dashboard/billing/BillingClient.tsx`, `app/dashboard/TabNav.tsx`, `.env.example`)

- **Aufgabe 21 – Navigation & Leads/Kontakte-Umbau** – Navbar-Umbau: Account + Logout als Icon-only Buttons (Breakpoint `lg`/1024px für Hamburger-Menü), Icons für alle Tabs ergänzt (Leads: Inbox, Kontakte: Users, Funnels: Layers), Account-Farbe im Mobile-Menü korrigiert. Neue Tab-Struktur: "Leads" (detaillierte Ansicht mit aufklappbaren Antworten + Funnel-Filter/Von-Bis/Sort) + "Kontakte" (einfache Kontaktliste Name/E-Mail/Telefon/Funnel/Angelegt). TenantLeadsTable erweitert: Funnel-Filter, Von/Bis-Datum, Sortierung, Suche mit Icon, gruppierter Datumsbereich-Container. LeadsTable (Kontakte) vereinfacht: kein Status, keine PATCH-API, nur Lesezugriff. Beide Komponenten: Zähler nur bei aktivem Filter sichtbar, einheitliche Spalten-Styles, mobile Kartenreihenfolge korrigiert. DB: `notes`-Spalte gedroppt. (`app/dashboard/TabNav.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/TenantLeadsTable.tsx`, `app/dashboard/leads/page.tsx`, `app/dashboard/kontakte/page.tsx` (neu), `components/leads/LeadsTable.tsx`, `app/api/leads/[id]/route.ts`)

- **Aufgabe 19 – Editor Responsive, Navigation & E-Mail-Preview** – Responsiver Editor: Sidebar full-width auf Mobile, Preview-Panel `hidden md:block`, Live-Button (`ExternalLink`, `md:hidden`) im Sidebar-Header bei vorhandenem `originalSlug`. Status-Badge in PreviewPanel: grün "Alles gespeichert" / amber "Ungespeicherte Änderungen" für alle Modi inkl. E-Mail-Previews (nur Success+noQuestions bleibt amber). `isDirty` als berechneter Wert (`JSON.stringify(state) !== JSON.stringify(initialState)`) statt boolean-State — Zurücktippen hebt Dirty-Flag automatisch auf. Exit-Modal statt Browser-`beforeunload`: `window.__editorGuard` Global-Callback wird bei `isDirty` gesetzt; `TabNav` + `DashboardHeader` fangen alle Nav-Link-Klicks ab und zeigen das Modal mit `pendingHref` — nach Speichern/Verwerfen wird zum ursprünglichen Ziel navigiert. Header max-width-Fix: `max-w-5xl mx-auto` aus DashboardHeader-Inner-Div entfernt → full-width passend zum Editor-Layout. Account-Breadcrumb in `TabNav`: auf `/dashboard/account` erscheint `← Dashboard / Account`. E-Mail-Previews: `EmailPreviewMockup` nutzt `state.emailSenderLocal + "@anfragebestaetigung.de"` für Von-Feld; `LeadEmailPreviewMockup` + `TenantLeadNotification.tsx` auf neues Design umgestellt (farbiger Header-Banner, Kontaktfelder dynamisch aus `state.contactFields`/`tenantConfig.contactFields`, CTA-Button "Lead im Dashboard ansehen →", Footer "Übermittelt von leadplug.de"). (`components/tenant-editor/FunnelEditorShell.tsx`, `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/PreviewPanel.tsx`, `components/tenant-editor/EmailPreviewMockup.tsx`, `components/tenant-editor/LeadEmailPreviewMockup.tsx`, `emails/TenantLeadNotification.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/TabNav.tsx`)

- **Aufgabe 18 – Editor UX, Design System Fixes & Funnel-Verwaltung** – Umfangreiche UX-Verbesserungen am Tenant-Editor und Dashboard. *DB:* `funnel_title` → `contact_form_title` umbenannt (Migration via Supabase MCP); Slug-Generierung von menschenlesbar auf 8-stellige zufällige Base36-Codes umgestellt (`generateRandomSlug`). *Funnel löschen:* `DeleteFunnelButton` Client-Component (3 Varianten: `icon`, `full`, `badge`) mit Bestätigungs-Modal + Permanenz-Warnliste; DELETE-API prüft `is_active=false` server-seitig; Lösch-Reihenfolge: funnel_view_logs → submissions → funnel_questions → funnels. Delete-Button in EditorSidebar-Footer (badge) + Funnels-Übersicht-Kacheln (icon). *Editor UX:* Slug-Anzeige im Header entfernt; ← Zurück-Button mit Exit-Modal ("Ungespeicherte Änderungen" — Abbrechen/Verwerfen/Speichern); oranger Dot-Badge am Speichern-Button wenn `isDirty`; `beforeunload`-Guard bei ungespeicherten Änderungen. *Embed-Code-Seite:* zeigt Funnel-Namen als Akkordeon-Titel statt generisches "Embed-Code". *Funnels-Übersicht:* `FunnelCard` als eigenes Client-Component; gesamte Karte klickbar (→ Bearbeiten); Öffnen und Delete stoppen Event-Bubbling; Trash-Icon mit rotem Rand. *Design System Fixes:* `bg-primary/10` als aktiver Listenzustand in 5 Dateien durch `bg-gray-100 dark:bg-gray-800` ersetzt (MonthlyStats, SubmissionsTable, TenantLeadsTable, LeadsView, IconPicker); `Card`-Komponente + Funnel-Kacheln bekommen `border border-gray-100 dark:border-gray-800` für Dark-Mode-Sichtbarkeit; `button:not(:disabled)` global `cursor:pointer` in `globals.css`. *Preview-Verlinkung:* `SectionFragen` nutzt Event-Delegation (`onFocus` auf Card-Body-Div + `data-field`-Attribute) statt individueller `onFocus`-Props — deckt alle Felder inkl. Slider automatisch ab. *Bugfix:* `newOption()` startet mit `value = _id` (statt `""`) + `handleOptionLabelChange` stellt Eindeutigkeit bei identischen Labels sicher (Suffix -2, -3…) — verhindert `duplicate key`-Error in `funnel.tsx`. (`app/api/tenant/funnels/[slug]/route.ts`, `lib/editorUtils.ts`, `lib/getTenantConfig.ts`, `components/tenant-editor/DeleteFunnelButton.tsx` (neu), `components/tenant-editor/EditorSidebar.tsx`, `components/tenant-editor/FunnelEditorShell.tsx`, `components/tenant-editor/SectionFragen.tsx`, `components/dashboard/FunnelCard.tsx` (neu), `app/dashboard/funnels/page.tsx`, `app/dashboard/embed/page.tsx`, `app/admin/[slug]/EmbedBlock.tsx`, `components/ui/Card.tsx`, `app/globals.css`, `app/admin/MonthlyStats.tsx`, `app/admin/[slug]/SubmissionsTable.tsx`, `app/dashboard/TenantLeadsTable.tsx`, `app/admin/leads/LeadsView.tsx`, `app/admin/new/IconPicker.tsx`)

- **Aufgabe 17 – Tenant Funnel-Editor Dokumentation & isActive-Toggle** – HTML-Dokumentation des Funnel-Editors erstellt (`context/tenant-funnel-editor.html`): 11 Sektionen (Übersicht, Layout/Hierarchie, EditorState, EditorQuestion/ContactFieldConfig, Sidebar-Sektionen, PreviewPanel, Save-Flow, editorUtils, Datenfluss, kritische Regeln, Dateiübersicht). isActive-Toggle in EditorSidebar-Footer verschoben mit `DeactivateModal` (Bestätigung nur beim Deaktivieren). (`context/tenant-funnel-editor.html`, `CLAUDE.md`, `components/tenant-editor/EditorSidebar.tsx`)

- **Aufgabe 16 – Tenant Funnel Editor (Self-Service)** – Vollständiger Split-Screen-Editor für Tenants. `components/tenant-editor/` (neu): FunnelEditorShell (State-Owner), EditorSidebar (Akkordeon), SectionBasics/Design/Texte/Fragen/Kontakt, PreviewPanel (Live-Render via direktem `<Funnel>`-Render), SlugInput (Debounced Availability-Check), SectionAccordion. `lib/editorUtils.ts` (neu): buildTheme/buildFunnelConfig/buildQuestions/dbToEditorState/editorStateToFunnelRow/editorQuestionsToDbRows. `components/tenant-editor/defaults.ts` (neu): DEFAULT_EDITOR_STATE + DEFAULT_CONTACT_FIELDS. API-Routes (neu): GET+POST `/api/tenant/funnels`, GET+PUT `/api/tenant/funnels/[slug]`, GET `/api/tenant/slug-check`. Dashboard-Pages (neu): `/dashboard/funnels` (Liste), `/dashboard/funnels/new`, `/dashboard/funnels/[slug]/edit`. `components/funnel.tsx`: `previewHighlight`-Prop + `hl()`-Helper für blaue Outline-Highlights. `app/dashboard/TabNav.tsx`: Tab "Meine Funnels" ergänzt. Types: EditorOption, EditorQuestion, EditorState in `types/index.ts`. 0 DB-Migrationen, 0 neue npm-Pakete. (`components/tenant-editor/`, `lib/editorUtils.ts`, `app/api/tenant/`, `app/dashboard/funnels/`, `components/funnel.tsx`, `types/index.ts`, `app/dashboard/TabNav.tsx`)

- **Custom Icons Refactoring — One-File-Per-Icon + CUSTOM_ICON_REGISTRY** – Architektur auf skalierbare Struktur umgebaut: `components/icons/` (Verzeichnis neu), `_base.tsx` (Icon-Wrapper + CustomIconProps), `index.ts` (CUSTOM_ICON_REGISTRY als Single Source of Truth, davon abgeleitet: CUSTOM_ICONS + CUSTOM_ICON_LABELS). `custom-icons.tsx` gelöscht. 16 Custom-Icons, je eine eigene Datei: Mehrfamilienhaus, Zweifamilienhaus, Lagergebäude, Grundstück, Sonstige, Satteldach, Pultdach, Walmdach, Eigentümergemeinschaft, Dachziegel + 6 Kalender-Varianten (Sofort, <1 Monat, 1–3, 4–6, 7–12, >12 Monate). Alle Icons Lucide-konform (stroke-basiert, viewBox 0 0 24 24, strokeWidth 1.5). `components/icons.tsx`: Import aus `./icons/index`. `app/admin/new/IconPicker.tsx`: CUSTOM_ICON_LABELS aus Registry importiert (nicht mehr lokal definiert). `lucide-icon-anleitung.html` (Integrationsabschnitt aktualisiert auf CUSTOM_ICON_REGISTRY-Workflow). (`components/icons/`, `components/icons.tsx`, `app/admin/new/IconPicker.tsx`)

- **Admin UI Polish — Konsistenz & Theme-Erweiterungen** – `admin/new`: vollständiger Theme-Block (text_color, background_color, page_background_color, border_radius, max_width) mit Farbpickern; `free` als Abrechnungsmodell ergänzt (kein Preisfeld); Felder-Reihenfolge korrigiert (Slug+E-Mail-Präfix oben, dann Theme mit Font+4 Farben 2×2+Border-Radius/Max-Breite nebeneinander, dann Texte); Kontaktformular-Untertitel direkt nach Funnel-Titel. `admin/[slug]`: alle Labels auf Deutsch vereinheitlicht (Firmenname, Lead-Benachrichtigung (E-Mail), Abrechnungsmodell mit deutschen Werten + free-Case, DB-Keys → lesbare Labels, Widget-Hintergrund/Seiten-Hintergrund). `admin/preview`: alle Theme-Felder gemapped, icon_key in buildQuestions korrekt gelesen, max-w-2xl-Wrapper entfernt (w-full). `components/funnel.tsx`: maxWidth-Default von "720px" → "none" (iFrame begrenzt Breite). Demo-Funnel DB: funnel_title → "Jetzt kostenlos einrichten lassen", contact_form_subtitle → "Schneller Start, keine technischen Kenntnisse nötig." (`app/admin/new/page.tsx`, `app/admin/[slug]/page.tsx`, `app/admin/preview/page.tsx`, `components/funnel.tsx`)

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

- **Design-Token-System** – `globals.css` zur alleinigen Design-Grundlage gemacht: `--primary: #4648d4`, `--primary-hover: #3537b0`, unused oklch-Boilerplate (sidebar, chart, secondary, muted) entfernt, `.dark`-Block mit sinnvollen Slate/Indigo-Werten, `@theme inline` auf benötigte Tokens reduziert, Font von Geist → Inter korrigiert. Alle ~40 hardcodierten `[#4648d4]`/`[#3537b0]`-Klassen in 16 Dateien durch `primary`/`primary-hover`-Tokens ersetzt; `indigo-600/700` → `primary`/`primary-hover` in Buttons; `indigo-50/100/400` → `primary/10`, `primary/20`, `primary/60` (opacity-Varianten). (`app/globals.css`, `components/ui/Button.tsx`, `app/admin/AdminHeader.tsx`, `app/dashboard/DashboardHeader.tsx`, `app/dashboard/TabNav.tsx`, + 12 weitere)

- **Aufgabe 14 – Globale Leads-Übersicht** – Neue Seite `/dashboard/leads`: alle Submissions aller Tenants. Tab-Navigation im Header (Funnels | Leads). Tenant-Filter, Freitextsuche, Standard-CSV-Export, einklappbare Detailzeilen. (`app/dashboard/leads/page.tsx`, `app/dashboard/leads/LeadsView.tsx`, `app/dashboard/page.tsx`)

- **DB-Cleanup Tenant-Konsolidierung** – Alle Demo-Funnels unter einen `demo`-Tenant zusammengeführt. `klartext-demo` → `demo-klartext` umbenannt + von `leadplug` zu `demo` verschoben (inkl. Submission-Snapshot). `singotec-demo`-Funnel + `singotec`-Tenant gelöscht. 7 leere Einzel-Demo-Tenants (`bad-demo`, `dach-demo` etc.) gelöscht. Nur noch 2 Tenants in der DB: `demo` + `leadplug`.

- **Aufgabe 13 – Dashboard-Previews, DB-Cleanup & Billing-Enum** – `/dashboard/[slug]`: Funnel/Kontaktformular/Success-Vorschau als einklappbare Blöcke. `initialSubmitted` + `initialStep` Props in `funnel.tsx`. `plz`-Typ + Validierung. DB: `billing_model` als PostgreSQL-Enum, `billing_price`, `lead_price`, `contact` JSONB in `submissions`. (`components/funnel.tsx`, `lib/`, `types/index.ts`, `app/api/submit/route.ts`, `app/dashboard/[slug]/`)

- **Aufgabe 12 – Shadow-System (Widget)** – Kacheln: zweischichtiger Shadow, Farbglow bei Selected. Outer Card: weiches Shadow-Prinzip. Progress Bar `h-2`. Slider-Thumb mit Farbring. (`components/funnel.tsx`, `app/globals.css`)
