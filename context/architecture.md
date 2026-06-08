# LeadPlug — Architektur & Funktionsweise

> **Stand:** 2026-06-07 (nach Aufgabe 53 — Submit-Page entfernt, Webhooks + E-Mail-Drip + Conversion-Tracking live)
>
> Diese Datei ist die **technische Karte des Produkts**. Wenn du wissen willst „wie ist die App gebaut", „wo lebt was", „welche Komponente macht welchen Job" — hier nachlesen.
>
> **Komplement zu:**
> - [`CLAUDE.md`](../CLAUDE.md) §1-15 — strategische + organisatorische Wahrheit
> - [`supabase-schema.md`](supabase-schema.md) — vollständige DB-Referenz (Enums, Tables, RLS, Indices)

---

## 1. High-Level: Was tut die App?

LeadPlug ist ein **SaaS-Funnel-Builder mit integriertem Lead-Inbox** für Marketing-Agenturen. Die Architektur teilt sich in drei klar getrennte Welten:

```
┌──────────────────────────────────────────────────────────────────────┐
│  PRODUCT-WORLDS                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ① Dashboard         ② Builder           ③ Live-Widget (iFrame)      │
│  /dashboard/*        /dashboard/funnels  /[slug]                     │
│  (Agentur-Backend)   /[slug]/edit        (Endkunden-Funnel)          │
│                      (Funnel-Editor)                                  │
│                                                                       │
│  Auth: Supabase      Auth: Supabase      Auth: anonym                │
│  RLS pro tenant      RLS pro tenant      Service-Key am Server       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

Eine Agentur (= Tenant) loggt sich ins **Dashboard** ein, baut im **Builder** Funnel-Templates für ihre Endkunden, und embedded das fertige **Live-Widget** per iFrame auf den Websites ihrer Endkunden. Endkunden füllen den Funnel aus → Lead landet in der Lead-Inbox + per Webhook beim CRM des Tenants.

---

## 2. Tech-Stack

| Layer        | Technologie                                                            |
| ------------ | ---------------------------------------------------------------------- |
| Framework    | Next.js 16 App Router · Server Components default · React 19           |
| Sprache      | TypeScript strict                                                      |
| Styling      | TailwindCSS v4 mit Container Queries (`@container`)                    |
| Animation    | framer-motion (Slide-Transitions im Widget)                            |
| Drag & Drop  | @dnd-kit/core + @dnd-kit/sortable (Step-Reorder, Field-Reorder)        |
| DB / Auth    | Supabase Postgres mit RLS + Auth                                       |
| Mail         | Resend + React Email                                                   |
| Billing      | Stripe (Subscription, aktuell Test-Mode)                               |
| Deployment   | Vercel                                                                 |

Strict-Patterns die durchgehalten werden:
- **Server Components default**, Client Components nur `"use client"`-explicit
- **`runtime = "nodejs"`** auf API-Routes mit Supabase Service Key
- **Container Queries** statt klassischer Media Queries für das Widget (passt sich der iFrame-Breite an)
- **Validate at boundaries:** `/api/submit` validiert Lead-Daten, intern wird Typen vertraut

---

## 3. Codebase-Layout

```
leadplug-saas/
├── app/
│   ├── [slug]/                     # Live-Widget für Endkunden (iFrame-Embed)
│   │   ├── layout.tsx              # html/body { overflow: hidden }
│   │   └── page.tsx                # ruft getTenantConfig + rendert <TenantFunnelClient>
│   ├── dashboard/                  # Tenant-Backend (auth required)
│   │   ├── layout.tsx              # Tenant-Lookup + Auto-Tenant-Anlage beim ersten Login
│   │   ├── page.tsx                # Übersicht: Recent Leads + 14-Tage-Chart
│   │   ├── funnels/
│   │   │   ├── page.tsx            # Funnel-Liste (mit Lead-Count, completed-only)
│   │   │   ├── new/                # Neuer Funnel
│   │   │   └── [slug]/edit/        # Funnel-EDITOR
│   │   │       ├── page.tsx        # Server: lädt funnel + pages + fields → EditorState
│   │   │       └── FunnelEditorClient.tsx  # Client-Wrapper für EditorShell
│   │   ├── leads/                  # Lead-Inbox (3 Tabs: Completed / Abgebrochen-mit-Email / Abgebrochen-ohne) + Notizen
│   │   ├── statistiken/            # Monatliche Conversion-Charts
│   │   ├── account/, billing/      # Account-Settings · Stripe-Billing
│   └── api/                        # API-Routes (runtime nodejs)
│       ├── submit/                 # Final-Submit → UPSERT(completed) + after(): Webhooks + Drip-Mails
│       ├── track-progress/         # Partial-Submission + after_page-Webhook (debounced)
│       ├── track-view/             # View-Counter (funnel_view_logs)
│       ├── tenant/funnels/         # Funnel-CRUD + .../webhooks · emails · tracking · preview-leads
│       ├── tenant/slug-check/      # Slug-Uniqueness
│       ├── leads/[id]/             # Lead-Status + interne Notiz
│       ├── account/delete/         # Account-Löschung
│       ├── cron/webhook-retry/     # Vercel-Cron (5 Min): Webhook-Retry + Abbrecher + Mail-Queue
│       └── stripe/                 # checkout / portal / webhook
├── components/
│   ├── funnel.tsx                  # 🌟 DAS WIDGET (Live + Editor-Preview, ~2000 LOC)
│   ├── TenantFunnelClient.tsx      # Live-Wrapper um funnel.tsx (sessionId, postMessage)
│   ├── tenant-editor/
│   │   ├── defaults.ts             # DEFAULT_EDITOR_STATE + Factories (makeDefault*)
│   │   ├── DeleteFunnelButton.tsx
│   │   └── v2/                     # 🌟 DER BUILDER (3-Pane, ~3500 LOC verteilt)
│   ├── dashboard/                  # Cards, Charts, FunnelCard etc.
│   └── ui/                         # Design-System (Card, Badge, Button, Input, …)
├── lib/
│   ├── supabase/{server,client,admin}.ts  # 3 Supabase-Clients (User + Anon + Service)
│   ├── editorUtils.ts              # EditorState ⇄ DB-Pages+Fields Mapping (zentral!)
│   ├── getTenantConfig.ts          # Service-Key Load der Widget-Config aus DB
│   ├── tracking.ts                 # submissions UPSERT · honeypot · rate-limit · deriveContactFromAnswers
│   ├── webhooks.ts                 # Webhook-Sender: HMAC · Payload · Retry (Aufgabe 40)
│   ├── emails.ts / emailTemplates.ts  # Drip-Mail-Sender + Queue + Variablen/Magic-Sections (Aufgabe 41)
│   ├── validateContactField.ts     # Pflichtfeld-Validation pro field_type
│   ├── billing.ts / stripe.ts      # Plan-Logik + Stripe-Client
│   └── embedSnippet.ts             # iFrame-/Script-Embed-Code-Generator
├── types/index.ts                  # Zentrale Type-Definitionen (single source of truth)
├── supabase/migrations/            # SQL-Migrations (UP + DOWN, hourly-timestamp-Konvention)
└── context/                        # Doku-Files (du liest gerade eine davon)
```

---

## 4. Datenmodell (DB Schema)

Volle Referenz: [`supabase-schema.md`](supabase-schema.md). Hier die **Kernlogik**:

```
auth.users  ──┐                                          ┌─→ submissions
              │                                          │   (UPSERT auf session_id,
              ↓ membership                               │    completed_at-Flag)
tenant_members ─── owner/admin/member ──→ tenants ──→ funnels
                                                         │
                                                         │ 1:N
                                                         ↓
                                                       pages (page_type: welcome | question | custom | success)
                                                         │                    ('submit'-Enum-Wert verwaist seit 52D)
                                                         │ 1:N
                                                         ↓
                                                       fields (field_type: 19 Werte, siehe Type-System)
```

### 4.1 Multi-Tenancy
- **`tenants`** = Agentur-Account (Stripe-Felder, billing_model, lead_price, is_active, company_name)
- **`tenant_members`** = Junction-Table N:M (auth_user_id → tenant_id, role)
- **RLS überall**: Helper-Funktionen `current_tenant_ids()` + `current_tenant_role(uuid)` in der DB. User-Client nutzt RLS, Service-Key nur in dokumentierten Ausnahmen (siehe CLAUDE.md §13.2).

### 4.2 Funnel-Struktur (Aufgabe 30 + 38 + 39; Submit-Page entfernt 52D)
- **`funnels`** = pro Endkunde 1 Funnel. Hält: Theme (Colors/Font/Radius), Texte (success_message, response_message, etc.), `notification_email`, `email_sender_local`, `redirect_url`, `show_answers_overview`, Conversion-IDs (`meta_pixel_id`, `google_ads_conversion`). *(Footer-Spalten + `skip_submit_step` in Aufgabe 52 gedroppt.)*
- **`pages`** = ordered Liste pro Funnel. `page_type` ∈ {`welcome`, `question`, `custom`, `success`}. `config jsonb` für Page-Level-Settings (Title/Subtitle bei custom+welcome, button_label bei welcome). *(Enum-Wert `submit` existiert noch, wird aber seit 52D nicht mehr erzeugt.)*
- **`fields`** = N pro Page. `field_type` ∈ {19 Werte}. `config jsonb` für Type-spezifische Settings (z.B. slider {min/max/step}, rating {maxStars}, scale {min/max/labelLeft/labelRight})

### 4.3 Partial-Submissions (Aufgabe 34)
- **`submissions.session_id uuid UNIQUE`** = client-generierte UUID via sessionStorage (`lp_session_<slug>`)
- **`submissions.completed_at timestamptz NULL`** = NULL bei Abbrechern, NOW() bei finalem Submit
- Widget POSTet alle 600ms-debounced an `/api/track-progress` (UPSERT mit `completed=false`)
- Finaler Submit-Klick POSTet an `/api/submit` (UPSERT mit `completed=true` + Mails + Webhooks)
- **Pricing-Logik:** Lead = `completed_at IS NOT NULL` OR (`completed_at IS NULL` AND `contact->>'email'` befüllt)

### 4.4 Webhook-Schema (Schema Aufgabe 29 · Sender live seit Aufgabe 40)
- **`webhook_subscriptions`** = pro Funnel N: url, secret, event_types[], `trigger_type` (on_submit/after_page), `trigger_page_id`, name, is_active
- **`webhook_delivery_attempts`** = Audit-Trail + Retry-Queue (status, attempt_count, next_retry_at, response_status_code, last_error)
- Sender + HMAC + Cron-Retry + abandoned-Trigger: siehe §13 + [`webhook-architecture.md`](webhook-architecture.md).

---

## 5. Type-System: Field-Types (DB-Enum: 19 Werte)

Single Source of Truth ist `types/index.ts`. Die Types verteilen sich auf zwei verwandte Strukturen:

### 5.1 `QuestionType` (für Question-Pages, 1 Field pro Page)
```
single_choice    multi_choice    short_text    long_text
slider           date            number        dropdown
checkbox         rating          scale         statement
```

### 5.2 `ContactFieldConfig.type` (für Custom-Karten-Pages, N Fields pro Page)
```
text  email  tel  plz  radio  long_text  number  date  checkbox  dropdown  first_name  last_name  full_name
```

### 5.3 Mapping
- **DB-Enum `field_type`** ist der gemeinsame Pool (19 Werte): alle QuestionTypes + die ContactField-only-Types (`radio`, `email`, `tel`, `plz`, `first_name`, `last_name`, `full_name`, `text` als Alias zu `short_text`)
- `lib/editorUtils.ts` macht die Roundtrips: `questionTypeToFieldType()`, `fieldTypeToQuestionType()`, `fieldTypeToContactType()`, `CONTACT_TYPE_TO_FIELD_TYPE`
- **Vermeintliche Doppelung:** `text` (ContactField) = `short_text` (Question). Bewusste Aliasierung wegen historischer Gründe (Aufgabe 31 hat email + tel als Question-Types entfernt — bleiben aber als ContactField-Types).

---

## 6. Der Builder — 3-Pane-Editor (v2)

> Alles unter `components/tenant-editor/v2/`. Aktiv seit Aufgabe 32 (C.1a). v1 wurde in C.1d gelöscht.

### 6.1 Komponenten-Übersicht

```
EditorShell.tsx (~750 LOC)              ← der Hauptcontainer
├── TopTabs.tsx                            ← „Bearbeiten / Logik / E-Mails / Webhooks / Einbinden" (Inhalt+Design = ein Tab mit Inspektor-Umschalter)
├── ui/Panel.tsx                           ← geteilte Editor-Primitive (PanelShell/PanelHeader/Section/Field)
├── StepList.tsx                           ← linke Sidebar (Page-Liste, drag-reorder, +Button)
│   ├── StepPill.tsx                       ← einzelne Page-Pille
│   └── AddElementModal.tsx                ← „+ Frage hinzufügen"-Modal
├── CenterCanvas.tsx                       ← mittlere Vorschau-Spalte
│   └── nutzt <Funnel> aus components/funnel.tsx im editMode
├── PropertiesPanel.tsx                    ← rechte Properties-Spalte (~700 LOC)
│   ├── QuestionProps                      ← für kind=question
│   ├── CustomPageProps                    ← für kind=custom (Aufgabe 38)
│   ├── WelcomeProps                       ← für kind=welcome (Aufgabe 39)
│   ├── SuccessProps                       ← Success-Page mit Redirect-Toggle (Aufgabe 39)
│   ├── SortableContactFieldRow            ← Field-Row in Custom-Karten
│   └── properties/
│       ├── FieldRow.tsx                   ← Field-Row-Wrapper mit Drag, Eye, Trash
│       ├── FieldProperties.tsx            ← Question vs Contact-Field-Properties
│       ├── OptionsEditor.tsx              ← Drag-Reorder für Choice-Options
│       └── AddContactFieldPicker.tsx      ← Modal für „+ Feld hinzufügen"
├── ThemePanel.tsx                         ← Design-Tab-Inhalt (Aufgabe C.2)
└── vorlagen.ts                            ← (legacy, entfernt in Polish-Iteration 39)
```

### 6.2 Layout-Logik

| Top-Tab     | Body-Layout                                           |
| ----------- | ----------------------------------------------------- |
| `content` (Bearbeiten) | 3-Pane: StepList \| CenterCanvas \| PropertiesPanel — Inhalt + Design vereint via Inspektor-Umschalter (Aufgabe 45/49) |
| `emails`    | Master-Detail: EmailsPanel (Liste · Editor · Live-Vorschau) — **live** (Aufgabe 41) |
| `webhooks`  | WebhooksPanel (full-width) — **live** (Aufgabe 40)    |
| `share` (Einbinden) | SharePanel: Embed-Code + Conversion-Tracking — **live** (Aufgabe 42/43) |
| `logic`     | disabled (kommt mit C.4)                              |

### 6.3 Selection-Modell

```ts
type SelectedStep =
  | { kind: "question"; questionIndex: number }   // Question-, Custom- UND Welcome-Page (kind-Diskriminator)
  | { kind: "success" };                          // Success-Page
```

**Wichtig:** Welcome + Question + Custom teilen sich `state.questions[]` als ordered Liste mit `kind`-Diskriminator pro Entry. Die SelectedStep `kind: "question"` zeigt also auf einen Index, der ein Welcome, Question oder Custom-Page sein kann. PropertiesPanel routet anhand `state.questions[questionIndex].kind` auf den passenden Editor.

### 6.4 EditorState (= das was im Builder editiert wird)

Ein `EditorState` ist im Wesentlichen die gesamte Builder-State-Snapshot. Aktuelle Felder (siehe `types/index.ts` für die volle Liste):

- **Funnel-Metadaten:** funnelName, isActive
- **Theme:** primaryColor, textColor, backgroundColor, pageBackgroundColor, font, borderRadius, maxWidth
- **Funnel-Texte:** funnelTitle, contactFormSubtitle, submitButtonLabel, successMessage, responseMessage, privacyText, privacyPolicyUrl, answersOverviewLabel
- **E-Mail-Settings:** notificationEmail, emailSenderLocal
- **End-Screen-Verhalten:** redirectUrl (Aufgabe 39), showAnswersOverview (Aufgabe 51)
- **Conversion-Tracking:** metaPixelId, googleAdsConversion (Aufgabe 43)
- **Steps:** `questions: EditorQuestion[]` mit kind-Diskriminator (welcome/question/custom)

### 6.5 EditorQuestion — der Diskriminator-Trick

Statt drei separater Type-Arrays (questions, customPages, welcomeScreens) nutzen wir **EINE Liste mit kind-Diskriminator**:

```ts
interface EditorQuestion {
  _id: string;
  dbId?: string;
  kind?: 'question' | 'custom' | 'welcome';   // default 'question'

  // Gemeinsam (alle 3 Kinds)
  questionKey: string;
  title: string;
  subtitle: string;
  visible: boolean;

  // Nur für kind="question" relevant
  questionType: QuestionType;
  required: boolean;
  placeholder: string;
  maxLength: string;
  options: EditorOption[];
  sliderMin/Max/Step/Unit/Default
  dateMin/Max/Default
  numberMin/Max/Step/Default/Unit
  checkboxLabel
  ratingMaxStars                    // Aufgabe 39
  scaleMin/Max/LabelLeft/LabelRight // Aufgabe 39

  // Nur für kind="custom"
  customFields?: ContactFieldConfig[];

  // Nur für kind="welcome"
  welcomeButtonLabel?: string;
}
```

**Pragmatische Trade-Off-Entscheidung:** EditorQuestion ist breit (viele optionale Felder) — würden wir streng nach Page+Elements-Modell trennen, hätten wir 3 Type-Arrays und Sync-Probleme bei Sortierung. Mit Diskriminator bleibt `state.questions[]` als ordered Liste 1:1 mit den gerenderten Steps.

---

## 7. Das Widget — components/funnel.tsx (~2000 LOC)

> Eine einzige Datei. Hands-off ohne Absprache (CLAUDE.md §11). Wird sowohl im Live (`/[slug]/page.tsx` via `<TenantFunnelClient>`) als auch im Builder-Center-Canvas (mit `editMode={true}`) verwendet.

### 7.1 Doppelrolle: Live + Builder

Der Funnel rendert sich identisch in zwei Kontexten, gesteuert über Props:

| Prop                    | Live          | Builder         | Test-Mode-im-Builder |
| ----------------------- | ------------- | --------------- | -------------------- |
| `editMode`              | false         | true            | false                |
| `onFieldClick`          | undefined     | gesetzt         | undefined            |
| `onTextChange`          | undefined     | gesetzt         | undefined            |
| `onAddOption`           | undefined     | gesetzt         | undefined            |
| `onAddCustomFieldRequest` | undefined   | gesetzt         | undefined            |
| `onSubmit`              | echter Submit | No-Op           | No-Op                |
| `onAnswersChange`       | track-progress | undefined      | undefined            |
| `previewHighlight`      | ""            | selectedFieldRef | ""                  |

### 7.2 Step-Modell (Widget-intern)

Das Widget weiß nichts von Welcome/Custom/Submit auf Schema-Ebene — es bekommt eine `questions: QuestionConfig[]` mit `kind`-Diskriminator pro Entry. Die Render-Logik branchet:

```
isWelcomeStep    = currentQuestion?.kind === "welcome"
isCustomStep     = currentQuestion?.kind === "custom"
isStatementStep  = currentQuestion?.questionType === "statement"
isChoiceType     = single_choice + nicht welcome + nicht custom (für Auto-Advance)
isLastStep       = currentStep === visibleQuestions.length - 1  (Submit am Ende via autoFinish)
showWeiterButton = !isChoiceType
```

Render-Pipeline pro Step:
1. **Header-Bereich** (Step-Counter, Solo-Back-Button bei single_choice — bei welcome hidden)
2. **Title + Subtitle** (EditableText im editMode, sonst statisch — clamp() für fluid typography)
3. **Type-Block** branchet auf `currentQuestion.kind` und `questionType`:
   - Welcome → kein input, nur Bottom-Action-Bar mit welcomeButtonLabel
   - Custom + customFields.length > 0 → vertikaler Multi-Field-Stack
   - Custom + customFields.length === 0 + editMode → „+ Feld hinzufügen"-Button (bubble nach EditorShell)
   - Statement → kein Input, OK-Button advances
   - single_choice/multi_choice → Letter-Chip + Label vertikal
   - slider → großer Number-Readout + Range
   - rating → Sterne mit Hover-Preview (RatingStars-Helper)
   - scale → 0-N Buttons (ScaleButtons-Helper)
   - long_text → Textarea
   - short_text, number, date, dropdown, checkbox → Standard-Inputs
4. **Bottom-Action-Bar** ([BackButton tinted] + [primary OK-Button mit kontext-Label])
5. **Honeypot** (am Widget-Root, unsichtbar — seit 52D nicht mehr im Kontaktformular)
6. **Letzter Step:** OK-Button löst `autoFinish()` aus (kein separates Kontaktformular mehr; Consent = Checkbox-Feld mit Markdown-Link)

### 7.3 Submit-Pipeline (seit 52D: kein Submit-Step mehr — `autoFinish` am Funnel-Ende für ALLE Funnels)

```
Widget                                Server
─────                                 ──────
[OK-Klick auf letztem Step]
        └─► autoFinish()
              ├─► postMessage 'funnel-submit' an Parent (Conversion, PII-frei)
              ├─► setIsSubmitted(true)
              └─► onSubmit({answers, contact, honeypot})
                    │
                    ▼
              /api/submit
              ├─► Honeypot-Check (→ 200, kein Lead)
              ├─► Rate-Limit (3/IP/10min)
              ├─► getTenantConfig
              ├─► deriveContactFromAnswers(answers)   # Lead-Daten aus Karten-Antworten
              ├─► Card-Backstop-Validierung (Pflicht-Custom-Felder serverseitig)
              ├─► upsertSubmissionProgress(completed=true)
              └─► after(): triggerOnSubmit (Webhooks) + triggerEmailsOnSubmit (Drip-Mails)

[redirectUrl?] ─ja──► nach 1.5s window.location.replace(url)
[sonst] ───────────► Success-Page (responseMessage + optional answers-overview)
```

### 7.4 Partial-Submissions

Jede 600ms-debounced State-Änderung im Widget triggert:
```
onAnswersChange({answers, contact}) ─► TenantFunnelClient
                                       └─► /api/track-progress (UPSERT, completed=false)
```

`session_id` ist tab-scope in `sessionStorage[lp_session_<slug>]` — neuer Tab = neue Session = neue submissions-Row.

### 7.5 Auto-Advance-Regel

Nur **single_choice + nicht welcome + nicht custom** auto-advancen nach 250ms (Typeform-Pattern). Alle anderen Types (rating/scale/multi_choice/text/etc.) brauchen expliziten OK-Klick. Erklärung: User soll Multi-Selects ändern können, Statements lesen, Custom-Card-Forms ausfüllen, ohne zu früh weggeschnipst zu werden.

---

## 8. Lebensphasen einer Submission

```
1. User landet auf /[slug]
   └─► generateMetadata fetched getTenantConfig
   └─► <TenantFunnelClient> mountet
       ├─► /api/track-view feuert (View-Counter)
       └─► sessionId via sessionStorage erzeugt
2. User tippt Antworten
   └─► State-Updates triggern 600ms-debounced /api/track-progress
       └─► UPSERT submissions{session_id, answers, contact={}, completed_at=NULL}
3. User klickt finalen OK / autoFinish am Funnel-Ende
   └─► postMessage 'funnel-submit' an Parent → embed.js feuert Conversions (Meta/Google/GTM)
   └─► /api/submit feuert
       ├─► UPSERT submissions{completed_at=NOW(), contact=deriveContactFromAnswers(answers)}
       └─► after(): triggerOnSubmit (Webhooks) + triggerEmailsOnSubmit (Drip-Queue)
4. (optional) redirect_url gesetzt → window.location.replace
```

**Pricing-Klassifikation (Aufgabe 36) im Lead-Inbox:**
- **Completed:** `completed_at IS NOT NULL`
- **Abgebrochen-mit-Email:** `completed_at IS NULL AND contact->>'email'` nicht leer
- **Abgebrochen-ohne-Email:** `completed_at IS NULL` und keine Email

---

## 9. Mapping-Layer: EditorState ⇄ DB

> Zentrale Datei: [`lib/editorUtils.ts`](../lib/editorUtils.ts). Hier laufen alle Roundtrips zusammen.

### 9.1 Schreibrichtung (Editor → DB)

```
EditorState
    │
    ├─► editorStateToFunnelRow(state)
    │       → INSERT/UPDATE funnels-Row (Theme, Texte, Flags)
    │
    └─► editorStateToPagesAndFields(state, funnelId)
            → DELETE old pages WHERE funnel_id (CASCADE killt fields)
            → INSERT pages + fields neu (welche je nach kind):
                ├─ kind="welcome" → page_type='welcome' + page.config{title,subtitle,page_key,button_label}
                ├─ kind="custom"  → page_type='custom' + page.config{title,subtitle,page_key} + N fields
                ├─ kind="question" (default) → page_type='question' + 1 field
                └─ + 1 page_type='success' (leer)   # KEINE submit-Page mehr (52D)
```

### 9.2 Leserichtung (DB → Editor)

```
DB (pages + fields)
    │
    ├─► dbToEditorState(funnelRow, pages, fields)
    │       1. Group fields by page_id
    │       2. Filter stepPages = pages WHERE type IN (welcome, question, custom)
    │       3. Rekonstruiere EditorQuestion[] mit kind je nach page_type
    │       4. Funnel-Row-Fields → EditorState-Texte
    │
    └─► buildQuestions(state.questions, opts)
            Für das Widget: filtert visible (außer keepHidden), strippt Editor-only Felder
```

### 9.3 Spezialfall: Widget-Lookup

`getTenantConfig(slug)` in `lib/getTenantConfig.ts` ist der **Service-Key-Read-Pfad** für das öffentliche Widget. Liest funnel+tenant+pages+fields per JOIN, baut ein `TenantConfig`-Objekt. Wird vom Live-Page (`app/[slug]/page.tsx`) genutzt — funktioniert ohne Auth, RLS wird bypassed.

---

## 10. Globale Files — was wo lebt

### Müssen aktuell gehalten werden

- `CLAUDE.md` — strategische Regeln, niemals raten, immer fragen bei Unsicherheit. Bei Architektur-Änderungen anpassen.
- `context/supabase-schema.md` — DB-Vollreferenz. Bei jeder Migration regenerieren.
- `context/architecture.md` — **diese Datei**. Bei Builder/Widget-Architektur-Änderungen anpassen.
- `context/current-feature.md` — chronologische History. Pro abgeschlossener Aufgabe ein Eintrag.
- `MEMORY.md` + memory/*.md (im ~/.claude-Pfad) — persistente Notizen. Bei strategischen Entscheidungen schreiben.

### Werden bei Aufgabe X gerne vergessen
- API-Routes `app/api/tenant/funnels/...` müssen bei DB-Schema-Änderungen ihre SELECT-Listen mit-ergänzen
- `lib/getTenantConfig.ts` muss bei neuen Funnel-Spalten ihre SELECT-Query erweitern
- `components/tenant-editor/defaults.ts` muss bei neuen EditorState-Feldern Default-Werte liefern

---

## 11. Bekannte Eigenheiten + Design-Decisions

| Pattern | Warum |
| --- | --- |
| Pages-Delete-Replace beim Save | CASCADE-Delete + Re-Insert ist robuster als Diff-Logic für ordered Lists |
| `kind`-Diskriminator statt 3 Type-Arrays | Sortierung in `state.questions[]` bleibt 1:1 mit DB-sort_order |
| Service-Key nur in 6 dokumentierten Ausnahmen | Defense-in-depth via RLS (CLAUDE.md §13.2) |
| Icons komplett raus (Aufgabe 34) | A/B/C/D-Letter-Chips, kein IconPicker mehr |
| email/tel als Karten-Feld-Typen | Auf Question-Pages waren sie nur kosmetische Text-Inputs; bleiben als Custom-Karten-Felder (Aufgabe 34) |
| Partial-Submission UPSERT statt INSERT | Idempotent, kein Duplikat-Risk bei Network-Retry |
| `funnels.slug` nach Anlage unveränderlich | Sonst würden Tenant-Embeds brechen |
| Widget = 1 Datei, hands-off | Konsistenz-Risiko bei Splitting, Doppelnutzung Live + Builder |
| Container-Queries statt Media-Queries im Widget | iFrame-Embed-Breite ≠ Viewport |
| Auto-Advance nur single_choice | Andere Types brauchen Reflection/Korrektur-Zeit |

---

## 12. Aktueller Zustand des Builders (2026-06-07)

**Fertig (live auf main bzw. auf Feature-Branch):**
- ✅ Aufgaben 25-31 (Schema-Refactor, B-Phase)
- ✅ Aufgabe 32 (Editor-Shell v2)
- ✅ Aufgabe 33 (Vorlagen + Field-Level-Properties)
- ✅ Aufgabe 34 (WYSIWYG-Edit + Widget-Typeform-Redesign + Icons-raus + Partial-Submissions)
- ✅ Aufgabe 35 (Skip-Submit-Toggle + Auto-Finish)
- ✅ Aufgabe 36 (Lead-Inbox 3 Tabs)
- ✅ Aufgabe 37 (Floating-Nav-Bug-Fix)
- ✅ C.1d (v1-Editor Cutover)
- ✅ C.2 (Theme-Panel)
- ✅ Aufgabe 38 (Custom Multi-Field-Pages)
- ✅ Aufgabe 39 (Welcome + Rating/Scale/Statement + End-Screen-Redirect + Builder-Cleanup)
- ✅ Polish-Iteration nach 39 (UX-Bugs + Defaults + Visual-Builder)
- ✅ **Aufgabe 40 (Webhook-Actions, 2026-05-29)** — Action-Element-Modell: Webhooks sind dynamisch konfigurierbare Builder-Elemente im neuen „Webhooks"-Tab. Backend (Sender + HMAC + Cron + Retry + abandoned-Trigger), Editor-Tab + Step-Pill-Badges, CRUD-API. Schema additive (siehe `supabase-schema.md`). Replaces ursprünglichen C.5-Scope.
- ✅ **Aufgabe 41 (E-Mail-Drip-Actions, 2026-05-31)** — Drip-System für Lead-Nurturing: zeitversetzte Mail-Sequenz nach Submit (`delay_minutes`). TipTap-WYSIWYG-Editor mit Custom Variable + Magic-Section Nodes. 3-Pane-In-Place-Layout. Schema `email_subscriptions` + `email_delivery_attempts` (Queue-Pattern). **Detail-Doku: [`email-drip-architektur.md`](email-drip-architektur.md).**
- ✅ **Aufgabe 42 + 43 (Conversion-Tracking, 2026-05-31)** — postMessage-Bridge (iFrame→Parent) + `embed.js`-Loader + Turnkey-Pixel-IDs pro Funnel (`meta_pixel_id`/`google_ads_conversion`). **Detail-Doku: [`conversion-tracking.md`](conversion-tracking.md).**
- ✅ **Aufgaben 44–50 (Editor-/Dashboard-Uplift, 2026-05-31 → 06-06)** — Side-Nav-Shell + Vollbild-Editor, Editor-Design-System (`ui/Panel.tsx`), Mini-CRM (Lead-Notizen), Autosave-Pattern, Karten-Model, „Bearbeiten"-Tab (Inhalt + Design vereint), Webhook-Namen.
- ✅ **Aufgaben 51–53 (Go-live-Politur, 2026-06-06)** — Submit-Page/Kontaktformular abgeschafft (51) + restlos rausgerissen (52D) inkl. `skip_submit_step`/Footer-Drop; dynamische Mail-Variablen aus Funnel-Feldern + Empfänger-Modi + Dark-Mode (53).

**Offen vor Launch:**
- D.1 Stripe Test→Live (aufgeschoben, Testkunden `free`-Tier)
- D.3 3-5 Demo-Funnel-Templates (Content)
- C.4 Logic Jumps (optional / v1.1)

## 13. Action-Element-Architektur (Aufgabe 40)

> Vollständig in Memory `strategy-action-modell` + CLAUDE.md §5 dokumentiert. Hier nur die Code-Karte.

**Backend (Server):**
- [`lib/webhooks.ts`](../lib/webhooks.ts) ~540 LOC — Sender + HMAC-Signing (Stripe-Pattern `t=,v1=`) + Payload-Builder (answers[] mit Labels + answers_flat mit Label-as-Value) + Backoff-Helper + 4 public Entry-Points: `triggerOnSubmit`, `triggerOnPageAdvance`, `retryDelivery`, `sendTestPayload`. Plus `generateWebhookSecret()` → `whsec_<64-hex>`.
- [`app/api/submit/route.ts`](../app/api/submit/route.ts) erweitert um `after(triggerOnSubmit(funnelId, 'submission.completed', snapshot, tenantConfig))` — Submit-Response geht sofort raus, Webhook-Delivery läuft asynchron weiter.
- [`app/api/cron/webhook-retry/route.ts`](../app/api/cron/webhook-retry/route.ts) alle 5 Min via [`vercel.json`](../vercel.json). Auth via `Authorization: Bearer $CRON_SECRET`. Macht Retries (Backoff `1m/5m/30m/2h/6h`) + abandoned-Trigger (10 Min Cooldown).
- `app/api/tenant/funnels/[slug]/webhooks/...` — Subscription-CRUD + `/test` + `/logs`.

**Frontend (Editor):**
- [`components/tenant-editor/v2/TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx) erweitert: neuer Tab „Webhooks".
- [`components/tenant-editor/v2/WebhooksPanel.tsx`](../components/tenant-editor/v2/WebhooksPanel.tsx) ~600 LOC — Container + Liste + collapsible Cards (Config, Test, Logs, Secret-Rotation, Verify-Snippet Node/Python/PHP).
- [`components/tenant-editor/v2/WebhookAddModal.tsx`](../components/tenant-editor/v2/WebhookAddModal.tsx) — Add-Modal mit Trigger-Auswahl (on_submit / after_page) + Event-Multi-Select.
- [`components/tenant-editor/v2/EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx) routet `activeTab === "webhooks"` auf WebhooksPanel (full-width) + lädt webhook-trigger_page_id Map für StepPill-Badges.
- [`components/tenant-editor/v2/StepPill.tsx`](../components/tenant-editor/v2/StepPill.tsx) + [`StepList.tsx`](../components/tenant-editor/v2/StepList.tsx) erweitert um violettes Webhook-Badge mit Count. Click → springt in Webhooks-Tab.

**Payload-Format Webhook (final):**
```json
{
  "event": "submission.completed",
  "delivery_id": "<uuid>",
  "delivered_at": "2026-05-29T14:23:00Z",
  "tenant_id": "<uuid>",
  "funnel": { "id": "<uuid>", "slug": "...", "name": "..." },
  "submission": { "id", "session_id", "created_at", "completed_at", "source_url" },
  "available_channels": { "email": true, "telefon": false, "name": true },
  "contact": { "email": "...", "name": "...", "telefon": "..." },
  "answers": [
    { "key": "...", "label": "...", "type": "single_choice", "value": "internal", "value_label": "User-readable" }
  ],
  "answers_flat": { "key": "User-readable label" }
}
```

**HMAC-Header:** `X-LeadPlug-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>` über `<t>.<bodyJson>`. Tenant verifiziert mit dem Secret (Code-Snippets im Tab).

## 14. E-Mail-Drip-Architektur (Aufgabe 41)

> Vollständige Detail-Doku: [`email-drip-architektur.md`](email-drip-architektur.md). Hier nur die Code-Karte.

**Konzeptueller Unterschied zu Webhooks:** E-Mails sind **Sequenzen** (Drip), keine Events. Trigger ist `delay_minutes nach Submit` — kein `after_page`, kein `on_abandoned`. Lead-Nurturing-Use-Case.

**Backend:**
- [`lib/emails.ts`](../lib/emails.ts) ~430 LOC — Sender (Resend + DynamicEmail-Render) + Queue-Insert (`scheduleAttemptsForSubmission`) + Backoff (1m/5m/30m/2h/6h, 4xx→permanent) + Public Entry-Points: `triggerEmailsOnSubmit`, `processPendingDelivery`, `retryEmailDelivery`, `sendTestEmail` (mit Draft-Override), `aggregateEmailStatusForSubmission` (Dashboard-Badges).
- [`lib/emailTemplates.ts`](../lib/emailTemplates.ts) — HTML-Substitutions-Pipeline: `<span data-variable="X">{{X}}</span>` → HTML-escaped Value via `resolveVar()`, `<div data-magic-section="X">` → fertiges Sub-HTML (`renderAnswersOverview` / `renderContactSummary` / `renderDashboardButton`). Subject läuft denselben Pfad mit HTML-Tag-Strip. Plus `AVAILABLE_TOKENS` als Editor-Picker-Quelle.
- [`emails/DynamicEmail.tsx`](../emails/DynamicEmail.tsx) — React-Email-Shell mit Brand-Color-Header, dangerouslySetInnerHTML-Body, Footer.
- [`/api/submit`](../app/api/submit/route.ts): `after(triggerEmailsOnSubmit(...).then(aggregate...))` — Submit-Response geht sofort raus, Drip-Queue wird gefüllt + sofort fällige Mails (delay=0) versendet.
- [`/api/cron/webhook-retry`](../app/api/cron/webhook-retry/route.ts) erweitert: Section „E-Mail-Queue" pickt `status='pending' AND scheduled_at <= NOW()` + `status='retrying' AND next_retry_at <= NOW()`.
- `app/api/tenant/funnels/[slug]/emails/...` — Subscription-CRUD + `/test` (mit Draft-Override) + `/logs` + `/preview-leads` (top 5 completed Submissions für Vorschau-Lead-Picker).

**Frontend (Editor):**
- [`components/tenant-editor/v2/EmailsPanel.tsx`](../components/tenant-editor/v2/EmailsPanel.tsx) ~900 LOC — 3-Pane-Layout (Liste · Editor · Live-Vorschau). Draft-State lebt im Panel (`useState<EmailDraft>`), Editor + Vorschau lesen denselben Draft → Live-Updates beim Tippen. Auto-Save via `useEffect` mit `setTimeout(handleSave, 1500)`. Switch-Warn bei dirty (`trySwitchTo`). Resize-Handle zwischen Editor und Vorschau (320–900 px). Demo-Mode-Fallback bei API-Fehler.
- [`components/tenant-editor/v2/email/EmailEditor.tsx`](../components/tenant-editor/v2/email/EmailEditor.tsx) — TipTap-Wrapper, single-line oder full-mode. Toolbar mit Standard-Marks + Portal-Dropdowns für „+Variable" / „+Baustein".
- [`components/tenant-editor/v2/email/VariableNode.ts`](../components/tenant-editor/v2/email/VariableNode.ts) — Custom TipTap-Inline-Atom. NodeView rendert violetten Chip mit human-Label („Lead-Name" statt `contact.name`). Speichert sich als `<span data-variable="contact.name">{{contact.name}}</span>`.
- [`components/tenant-editor/v2/email/MagicSectionNode.ts`](../components/tenant-editor/v2/email/MagicSectionNode.ts) — Custom TipTap-Block-Atom. NodeView rendert dashed Block-Card mit X-Button (Hover rot) zum Entfernen. Speichert sich als `<div data-magic-section="answers_overview"></div>`.

**Magic-Sections:**
- `answers_overview` — graue Box mit allen sichtbaren Antworten formatiert
- `contact_summary` — Kontakt-Felder-Box (Name/Email/Telefon mit mailto:/tel: Links)
- `dashboard_button` — vordefinierter CTA „Lead im Dashboard ansehen →" (Magic-Section, nur für Tenant-Mails sinnvoll)
- **CTA-Button (eigener Link)** — über `CtaButtonNode`: anpassbarer Button mit Label + URL, inline editierbar (siehe `email-drip-architektur.md`)
