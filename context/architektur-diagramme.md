# LeadPlug — Architektur-Diagramme (Diagram-as-Code)

> **Zweck:** Versionierte, regenerierbare Klartext-Quelle aller Architektur-Diagramme. Die interaktive, gerenderte Ansicht liegt in Eraser; jeder Block unten ist Eraser-„Diagram-as-Code" — aus dem DSL baut jede KI (oder Eraser) das Diagramm in Sekunden neu auf.
>
> **Interaktive Datei (Eraser):** https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw
>
> **Stand:** 2026-06-07 · gebaut aus echtem Code + Live-DB-Introspektion (nicht aus den `context/`-Docs). Bei Architektur-Änderungen hier **und** in Eraser nachziehen.
>
> **Begriffe in den Diagrammen:** *Kunde* = Agentur/zahlender Account (Code/DB: `tenant`) · *Endkunde* = Betrieb hinter dem Funnel · *Lead* = Person, die den Funnel ausfüllt (Code: `recipient_type='customer'`). ⚠️ Code-`customer` = Lead, Code-`tenant` = Kunde — Begriff und Code laufen gegenläufig.

---

## 1. Cloud / Infrastruktur

Vercel · Supabase · Resend · Stripe · `embed.js` auf Kundenseiten · Cron · Conversion-Bridge.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=yyA9Ftu3omJNSDxm7-4D

```
// Typ: cloud-architecture-diagram
direction down

Endkunden-Website [icon: globe, color: gray] {
  Embed-Loader [icon: javascript, label: "embed.js (Script-Loader)"]
  iFrame-Widget [icon: monitor, label: "iFrame Funnel-Widget"]
  GTM-dataLayer [icon: google, label: "GTM dataLayer"]
  Meta-Pixel [icon: facebook, label: "Meta Pixel"]
  Google-Ads [icon: google, label: "Google Ads gtag"]
}

Agentur-Browser [icon: chrome, color: blue] {
  Dashboard-UI [icon: react, label: "Dashboard (RSC + Client)"]
  Funnel-Editor [icon: react, label: "Funnel-Editor v2"]
}

Vercel [icon: vercel, color: black] {
  Widget-Route [icon: nextjs, label: "Widget-Route /:slug (SSR)"]
  Dashboard-Routes [icon: nextjs, label: "Dashboard-Routes"]
  API-Routes [icon: nextjs, label: "API-Routes /api/*"]
  Cron [icon: clock, label: "Vercel Cron */5 min"]
}

Supabase [icon: supabase, color: green] {
  Postgres [icon: postgresql, label: "Postgres + RLS"]
  Auth [icon: lock, label: "Supabase Auth"]
  Backups [icon: database, label: "Daily Backups"]
}

Resend [icon: mail, color: purple]
Stripe [icon: stripe, color: indigo]
Externe-CRMs [icon: webhook, color: orange, label: "Externe CRMs (HubSpot, Pipedrive, …)"]

Embed-Loader > iFrame-Widget: injiziert iFrame
Widget-Route > iFrame-Widget: lädt Funnel (SSR)
iFrame-Widget > Embed-Loader: postMessage (funnel-submit / -resize)
Embed-Loader > GTM-dataLayer: leadplug_lead
Embed-Loader > Meta-Pixel: fbq track Lead
Embed-Loader > Google-Ads: gtag conversion
iFrame-Widget > API-Routes: POST /api/submit · track-progress · track-view
Dashboard-UI > Dashboard-Routes: navigiert (RSC)
Funnel-Editor > API-Routes: Funnel-/Webhook-/E-Mail-CRUD
Dashboard-Routes > Auth: Login / Session (Cookies)
API-Routes > Postgres: Service-Key (submit, track) + RLS-Client (CRUD)
Dashboard-Routes > Postgres: RLS (User-Client)
API-Routes > Resend: Mails via after()
API-Routes > Externe-CRMs: Webhooks via after()
Cron > Postgres: Queue + Abbrecher
Cron > Resend: Drip-Mails (delay > 0)
Cron > Externe-CRMs: Retry + abandoned-Webhook
Dashboard-UI > Stripe: Checkout / Customer-Portal
Stripe > API-Routes: Webhook subscription.*
```

---

## 2. App- / Komponenten-Architektur

Eine Next.js-16-App · 3 Welten (Widget · Editor v2 · Dashboard) + API-Routes + `lib/`.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=FQLT98orN8lMhd3ti-aw

```
// Typ: flowchart-diagram
direction down

WidgetWorld [label: "① Widget (öffentlich, anonym)", icon: monitor, color: gray] {
  slugPage [label: "app/[slug]/page.tsx (SSR)", icon: nextjs]
  TFC [label: "TenantFunnelClient.tsx", icon: react]
  FunnelCmp [label: "components/funnel.tsx (Widget)", icon: react]
}

EditorWorld [label: "② Funnel-Editor v2 (Auth + RLS)", icon: edit, color: blue] {
  editPage [label: "funnels/[slug]/edit/page.tsx", icon: nextjs]
  EditorShell [label: "EditorShell + TopTabs", icon: react]
  StepList [label: "StepList / StepPill / AddElementModal", icon: react]
  CenterCanvas [label: "CenterCanvas (→ funnel.tsx editMode)", icon: react]
  PropsPanel [label: "PropertiesPanel + properties/*", icon: react]
  ThemePanel [label: "ThemePanel (Design)", icon: react]
  WebhooksPanel [label: "WebhooksPanel + AddModal", icon: react]
  EmailsPanel [label: "EmailsPanel + email/EmailEditor (TipTap)", icon: react]
  SharePanel [label: "SharePanel (Einbinden + Tracking)", icon: react]
}

DashWorld [label: "③ Dashboard (Agentur, Auth + RLS)", icon: grid, color: green] {
  dashLayout [label: "dashboard/layout.tsx (Tenant-Lookup + Auto-Provision)", icon: nextjs]
  overview [label: "Overview + DailyLeadsChart", icon: nextjs]
  funnelsList [label: "Funnels-Liste + FunnelCard", icon: nextjs]
  leadsPage [label: "Leads-Inbox (3 Tabs)", icon: nextjs]
  statsPage [label: "Statistiken", icon: nextjs]
  accountPage [label: "Account", icon: nextjs]
  billingPage [label: "Billing", icon: nextjs]
}

AdminWorld [label: "Super-Admin (Platform-Owner)", icon: shield, color: red] {
  adminPage [label: "app/admin/* (lib/auth/superadmin)", icon: nextjs]
}

API [label: "API-Routes (runtime = nodejs)", icon: server, color: orange] {
  submitR [label: "/api/submit", icon: nextjs]
  trackProg [label: "/api/track-progress", icon: nextjs]
  trackView [label: "/api/track-view", icon: nextjs]
  funnelCrud [label: "/api/tenant/funnels (+[slug])", icon: nextjs]
  resCrud [label: ".../webhooks · emails · tracking · preview-leads", icon: nextjs]
  leadsApi [label: "/api/leads/[id]", icon: nextjs]
  stripeApi [label: "/api/stripe/{checkout,portal,webhook}", icon: stripe]
  cronApi [label: "/api/cron/webhook-retry", icon: clock]
}

Lib [label: "lib/ (Server-Logik)", icon: code, color: purple] {
  getCfg [label: "getTenantConfig.ts", icon: file]
  editorUtils [label: "editorUtils.ts (State ⇄ pages+fields)", icon: file]
  trackingLib [label: "tracking.ts (UPSERT · honeypot · rate-limit · deriveContact)", icon: file]
  webhooksLib [label: "webhooks.ts (HMAC · Payload · Retry)", icon: file]
  emailsLib [label: "emails.ts (Queue · Sender · Backoff)", icon: file]
  emailTpl [label: "emailTemplates.ts + resolveAnswer.ts", icon: file]
  validateLib [label: "validateContactField.ts", icon: file]
  billingLib [label: "billing.ts + stripe.ts", icon: file]
  sbClients [label: "supabase/{server,client,admin}.ts", icon: file]
}

Supabase [icon: supabase, color: green]
Resend [icon: mail, color: purple]
StripeExt [icon: stripe, color: indigo, label: "Stripe"]
CRM [label: "Externe CRMs", icon: webhook, color: orange]

slugPage > getCfg: getTenantConfig(slug)
slugPage > TFC
TFC > FunnelCmp: rendert <Funnel>
TFC > submitR
TFC > trackProg
TFC > trackView
editPage > editorUtils: dbToEditorState (lesen)
editPage > EditorShell
EditorShell > StepList
EditorShell > CenterCanvas
EditorShell > PropsPanel
EditorShell > ThemePanel
EditorShell > WebhooksPanel
EditorShell > EmailsPanel
EditorShell > SharePanel
CenterCanvas > FunnelCmp: editMode-Vorschau
EditorShell > funnelCrud: Speichern (PUT)
WebhooksPanel > resCrud
EmailsPanel > resCrud
SharePanel > resCrud
funnelCrud > editorUtils: editorStateToPagesAndFields (schreiben)
dashLayout > sbClients: Tenant via tenant_members
funnelsList > sbClients
leadsPage > leadsApi
billingPage > stripeApi
submitR > getCfg
submitR > trackingLib
submitR > validateLib: Card-Backstop
submitR > webhooksLib: triggerOnSubmit (after)
submitR > emailsLib: triggerEmailsOnSubmit (after)
trackProg > trackingLib
trackProg > webhooksLib: triggerOnPageAdvance
trackView > sbClients
cronApi > webhooksLib: Retry + abandoned
cronApi > emailsLib: due pending / retrying
funnelCrud > sbClients
resCrud > sbClients
leadsApi > sbClients
stripeApi > billingLib
getCfg > sbClients
editorUtils > sbClients
trackingLib > sbClients
webhooksLib > sbClients
webhooksLib > CRM: HMAC-signierte POSTs
emailsLib > emailTpl: Variablen + Magic-Sections
emailsLib > sbClients
emailsLib > Resend
billingLib > StripeExt
sbClients > Supabase
```

---

## 3. Sequenz — Lead-Lebenszyklus

View → Fortschritt → Submit → `after()`-Actions → Cron. Verifiziert an `/api/submit`, Cron, `embed.js`.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=LWKTb4GtPdpWFlOuJvSL

```
// Typ: sequence-diagram
Besucher [icon: user]
Widget [icon: monitor, label: "Widget (funnel.tsx + TenantFunnelClient)"]
EmbedJS [icon: javascript, label: "embed.js (Parent-Seite)"]
AdPlat [icon: google, label: "GTM / Meta / Google Ads"]
API [icon: server, label: "Next.js API-Routes"]
DB [icon: supabase, label: "Supabase Postgres"]
Resend [icon: mail]
CRM [icon: webhook, label: "Externe CRMs"]
Cron [icon: clock, label: "Vercel Cron /5min"]

Besucher > Widget: öffnet /[slug] (iFrame)
Widget > API: POST /api/track-view
API > DB: INSERT funnel_view_logs

loop [bei jeder Antwort · 600ms debounced] {
  Besucher > Widget: Antwort / Page-Advance
  Widget > API: POST /api/track-progress
  API > DB: UPSERT submissions (session_id · completed_at = NULL)
  opt [after_page-Webhook konfiguriert] {
    API > CRM: triggerOnPageAdvance (HMAC)
  }
}

Besucher > Widget: Absenden (oder autoFinish am Funnel-Ende)
Widget > EmbedJS: postMessage funnel-submit (slug · meta · google — PII-frei)
EmbedJS > AdPlat: dataLayer leadplug_lead · fbq Lead · gtag conversion
Widget > API: POST /api/submit

alt [Honeypot gefüllt ODER Rate-Limit 3/IP/10min] {
  API > DB: logHoneypot (nur bei Bot)
  API --> Widget: 200 {success:true} — kein Lead
}

API > DB: getTenantConfig (Service-Key JOIN funnels+tenants+pages+fields)
API > API: deriveContactFromAnswers · Card-Backstop-Validierung · lead_price
API > DB: UPSERT submissions (completed_at = NOW)
API --> Widget: 200 {success:true}

opt [after() · Webhooks — fire-and-forget] {
  API > DB: insert webhook_delivery_attempts
  API > CRM: HMAC-POST submission.completed
}
opt [after() · E-Mail-Drip] {
  API > DB: insert email_delivery_attempts
  API > Resend: sofort-Mail bei delay = 0 (DynamicEmail)
}

Widget > Besucher: Success-Page ODER redirect_url

loop [Cron alle 5 Min · Bearer CRON_SECRET] {
  Cron > DB: due webhook-Attempts (Backoff 1m/5m/30m/2h/6h)
  Cron > CRM: retryDelivery
  Cron > DB: Abbrecher (completed_at NULL · älter 10min)
  Cron > CRM: submission.abandoned (nur wenn email/telefon)
  Cron > DB: due email-Attempts (delay > 0)
  Cron > Resend: Drip-Mail senden
}
```

---

## 4. ER-Diagramm (Public-Schema)

1:1 aus dem Supabase-Live-Schema. Farben: blau = Account/Auth · grün = Funnel-Inhalt · orange = Leads/Tracking · lila = Webhooks · rot = E-Mail-Drip.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=iByxiQ4E9aCaspo_Us8S

```
// Typ: entity-relationship-diagram

// LEGENDE
Legende_Account [icon: lock, color: blue, label: "LEGENDE: Account / Auth (blau)"] {
  Tabellen tenants,tenant_members,auth_users
}
Legende_Funnel [icon: filter, color: green, label: "LEGENDE: Funnel-Inhalt (grün)"] {
  Tabellen funnels,pages,fields
}
Legende_Leads [icon: inbox, color: orange, label: "LEGENDE: Leads / Tracking (orange)"] {
  Tabellen submissions,funnel_view_logs,honeypot_triggers
}
Legende_Webhooks [icon: webhook, color: purple, label: "LEGENDE: Webhooks (lila)"] {
  Tabellen webhook_subscriptions,webhook_delivery_attempts
}
Legende_Mail [icon: mail, color: red, label: "LEGENDE: E-Mail-Drip (rot)"] {
  Tabellen email_subscriptions,email_delivery_attempts
}

auth_users [icon: lock, color: blue, label: "auth.users (Supabase-managed)"] {
  id uuid pk
  email text
}
tenants [icon: briefcase, color: blue] {
  id uuid pk
  company_name text
  is_active bool
  billing_model billing_model_type
  lead_price numeric
  billing_price numeric
  stripe_customer_id text
  stripe_subscription_id text
  stripe_subscription_status text
  stripe_price_id text
  created_at timestamptz
  updated_at timestamptz
}
tenant_members [icon: users, color: blue] {
  id uuid pk
  tenant_id uuid fk
  auth_user_id uuid fk
  role tenant_member_role
  created_at timestamptz
  updated_at timestamptz
}
funnels [icon: filter, color: green] {
  id uuid pk
  slug text unique
  tenant_id uuid fk
  is_active bool
  funnel_name text
  contact_form_title text
  contact_form_subtitle text
  submit_button_label text
  success_message text
  response_message text
  answers_overview_label text
  show_answers_overview bool
  privacy_text text
  privacy_policy_url text
  notification_email text
  email_sender_local text
  redirect_url text
  meta_pixel_id text
  google_ads_conversion text
  primary_color text
  text_color text
  background_color text
  page_background_color text
  font text
  border_radius text
  max_width text
  created_at timestamptz
  updated_at timestamptz
}
pages [icon: layers, color: green] {
  id uuid pk
  funnel_id uuid fk
  page_type page_type
  sort_order int
  config jsonb
  created_at timestamptz
  updated_at timestamptz
}
fields [icon: list, color: green] {
  id uuid pk
  page_id uuid fk
  field_key text
  field_type field_type
  label text
  subtitle text
  placeholder text
  visible bool
  required bool
  sort_order int
  options jsonb
  config jsonb
  created_at timestamptz
  updated_at timestamptz
}
submissions [icon: inbox, color: orange] {
  id uuid pk
  session_id uuid unique
  tenant_id uuid fk
  funnel_slug text
  tenant_slug text
  contact jsonb
  answers jsonb
  completed_at timestamptz
  abandoned_webhook_fired_at timestamptz
  lead_price numeric
  status text
  notes text
  source_url text
  user_agent text
  ip_address text
  customer_email_sent bool
  tenant_email_sent bool
  created_at timestamptz
}
funnel_view_logs [icon: eye, color: orange] {
  id bigint pk
  funnel_id uuid fk
  tenant_id uuid fk
  viewed_at timestamptz
}
honeypot_triggers [icon: shield, color: orange] {
  id uuid pk
  funnel_slug text
  ip_address text
  created_at timestamptz
}
webhook_subscriptions [icon: webhook, color: purple] {
  id uuid pk
  tenant_id uuid fk
  funnel_id uuid fk
  name text
  url text
  secret text
  event_types text_array
  trigger_type text
  trigger_page_id uuid fk
  is_active bool
  created_at timestamptz
  updated_at timestamptz
}
webhook_delivery_attempts [icon: send, color: purple] {
  id uuid pk
  subscription_id uuid fk
  submission_id uuid fk
  event_type text
  attempt_count int
  status text
  response_status_code int
  response_body text
  last_error text
  next_retry_at timestamptz
  delivered_at timestamptz
  created_at timestamptz
}
email_subscriptions [icon: mail, color: red] {
  id uuid pk
  funnel_id uuid fk
  tenant_id uuid fk
  name text
  recipient_type text
  recipient_value text
  delay_minutes int
  subject text
  body_html text
  from_local text
  is_active bool
  created_at timestamptz
  updated_at timestamptz
}
email_delivery_attempts [icon: send, color: red] {
  id uuid pk
  subscription_id uuid fk
  submission_id uuid fk
  scheduled_at timestamptz
  attempt_count int
  status text
  recipient_address text
  resend_message_id text
  last_error text
  next_retry_at timestamptz
  delivered_at timestamptz
  created_at timestamptz
}

tenant_members.tenant_id > tenants.id
tenant_members.auth_user_id > auth_users.id
funnels.tenant_id > tenants.id
pages.funnel_id > funnels.id
fields.page_id > pages.id
submissions.tenant_id > tenants.id
funnel_view_logs.funnel_id > funnels.id
funnel_view_logs.tenant_id > tenants.id
webhook_subscriptions.tenant_id > tenants.id
webhook_subscriptions.funnel_id > funnels.id
webhook_subscriptions.trigger_page_id > pages.id
webhook_delivery_attempts.subscription_id > webhook_subscriptions.id
webhook_delivery_attempts.submission_id > submissions.id
email_subscriptions.funnel_id > funnels.id
email_subscriptions.tenant_id > tenants.id
email_delivery_attempts.subscription_id > email_subscriptions.id
email_delivery_attempts.submission_id > submissions.id

// Hinweis: submissions hat KEINEN FK auf funnels (Snapshot via funnel_slug).
// honeypot_triggers steht bewusst beziehungslos (reines Bot-Log).
```

---

## 5. Funnel-Journey (Lead-Sicht)

Wie ein Lead durchklickt und zur Submission wird (menschenlesbar). Verifiziert an `funnel.tsx`-Render-Logik.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=YoItoK9XSJK1Gb1mLHJp

```
// Typ: flowchart-diagram
direction down

start [shape: oval, label: "Lead öffnet Funnel (im iFrame auf der Website)", icon: user, color: blue]
view [label: "Aufruf wird gezählt (track-view)"]
welcome [label: "Welcome-Screen (optional) — Button 'Starten'", icon: flag]

qtype [shape: diamond, label: "Welcher Schritt-Typ?", color: gray]
single [label: "Single-Choice — eine Option wählen"]
auto [label: "Auto-Advance nach 250ms (Typeform-Stil)", color: green]
other [label: "Multi-Choice · Text · Slider · Rating · Skala · Datum · Zahl · Dropdown — Eingabe"]
weiter [label: "Button 'Weiter'"]
statement [label: "Statement — nur lesen, Button 'OK'"]
card [label: "Kontaktdaten-Karte: Name · E-Mail · Telefon", icon: address-book]

save [shape: oval, label: "Zwischenstand wird laufend gespeichert (track-progress · completed_at = NULL)", color: orange]
abandon [label: "Lead bricht ab / schließt Tab", color: red]
cron [label: "Cron nach 10 Min: zählt als Abbrecher-Lead; abandoned-Webhook nur wenn E-Mail/Telefon erfasst", color: red]

last [shape: diamond, label: "War das der letzte Schritt?", color: gray]
submit [label: "Absenden / autoFinish am Funnel-Ende", icon: send, color: blue]
conv [label: "Conversion an Werbe-Plattform melden (Meta · Google · GTM, PII-frei)", color: blue]
server [label: "Server speichert vollständigen Lead (completed_at = NOW)", color: green]
after [label: "Im Hintergrund: Webhooks an CRM + Drip-Mails (Lead-Bestätigung & Benachrichtigung)", color: purple]

endq [shape: diamond, label: "Weiterleitungs-URL gesetzt?", color: gray]
redirect [shape: oval, label: "Weiterleitung zur Ziel-Seite (Danke/Termin)", icon: link]
success [shape: oval, label: "Dank-Screen (optional Antworten-Übersicht)", icon: check, color: green]

start > view > welcome > qtype
qtype > single: single_choice
single > auto
qtype > other: andere Eingabe
other > weiter
qtype > statement: statement
qtype > card: Kontakt-Karte
auto > save
weiter > save
statement > save
card > save
save > last
last > qtype: nein — nächster Schritt
last > submit: ja
submit > conv > server > after
server > endq
endq > redirect: ja
endq > success: nein
save > abandon: jederzeit möglich
abandon > cron
```

---

## 6. Produkt-Überblick (Vogelperspektive)

Was ist LeadPlug und wer profitiert wie — für Menschen + KI-Onboarding.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=2_4Hvp1LX8B4SDyNuqrb

```
// Typ: flowchart-diagram
direction down

LeadPlug [icon: box, color: black, label: "LeadPlug — Funnel-Builder + Lead-CRM (SaaS)"]

Kunde [icon: briefcase, color: blue, label: "KUNDE — Agentur / Marketer (zahlender Account)"]
Endkunde [icon: store, color: gray, label: "ENDKUNDE — Betrieb, für den der Funnel ist (z.B. Solar)"]
Lead [icon: user, color: orange, label: "LEAD — die Person, die den Funnel ausfüllt"]

Builder [icon: edit, color: blue, label: "1. Funnel bauen — Fragen · Design · Webhooks · Mails · Tracking"]
Embed [icon: code, color: green, label: "2. Einbetten — embed.js / iFrame auf der Website"]
Fill [icon: pencil, color: orange, label: "3. Funnel ausfüllen → ein Lead entsteht"]

Ergebnisse [label: "Was mit jedem Lead passiert", color: gray] {
  Inbox [icon: inbox, color: blue, label: "Lead-Inbox (offen → kontaktiert → abgeschlossen)"]
  CRM [icon: webhook, color: purple, label: "CRM des Kunden via Webhook (HubSpot, Pipedrive …)"]
  Mails [icon: mail, color: red, label: "Drip-Mails (Bestätigung + Benachrichtigung)"]
  Conv [icon: target, color: green, label: "Conversion an Meta / Google → bessere Anzeigen"]
}

Billing [icon: credit-card, color: indigo, label: "Billing via Stripe (pro Lead oder Pauschale)"]

LeadPlug > Kunde: stellt Plattform bereit
Kunde > Builder: baut im Dashboard
Builder > Embed
Embed > Endkunde: Funnel lebt auf deren Website
Endkunde > Lead: Website-Besucher
Lead > Fill
Fill > Inbox
Fill > CRM
Fill > Mails
Fill > Conv
Inbox > Kunde: bearbeitet Leads
Mails > Lead: Eingangs-Bestätigung
Conv > Kunde: bessere Werbe-Performance
Kunde > Billing: zahlt Abo / pro Lead
Billing > LeadPlug: Umsatz
```

---

## 7. Capability-Map (Funktionsbereiche & Schnittstellen)

Das Programm in 10 Sektionen zerlegt; jede Karte = 1 Fähigkeit mit Schnittstelle + eigenen Tabellen.
🔗 https://app.eraser.io/workspace/9pKfAsoxoczc5HQCf9Vw?diagram=QPN64XoCj0orymsRcOM0

```
// Typ: flowchart-diagram
direction down

Auth [icon: lock, color: blue, label: "Auth & Tenancy — Login · Tenant-Zuordnung · RLS"] {
  Auth_if [label: "Schnittstelle: Supabase-Session · current_tenant_ids()"]
  Auth_db [icon: database, label: "Tabellen: tenants · tenant_members · auth.users"]
}
Builder [icon: edit, color: blue, label: "Funnel-Builder — Editor & Funnel-Definition"] {
  Builder_if [label: "Schnittstelle: /api/tenant/funnels · EditorState ⇄ pages/fields"]
  Builder_db [icon: database, label: "Tabellen: funnels · pages · fields"]
}
Widget [icon: monitor, color: green, label: "Widget / Runtime — Funnel rendern & ausfüllen"] {
  Widget_if [label: "Schnittstelle: TenantConfig · postMessage · /api/submit + track-*"]
  Widget_db [icon: database, label: "schreibt: submissions"]
}
Inbox [icon: inbox, color: blue, label: "Lead-Inbox / CRM — Leads ansehen & bearbeiten"] {
  Inbox_if [label: "Schnittstelle: /api/leads/[id] · Status offen → kontaktiert → abgeschlossen"]
  Inbox_db [icon: database, label: "liest/updatet: submissions · notes"]
}
Webhook [icon: webhook, color: purple, label: "Webhook-Engine — Events an externe CRMs"] {
  Webhook_if [label: "Schnittstelle: triggerOnSubmit / -PageAdvance · HMAC-Payload · Retry-Cron"]
  Webhook_db [icon: database, label: "Tabellen: webhook_subscriptions · webhook_delivery_attempts"]
}
Email [icon: mail, color: red, label: "E-Mail-Drip — Nurturing-Sequenzen"] {
  Email_if [label: "Schnittstelle: triggerEmailsOnSubmit · Resend · Queue-Cron"]
  Email_db [icon: database, label: "Tabellen: email_subscriptions · email_delivery_attempts"]
}
Conversion [icon: target, color: green, label: "Conversion-Tracking — Leads an Werbe-Plattform"] {
  Conv_if [label: "Schnittstelle: embed.js · funnel-submit · dataLayer / fbq / gtag"]
  Conv_db [icon: database, label: "Felder: funnels.meta_pixel_id · google_ads_conversion"]
}
Billing [icon: credit-card, color: indigo, label: "Billing — Abo & Bezahlung"] {
  Billing_if [label: "Schnittstelle: Stripe Checkout · Portal · Webhook"]
  Billing_db [icon: database, label: "Felder: tenants.stripe_* · billing_model · lead_price"]
}
Analytics [icon: bar-chart, color: orange, label: "Analytics & Bot-Schutz — Views · Honeypot · Statistik"] {
  Analytics_if [label: "Schnittstelle: /api/track-view · Honeypot-Check · Rate-Limit"]
  Analytics_db [icon: database, label: "Tabellen: funnel_view_logs · honeypot_triggers"]
}
Admin [icon: shield, color: gray, label: "Platform-Admin — Owner-Tools (Stavros)"] {
  Admin_if [label: "Schnittstelle: app/admin · superadmin.ts"]
  Admin_db [icon: database, label: "Zugriff: alle Tenants (Service-Key)"]
}

Auth_if > Builder_if: berechtigt
Auth_if > Inbox_if: berechtigt
Auth_if > Billing_if: Abo
Builder_if > Widget_if: Funnel-Config
Widget_if > Inbox_if: Lead
Widget_if > Webhook_if: triggert
Widget_if > Email_if: triggert
Widget_if > Conv_if: Submit
Widget_if > Analytics_if: Views
```
