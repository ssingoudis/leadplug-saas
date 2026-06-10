# E-Mail-Drip-Architektur (Aufgabe 41)

> **Stand:** 2026-05-31
>
> Vollständige technische Doku des E-Mail-Subsystems: DB-Schema, Code-Layout, Send-Pipeline, Editor-UI, Sequence-Diagramme, Known-Issues.
>
> **Komplement zu:**
> - [`CLAUDE.md`](../CLAUDE.md) §5 (Architektur-Konsens) + §10 (Code-Regeln) + §13.5 (Schema-Status)
> - [`architecture.md`](architecture.md) §14 (Code-Karte)
> - [`webhook-architecture.md`](webhook-architecture.md) — paralleles System für Webhooks (anderes Trigger-Modell)

---

## 1. Konzept

E-Mails sind in LeadPlug **dynamisch konfigurierbare Drip-Mails** pro Funnel, kein hartkodierter Versand mehr.

| Aspekt | Vorher (vor Aufgabe 41) | Jetzt |
|---|---|---|
| Mail-Versand | hartkodiert in `/api/submit` via `sendAllEmails` aus `lib/sendEmails.ts` | dynamisch via `email_subscriptions`-Tabelle pro Funnel |
| Anzahl Mails | fix 2 (Customer-Confirmation + Tenant-Notification) | beliebig viele pro Funnel (Drip-Sequenz) |
| Inhalt | React-Email-Komponenten in Code (`CustomerConfirmation.tsx`, `TenantLeadNotification.tsx`) | TipTap-WYSIWYG-Output (HTML) in `email_subscriptions.body_html` |
| Trigger | immer sofort beim Submit | `delay_minutes` nach Submit (0 = sofort, N = N Min später) |
| Editierbar | nein, nur via Code-Deploy | ja, im Editor unter Tab „E-Mails" |

**Use-Case:** Lead-Nurturing-Sequenzen. Beispiel:
- Sofort: „Vielen Dank, Ihre Anfrage ist da"
- +1 Tag: „Hallo Max, fehlen Ihnen noch Infos?"
- +3 Tage: „Letzter Reminder — wir helfen gerne"
- +7 Tage: „Falls Sie weitere Fragen haben…"

Plus die initiale **Tenant-Benachrichtigung** an die Agentur (= `recipient_type='tenant'`).

**Webhooks ≠ E-Mails (wichtig!):** Webhooks pushen Events (Timing matched dem Event: `on_submit` / `after_page` / abandoned-Cron). E-Mails sind Sequenzen (Timing relativ zum Submit). Daher: kein `after_page`-Trigger, kein `on_abandoned`-Trigger bei E-Mails — das wäre Webhook-Domain. Wer Lead-Push an CRM will, baut einen Webhook; wer Lead-Nurturing will, baut Drip-Mails.

---

## 2. DB-Schema

### 2.1 `email_subscriptions`

Pro Funnel 1..N Mail-Konfigurationen.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | |
| `funnel_id` | uuid FK → `funnels(id)` ON DELETE CASCADE | |
| `tenant_id` | uuid FK → `tenants(id)` ON DELETE CASCADE | RLS-Filter, vermeidet zusätzlichen Join in jeder Policy |
| `name` | text | Interner Name (z.B. „Bestätigung sofort" / „3-Tage-Reminder") |
| `recipient_type` | text | `'customer'` / `'tenant'` / `'custom'`. CHECK |
| `recipient_value` | text NULL | **Bei `recipient_type='custom'`**: comma-separated Liste von 1–3 E-Mail-Adressen. Bei customer/tenant: NULL. CHECK enforct dass bei custom mindestens 1 nicht-leerer Wert da ist |
| `delay_minutes` | int DEFAULT 0 | 0 = sofort, N = N Min nach `submission.completed_at`. CHECK >= 0 |
| `subject` | text | TipTap-HTML mit Variable-Spans (wird beim Send zu Plain-Text gestrippt) |
| `body_html` | text | TipTap-WYSIWYG-Output (HTML mit `data-variable` / `data-magic-section` / `data-cta-button` Spans) |
| `from_local` | text NULL | Optionaler Override des Funnel-Senders (`funnels.email_sender_local`) |
| `is_active` | bool DEFAULT true | Pausieren ohne Löschen |
| `created_at` / `updated_at` | timestamptz | updated_at-Trigger |

**Indices:**
- `idx_email_subscriptions_funnel_id (funnel_id)` — Sender-Lookup pro Funnel
- `idx_email_subscriptions_funnel_active (funnel_id, is_active) WHERE is_active = true` — Partial-Index für aktive Subs

**RLS-Policies (4):**
- SELECT — alle Tenant-Member
- INSERT / UPDATE — owner + admin
- DELETE — owner only

### 2.2 `email_delivery_attempts`

Drip-Queue + Audit-Trail. Pro Submission × Subscription wird beim Submit eine Row mit `status='pending'` und `scheduled_at = submitTime + delay_minutes` angelegt.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | uuid PK | = `resend_message_id`-Analog, hier auch UUID |
| `subscription_id` | uuid FK → `email_subscriptions(id)` ON DELETE CASCADE | |
| `submission_id` | uuid FK → `submissions(id)` ON DELETE SET NULL | Audit bleibt erhalten wenn Submission gelöscht |
| `scheduled_at` | timestamptz NOT NULL | Wann soll/wurde versendet (= completed_at + delay) |
| `attempt_count` | int DEFAULT 0 | 0 = noch nicht versucht. 1+ = Anzahl Send-Versuche. CHECK >= 0 |
| `status` | text DEFAULT 'pending' | `pending` / `retrying` / `success` / `failed`. CHECK |
| `last_error` | text | bei retrying/failed |
| `resend_message_id` | text | Resend-API-ID (für Tracking via Resend-Dashboard) |
| `recipient_address` | text | Effektiv versandte Adresse (Audit-Spur) |
| `delivered_at` | timestamptz | bei success NOT NULL — CHECK enforct |
| `next_retry_at` | timestamptz | bei retrying gesetzt |
| `created_at` | timestamptz | |

**Indices:**
- `idx_email_delivery_attempts_subscription (subscription_id, created_at DESC)` — Logs-Drawer
- `idx_email_delivery_attempts_submission (submission_id) WHERE submission_id IS NOT NULL` — Aggregations-Query für Dashboard-Badges
- `idx_email_delivery_due (scheduled_at) WHERE status = 'pending'` — **Cron-Query für due-pending**
- `idx_email_delivery_retry_due (next_retry_at) WHERE status = 'retrying' AND next_retry_at IS NOT NULL` — **Cron-Query für due-retrying**

**RLS:** nur SELECT (Tenant-Member sieht eigene Logs). INSERT/UPDATE durch Sender via Service-Key.

### 2.3 Status-Lebenszyklus

```
                  ┌───────────┐
[submit]  ───────►│  pending  │
                  └─────┬─────┘
                        │
       ┌────────────────┼──────────────────┐
       │                │                  │
   [send ok]      [send fail 5xx/timeout]  [send fail 4xx/validation]
       │                │                  │
       ▼                ▼                  ▼
   ┌─────────┐    ┌──────────┐        ┌─────────┐
   │ success │    │ retrying │───┐    │ failed  │
   └─────────┘    └──────────┘   │    └─────────┘
                        ▲        │
                        │        │
                   [next_retry_at reached]
                        │
                        └───[backoff: 1m/5m/30m/2h/6h, dann failed]
```

**Permanente Errors (sofort failed):** Resend-Errors mit `name === 'validation_error'`, `invalid_*`, `missing_required_field`. Recipient leer (z.B. customer-Mail bei Lead ohne E-Mail) wird ebenfalls als initial `failed` insertet (kein Retry, da hoffnungslos).

---

## 3. Send-Pipeline

### 3.1 Beim Submit (`/api/submit`)

```
User klickt finalen Submit
      │
      ▼
upsertSubmissionProgress(completed=true)  ◄── setzt completed_at, billing-sicher
      │
      ▼
after(triggerOnSubmit(...))               ◄── Webhooks (Aufgabe 40)
      │
      ▼
after(
  triggerEmailsOnSubmit(funnelId, snapshot, tenantConfig)
    .then(() => aggregateEmailStatusForSubmission(submissionId))
)
      │
      ▼
Response sofort: {success: true}
```

`triggerEmailsOnSubmit` (in [`lib/emails.ts`](../lib/emails.ts)):
1. Lade alle aktiven Subscriptions des Funnels (`is_active = true`)
2. Für jede: berechne `scheduled_at = completed_at + delay_minutes`. Resolve Recipient (customer → contact.email / tenant → funnels.notification_email).
3. INSERT `email_delivery_attempts` Row pro Subscription (status='pending', recipient_address gesetzt). Wenn Recipient leer → status='failed' mit `last_error`-Begründung.
4. Picke alle Rows mit `scheduled_at <= NOW()` (= delay=0) → sende sofort via `processAttempt`.
5. Subscriptions mit delay>0 bleiben pending in der Queue, werden vom Cron später gepickt.

`aggregateEmailStatusForSubmission`:
- Liest `email_delivery_attempts` der Submission
- Setzt `submissions.customer_email_sent` = true wenn mind. 1 success bei recipient_type=customer
- Setzt `submissions.tenant_email_sent` = true wenn mind. 1 success bei recipient_type=tenant
- Dashboard zeigt diese Badges in der Lead-Tabelle

### 3.2 Cron alle 5 Min (`/api/cron/webhook-retry`)

Der Cron-Job heißt historisch „webhook-retry", macht jetzt aber auch E-Mails:

```
Cron-Tick (alle 5 Min via vercel.json)
  │
  ├─► 1. Webhook-Retries (status pending/retrying, next_retry_at <= NOW())
  │
  ├─► 2. Webhook-Abandoned-Trigger (10 Min Cooldown)
  │
  ├─► 3. E-Mail due-pending:
  │       SELECT FROM email_delivery_attempts WHERE status='pending' AND scheduled_at <= NOW()
  │       → für jeden: processPendingDelivery(id) (= processAttempt)
  │
  ├─► 4. E-Mail due-retrying:
  │       SELECT FROM email_delivery_attempts WHERE status='retrying' AND next_retry_at <= NOW()
  │       → für jeden: retryEmailDelivery(id) (= processAttempt)
  │
  └─► 5. Aggregate-Pass: für alle touched submission_ids aus 3+4 → aggregateEmailStatusForSubmission
```

Beide Pfade rufen denselben `processAttempt` in `lib/emails.ts` — die Pick-Bedingung unterscheidet sich, der Send-Code ist identisch.

Auth: `Authorization: Bearer $CRON_SECRET`. Vercel-Cron-Definition in [`vercel.json`](../vercel.json).

### 3.3 `processAttempt(attemptId, supabase)`

```
1. Lade attempt + Subscription (JOIN) — wenn !is_active oder Submission gelöscht → failed
2. Lade frische Submission + TenantConfig (für aktuelle contact/answers/Branding)
3. Render via lib/emailTemplates.renderEmail(subject, body_html, ctx):
   • Magic-Sections (<div data-magic-section="X">) → fertiges Sub-HTML
   • Variable-Spans (<span data-variable="X">{{X}}</span>) → resolveVar(X, ctx) HTML-escaped
   • Subject läuft denselben Pfad mit HTML-Tag-Strip
4. From-Address: buildFromAddress(sub, tenantConfig) — customer-Mail = tenant-branded, tenant-Mail = LeadPlug-branded
5. Resend.emails.send mit React-Email-Component DynamicEmail
6. Result analysieren:
   • ok → status='success', delivered_at=NOW(), resend_message_id gespeichert
   • permanent error → status='failed', next_retry_at=NULL
   • transient error + Versuche < 6 → status='retrying', next_retry_at=NOW()+backoff(n)
   • transient error + Versuche >= 6 → status='failed'
7. UPDATE email_delivery_attempts Row
```

---

## 4. Template-Rendering

### 4.1 TipTap-Output-Format

Im Editor wird WYSIWYG editiert, gespeichert wird ein HTML-String mit Marker-Elementen:

**Variable-Chip** (= Inline-Atom):
```html
<span data-variable="contact.name">{{contact.name}}</span>
```
Der innere Text ist nur Fallback (falls die Render-Pipeline scheitert) — er wird beim Render durch den tatsächlichen Wert ersetzt.

**Magic-Section-Block** (= Block-Atom):
```html
<div data-magic-section="answers_overview" data-heading="Eigene Überschrift"></div>
```
Self-closing, weil der Inhalt komplett serverseitig generiert wird. `data-heading` ist optional — Renderer fällt auf den Default (Funnel-Config bzw. „Kontaktdaten") zurück wenn leer/nicht gesetzt.

**CTA-Button-Block** (= Block-Atom, anpassbar):
```html
<div data-cta-button data-label="Termin buchen" data-url="https://cal.com/..."></div>
```
Beide Attribute sind inline editierbar im Editor (zwei `<input>`-Felder im NodeView). Wird beim Render zu einem gestylten Button mit Brand-Color expandiert.

### 4.2 Server-Render (`lib/emailTemplates.ts`)

```ts
function expandBody(html: string, ctx: TemplateContext): string {
  // 1. Magic-Sections (sie können Variable-Spans enthalten, also zuerst).
  //    Extrahiert optional data-heading aus dem Match.
  let out = html.replace(MAGIC_SECTION_RE, (match, _tag, name) => {
    const heading = ATTR_HEADING_RE.exec(match)?.[1] ?? null
    if (name === 'answers_overview')  return renderAnswersOverview(ctx, heading)
    if (name === 'contact_summary')   return renderContactSummary(ctx, heading)
    if (name === 'dashboard_button')  return renderDashboardButton(ctx)  // Legacy
    return ''
  })
  // 2. CTA-Buttons (custom label + url)
  out = out.replace(CTA_BUTTON_RE, (match) => {
    const label = ATTR_LABEL_RE.exec(match)?.[1] ?? ''
    const url   = ATTR_URL_RE.exec(match)?.[1]   ?? ''
    return renderCtaButton(label, url, ctx)
  })
  // 3. Variable-Chips ersetzen (HTML-escaped — XSS-Schutz vs Lead-Daten)
  out = out.replace(VARIABLE_RE, (_match, name) => htmlEscape(resolveVar(name, ctx)))
  // 4. Inline-Styles für die generischen Tags injizieren (siehe unten)
  out = inlineGenericTagStyles(out, ctx.tenantConfig.theme.primaryColor)
  return out
}
```

**`inlineGenericTagStyles`** ist der entscheidende Pass für Mail-Client-Kompatibilität. Gmail/Outlook ignorieren CSS-Klassen + `<style>`-Blocks aus dem React-Email-Container — daher MÜSSEN `<p>` / `<h2>` / `<h3>` / `<ul>` / `<ol>` / `<li>` / `<a>` / `<hr>` direkt im HTML inline-styled sein. Sonst sieht der Lead **keine Margins zwischen Absätzen** (TipTap macht bei Enter neue `<p>`-Tags). Tags die bereits `style=` haben werden NICHT überschrieben (Magic-Section-/CTA-Button-Renderer haben schon korrekte Styles). Leere `<p></p>`-Tags (= doppeltes Enter für Whitespace-Zeile) werden zu `<p>&nbsp;</p>` damit Browser sie nicht kollabieren.

**Subject läuft denselben Pfad**, danach werden alle HTML-Tags gestripped (Subject ist Plain-Text).

### 4.3 Verfügbare Tokens

`AVAILABLE_TOKENS` in `lib/emailTemplates.ts` ist die Wahrheit für den Editor-Dropdown:

**Lead** (= contact-Felder aus Submission):
- `contact.name` · `contact.email` · `contact.telefon`
- Plus dynamisch: `contact.<key>` für beliebige Contact-Feld-Keys

**Funnel** (= tenantConfig):
- `funnel.name` (companyName) · `funnel.email` (publicEmail) · `funnel.phone`
- `funnel.success_message` · `funnel.response_message`
- `funnel.slug`

**Meta:**
- `submitted_at` (de-DE-formatiertes Datum)

**Magic Sections** (Block-Bausteine, nicht Inline):
- `answers_overview` — Antworten-Box mit allen sichtbaren visible-Fragen formatiert
- `contact_summary` — Kontaktdaten-Box mit sichtbaren ContactFields (Email als mailto-Link, Tel als tel-Link)
- `dashboard_button` — CTA-Button „Lead im Dashboard ansehen →" (für Tenant-Mails)

---

## 5. Editor-UI

### 5.1 3-Pane-Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  E-Mails-Tab                                                           │
├──────────────┬──────────────────────────┬──┬──────────────────────────┤
│ Liste (280px)│ Editor (flex)            │║ │ Vorschau (320–900 px)    │
│              │                          │║ │ ◄ resizable per Drag     │
│  Sub 1       │ Header: Name + aktiv +   │║ │                          │
│  Sub 2 ←sel  │   aktiv-Toggle +         │║ │ Mail-Card (max 600 px,   │
│  Sub 3       │   "Speichern"-Button     │║ │   wie echte Mail)        │
│              │                          │║ │   ┌──────────────────┐   │
│  + Hinzu     │ Body:                    │║ │   │ Header (Brand)   │   │
│              │  - Name-Input            │║ │   │                  │   │
│              │  - Delay (Zahl + Einh.)  │║ │   │ Vielen Dank,     │   │
│              │  - Recipient (customer/  │║ │   │ Max Mustermann!  │   │
│              │    tenant)               │║ │   │                  │   │
│              │  - Subject (TipTap       │║ │   │ [Antworten-Box]  │   │
│              │    single-line + Var)    │║ │   │                  │   │
│              │  - Body (TipTap full)    │║ │   │ Footer           │   │
│              │  ▼ Test-Mail senden      │║ │   └──────────────────┘   │
│              │  ▼ Versand-Historie      │║ │                          │
│              │  ✗ Diese E-Mail löschen  │║ │ ▼ Lead-Picker            │
└──────────────┴──────────────────────────┴──┴──────────────────────────┘
```

### 5.2 State-Lift: Draft im Parent

Der Editor-Draft lebt im `EmailsPanel`, nicht im `SelectedEditor`. Grund: die Vorschau muss bei jedem Keystroke live updaten und braucht denselben Draft.

```tsx
// EmailsPanel
const [draft, setDraft] = useState<EmailDraft | null>(null);

useEffect(() => {
  setDraft(selected ? subToDraft(selected) : null);
}, [selected?.id, selected?.updated_at]);  // reset bei Sub-Switch ODER nach Save

const dirty = useMemo(
  () => selected && draft ? !draftsEqual(draft, subToDraft(selected)) : false,
  [draft, selected]
);

// SelectedEditor bekommt draft + onDraftChange + dirty + onSave
// PreviewPane bekommt draft.subject + draft.body_html + draft.recipient_type
```

**Manuelles Speichern:** kein Auto-Save (war initial implementiert, dann auf Tenant-Feedback hin entfernt — "macht einen verrückt, ist eine katastrophe"). User klickt Save-Button selbst, Button-Label wechselt zu "Speichere…" während des Saves.

**Switch-Warn:** `trySwitchTo(id)` wrapper für die Liste — wenn dirty, öffnet sich `UnsavedChangesModal` (eigener Modal-Component mit TriangleAlert-Icon, 3 Buttons: Abbrechen / Verwerfen / Speichern). Beim Klick auf Speichern wird der Save ausgeführt + danach die Ziel-Subscription gewechselt.

### 5.3 TipTap Custom Nodes

**`VariableNode`** (`components/tenant-editor/v2/email/VariableNode.ts`):
- `Node.create({ name: 'variable', group: 'inline', inline: true, atom: true })`
- `parseHTML` matcht `<span data-variable="...">`
- `renderHTML` produziert `<span data-variable="<name>">{{<name>}}</span>`
- `addNodeView` rendert im Editor einen violetten Chip mit human-Label aus `AVAILABLE_TOKENS` (z.B. „Lead-Name" statt `contact.name`). `contentEditable=false` → Atom, wird beim Backspace komplett gelöscht.
- `addCommands.insertVariable(name)` → `chain().insertContent({ type: 'variable', attrs: { name } }).run()`

**`MagicSectionNode`** (`components/tenant-editor/v2/email/MagicSectionNode.ts`):
- `Node.create({ name: 'magicSection', group: 'block', atom: true })`
- `parseHTML` matcht `<div data-magic-section="...">`
- `renderHTML` produziert `<div data-magic-section="<section>"></div>`
- `addNodeView` rendert eine dashed Block-Card mit Titel + Description aus `AVAILABLE_TOKENS.magic`. **Plus X-Button oben rechts** (Hover rot) zum Entfernen via `deleteRange(getPos(), getPos() + node.nodeSize)`.

**`CtaButtonNode`** (`components/tenant-editor/v2/email/CtaButtonNode.ts`):
- `Node.create({ name: 'ctaButton', group: 'block', atom: true, draggable: true })`
- Attributes: `label` (Text auf dem Button) + `url` (Ziel-Link). Beide editierbar direkt im NodeView via inline `<input>`-Felder.
- `renderHTML` produziert `<div data-cta-button data-label="..." data-url="..."></div>`
- Server-Render: `<a href="<url>" style="background:<brandColor>;color:#fff;padding:14px 28px;…">{label}</a>` mittig zentriert.
- URL wird beim Render auf `^https?://` geprüft — sonst `#` (verhindert javascript:-URIs).
- Inline-Edit via `setNodeMarkup`-Transaction: jeder Input-Change updated das Attribut direkt im TipTap-State. `update()` synct die Inputs zurück bei externem Attr-Update (Undo/Redo).

**Drag-and-Drop:** alle drei Node-Typen (`VariableNode`, `MagicSectionNode`, `CtaButtonNode`) haben `draggable: true` + `cursor: grab` im NodeView. TipTap-Native-Drag: Tenant zieht Bausteine + Variablen durch den Text. `stopEvent` schützt Inputs/Buttons im NodeView vor TipTap-Click-Intercepts.

### 5.4 EmailEditor-Wrapper

`components/tenant-editor/v2/email/EmailEditor.tsx` ist ein TipTap-Wrapper mit zwei Modi:

- **`singleLine`** (für Subject): Nur das Eingabefeld, **kein Variable-Dropdown** (bewusst simpel gehalten — Subject wird vom Tenant direkt getippt; existierende `{{vars}}` aus Backfill werden weiter als Chips dargestellt). Enter wird abgefangen (kein Multi-Line).
- **default** (für Body): volle Toolbar mit Bold/Italic/H2/H3/Listen/Link + „+Variable" + „+Baustein".

**Variable-Picker (im Body)** zeigt nur:
- `Daten vom Lead`: `contact.name` / `contact.email` / `contact.telefon`
- `Datum / Zeit`: `submitted_at`

Funnel-Daten (`funnel.name` etc.) sind aus dem Picker entfernt — sie sind pro Funnel statisch und werden vom Tenant direkt getippt. `resolveVar()` versteht sie aber weiterhin, damit Backfill-Mails korrekt rendern.

**Baustein-Picker (im Body)** zeigt:
- 🔗 **Link-Button** — anpassbarer CTA mit Label + URL (CtaButtonNode), häufigster Use-Case, daher an erster Stelle
- 📦 **Antworten-Box** (answers_overview, Magic-Section) — mit editierbarem Heading
- 📦 **Kontakt-Box** (contact_summary, Magic-Section) — mit editierbarem Heading

**Legacy `dashboard_button`** ist aus dem Picker raus. Renderer expandiert ihn weiterhin (Backfill-Mails). Im Editor erscheint er als „Dashboard-Button (Legacy)"-Card, kann via X gelöscht werden.

**Portal-Dropdowns:** Die Variable- und Baustein-Dropdowns rendern via `createPortal(..., document.body)` mit `position: fixed` + Position-Calc aus `triggerRef.current.getBoundingClientRect()`. Verhindert Cropping bei Scroll-Containern (war früher ein Bug mit dem Modal).

### 5.5 Vorschau-Pane

```tsx
function PreviewPane({ subject, bodyHtml, recipientType, state, funnelSlug, previewLead }) {
  const { subject, bodyHtml, recipient } = useMemo(() => {
    // 1. Baue tenantConfig aus EditorState (für Brand-Color, Texte, contactFields)
    const previewConfig = buildPreviewConfig(state, funnelSlug)
    // 2. Mock- oder echte Lead-Daten als ctx
    const ctx = previewLead ? { contact: previewLead.contact, answers: previewLead.answers, ...}
                            : { contact: MOCK_CONTACT, answers: buildMockAnswers(...), ...}
    // 3. Server-Substitution client-side (gleiche Funktion wie beim echten Send!)
    return renderEmail(rawSubject, rawBody, ctx)
  }, [rawSubject, rawBody, recipientType, state, funnelSlug, previewLead])
}
```

Wichtig: dieselbe `renderEmail`-Funktion aus `lib/emailTemplates.ts` läuft client + server. Beide Pfade produzieren identisches HTML.

**Lead-Picker:** Dropdown im Vorschau-Header zwischen „Mock-Lead (Max Mustermann)" und den letzten 5 completed Submissions (aus `/api/tenant/funnels/[slug]/preview-leads`).

**CSS-Match zur echten Mail:**
- Mail-Card auf `max-w-150` (= 600 px), mittig zentriert — identisch zu `DynamicEmail.tsx` maxWidth
- Inline `<style>` mit `.lp-email-preview { ... }`-Klasse, die Tailwind-Resets für `p`/`h2`/`h3`/`ul`/`ol`/`a` überschreibt
- Font-Stack `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — identisch zu Resend-Output

---

## 6. CRUD-API

Alle Routes unter `app/api/tenant/funnels/[slug]/emails/`:

| Endpoint | Methode | Zweck |
|---|---|---|
| `/emails` | GET | Liste aller Subs des Funnels |
| `/emails` | POST | Neue Sub anlegen |
| `/emails/[id]` | GET | Einzelne Sub laden |
| `/emails/[id]` | PATCH | Sub updaten (Name, Trigger, Recipient, Subject, Body, is_active) |
| `/emails/[id]` | DELETE | Sub löschen (delivery_attempts via CASCADE) |
| `/emails/[id]/test` | POST | Test-Mail mit Mock-Daten. **Body kann Draft-Override enthalten** (`draft_subject`, `draft_body_html`, `draft_recipient_type`, `draft_recipient_value`) — Test rendert dann den ungesicherten Stand statt der DB-Werte. Multi-Recipient bei custom: alle Adressen werden adressiert. |
| `/emails/[id]/logs` | GET | Letzte N delivery_attempts (Default 50) |
| `/preview-leads` | GET | top 5 completed Submissions (für Vorschau-Lead-Picker) |

**RLS macht die ganze Auth-Arbeit.** API-Routes prüfen nur explizit dass der Funnel zum slug aus der URL gehört (verhindert ID-Guessing fremder Tenants).

---

## 7. Sequence-Diagrams

### 7.1 Submit → sofort fällige Mail (delay=0)

```
Widget          /api/submit          lib/emails       Resend API     submissions   email_delivery_attempts
  │                 │                    │                │              │              │
  │ POST submit ───►│                    │                │              │              │
  │                 │ upsertSubmission ─────────────────────────────────►│ UPDATE       │
  │                 │ Response {success:true} ◄──                        │              │
  │                 │ after(...) ───────►│                │              │              │
  │                 │                    │ scheduleAttempts ──────────────────────────►│ INSERT (pending,
  │                 │                    │                                              │  scheduled_at=NOW)
  │                 │                    │ filter due (sched <= NOW)                   │
  │                 │                    │ processAttempt(id) ──►                      │
  │                 │                    │                  ├ load JOIN ◄───────────────│ SELECT
  │                 │                    │                  ├ renderEmail()             │
  │                 │                    │                  └ send ────►│ POST          │
  │                 │                    │                              │ {data, id}    │
  │                 │                    │                  ◄───────────│               │
  │                 │                    │                  UPDATE ─────────────────►│ status='success',
  │                 │                    │                                            │ delivered_at, resend_id
  │                 │                    │ aggregateEmailStatus ──────►│ UPDATE       │
  │                 │                    │                              │ customer_email_sent, …
```

### 7.2 Delayed Mail (delay=4320 = 3 Tage)

```
Submit-Zeitpunkt T0:
  scheduleAttempts inserts Row {status='pending', scheduled_at = T0 + 4320 min}
  → processAttempt überspringt diese Row (scheduled_at > NOW)

Cron alle 5 Min:
  bei jedem Tick: SELECT * WHERE status='pending' AND scheduled_at <= NOW
  → 3 Tage nach T0 wird die Row gepickt
  → processAttempt(id) → send via Resend → UPDATE status='success'
  → aggregateEmailStatusForSubmission updated die submissions-Row
```

### 7.3 Retry-Pfad (5xx oder Timeout)

```
processAttempt:
  send fails mit "RateLimit" (transient)
  → newAttemptCount = 1
  → nextRetry = backoff(1) = 1 Min
  → UPDATE Row {status='retrying', next_retry_at=NOW+1min, last_error}

Cron 5 Min später:
  SELECT WHERE status='retrying' AND next_retry_at <= NOW
  → picked, retry: processAttempt
  → send fails wieder, newAttemptCount=2, backoff(2)=5min
  → ... (1m/5m/30m/2h/6h)
  → newAttemptCount=6 oder 4xx → status='failed', next_retry_at=NULL
```

### 7.4 Test-Mail mit Draft-Override

```
Editor (Tenant ändert subject ohne zu speichern)
  │
  │ Click "Test-Mail senden"
  ▼
TestSection.send():
  POST /test mit Body { recipient?, draft_subject, draft_body_html, draft_recipient_type }
  ▼
API-Route:
  Validiert recipient
  sendTestEmail(subId, { customRecipient, draftSubject, draftBodyHtml, draftRecipientType })
  ▼
lib/emails.sendTestEmail:
  Lade saved Sub aus DB
  effectiveSubject = draftSubject ?? subject  // ← Draft hat Vorrang
  effectiveBody    = draftBodyHtml ?? body_html
  effectiveRecType = draftRecipientType ?? recipient_type
  renderEmail(effectiveSubject, effectiveBody, ctx)
  Resend.emails.send
  INSERT email_delivery_attempts (is_test=true, submission_id=NULL,   ← Aufgabe 57B
         status=success|failed terminal, delivered_at bei success)
```

So sieht der Tenant immer den aktuellen Editor-Stand im Test-Posteingang, auch ohne vorher zu speichern.

**Test-Logging (Aufgabe 57B):** Jeder tatsächliche Test-Send landet als Row in `email_delivery_attempts` mit `is_test=true` — Konsistenz zum Webhook-Test (`event_type='webhook.test'`). Die Versand-Historie im Editor zeigt dafür ein „Test"-Badge. Früh-Returns (Subscription fehlt, Empfänger fehlt, Config-Fehler) loggen nicht. Da der Status terminal ist (success/failed) und `submission_id` NULL, fassen Cron-Queues (pending/retrying) und `aggregateEmailStatusForSubmission` (filtert auf `submission_id`) Test-Rows nie an.

---

## 8. Backwards-Compat: Backfill

Die Migration `aufgabe_41_email_subscriptions` legt beim Apply für jeden bestehenden Funnel 2 Default-Subscriptions an:

**Subscription 1 — Customer-Confirmation (delay=0, recipient='customer'):**
```html
<p>Vielen Dank, <span data-variable="contact.name">{{contact.name}}</span>!</p>
<p><span data-variable="funnel.success_message">{{funnel.success_message}}</span></p>
<p><span data-variable="funnel.response_message">{{funnel.response_message}}</span></p>
<div data-magic-section="answers_overview"></div>
<hr />
<p><strong>Ihr Ansprechpartner:</strong><br />
<span data-variable="funnel.name">{{funnel.name}}</span><br />
<span data-variable="funnel.phone">{{funnel.phone}}</span><br />
<span data-variable="funnel.email">{{funnel.email}}</span></p>
```

**Subscription 2 — Tenant-Notification (delay=0, recipient='tenant'):**
```html
<p><strong>Neue Anfrage eingegangen!</strong></p>
<p>Eingegangen: <span data-variable="submitted_at">{{submitted_at}}</span></p>
<div data-magic-section="contact_summary"></div>
<div data-magic-section="answers_overview"></div>
<div data-magic-section="dashboard_button"></div>
```

**Resultat:** das alte hartkodierte Verhalten (`sendAllEmails` → Customer + Tenant Mail beim Submit) wird durch diese 2 Subscriptions 1:1 reproduziert. Tenants merken nichts beim Cutover, können aber ab sofort die Mails editieren oder weitere Drip-Mails dazubauen.

---

## 9. ENV-Vars

| Var | Zweck |
|---|---|
| `RESEND_API_KEY` | Resend-Account-Key. Ohne den ist der Sender disabled. |
| `EMAIL_DOMAIN` | Sender-Domain für customer-Mails, z.B. `anfragebestaetigung.de`. From wird `<companyName> <local@EMAIL_DOMAIN>` |
| `EMAIL_DOMAIN_PLATFORM` | Sender-Domain für tenant-Mails, z.B. `leadplug.de`. From wird `LeadPlug <anfrage@EMAIL_DOMAIN_PLATFORM>` |
| `EMAIL_FROM` | Final-Fallback wenn weder `from_local` noch `emailSenderLocal` gesetzt |
| `NEXT_PUBLIC_BASE_URL` | für Magic-Section-Dashboard-Button. Default `https://app.leadplug.de` |
| `CRON_SECRET` | Bearer-Auth für `/api/cron/webhook-retry` (gemeinsam mit Webhooks) |

---

## 10. Known-Issues / Verschoben

**Verschoben (nicht-blockierend):**
- **Mobile-Responsive:** 3-Pane bricht unter ~1100 px Breite. Wird mit allgemeinem Design-Pass für alle Editor-Tabs gefixt.

**Bekannte Trade-Offs:**
- **Vorschau zeigt nur Body-HTML in der Brand-Card-Optik**, nicht den vollen React-Email-Render. Letzterer würde nur via Server-Render gehen — Client kann React-Email nicht ausführen. Für Layout/Inhalt-Check reicht die Approximation; für 100% pixel-perfekte Vorschau muss man einen Test-Versand machen.
- **Aggregat-Status (`customer_email_sent` / `tenant_email_sent`) wird beim Drip nur einmal nach Submit gesetzt und beim Cron-Pass aktualisiert.** Bei verzögerten Mails (delay > 0) sieht man im Dashboard initial alle Mails als „nicht versandt" bis der Cron den ersten erfolgreichen Send gemacht hat.
- **Subscription-Switch mit dirty Draft** triggert einen Modal-Dialog (Abbrechen / Verwerfen / Speichern). „Verwerfen" verliert den Draft.

---

## 11. Migration-History

| Datum | Migration | Wirkung |
|---|---|---|
| 2026-05-31 | `aufgabe_41_email_subscriptions` | + 2 Tabellen (`email_subscriptions`, `email_delivery_attempts`) + RLS + Indices + Trigger. Backfill: 24 Default-Subscriptions für 12 bestehende Funnels. |
| 2026-05-31 | `aufgabe_41_custom_recipient` | CHECK-Constraint-Erweiterung auf `recipient_type IN ('customer','tenant','custom')` + neue Spalte `recipient_value text NULL` + CHECK „bei `custom` muss `recipient_value` gefüllt sein". Additive, kein Backfill. |

DOWN-Migrationen: `supabase/migrations/*_DOWN.sql` (DROP TABLE CASCADE bzw. Constraint-Revert).

---

## 12. Code-Datei-Index

**Backend:**
- [`lib/emails.ts`](../lib/emails.ts) — Sender + Queue + Public Entry-Points
- [`lib/emailTemplates.ts`](../lib/emailTemplates.ts) — Substitution + Magic-Section-Renderer + AVAILABLE_TOKENS
- [`emails/DynamicEmail.tsx`](../emails/DynamicEmail.tsx) — React-Email-Shell
- [`app/api/submit/route.ts`](../app/api/submit/route.ts) — Trigger-Aufruf via `after()`
- [`app/api/cron/webhook-retry/route.ts`](../app/api/cron/webhook-retry/route.ts) — Cron erweitert um E-Mail-Queue
- [`app/api/tenant/funnels/[slug]/emails/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/emails/route.ts) + Sub-Routes — CRUD-API
- [`app/api/tenant/funnels/[slug]/preview-leads/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/preview-leads/route.ts) — Vorschau-Lead-Picker-Quelle

**Frontend:**
- [`components/tenant-editor/v2/EmailsPanel.tsx`](../components/tenant-editor/v2/EmailsPanel.tsx) — 3-Pane-Container, Draft-State im Parent, Manual-Save, UnsavedChangesModal beim Switch, Resize-Handle, Custom-Recipient-List, Demo-Mode-Fallback
- [`components/tenant-editor/v2/email/EmailEditor.tsx`](../components/tenant-editor/v2/email/EmailEditor.tsx) — TipTap-Wrapper, Portal-Dropdowns
- [`components/tenant-editor/v2/email/VariableNode.ts`](../components/tenant-editor/v2/email/VariableNode.ts) — Custom Inline-Atom
- [`components/tenant-editor/v2/email/MagicSectionNode.ts`](../components/tenant-editor/v2/email/MagicSectionNode.ts) — Custom Block-Atom mit X-Button
- [`components/tenant-editor/v2/email/CtaButtonNode.ts`](../components/tenant-editor/v2/email/CtaButtonNode.ts) — Custom Block-Atom mit Inline-Label-/URL-Editing + X-Button
- [`components/tenant-editor/v2/TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx) — E-Mails-Tab aktiv
- [`components/tenant-editor/v2/EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx) — Tab-Routing

**Migration:**
- [`supabase/migrations/20260531120000_aufgabe_41_email_subscriptions.sql`](../supabase/migrations/20260531120000_aufgabe_41_email_subscriptions.sql)
- [`supabase/migrations/20260531120000_aufgabe_41_email_subscriptions_DOWN.sql`](../supabase/migrations/20260531120000_aufgabe_41_email_subscriptions_DOWN.sql)
