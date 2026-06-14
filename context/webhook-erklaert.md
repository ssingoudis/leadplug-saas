# Webhooks bei LeadPlug — von Anfang an erklärt

> Für jemanden der Programmieren lernt und wissen will: **was ist ein Webhook, wie
> funktioniert das in LeadPlug, und warum ist es so gebaut?** Du brauchst nur
> grundlegende Kenntnisse von HTTP, JSON und Datenbanken (was eine Tabelle ist).
>
> Stand: 2026-05-29 (Aufgabe 40).

---

## Teil 1: Was ist überhaupt ein Webhook?

Stell dir vor du wartest auf ein Paket. Du hast zwei Möglichkeiten:

**Option A (Polling):** Du gehst alle 10 Minuten zur Tür und schaust ob's da ist.
Nervig, ineffizient — die meiste Zeit war kein Paket da.

**Option B (Webhook):** Der Postbote klingelt wenn er ankommt. Du wartest
entspannt, machst was anderes, und nur wenn wirklich was passiert wirst du
benachrichtigt.

Ein **Webhook** ist die Klingel im Internet. Ein System (bei uns: LeadPlug) ruft
ein anderes System (bei uns: das CRM einer Agentur, z.B. Pipedrive) an —
genauer: schickt ihm einen HTTP-POST-Request — sobald etwas Interessantes
passiert ist. Das andere System muss nicht alle 10 Minuten bei uns nachfragen
„hast du neue Leads?" — sondern wird gepusht.

Die Daten kommen als **JSON** im Request-Body. Das andere System antwortet mit
einem HTTP-Status (200 = OK, 400 = du hast was falsch gemacht, 500 = bei mir
ist was kaputt). Das war's. Webhook im Kern.

---

## Teil 2: Warum brauchen wir das in LeadPlug?

LeadPlug ist ein **Funnel-Builder**: Agenturen bauen damit Formulare für ihre
Endkunden (z.B. eine Solar-Agentur baut einen Funnel für ihren Kunden „Solar
König"). Endkunden füllen das Formular aus → Lead landet in unserer DB.

**Das Problem:** Die Agentur arbeitet im Alltag mit ihrem **eigenen CRM**
(Pipedrive, HubSpot, Zapier, Make, …). Sie will den Lead NICHT in unserem
LeadPlug-Dashboard pflegen — sie will ihn in ihrem CRM.

**Die Lösung:** Sobald ein Lead bei uns reinkommt, schicken wir den per Webhook
an die CRM-URL der Agentur. Die Agentur trägt die URL einmal bei uns ein, wir
schicken jeden neuen Lead automatisch dorthin. Sie muss nie wieder bei uns
reinschauen.

Das ist auch unser **Verkaufsmodell**: der „Webhook-Tier" für 29€/Monat. Pro
Funnel beliebig viele Webhooks, Lead landet automatisch im CRM.

---

## Teil 3: Die drei Welten

Wenn du das Webhook-System verstehen willst, sind drei Akteure beteiligt:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  ① Endkunden-    │     │  ② LeadPlug-     │     │  ③ Tenant-CRM    │
│     Browser      │     │     Server       │     │  (Zapier,        │
│  (Funnel im     │     │  (Vercel,        │     │   Pipedrive,     │
│   iFrame)        │     │   Next.js)       │     │   eigener        │
│                  │     │                  │     │   Endpoint…)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘

         │                        │                        │
         │  füllt Funnel aus      │                        │
         │ ─────────────────────► │                        │
         │                        │                        │
         │   submit-Request       │                        │
         │ ─────────────────────► │                        │
         │                        │  Lead in DB speichern  │
         │                        │  → Webhook senden      │
         │                        │ ─────────────────────► │
         │                        │                        │
         │                        │   HTTP 200 OK          │
         │                        │ ◄───────────────────── │
         │                        │                        │
         │   "Vielen Dank!"       │                        │
         │ ◄───────────────────── │                        │
```

- **① Endkunden-Browser**: Das LeadPlug-Funnel-Widget läuft im iFrame auf der
  Webseite der Agentur (z.B. `solar-koenig.de`). Hier füllt der Endkunde das
  Formular aus.
- **② LeadPlug-Server**: Bei Vercel gehostet. Empfängt den Submit, speichert in
  unserer Supabase-Datenbank, schickt den Webhook an die Tenant-CRM-URL.
- **③ Tenant-CRM**: Das System der Agentur. Empfängt unsere POST-Nachricht und
  macht damit was sie wollen (Lead anlegen, Slack-Nachricht senden, was auch
  immer).

---

## Teil 4: Die Datenbank-Tabellen

Drei Tabellen halten den Webhook-Zustand:

### `webhook_subscriptions` — das Abo

Pro Agentur (= Tenant) und pro Funnel gibt es 0 oder mehr „Subscriptions".
Eine Subscription ist im Grunde: „LeadPlug, bei Events des Funnels X schick
mir bitte einen Webhook an die URL Y".

Wichtige Spalten:

| Spalte | Was steht da | Beispiel |
|---|---|---|
| `id` | Eindeutige ID dieser Subscription | uuid |
| `funnel_id` | Zu welchem Funnel gehört das Abo? | uuid |
| `url` | Wohin schicken? | URL des Tenant-CRMs (Zapier, Make, eigener Endpoint, …) |
| `secret` | Geheimer Schlüssel für Signatur (siehe Teil 6) | `whsec_a8f3…` |
| `event_types` | Bei welchen Events feuern? | `['submission.completed']` |
| `trigger_type` | Wann genau? | `on_submit` oder `after_page` |
| `trigger_page_id` | Bei `after_page`: nach welcher Page? | uuid einer page |
| `is_active` | Subscription aktiv? | true |

Die Spalten `trigger_type` + `trigger_page_id` zusammen sagen uns: feuert der
Webhook am Ende des Funnels (`on_submit`), oder bereits mitten im Funnel nach
einer bestimmten Frage (`after_page`)?

Mid-Funnel-Trigger ist hilfreich für **Lead-Qualifizierung**: Wenn der Endkunde
seine Email schon auf Frage 2 gibt, kann die Agentur **sofort** angerufen
werden, auch wenn der Funnel noch nicht final abgeschickt ist. Das ist
verkaufstaktisch Gold (Speed-to-Lead).

### `webhook_delivery_attempts` — das Versuchs-Logbuch

Jeder Webhook-Versuch wird hier protokolliert. Wenn der Tenant-Endpoint
verfügbar ist → 1 Eintrag mit `status='success'`. Wenn nicht → 1 Eintrag pro
Versuch mit `status='retrying'` oder `'failed'`.

| Spalte | Was steht da |
|---|---|
| `id` | Eindeutige Delivery-ID. Wird auch im Payload an den Tenant geschickt. |
| `subscription_id` | Welche Subscription? |
| `submission_id` | Welche Submission war's? |
| `event_type` | `submission.completed` / `submission.abandoned` / `step.advanced` |
| `status` | `pending` / `retrying` / `success` / `failed` |
| `attempt_count` | Wievielter Versuch? (1 = Erst-Versuch) |
| `next_retry_at` | Wann ist der nächste Retry fällig? (NULL = kein Retry mehr) |
| `response_status_code` | Was hat der Tenant-Endpoint geantwortet (200, 400, 500…) |
| `response_body` | Antworttext (für Debugging) |
| `last_error` | Kurzbeschreibung des Fehlers (für UI-Anzeige) |
| `delivered_at` | Zeitpunkt der erfolgreichen Zustellung (NULL bis success) |

Tenants sehen das im Editor unter „Letzte Versuche" — wie ein Briefträger-
Protokoll: hat's geklappt, wann, was war die Antwort.

### `submissions` — die Leads selbst

Bestehende Tabelle. Bekam nur eine neue Spalte:

| Spalte | Was steht da |
|---|---|
| `abandoned_webhook_fired_at` | Wann der Abbrecher-Webhook gefeuert wurde (NULL = noch nicht) |

Verhindert Doppel-Feuer bei Abbrechern (siehe Teil 9).

---

## Teil 5: Wie ein Lead durchfließt (End-to-End)

Beispiel: Endkunde Maria füllt einen Solar-Funnel aus.

```
─────────────────────────────────────────────────────────────────────
Schritt 1 — Maria klickt sich durch
─────────────────────────────────────────────────────────────────────
Browser:    Maria klickt erste Antwort.
Widget:     `setAnswers(...)` updatet React-State.
useEffect:  Nach 600ms debounce → POST /api/track-progress
            mit {sessionId, answers}.
Server:     UPSERT in submissions (Row mit completed_at=NULL).
            Maria hat jetzt einen "halbfertigen" Eintrag.

Maria klickt weiter. Jede 600ms wird der DB-Eintrag aktualisiert.

─────────────────────────────────────────────────────────────────────
Schritt 2 — Maria gibt auf Frage 3 ihre Email ein
─────────────────────────────────────────────────────────────────────
Widget:     Maria tippt Email + klickt "Weiter".
            handleNext() → onPageAdvanced(pageId, snapshot)
TenantFunnelClient:
            POST /api/track-progress mit advancedPageId=<page 3>
Server:     1. UPSERT submissions (mit aktueller Email in contact)
            2. after() triggert triggerOnPageAdvance(...)
                a) SELECT webhook_subscriptions WHERE
                   funnel_id=X AND trigger_type='after_page'
                   AND trigger_page_id=<page 3>
                b) Pre-Check delivery_attempts: gibt es bereits eine
                   Delivery für (sub, submission, step.advanced)?
                c) Wenn nein → POST an Tenant-URL + INSERT delivery_attempts
                   Wenn ja → skip (= Dedup-Schutz)

Tenant-CRM: Bekommt einen Webhook-Request mit Marias bisherigen Antworten +
            ihrer Email. Zapier triggert eine Pipedrive-Action.

─────────────────────────────────────────────────────────────────────
Schritt 3 — Maria klickt finalen Submit
─────────────────────────────────────────────────────────────────────
Widget:     handleFormSubmit() → onSubmit({answers, contact})
TenantFunnelClient:
            POST /api/submit
Server:     1. Honeypot / Rate-Limit / Validation
            2. effectiveContact = deriveContactFromAnswers(answers)
                                ∪ enrichContact(contact)
            3. upsertSubmissionProgress(completed=true)
               → submissions.completed_at = NOW()
            4. sendAllEmails() → an Maria + Tenant
            5. Response sofort: {success:true}
            6. after() triggert triggerOnSubmit('submission.completed', ...)
                a) SELECT subs WHERE trigger_type='on_submit'
                b) Parallel pro Sub: POST mit HMAC-Signatur
                c) INSERT delivery_attempts pro Sub mit Ergebnis

Tenant-CRM: Bekommt einen zweiten Webhook mit Marias finalen Daten.
            Pipedrive aktualisiert den bereits angelegten Lead.
```

Wichtige Design-Entscheidung: Der Submit-Response wird **sofort** an den Browser
zurückgeschickt (`{success:true}`). Der Webhook-Versand passiert
**asynchron** im Hintergrund via Next.js' `after()`-Funktion. Wenn der
Tenant-CRM langsam ist (5 Sekunden Antwortzeit), spürt Maria das nicht — sie
sieht sofort die Erfolgsseite. Performance.

---

## Teil 6: Wie wir die Nachrichten absichern (HMAC)

**Problem:** Wenn die Webhook-URL der Agentur öffentlich bekannt ist, kann
theoretisch jeder eine Fake-Nachricht hinschicken. Beispiel: ein Konkurrent
schickt 1000 Fake-Leads ins CRM der Agentur. CRM-Chaos.

**Lösung:** Wir signieren jede Nachricht mit einem geheimen Schlüssel
(`secret`). Die Agentur kennt diesen Schlüssel auch — sie kann prüfen ob die
Nachricht wirklich von uns kommt.

Das Verfahren heißt **HMAC-SHA256** (Hash-based Message Authentication Code).
Klingt komplex, ist im Kern:

```
Wir machen:
  HEADER X-LeadPlug-Signature = "t=<zeit>,v1=<hash>"
  wobei <hash> = HMAC-SHA256(secret, "<zeit>.<bodyJson>")

Tenant macht:
  expected = HMAC-SHA256(secret, "<zeit-aus-header>.<body-roh>")
  wenn expected == <hash-aus-header>: nachricht ist echt
  sonst: 401 zurückschicken
```

Das `secret` ist nur LeadPlug und Tenant bekannt. Niemand sonst kann den
gleichen `hash` produzieren — denn ohne `secret` ist HMAC kryptographisch
sicher (du kannst es nicht raten oder rückwärts rechnen).

Wir generieren den Secret bei Webhook-Anlegen automatisch (64-stelliger Hex):

```ts
crypto.randomBytes(32).toString('hex')
```

Tenant sieht das Secret **einmal** im Reveal-Banner und kopiert es. Danach
sieht er nur noch `whsec_••••••••<last4>` als Hint. Wenn er's verliert: Rotate-
Button generiert ein neues Secret (altes wird ungültig).

**Optional aber empfohlen:** Tenant sollte auch das **Timestamp** prüfen (z.B.
nur Nachrichten der letzten 5 Min akzeptieren) — schützt gegen Replay-
Attacken (Angreifer fängt eine echte Nachricht ab und sendet sie 1000 mal
nochmal).

Das ist exakt dasselbe Pattern, das Stripe für ihre Webhooks nutzt. Standard-
Industrie-Pattern.

---

## Teil 7: Was wenn der Tenant-Endpoint nicht antwortet?

Verteilte Systeme sind unzuverlässig. Das Tenant-CRM kann:
- **Kurz down sein** (Server-Update, Stromausfall, Wartung)
- **Langsam sein** (überlastet, Timeout)
- **Falsch konfiguriert sein** (URL falsch, Auth fehlt)
- **Auf 4xx antworten** (z.B. 401 Unauthorized: HMAC stimmt nicht, 422
  Validation: Felder fehlen)
- **Auf 5xx antworten** (interner Bug)

Wir unterscheiden zwei Fälle:

### 4xx → sofort failed, KEIN Retry

Wenn der Endpoint mit `400-499` antwortet, ist das ein **Client-Error**: der
Tenant hat was falsch konfiguriert. **Retries machen es nicht besser** — die
URL bleibt falsch, der Auth fehlt weiterhin. Wir setzen sofort
`status='failed'` und lassen den Tenant den Fehler beheben (er sieht im
Logs-Drawer „HTTP 401" oder „HTTP 404" und weiß was zu tun ist).

Ohne diesen Fix würden wir **9 Stunden lang gegen eine kaputte URL hämmern**
(siehe Backoff unten). Das ist Spam.

### 5xx / Timeout → Retry mit Backoff

Wenn der Endpoint mit `500-599` antwortet ODER innerhalb von 10 Sekunden
nicht antwortet, ist das ein **Server-Error**: vielleicht ein temporärer
Ausfall, lohnt sich nochmal zu probieren.

Wir machen das mit **exponentiellem Backoff** (Stripe-Pattern):

| Versuch | Wartezeit nach vorherigem Versuch |
|---|---|
| 1 (Erst-Versuch) | sofort |
| 2 | + 1 Min |
| 3 | + 5 Min |
| 4 | + 30 Min |
| 5 | + 2 Std |
| 6 | + 6 Std |
| Nach Versuch 6 | `status='failed'` |

Total: ~9 Stunden über 6 Versuche. Wenn ein CRM 8 Stunden Ausfall hatte, wird
unser Webhook trotzdem zugestellt. Wenn das CRM nach 9 Stunden immer noch tot
ist, hat die Agentur eh andere Probleme.

---

## Teil 8: Der Cron — die Putzkolonne

Backend-Frage: **wer schaut alle 5 Minuten ob retries fällig sind?**

Antwort: **Vercel-Cron**. In `vercel.json` definieren wir einen Cron-Job:

```json
{
  "crons": [
    { "path": "/api/cron/webhook-retry", "schedule": "*/5 * * * *" }
  ]
}
```

Das bedeutet: Vercel ruft alle 5 Min die URL `/api/cron/webhook-retry` auf.
Diese Route gehört zu uns. Sie macht zwei Sachen:

### Aufgabe 1 — Pending Retries abarbeiten

```sql
SELECT * FROM webhook_delivery_attempts
WHERE status IN ('pending', 'retrying')
  AND next_retry_at <= NOW()
  AND attempt_count < 6
ORDER BY next_retry_at ASC
LIMIT 50
```

Für jeden Treffer: nochmal POST machen. Wenn ok → status='success'. Wenn nicht
→ attempt_count++ und next_retry_at neu setzen (oder failed).

### Aufgabe 2 — Abbrecher-Webhooks feuern (siehe Teil 9)

### Auth — verhindert dass jeder den Cron ausführen kann

Vercel sendet den Request mit Header `Authorization: Bearer <CRON_SECRET>`.
Wir prüfen den gegen `process.env.CRON_SECRET`. Wenn er nicht stimmt → 401.

```ts
if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Stavros hat den Wert in Vercel ENV gesetzt.

---

## Teil 9: Abbrecher (`submission.abandoned`)

Realität: 60-80% aller User füllen das Formular **nicht zu Ende aus**. Sie
brechen mittendrin ab. Die meisten dieser User sind verloren — **außer wir
können sie noch erreichen**.

Wenn der Endkunde uns auf Frage 2 schon seine Email gegeben hat und dann
abbricht: das ist ein Lead-Capture-Hebel. Die Agentur kann ihn anrufen / per
Email kontaktieren („Hallo, ich sehe Sie haben sich für Solar interessiert —
gibt es noch Fragen?").

### Wann ist „abgebrochen"?

Pragmatisch: wenn die Session **10 Minuten** keine Aktivität mehr hatte. Vorher
ist es einfach „User schreibt noch".

### Wie merken wir das technisch?

Der Cron prüft alle 5 Min:

```sql
SELECT * FROM submissions
WHERE completed_at IS NULL
  AND abandoned_webhook_fired_at IS NULL
  AND created_at < NOW() - INTERVAL '10 minutes'
  AND funnel_slug IS NOT NULL
```

Für jeden Treffer:
1. Email/Telefon aus contact oder answers extrahieren
2. Wenn weder Email noch Telefon vorhanden: skip (= Trash-Lead, Tenant kann nix
   damit anfangen). Marker setzen damit wir nicht jedes Mal wieder picken.
3. Wenn ja: `triggerOnSubmit('submission.abandoned', ...)` → Webhook senden
4. `abandoned_webhook_fired_at = NOW()` setzen → kein Doppel-Trigger im
   nächsten Cron-Run

### Was wenn User später doch noch submittet?

Kein Problem. Der `completed`-Webhook feuert dann zusätzlich. Tenant sieht im
CRM: erst „abgebrochen", dann „completed mit zusätzlichen Daten". Story-
Information für den Sales-Pitch.

---

## Teil 10: Die Code-Karte

Wenn du im Code rumstöbern willst — wo lebt was?

```
leadplug-saas/
├── lib/
│   ├── webhooks.ts          ← Sender-Core. Macht HTTP-POST, HMAC, Backoff,
│   │                          Delivery-Logging. 700 LOC.
│   ├── tracking.ts          ← upsertSubmissionProgress + Helpers.
│   │                          deriveContactFromAnswers extrahiert Email/Telefon
│   │                          aus Antworten (Skip-Mode).
│   └── getTenantConfig.ts   ← Lädt Funnel-Konfiguration aus DB. Verwendet vom
│                              Widget UND vom Webhook-Sender.
│
├── app/api/
│   ├── submit/route.ts            ← /api/submit. Nimmt finalen Submit entgegen,
│   │                                triggert on_submit-Webhooks via after().
│   ├── track-progress/route.ts    ← /api/track-progress. Wird alle 600ms vom
│   │                                Widget gefeuert. Bei Step-Advance triggert
│   │                                after_page-Webhooks via after().
│   ├── cron/webhook-retry/route.ts ← Cron-Endpoint. Auth via CRON_SECRET.
│   │                                Retries + Abbrecher.
│   └── tenant/funnels/[slug]/webhooks/
│       ├── route.ts               ← GET/POST: Subscription anlegen + listen
│       ├── [id]/route.ts          ← GET/PATCH/DELETE: einzelne Subscription
│       ├── [id]/test/route.ts     ← POST: Test-Webhook senden
│       └── [id]/logs/route.ts     ← GET: Delivery-Logs
│
├── components/
│   ├── funnel.tsx                 ← Das Widget. Ruft onPageAdvanced() und
│   │                                onSubmit() Callbacks.
│   ├── TenantFunnelClient.tsx     ← Wrapper. Empfängt Callbacks, POSTet an
│   │                                die /api/* Endpoints.
│   └── editor/
│       ├── WebhooksPanel.tsx      ← Editor-Tab "Webhooks". Liste, Add, Test,
│       │                            Logs, Verify-Snippet.
│       └── WebhookAddModal.tsx    ← Modal beim "+ Webhook hinzufügen".
│
├── supabase/migrations/
│   ├── 20260528170000_aufgabe_29_webhook_schema.sql      ← Erste Tabellen
│   ├── 20260529120000_aufgabe_40_webhook_actions.sql     ← Trigger-Typen + Inspector-Felder
│   ├── 20260529130000_fix_submissions_tenant_slug_…sql   ← Hotfix
│   └── 20260529140000_aufgabe_40_name_field_types.sql    ← first_name/last_name/full_name
│
└── vercel.json                    ← Cron-Schedule */5 * * * *
```

---

## Teil 11: Das Payload-Format (was der Tenant sieht)

Das ist die JSON-Nachricht die LeadPlug an die Tenant-URL POSTet:

```json
{
  "event": "submission.completed",
  "delivery_id": "ec480507-…",
  "delivered_at": "2026-05-29T08:10:54.241Z",
  "tenant_id": "f64b2227-…",

  "funnel": {
    "id": "a52ee081-…",
    "slug": "leadplug",
    "name": "LeadPlug"
  },

  "submission": {
    "id": "68f8b543-…",
    "session_id": "bc6011ff-…",
    "created_at": "...",
    "completed_at": "...",       // null bei .abandoned und .step.advanced
    "source_url": "https://solar-koenig.de/anfragen"
  },

  "available_channels": {        // Filter-Hilfe für Zapier-User
    "email": true,
    "telefon": true,
    "name": true
  },

  "contact": {                   // aggregiert: email, telefon, name, firstName, lastName, anrede…
    "name": "Max Mustermann",
    "email": "max@example.de",
    "telefon": "+49170…"
  },

  "answers": [                   // self-describing Array mit Labels (für Zapier-Visual-Builder)
    {
      "key": "problem",
      "label": "Was ist dein Problem?",
      "type": "single_choice",
      "value": "zu_wenig",       // interner Wert
      "value_label": "Zu wenig Leads"  // user-readable
    }
  ],

  "answers_flat": {              // flache Map mit Labels statt Values (für Direct-CRM)
    "problem": "Zu wenig Leads"
  }
}
```

Doppel-Format `answers[]` + `answers_flat{}` ist Absicht:
- **Array** ist für visuelle Mapping-Tools (Zapier, Make) — User sieht Labels
  + value_labels und kann gezielt einzelne Felder ins CRM ziehen
- **Flat-Map** ist für direkte CRM-Webhooks ohne Middleware — einfache
  Key-Value-Zuordnung

---

## Teil 12: Glossar

| Begriff | Bedeutung |
|---|---|
| **Tenant** | Agentur die LeadPlug nutzt. Hat einen Account mit beliebig vielen Funnels. |
| **Funnel** | Ein Formular/Quiz das eine Agentur baut. Hat eine eindeutige URL (`/leadplug`). Ein Tenant hat oft mehrere Funnels (einen pro Endkunde). |
| **Submission** | Eine Lead-Eingabe. Eine DB-Row in `submissions`. Hat einen Status (`pending` / `completed` / `abandoned`). |
| **Subscription** | Ein „Webhook-Abo" — die Konfiguration „bei Event X schick mir POST an URL Y". Eine DB-Row in `webhook_subscriptions`. |
| **Delivery-Attempt** | Ein einzelner Webhook-Versand-Versuch. Erfolg/Fehler steht in `webhook_delivery_attempts`. |
| **Trigger-Type** | `on_submit` (am Funnel-Ende) oder `after_page` (mitten im Funnel nach Page X). |
| **Event-Type** | Was ist passiert? `submission.completed` / `.abandoned` / `step.advanced` / `webhook.test` |
| **Backoff** | Strategie wann Retries gemacht werden. Stripe-Pattern: 1m / 5m / 30m / 2h / 6h. |
| **HMAC** | Hash-based Message Authentication Code. Kryptographische Signatur damit der Tenant prüfen kann dass die Nachricht von uns kommt. |
| **Cron** | Zeit-gesteuerter Job. Bei uns: alle 5 Min via Vercel. Macht Retries + Abbrecher-Trigger. |
| **Dedup** | Verhindern dass dasselbe Event doppelt getriggert wird (z.B. wenn User zweimal über dieselbe Page advancet). Server-side via Pre-SELECT auf `delivery_attempts`. |
| **Race-Condition** | Zwei async Operations, deren Reihenfolge nicht garantiert ist. Bei uns: track-progress kann nach submit feuern und dabei contact-Daten überschreiben. Fix: Pre-SELECT auf `completed_at`. |
| **`field_key`** | Interner Schlüssel eines Felds. Wird im Webhook-Payload als JSON-Key benutzt. Stabil über Title-Renames. Editierbar im UI unter "Feldname im Export". |
| **`_clientId`** | Transient (= nur im Browser-State, nicht in DB) UI-Identifier für ContactField-Komponenten. Verhindert React-Remount wenn `field.key` sich live ändert. |

---

## Teil 13: Was hier NICHT erklärt ist (für später)

Wenn du tiefer einsteigen willst, lies:

- [`webhook-architecture.md`](webhook-architecture.md) — die volle technische Karte
- [`webhook-architecture.html`](webhook-architecture.html) — dieselbe Karte visuell
- [`supabase-schema.md`](supabase-schema.md) §3.8 + §3.9 — DB-Schema-Voll-Referenz
- [`current-feature.md`](current-feature.md) — chronologische Sprint-Story
- `CLAUDE.md` §5 — strategischer Konsens zum Action-Element-Modell

Themen die hier bewusst weggelassen wurden:
- Wie das **Action-Element-Modell** im Builder funktioniert (separates Pattern,
  auch für Emails + Logic-Jumps wiederverwendet)
- Wie der **Field-Key-Editor** mit Live-Sync funktioniert
  (`_keyTouched`-Tracking)
- Die **Race-Condition** zwischen track-progress und submit (komplexe Erklärung,
  reicht zu wissen: gibt's, ist gefixt)
- **Pricing-Modell** und warum `lead_price` nicht im Payload ist (Konsens
  Abo-only)

---

## Schlussbemerkung

Das ist viel auf einmal. Wenn du nur drei Sachen mitnimmst:

1. **Webhook = HTTP-Push statt Polling.** Andere Systeme werden benachrichtigt
   statt nachzufragen.

2. **LeadPlug schickt Leads automatisch an CRMs der Agenturen.** Das ist unser
   29€-Tier. Funnel-Subscription mit URL + Trigger-Konfig.

3. **Zuverlässigkeit + Sicherheit kommt durch Patterns die andere Firmen
   etabliert haben** — Stripe-Backoff, HMAC-Signatur, Cron-Retry, server-side
   Dedup. Wir haben das nicht erfunden, wir haben es ordentlich
   zusammengebaut.

Wenn du beim Code-Lesen hängen bleibst, frag. Bessere Doku als „lies das
Konzept zweimal" gibt's nicht.
