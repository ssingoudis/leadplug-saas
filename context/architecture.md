# LeadPlug — Architektur & Funktionsweise

> **Stand:** 2026-05-28 (Ende Polish-Iteration nach Aufgabe 39)
>
> Diese Datei ist die **technische Karte des Produkts**. Wenn du wissen willst „wie ist die App gebaut", „wo lebt was", „welche Komponente macht welchen Job" — hier nachlesen.
>
> **Komplement zu:**
> - [`CLAUDE.md`](../CLAUDE.md) §1-15 — strategische + organisatorische Wahrheit
> - [`project-overview.md`](project-overview.md) — Code-Struktur (Verzeichnisse) + DB-Schema-Referenz
> - [`supabase-schema.md`](supabase-schema.md) — vollständige DB-Referenz (Enums, Tables, RLS, Indices)
> - [`roadmap.md`](roadmap.md) — Aufgaben-History + nächste Schritte

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
│   │   │       └── FunnelEditorClient.tsx  # Client-Wrapper für EditorShellV2
│   │   ├── leads/                  # Lead-Inbox (3 Tabs: Completed / Abgebrochen-mit-Email / Abgebrochen-ohne)
│   │   ├── kontakte/               # Aggregierte Contact-View
│   │   ├── statistiken/            # Monatliche Conversion-Charts
│   │   ├── account/, billing/, embed/
│   └── api/                        # API-Routes
│       ├── submit/                 # Final-Submit vom Widget → UPSERT + Mail
│       ├── track-progress/         # Partial-Submission-Tracking vom Widget (debounced)
│       ├── track-view/             # View-Counter
│       ├── tenant/funnels/         # Funnel-CRUD vom Editor (RLS via user-client)
│       ├── tenant/slug-check/      # Slug-Uniqueness
│       ├── leads/[id]/             # Lead-Status-Update
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
│   ├── tracking.ts                 # submissions UPSERT + email-status
│   ├── sendEmails.ts               # Resend-Wrapper für Customer + Tenant-Mail
│   └── validateContactField.ts     # Pflichtfeld-Validation pro field_type
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
                                                       pages (page_type: welcome | question | custom | submit | success)
                                                         │
                                                         │ 1:N
                                                         ↓
                                                       fields (field_type: 14 Werte, siehe Type-System)
```

### 4.1 Multi-Tenancy
- **`tenants`** = Agentur-Account (Stripe-Felder, billing_model, lead_price, is_active, company_name)
- **`tenant_members`** = Junction-Table N:M (auth_user_id → tenant_id, role)
- **RLS überall**: Helper-Funktionen `current_tenant_ids()` + `current_tenant_role(uuid)` in der DB. User-Client nutzt RLS, Service-Key nur in dokumentierten Ausnahmen (siehe CLAUDE.md §13.2).

### 4.2 Funnel-Struktur (Aufgabe 30 + 38 + 39)
- **`funnels`** = pro Endkunde 1 Funnel. Halt: Theme (Colors/Font/Radius), Texte (success_message, etc.), Footer, `notification_email`, `skip_submit_step`, `redirect_url`
- **`pages`** = ordered Liste pro Funnel. `page_type` ∈ {`welcome`, `question`, `custom`, `submit`, `success`}. `config jsonb` für Page-Level-Settings (Title/Subtitle bei custom+welcome, button_label bei welcome)
- **`fields`** = N pro Page. `field_type` ∈ {14 Werte}. `config jsonb` für Type-spezifische Settings (z.B. slider {min/max/step}, rating {maxStars}, scale {min/max/labelLeft/labelRight})

### 4.3 Partial-Submissions (Aufgabe 34)
- **`submissions.session_id uuid UNIQUE`** = client-generierte UUID via sessionStorage (`lp_session_<slug>`)
- **`submissions.completed_at timestamptz NULL`** = NULL bei Abbrechern, NOW() bei finalem Submit
- Widget POSTet alle 600ms-debounced an `/api/track-progress` (UPSERT mit `completed=false`)
- Finaler Submit-Klick POSTet an `/api/submit` (UPSERT mit `completed=true` + Mails + Webhooks)
- **Pricing-Logik:** Lead = `completed_at IS NOT NULL` OR (`completed_at IS NULL` AND `contact->>'email'` befüllt)

### 4.4 Webhook-Schema (Aufgabe 29, Sender-Code in C.5)
- **`webhook_subscriptions`** = pro Tenant N: url, secret, event_types[], is_active
- **`webhook_delivery_attempts`** = Audit-Trail (status, attempt_count, last_error)
- Tabellen + RLS stehen, Sender-Code ist noch nicht geschrieben (Aufgabe C.5).

---

## 5. Type-System: 14 Field-Types

Single Source of Truth ist `types/index.ts`. Die Types verteilen sich auf zwei verwandte Strukturen:

### 5.1 `QuestionType` (für Question-Pages, 1 Field pro Page)
```
single_choice    multi_choice    short_text    long_text
slider           date            number        dropdown
checkbox         rating          scale         statement
```

### 5.2 `ContactFieldConfig.type` (für Submit + Custom-Pages, N Fields pro Page)
```
text  email  tel  plz  radio  long_text  number  date  checkbox  dropdown
```

### 5.3 Mapping
- **DB-Enum `field_type`** ist der gemeinsame Pool: alle 14 QuestionTypes + die ContactField-Submit-only-Types (`radio`, `email`, `tel`, `plz`, `text` als Alias zu `short_text`)
- `lib/editorUtils.ts` macht die Roundtrips: `questionTypeToFieldType()`, `fieldTypeToQuestionType()`, `fieldTypeToContactType()`, `CONTACT_TYPE_TO_FIELD_TYPE`
- **Vermeintliche Doppelung:** `text` (ContactField) = `short_text` (Question). Bewusste Aliasierung wegen historischer Gründe (Aufgabe 31 hat email + tel als Question-Types entfernt — bleiben aber als ContactField-Types).

---

## 6. Der Builder — 3-Pane-Editor (v2)

> Alles unter `components/tenant-editor/v2/`. Aktiv seit Aufgabe 32 (C.1a). v1 wurde in C.1d gelöscht.

### 6.1 Komponenten-Übersicht

```
EditorShellV2.tsx (~750 LOC)              ← der Hauptcontainer
├── TopTabs.tsx                            ← „Inhalt / Design / Logik / E-Mails / Einbinden"
├── StepList.tsx                           ← linke Sidebar (Page-Liste, drag-reorder, +Button)
│   ├── StepPill.tsx                       ← einzelne Page-Pille
│   └── AddElementModal.tsx                ← „+ Frage hinzufügen"-Modal
├── CenterCanvas.tsx                       ← mittlere Vorschau-Spalte
│   └── nutzt <Funnel> aus components/funnel.tsx im editMode
├── PropertiesPanel.tsx                    ← rechte Properties-Spalte (~700 LOC)
│   ├── QuestionProps                      ← für kind=question
│   ├── CustomPageProps                    ← für kind=custom (Aufgabe 38)
│   ├── WelcomeProps                       ← für kind=welcome (Aufgabe 39)
│   ├── SubmitProps                        ← Submit-Page
│   ├── SuccessProps                       ← Success-Page mit Redirect-Toggle (Aufgabe 39)
│   ├── SortableContactFieldRow            ← Field-Row in Submit + Custom
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
| `content` (Inhalt) | 3-Pane: StepList \| CenterCanvas \| PropertiesPanel  |
| `design`    | 2-Pane: CenterCanvas \| ThemePanel                    |
| `logic`     | disabled (kommt mit C.4)                              |
| `emails`    | disabled (post-launch)                                |
| `share`     | disabled (post-launch)                                |

### 6.3 Selection-Modell

```ts
type SelectedStep =
  | { kind: "question"; questionIndex: number }   // Question-Page, Custom-Page UND Welcome-Page
  | { kind: "submit" }                            // Submit-Page
  | { kind: "success" };                          // Success-Page
```

**Wichtig:** Welcome + Question + Custom teilen sich `state.questions[]` als ordered Liste mit `kind`-Diskriminator pro Entry. Die SelectedStep `kind: "question"` zeigt also auf einen Index, der ein Welcome, Question oder Custom-Page sein kann. PropertiesPanel routet anhand `state.questions[questionIndex].kind` auf den passenden Editor.

### 6.4 EditorState (= das was im Builder editiert wird)

Ein `EditorState` ist im Wesentlichen die gesamte Builder-State-Snapshot. Aktuelle Felder (siehe `types/index.ts` für die volle Liste):

- **Funnel-Metadaten:** funnelName, isActive
- **Theme:** primaryColor, textColor, backgroundColor, pageBackgroundColor, font, borderRadius, maxWidth
- **Submit-Page-Texte:** funnelTitle, contactFormSubtitle, submitButtonLabel, successMessage, responseMessage, privacyText, privacyPolicyUrl, footerText, answersOverviewLabel
- **Footer-Kontakt:** footerCompanyName, footerEmail, footerPhone
- **E-Mail-Settings:** notificationEmail, emailSenderLocal
- **Submit-Verhalten:** skipSubmitStep (Aufgabe 35)
- **End-Screen-Verhalten:** redirectUrl (Aufgabe 39)
- **Steps:** `questions: EditorQuestion[]` mit kind-Diskriminator
- **Submit-Fields:** `contactFields: ContactFieldConfig[]`

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
isContactStep    = !skipSubmitStep && currentStep === visibleQuestions.length
isWelcomeStep    = currentQuestion?.kind === "welcome"
isCustomStep     = currentQuestion?.kind === "custom"
isStatementStep  = currentQuestion?.questionType === "statement"
isChoiceType     = single_choice + nicht welcome + nicht custom (für Auto-Advance)
showWeiterButton = !isContactStep && !isChoiceType
```

Render-Pipeline pro Step:
1. **Header-Bereich** (Step-Counter, Solo-Back-Button bei single_choice — bei welcome hidden)
2. **Title + Subtitle** (EditableText im editMode, sonst statisch — clamp() für fluid typography)
3. **Type-Block** branchet auf `currentQuestion.kind` und `questionType`:
   - Welcome → kein input, nur Bottom-Action-Bar mit welcomeButtonLabel
   - Custom + customFields.length > 0 → vertikaler Multi-Field-Stack
   - Custom + customFields.length === 0 + editMode → „+ Feld hinzufügen"-Button (bubble nach EditorShellV2)
   - Statement → kein Input, OK-Button advances
   - single_choice/multi_choice → Letter-Chip + Label vertikal
   - slider → großer Number-Readout + Range
   - rating → Sterne mit Hover-Preview (RatingStars-Helper)
   - scale → 0-N Buttons (ScaleButtons-Helper)
   - long_text → Textarea
   - short_text, number, date, dropdown, checkbox → Standard-Inputs
4. **Bottom-Action-Bar** ([BackButton tinted] + [primary OK-Button mit kontext-Label])
5. **Honeypot** (nur isContactStep)
6. **Privacy-Notice + Submit-Button** (nur isContactStep)

### 7.3 Submit-Pipeline

```
Widget                                Server
─────                                 ──────
[OK-Klick auf letzter Frage]
        │
        ├─► (skipSubmitStep?) ──ja──► autoFinish()
        │                              ├─► setIsSubmitted(true)
        │                              └─► onSubmit({answers, contact, honeypot})
        │
        └─► (Submit-Page-Klick) ───► handleFormSubmit()
                                       ├─► validate
                                       └─► onSubmit(...)
                                             │
                                             ▼
                                       /api/submit
                                       ├─► Honeypot-Check
                                       ├─► Rate-Limit
                                       ├─► getTenantConfig
                                       ├─► deriveContactFromAnswers (Skip-Mode-Backstop)
                                       ├─► upsertSubmissionProgress(completed=true)
                                       ├─► sendAllEmails
                                       └─► updateEmailStatus

[redirectUrl?] ─ja─► nach 1.5s window.location.replace(url)
[sonst] ──────────► Success-Page (responseMessage + answers-overview)
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
3. User klickt finalen Submit (oder Auto-Finish im Skip-Mode)
   └─► /api/submit feuert
       ├─► UPSERT submissions{completed_at=NOW(), contact=deriveContactFromAnswers(answers)}
       ├─► sendAllEmails (Customer + Tenant)
       └─► (zukünftig C.5) Webhook-Delivery
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
                ├─ + 1 page_type='submit' am Ende mit N contactFields-Fields
                └─ + 1 page_type='success' (leer)
```

### 9.2 Leserichtung (DB → Editor)

```
DB (pages + fields)
    │
    ├─► dbToEditorState(funnelRow, pages, fields)
    │       1. Group fields by page_id
    │       2. Filter stepPages = pages WHERE type IN (welcome, question, custom)
    │       3. Rekonstruiere EditorQuestion[] mit kind je nach page_type
    │       4. Submit-Page → contactFields[]
    │       5. Funnel-Row-Fields → EditorState-Texte
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
- `context/project-overview.md` — Code-Struktur + DB-Schema. Bei Schema-Änderungen anpassen.
- `context/supabase-schema.md` — DB-Vollreferenz. Bei jeder Migration regenerieren.
- `context/architecture.md` — **diese Datei**. Bei Builder/Widget-Architektur-Änderungen anpassen.
- `context/roadmap.md` — granulare Aufgaben-Liste. Pro Aufgabe ein Eintrag.
- `context/builder-fokus-roadmap.html` — strategische Reihenfolge (was wir bauen bis Launch). Bei Strategie-Shifts anpassen.
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
| email/tel als Submit-only-Types | Auf Question-Pages waren sie nur kosmetische Text-Inputs (Aufgabe 34) |
| Partial-Submission UPSERT statt INSERT | Idempotent, kein Duplikat-Risk bei Network-Retry |
| `funnels.slug` nach Anlage unveränderlich | Sonst würden Tenant-Embeds brechen |
| Widget = 1 Datei, hands-off | Konsistenz-Risiko bei Splitting, Doppelnutzung Live + Builder |
| Container-Queries statt Media-Queries im Widget | iFrame-Embed-Breite ≠ Viewport |
| Auto-Advance nur single_choice | Andere Types brauchen Reflection/Korrektur-Zeit |

---

## 12. Aktueller Zustand des Builders (2026-05-29)

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
- ✅ **Aufgabe 40 (Webhook-Actions, 2026-05-29, auf Branch `feature/aufgabe-40-webhook-actions`)** — Action-Element-Modell: Webhooks sind dynamisch konfigurierbare Builder-Elemente im neuen „Webhooks"-Tab. Backend (Sender + HMAC + Cron + Retry + abandoned-Trigger), Editor-Tab + Step-Pill-Badges, CRUD-API. Schema additive (siehe `supabase-schema.md`). Replaces ursprünglichen C.5-Scope.

**Offen vor Launch (siehe roadmap.md + builder-fokus-roadmap.html):**
- E-Mails-Tab dynamisch machen (folgt Webhook-Action-Pattern)
- C.4 Logic Jumps (v1.1 OK)
- D.1 Stripe Live (aufgeschoben, Testkunden `free`-Tier)
- D.2 Conversion-Tracking via postMessage + Script-Loader-Embed (Performance-Marketing-Blocker)
- D.3 3-5 Demo-Funnels als Templates

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
- [`components/tenant-editor/v2/EditorShellV2.tsx`](../components/tenant-editor/v2/EditorShellV2.tsx) routet `activeTab === "webhooks"` auf WebhooksPanel (full-width) + lädt webhook-trigger_page_id Map für StepPill-Badges.
- [`components/tenant-editor/v2/StepPill.tsx`](../components/tenant-editor/v2/StepPill.tsx) + [`StepList.tsx`](../components/tenant-editor/v2/StepList.tsx) erweitert um violettes Webhook-Badge mit Count. Click → springt in Webhooks-Tab.

**Payload-Format (final):**
```json
{
  "event": "submission.completed",
  "delivery_id": "<uuid>",
  "delivered_at": "2026-05-29T14:23:00Z",
  "tenant_id": "<uuid>",
  "funnel": { "id": "<uuid>", "slug": "...", "name": "..." },
  "submission": { "id", "session_id", "created_at", "completed_at", "source_url", "lead_price" },
  "available_channels": { "email": true, "telefon": false, "name": true },
  "contact": { "email": "...", "name": "...", "telefon": "..." },
  "answers": [
    { "key": "...", "label": "...", "type": "single_choice", "value": "internal", "value_label": "User-readable" }
  ],
  "answers_flat": { "key": "User-readable label" }
}
```

**HMAC-Header:** `X-LeadPlug-Signature: t=<unix-seconds>,v1=<hex-hmac-sha256>` über `<t>.<bodyJson>`. Tenant verifiziert mit dem Secret (Code-Snippets im Tab).
