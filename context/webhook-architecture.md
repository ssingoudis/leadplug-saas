# Webhook-Architektur (Aufgabe 40)

> **Stand:** 2026-05-29 — eingeführt mit Aufgabe 40 auf Branch `feature/aufgabe-40-webhook-actions`.
>
> Dieses File ist die **vollständige technische Karte des Webhook-Systems** — gedacht
> als Lese-Wegweiser für dich + für zukünftige Claude-Code-Instanzen.
>
> **Mission in einem Satz:** Tenants verbinden ihr CRM (Zapier, Make, Pipedream,
> n8n, eigener Endpoint) per HTTP-POST mit ihrem LeadPlug-Funnel. Pro Funnel
> beliebig viele Webhook-Subscriptions mit Trigger-Wahl (am Ende oder mid-funnel),
> HMAC-signiert, fire-and-forget mit Auto-Retry + Abbrecher-Capture.
>
> **Begleit-Doku:**
> - [`CLAUDE.md`](../CLAUDE.md) §5 — strategischer Konsens zum Action-Element-Modell
> - [`architecture.md`](architecture.md) §13 — kurze Code-Karte
> - [`supabase-schema.md`](supabase-schema.md) §3.8/§3.9 — Schema-Vollreferenz
> - [`current-feature.md`](current-feature.md) — Sprint-History
> - Memory `strategy-action-modell` — Pattern für alle künftigen Output-Aktionen

---

## 1. Action-Element-Modell — die Kern-Idee

LeadPlug ist „eine Art Typeform-Klon": **alle Output-Mechanismen sind dynamisch
konfigurierbare Builder-Elemente, kein impliziter Automatismus.** Webhooks sind
die erste Action-Klasse — E-Mails, Logic-Jumps, Slack-Notifications etc. folgen
demselben Pattern.

```
┌────────────────────────────────────────────────────────────────────────┐
│   FRÜHERES MODELL (vor Aufgabe 40, „alt"):                            │
│   ─────────────────────────────────────                               │
│   /api/submit  ──hartkodiert──►  Mail + (geplant) Webhook              │
│       Tenant kann nichts steuern. Trigger ist immer „bei Submit".     │
│                                                                        │
│                                                                        │
│   AKTUELL (Aufgabe 40 — Action-Element-Modell):                       │
│   ───────────────────────────────────────────                         │
│                                                                        │
│   Funnel  ─►  N Action-Subscriptions (Webhook-Tab im Editor)          │
│                  │                                                     │
│                  ├─► trigger_type = 'on_submit'                       │
│                  │     event_types = ['submission.completed',         │
│                  │                    'submission.abandoned']         │
│                  │                                                     │
│                  └─► trigger_type = 'after_page'                      │
│                        trigger_page_id = <uuid>                       │
│                        event_types = ['step.advanced']                │
│                                                                        │
│   Tenant wählt PRO Webhook: wann + welche Events.                    │
└────────────────────────────────────────────────────────────────────────┘
```

Mehr Hintergrund: Memory `strategy-action-modell` + CLAUDE.md §5.

---

## 2. DB-Schema

3 Tabellen + 1 Snapshot-Spalte auf `submissions`.

```
                     ┌─────────────────────────────────────┐
                     │             funnels                 │
                     │  id (uuid PK)                       │
                     │  slug (text UNIQUE)                 │
                     │  tenant_id (uuid FK → tenants)      │
                     └──────┬──────────────────────────────┘
                            │ 1:N
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                webhook_subscriptions                              │
│  id (uuid PK)                                                    │
│  funnel_id (uuid NOT NULL FK → funnels) ⟵ Aufgabe 40             │
│  tenant_id (uuid FK → tenants) ⟵ behält für RLS-Speed            │
│  url (text, CHECK 'http%' + len ≥ 10)                            │
│  secret (text, CHECK len ≥ 16) ⟵ Format `whsec_<64hex>`          │
│  event_types (text[]) ⟵ z.B. ['submission.completed']            │
│  trigger_type (text NOT NULL DEFAULT 'on_submit') ⟵ Aufgabe 40   │
│         CHECK IN ('on_submit', 'after_page')                     │
│  trigger_page_id (uuid FK → pages ON DELETE SET NULL) ⟵ Aufgabe40│
│  is_active (bool NOT NULL DEFAULT true)                          │
│  created_at, updated_at                                          │
└──────┬───────────────────────────────────────────────────────────┘
       │ 1:N
       ▼
┌──────────────────────────────────────────────────────────────────┐
│              webhook_delivery_attempts                            │
│  id (uuid PK)        ⟵ wird als delivery_id im Payload geschickt │
│  subscription_id (uuid FK → webhook_subscriptions CASCADE)       │
│  submission_id (uuid FK → submissions SET NULL)                  │
│  attempt_count (int DEFAULT 1, CHECK ≥ 1)                        │
│  status (text DEFAULT 'pending')                                 │
│         CHECK IN ('pending','retrying','success','failed')       │
│  event_type (text) ⟵ Aufgabe 40                                  │
│  last_error (text)                                               │
│  delivered_at (timestamptz)                                      │
│  next_retry_at (timestamptz) ⟵ Aufgabe 40, Backoff-Sortierfeld   │
│  response_status_code (int) ⟵ Aufgabe 40, Inspector              │
│  response_body (text, app-truncated auf 4000) ⟵ Aufgabe 40       │
│  created_at                                                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              submissions (existierend)                            │
│  + abandoned_webhook_fired_at (timestamptz NULL) ⟵ Aufgabe 40    │
│         Cooldown-Marker. NULL = Cron hat noch nicht gefeuert.    │
└──────────────────────────────────────────────────────────────────┘
```

### Indices (neu in Aufgabe 40)
- `idx_webhook_subscriptions_funnel_id`
- `idx_webhook_subscriptions_trigger_page` (partial, WHERE trigger_page_id IS NOT NULL)
- `idx_webhook_delivery_retry_due` (partial, status IN (pending,retrying) AND next_retry_at IS NOT NULL)
- `idx_submissions_abandoned_pending` (partial, WHERE completed_at IS NULL AND abandoned_webhook_fired_at IS NULL)

### RLS-Policies
- `webhook_subscriptions`: 4 Policies (select/insert/update/delete) — alle tenant-scoped via `current_tenant_ids()`. Owner/Admin können INSERT/UPDATE, nur Owner DELETE.
- `webhook_delivery_attempts`: nur SELECT für authenticated tenants (Schreibzugriff nur via Service-Key durch Sender-Code).

---

## 3. Code-Layout

```
leadplug-saas/
├── lib/
│   └── webhooks.ts                              ← Sender-Core (~540 LOC)
│         buildSignatureHeader()                 HMAC-SHA256 im Stripe-Pattern
│         buildPayload()                         Payload-Builder mit answers[] + answers_flat
│         postWithTimeout()                      HTTP-POST mit 10s AbortController
│         deliverNewAttempt()                    Erst-Zustellung + insert in delivery_attempts
│         retryDelivery()                        Cron-Pfad — re-load + post + update
│         triggerOnSubmit()  ⟵ PUBLIC          Aufruf aus /api/submit + Cron-Abbrecher
│         triggerOnPageAdvance() ⟵ PUBLIC      vorbereitet, NOT YET wired
│         sendTestPayload() ⟵ PUBLIC           Aufruf aus /test-Endpoint
│         generateWebhookSecret() ⟵ PUBLIC     `whsec_<64hex>` Format
│         nextRetryDelayMs() ⟵ PUBLIC          Backoff-Schedule [1m,5m,30m,2h,6h]
│
├── app/api/
│   ├── submit/route.ts                          ← erweitert: after(triggerOnSubmit(...))
│   ├── cron/webhook-retry/route.ts              ← NEU, alle 5 Min, Auth via CRON_SECRET
│   └── tenant/funnels/[slug]/webhooks/
│       ├── route.ts                             ← GET-Liste + POST-Create
│       ├── [id]/route.ts                        ← GET/PATCH/DELETE
│       ├── [id]/test/route.ts                   ← POST-Test
│       └── [id]/logs/route.ts                   ← GET-Logs (default last 50)
│
├── components/editor/
│   ├── TopTabs.tsx                              ← erweitert: 'webhooks' Tab
│   ├── EditorShell.tsx                        ← erweitert: routet auf WebhooksPanel,
│   │                                              + lädt webhook_counts für StepPill-Badges
│   ├── WebhooksPanel.tsx (~600 LOC)             ← NEU — Liste + Cards + Test + Logs +
│   │                                              + Verify-Snippets + Secret-Rotation
│   ├── WebhookAddModal.tsx (~200 LOC)           ← NEU — Add-Modal mit Trigger-Auswahl
│   ├── StepPill.tsx                             ← erweitert: webhookCount-Badge
│   └── StepList.tsx                             ← erweitert: webhookCountsByPageId-Prop
│
├── supabase/migrations/
│   ├── 20260529120000_aufgabe_40_webhook_actions.sql
│   ├── 20260529120000_aufgabe_40_webhook_actions_DOWN.sql
│   └── 20260529130000_fix_submissions_tenant_slug_nullable.sql ← Hotfix
│
└── vercel.json                                  ← NEU — Cron-Schedule */5 * * * *
```

### Was im EditorState NICHT liegt

Webhooks sind **kein** Bestandteil von `EditorState` / `state.questions`. Sie leben
in ihrer eigenen DB-Tabelle und werden per fetch direkt geladen, **nicht** über
das normale Save-Flow von Funnels. Begründung: Webhook-Änderungen sollen unmittelbar
wirken (kein „Speichern"-Klick im Funnel-Editor nötig). Die Anzeige der Step-Pill-Badges
fragt die Webhooks separat ab (`reloadWebhookCounts()` in EditorShell).

---

## 4. Trigger-Flows (Sequence-Diagramme)

### 4.1 Completed-Webhook (häufigster Pfad)

```
Endkunde-Browser              LeadPlug-Server              Tenant-CRM (z.B. Zapier)
──────────────────            ─────────────────            ────────────────────────

[User klickt letzte Antwort]
        │
        │  POST /api/submit
        │  { tenant, answers, contact, sessionId, … }
        ├─────────────────────────►
        │                          ├─ Honeypot-Check
        │                          ├─ Rate-Limit-Check
        │                          ├─ Struktur-Validation
        │                          ├─ getTenantConfig(tenant)
        │                          ├─ effectiveContact-Berechnung
        │                          ├─ upsertSubmissionProgress(completed=true)
        │                          │     └─► submissions row mit completed_at = NOW()
        │                          ├─ sendAllEmails (parallel)  [bleibt vorerst hartkodiert]
        │                          ├─ updateEmailStatus
        │                          │
        │                          ├─ snapshot = SubmissionSnapshot{...}
        │                          ├─ after(triggerOnSubmit(funnelId, 'completed', snapshot, tenantConfig))
        │  { success: true }       │     ↑ Next 16 after() — Response geht raus, weiter im Background
        │◄─────────────────────────┘
        │
        │                                                   [Background-Work läuft weiter]
        │                          triggerOnSubmit:
        │                          ├─ SELECT subs WHERE funnel_id=X AND
        │                          │            is_active=true AND
        │                          │            trigger_type='on_submit'
        │                          ├─ Filter event_types contains 'submission.completed'
        │                          │
        │                          └─ Parallel pro matched subscription:
        │                              ├─ buildPayload(eventType, snapshot, tenantConfig, deliveryId)
        │                              ├─ bodyJson = JSON.stringify(payload)
        │                              ├─ sig = buildSignatureHeader(bodyJson, secret)
        │                              ├─ postWithTimeout(url, bodyJson, sig)
        │                              │       │  POST mit Headers:
        │                              │       │  Content-Type: application/json
        │                              │       │  User-Agent: LeadPlug-Webhook/1.0
        │                              │       │  X-LeadPlug-Signature: t=<ts>,v1=<hex>
        │                              │       ├──────────────────────►
        │                              │       │                       ├─ Zapier empfängt
        │                              │       │                       ├─ verifiziert Sig (optional)
        │                              │       │                       ├─ legt Deal in Pipedrive an
        │                              │       │ 200 OK                ├─ schickt Slack-Msg
        │                              │       ◄───────────────────────┘
        │                              │
        │                              └─ INSERT delivery_attempts {
        │                                    status: 'success',
        │                                    response_status_code: 200,
        │                                    delivered_at: NOW(),
        │                                    next_retry_at: NULL
        │                                  }
```

### 4.2 Abbrecher-Webhook (Cron-Pfad)

```
[t=0:00]  User landet auf /leadplug, sessionId X generiert
          ├─ tipp Frage 1                     ──► POST /api/track-progress (UPSERT)
          ├─ tipp Frage 2 (Email!)            ──► POST /api/track-progress (UPSERT)
          ├─ tipp Frage 3 (Telefon!)          ──► POST /api/track-progress (UPSERT)
          └─ schließt Tab                                                          
            
            [DB-Stand:]
            session_id: X
            completed_at: NULL
            contact: { email: "...", telefon: "..." } / answers: { ... }
            abandoned_webhook_fired_at: NULL
            created_at: 14:00:00

  ⏱️  10 Min Cooldown vergehen
  ⏱️  Vercel Cron feuert (*/5 * * * *)


[t=14:15] GET /api/cron/webhook-retry
          Authorization: Bearer <CRON_SECRET>
          ├─ Auth-Check
          │
          ├─ Retry-Block (siehe 4.3)
          │
          └─ Abbrecher-Block:
              SELECT submissions WHERE
                  completed_at IS NULL
                  AND abandoned_webhook_fired_at IS NULL
                  AND created_at < NOW() - 10min
                  AND funnel_slug IS NOT NULL
                  ORDER BY created_at ASC
                  LIMIT 50
              ├─ Match: Session X (älter als 10 Min)
              │
              ├─ Für jeden Match:
              │   1. effectiveContact = derive(answers) ∪ contact
              │   2. Skip wenn kein email UND kein telefon
              │      (sonst Trash-Lead, bringt Tenant nichts)
              │   3. tenantConfig laden (via getTenantConfig, gecacht im Run)
              │   4. snapshot bauen
              │   5. triggerOnSubmit(funnelId, 'submission.abandoned', snapshot, tenantConfig)
              │        ├─ Schickt Webhook (parallel pro matched subscription)
              │        └─ INSERT delivery_attempts (success oder retrying)
              │   6. UPDATE submissions
              │        SET abandoned_webhook_fired_at = NOW()
              │      Verhindert Doppel-Trigger im NÄCHSTEN Cron-Run.
              │
              └─ Response { ok: true, abandoned: { picked: N, triggered: M } }
```

### 4.3 Retry-Pfad (bei vorigem Failure)

```
[Vorheriger Versuch:]
delivery_attempts row {
    status: 'retrying',
    attempt_count: 1,
    last_error: 'HTTP 503',
    next_retry_at: '14:01:00'  (1 Min nach erstem Versuch um 14:00)
}

  ⏱️  Vercel Cron feuert wieder (*/5 * * * *) → trifft 14:05


[t=14:05] GET /api/cron/webhook-retry
          Auth-Check ✓
          │
          └─ Retry-Block:
              SELECT delivery_attempts WHERE
                  status IN ('pending','retrying')
                  AND next_retry_at <= NOW()
                  ORDER BY next_retry_at ASC
                  LIMIT 50
              ├─ Match: Versuch mit next_retry_at = 14:01 (overdue)
              │
              ├─ Für jeden Match: retryDelivery(attemptId)
              │   1. Re-load attempt + subscription (Join)
              │   2. Skip wenn !subscription.is_active → status='failed'
              │   3. Re-load submission (durch FK)
              │      Skip wenn submission gelöscht → status='failed'
              │   4. tenantConfig laden via getTenantConfig
              │   5. Re-build Payload mit GLEICHER delivery_id
              │      (für Idempotency auf Tenant-Seite!)
              │   6. POST mit gleichem Pattern (HMAC + Timeout)
              │   7. UPDATE attempt:
              │       attempt_count++
              │       Wenn ok: status='success', delivered_at=NOW()
              │       Wenn fail + retries übrig:
              │           status='retrying',
              │           next_retry_at = NOW() + nextRetryDelayMs(attempt_count)
              │           Schedule: [1m, 5m, 30m, 2h, 6h]
              │       Wenn fail + max erreicht (6. Versuch):
              │           status='failed', next_retry_at=NULL
              │
              └─ Response { ok: true, retries: { picked: N, success: M } }
```

### 4.4 Test-Webhook (UI-Button)

```
Tenant klickt „Test-Webhook senden" im Editor
      │
      │ POST /api/tenant/funnels/[slug]/webhooks/[id]/test
      ├──────────────────────────────────────────────────►
      │                              ├─ Auth + Funnel-Cross-Check (verhindert ID-Guessing)
      │                              ├─ sendTestPayload(subscription.id)
      │                              │   ├─ Lade subscription + funnel.slug
      │                              │   ├─ getTenantConfig(slug)
      │                              │   ├─ Mock-Submission bauen
      │                              │   │   - Fake-IDs (00000000-…)
      │                              │   │   - Standard contact (Max Mustermann etc.)
      │                              │   │   - buildMockAnswersFromConfig(tenantConfig)
      │                              │   │       ─► geht Funnel-Questions durch +
      │                              │   │          baut plausible Werte pro Type
      │                              │   ├─ Payload bauen (event='webhook.test')
      │                              │   ├─ HMAC-signieren + POST
      │                              │   └─ INSERT delivery_attempts {
      │                              │         event_type: 'webhook.test',
      │                              │         next_retry_at: NULL  ← Tests werden NIE retried
      │                              │       }
      │ { ok: true/false, statusCode, error }
      ◄──────────────────────────────┘
      │
      │ UI zeigt grüne/rote Box mit Status
```

---

## 5. Payload-Format

```jsonc
{
  // Event-Identität
  "event": "submission.completed",        // oder ".abandoned" oder "step.advanced" oder "webhook.test"
  "delivery_id": "<uuid>",                // = webhook_delivery_attempts.id
                                          // Tenant kann gegen Dedup verwenden
  "delivered_at": "2026-05-29T08:10:54.241Z",
  "tenant_id": "<uuid>",

  // Funnel-Identität
  "funnel": {
    "id":   "<uuid>",
    "slug": "leadplug",
    "name": "LeadPlug"                    // = companyName aus TenantConfig
  },

  // Submission-Metadaten
  "submission": {
    "id":           "<uuid>",
    "session_id":   "<uuid>",
    "created_at":   "...",
    "completed_at": "..." | null,         // null bei .abandoned
    "source_url":   "..." | null
    // KEIN lead_price — Pricing ist Abo-only (Konsens 2026-05-29)
  },

  // Verfügbarkeit der Kontakt-Kanäle (Tenant-Filter-Hilfe)
  "available_channels": {
    "email":   true,
    "telefon": true,
    "name":    true
  },

  // Effective contact = rohem contact ∪ deriveContactFromAnswers(answers)
  "contact": {
    "name":    "stavros",
    "email":   "stavrossingoudis@gmail.com",
    "telefon": "0157856565944",
    "anrede":  "Frau"
  },

  // SELF-DESCRIBING ARRAY — Zapier-User sieht Labels statt cryptic Keys
  "answers": [
    {
      "key":         "betriebsart",
      "label":       "Welche Art von Betrieb bist du?",
      "type":        "single_choice",
      "value":       "fachbetrieb",          // interner Wert
      "value_label": "Fachbetrieb"           // user-friendly Label
    },
    {
      "key":   "tätigkeitsbeschreibung",
      "label": "Was bietest du genau an?",
      "type":  "short_text",
      "value": "asdsad"
    }
  ],

  // FLACHES MAP — für direktes CRM-Mapping mit Label-as-Value
  "answers_flat": {
    "betriebsart":           "Fachbetrieb",                  // value_label, nicht "fachbetrieb"
    "problem":               "Schlechte Anfragenqualität",
    "tätigkeitsbeschreibung": "asdsad"
  }
}
```

### Format-Entscheidungen (Konsens 2026-05-29)
- **Doppel-Format** — Array für Zapier-Visual-Builder, Flat-Map für Direct-CRM-Mapping
- **`answers_flat` zeigt Label statt internen Value** — Tenant sieht „Fachbetrieb" nicht „fachbetrieb"
- **`available_channels` ist redundant aber bequem** — Tenant kann in Zapier per Filter „nur fortfahren wenn email == true" ohne null-Check im Sub-Object
- **`delivery_id` im Payload** — ermöglicht Idempotency auf Tenant-Seite bei Retries

---

## 6. HMAC-Signatur

### Pattern (Stripe-kompatibel)
```
HTTP-Header:  X-LeadPlug-Signature: t=<unix-seconds>,v1=<hex>
```

### Berechnung
```ts
const t  = Math.floor(Date.now() / 1000);
const v1 = HMAC_SHA256(secret, `${t}.${bodyJson}`).toHex();
```

### Verifikation (Tenant-Seite, Node/Python/PHP)
Code-Snippets stehen direkt im UI unter „Signatur verifizieren" pro Subscription.
Pattern:
1. Header parsen → `t` + `v1`
2. Raw-Body lesen (vor JSON.parse!)
3. `expected = HMAC_SHA256(secret, "t.body")`
4. `hmac.compare_digest(expected, v1)` → bei Mismatch HTTP 401

### Optional aber empfohlen
- Timestamp gegen aktuelle Zeit prüfen (z.B. nur akzeptieren wenn `|now - t| < 300`)
  → schützt gegen Replay-Attacks
- delivery_id in eigener DB tracken → Idempotency bei Retries

---

## 7. Subscription-Lifecycle

```
[Anlegen]
   ├─ POST /api/tenant/funnels/<slug>/webhooks { url, trigger_type, trigger_page_id?, event_types }
   ├─ generateWebhookSecret() → `whsec_<64hex>`
   ├─ INSERT subscription { is_active: true }
   └─ Response { ..., secret: <volltext>, secret_revealed: true }
      ↑ Erstes UND letztes Mal dass das Secret im Klartext fließt

[Anzeigen / Listen]
   GET /api/tenant/funnels/<slug>/webhooks
   ↑ secret kommt als maskierter Hint zurück: "whsec_••••••••<last4>"

[Update]
   PATCH /api/tenant/funnels/<slug>/webhooks/<id> { url?, is_active?, trigger_*, event_types? }

[Secret rotieren]
   PATCH … { rotate_secret: true }
   ├─ generateWebhookSecret() → neuer Wert
   ├─ UPDATE secret
   └─ Response { ..., secret: <volltext>, secret_revealed: true }
      ↑ Wieder nur 1×

[Pausieren]
   PATCH … { is_active: false }
   ├─ Sender ignoriert subscription beim Trigger-Match (WHERE is_active=true)
   └─ Cron-Retry: Aktive Versuche werden noch versucht. Bei Fehler → status='failed',
     da retryDelivery() prüft sub.is_active und sonst sofort failed setzt.

[Löschen]
   DELETE /api/tenant/funnels/<slug>/webhooks/<id>
   ├─ DELETE subscription
   └─ CASCADE löscht alle delivery_attempts (Audit-Trail futsch — gewollt)

[Test]
   POST /api/tenant/funnels/<slug>/webhooks/<id>/test
   └─ sendTestPayload() — Mock-Daten, KEIN echtes Submission, KEIN Retry

[Logs]
   GET /api/tenant/funnels/<slug>/webhooks/<id>/logs?limit=20
   ↑ Letzte N Delivery-Versuche (alle Events inkl. Tests)
```

---

## 8. ENV-Vars + Vercel-Setup

| ENV-Var               | Wo                     | Wofür |
|-----------------------|------------------------|-------|
| `SUPABASE_URL`        | .env.local + Vercel    | Sender DB-Zugriff (existiert schon) |
| `SUPABASE_SERVICE_KEY`| .env.local + Vercel    | Sender DB-Schreiben (existiert schon) |
| `CRON_SECRET`         | **.env.local + Vercel**| **Auth für /api/cron/webhook-retry** ⟵ NEU mit Aufgabe 40 |

**`vercel.json`** liegt am Repo-Root:
```json
{
  "crons": [
    { "path": "/api/cron/webhook-retry", "schedule": "*/5 * * * *" }
  ]
}
```

Vercel Pro-Plan ist Voraussetzung (Hobby unterstützt nur 1× täglich).

---

## 9. UI-Verkabelung im Editor

```
┌──────────────────────────────────────────────────────────────────┐
│  EditorShell                                                    │
│  ├─ activeTab state                                              │
│  ├─ webhookCountsByPageId state (Aufgabe 40)                     │
│  │     ↓ reloadWebhookCounts() lädt von                          │
│  │       /api/tenant/funnels/<slug>/webhooks                     │
│  │       und mapped trigger_page_id → count                      │
│  │                                                                │
│  ├─ TopTabs ── 'webhooks' active? ─► WebhooksPanel               │
│  │                                                                │
│  └─ StepList                                                     │
│      └─ StepPill                                                 │
│          └─ webhookCount > 0?                                    │
│              ↳ violettes Webhook-Badge mit Count                 │
│              ↳ onClick → setActiveTab('webhooks') (springt rüber)│
│                                                                   │
│  WebhooksPanel                                                   │
│  ├─ Load via fetch GET /api/.../webhooks (auf mount + onSubsChanged) │
│  ├─ Empty-State / Liste                                          │
│  ├─ + Webhook-Button → WebhookAddModal                           │
│  │     ↓ POST /api/.../webhooks                                  │
│  │     ↓ revealedSecret-Banner (gelb, 1×)                        │
│  │                                                                │
│  └─ Pro Subscription Card (collapsible):                         │
│      ├─ Active-Toggle (PATCH is_active)                          │
│      ├─ ConfigSection (URL + Trigger + Events, dirty-check)      │
│      ├─ TestSection (POST /test → grün/rot)                      │
│      ├─ LogsSection (GET /logs, refresh-Button)                  │
│      │     ↓ Inspector pro Log-Eintrag:                          │
│      │     ↓ Status, Code, Time, expandable last_error+response  │
│      ├─ VerifySnippetSection (Node/Python/PHP Tabs)              │
│      ├─ Secret rotieren-Link                                     │
│      └─ Löschen-Button                                           │
│                                                                   │
│  Nach jeder Schreib-Op → loadSubs() + onSubsChanged()            │
│       ↳ Letzteres triggert EditorShell.reloadWebhookCounts()   │
│       ↳ Step-Pill-Badges aktualisieren                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Was getestet wurde (Stand 2026-05-29)

✅ **Verifiziert in Smoke-Tests:**
- Migration auf Production live, 4 Spalten + 4 Indices angelegt
- Subscription anlegen via UI → Secret-Reveal-Modal funktioniert
- „Test senden" → HTTP 200 + Mock-Payload landet auf webhook.site
- Echter Submit eines Live-Funnels → completed-Webhook geht mit echten Daten raus
- Cron-Endpoint 401 ohne Auth / 200 mit Bearer
- Abbrecher-Trigger: Submission mit Email+Telefon + 15 Min alt → Cron pickt + feuert abandoned-Webhook
- Dedup-Schutz: 2. Cron-Aufruf direkt danach pickt nichts (abandoned_webhook_fired_at gesetzt)
- HMAC-Signatur-Header korrekt formatiert (Stripe-Pattern)
- Delivery-Logs im Inspector zeigen Status-Codes + Response-Bodies

⚠️ **NICHT getestet (= Risiko / TODO bei Bedarf):**
- Retry-Mechanik bei echtem Endpoint-Failure (5xx oder Timeout)
  → Code-Pfad ist da, aber kein Live-Test
- Backoff-Schedule (1m/5m/30m/2h/6h) — würde Stunden zum Verifizieren brauchen
- Multi-Subscription pro Funnel (nur 1 angelegt)
- `after_page`-Trigger im Live-Widget-Pfad
  → Schema + Sender sind ready, aber `/api/track-progress` ruft `triggerOnPageAdvance()`
    noch **nicht** auf. Vor Aktivierung Phase 2: Dedup-Logik pro Session+Page nötig
    (sonst alle 600ms Webhook-Spam)
- Production-Cron auf Vercel — lokal getestet, Vercel-Setup ist Standardpfad
- Secret-Rotation im Live-Flow gegen aktiven Endpoint

---

## 10b. Robustheits-Polish (2026-05-29, Aufgabe 40 V1.1)

Mehrere Production-Hardenings nach dem ersten Smoke-Test:

### Name-Field-Types
Drei neue `field_type`-Werte: `first_name`, `last_name`, `full_name`. Sender mappet sie
deterministisch ins contact-jsonb:
- `first_name` → `contact.firstName`
- `last_name` → `contact.lastName`
- `full_name` → `contact.name`

Plus Auto-Aggregation: wenn first + last beide gesetzt + kein full_name →
`contact.name = "first last"`. Funktioniert sowohl bei Submit-Page-Feldern (`enrichContact`)
als auch bei Custom-Karten-Feldern und Skip-Mode-Question-Pages (`deriveContactFromAnswers`).

### Field-Key-System (CRM-stable Identifier)
Jedes Feld (Question oder ContactField) hat einen `field_key` (= JSON-Key im Webhook-Payload).
Pattern wie Typeform/HubSpot/Stripe:
- Auto-Gen aus Type oder Label (`email` → `email`, „Beschreibung" → `beschreibung`)
- Editierbar im UI unter „Erweitert" → „Feldname im Export"
- Stabil bei Label-Re-Names (transient `_keyTouched` flag)
- Live-Transform: User tippt „Tätigkeit" → wird zu `taetigkeit` (Umlaute, Lowercase)
- Konflikt-Resolution beim Save: `name`, `name_2`, `name_3`, …
- Existing keys (auch hässliche/legacy mit Umlauten) werden beim Save NIE regeneriert
  → Backward-Compat für alle pre-Aufgabe-40-Funnels

### Stable `_clientId` für ContactField-UI
Transient `_clientId` (= UUID/synthetic) entkoppelt UI-Identität von `field.key`. Damit
remountet die SortableContactFieldRow nicht jedes Mal beim Live-Key-Sync, Edit-State bleibt
erhalten.

### 4xx → sofort `failed`, kein Retry-Spam
Sender (`deliverNewAttempt` + `retryDelivery`) erkennt HTTP 4xx als Client-Error
(Tenant-Endpoint-Config-Bug) und setzt sofort `status='failed'` ohne next_retry_at.
Verhindert 9-Stunden-Retry-Spam gegen kaputte/falsch-konfigurierte URLs.
Pattern: 5xx + Timeout → Backoff (1m/5m/30m/2h/6h). 4xx → failed.

### `after_page`-Trigger live verkabelt
Widget (`funnel.tsx`) ruft `onPageAdvanced(pageId, snapshot)` bei jedem Step-Advance auf.
TenantFunnelClient POSTet das an `/api/track-progress` mit `advancedPageId`.
Server `after()`-Hookt `triggerOnPageAdvance(funnelId, pageId, ...)`.

**Server-side Dedup:** vor dem Senden Pre-Check ob `delivery_attempts` für
`(subscription_id, submission_id, event_type='step.advanced')` existiert.
Wenn ja → skip diese Subscription. Verhindert Doppel-Trigger wenn User dieselbe Page
zweimal advancet (z.B. via Back-Klick).

Voraussetzung dafür: `QuestionConfig.pageId` (echte pages.id-uuid) in `getTenantConfig`
mit-emittiert, sodass Widget die ID kennt.

### Race-Fix `upsertSubmissionProgress`
Bei `completed=false` (= track-progress-Calls) macht der Sender Pre-SELECT auf
`completed_at`. Wenn Session schon completed → skip Overwrite (= return existing ID).
Verhindert dass late track-progress-Calls eine completed-Row mit leerem contact überschreiben.

---

## 11. Known Issues / Post-Merge-Items

### A) DB-Anomalie: leere `contact` / `answers` bei completed Submission (✓ behoben am 2026-05-29 via Race-Fix in `upsertSubmissionProgress`)

**Symptom:** Stavros' Test-Submit am 2026-05-29 hatte im Webhook-Payload volle Daten
(`contact: { name, email, telefon, anrede }` + 3 answers), aber die DB-Row in
`submissions` zeigte `contact: {}` und `answers: {}`.

**Vermutung:** Race-Condition zwischen `/api/submit` und einem späten
`/api/track-progress`-Call. Das Widget hat in `funnel.tsx:580-586` einen
useEffect mit 600ms-Debounce — wenn dieser Effect nach `setIsSubmitted(true)`
noch einen pending Timer hat, kann der track-progress mit leerem `contactData`
nach dem Submit feuern und die Row via UPSERT überschreiben.

Cleanup-Strategie wäre eines von:
1. Im Widget: Submit setzt `lastSentRef` so dass useEffect nicht mehr feuert
2. Im Server: `/api/track-progress` checkt `WHERE completed_at IS NULL` vor UPSERT
3. Im Server: Conditional UPSERT — niemals `contact` mit `{}` überschreiben

Empfehlung: **Variante 2** — simpel, server-side, kein Widget-Touch.

**Nicht Aufgabe-40-Bug**, sondern Erbe aus Aufgabe 34 (Partial-Submissions). Aber:
betrifft Lead-Inbox-Anzeige (Tenant sieht leeren Lead) UND Abbrecher-Cron (wenn
contact nachträglich geleert wird, schickt der Cron keinen abandoned-Webhook für
einen Lead der eigentlich Email hatte).

### B) `after_page`-Trigger nicht im Widget-Pfad verkabelt

**Status:** Schema fertig, Sender-Funktion `triggerOnPageAdvance()` implementiert,
aber `/api/track-progress` ruft sie nicht auf.

**Warum nicht fertig:** Würde Dedup-Logik brauchen. Beispiel: Widget feuert
track-progress alle 600ms während User tippt. Wenn wir bei jedem Call den
after-page-Webhook triggern, kriegt der Tenant Spam.

**Mögliche Lösungen für Phase 2:**
1. **Server-side Dedup via delivery_attempts**: Pre-INSERT check „existiert schon
   eine row für submission_id + subscription_id + event_type='step.advanced'"
2. **Client-side state**: Widget tracked `triggered_pages: Set<pageId>` in
   sessionStorage, schickt nur neu-overflowed Pages mit
3. **Server-side via Submissions-Spalte**: Neue Spalte `pages_advanced_through text[]`,
   App nur triggert was noch nicht drin

Empfehlung: **Variante 1** — keine Schema-Änderung, robust gegen Client-Manipulation.

### C) Stripe-Style Backoff hartkodiert in lib

`RETRY_BACKOFF_MS` = `[1m, 5m, 30m, 2h, 6h]`. Wenn Tenants später konfigurierbaren
Backoff wollen → ein `backoff_schedule jsonb` auf subscription wäre der Weg.
On-demand.

---

## 12. Strategischer Kontext (warum so gebaut)

Siehe Memory `strategy-action-modell` für Full Story. Kurz:

- LeadPlug ist „Typeform-Klon" → alles im Builder muss dynamisch sein
- Webhooks waren **vor Aufgabe 40** als „1 globaler Tenant-Webhook, feuert immer am
  Submit-Ende" geplant. Stavros hat in der Konsens-Runde 2026-05-29 dagegen
  argumentiert: das macht den Builder inkonsistent (Tab-Setting statt
  Editor-Element)
- Action-Element-Modell ist die Verallgemeinerung: pro Funnel N Subscriptions,
  jede mit eigenem Trigger. Webhook ist nur die erste Action-Klasse — E-Mails,
  Slack, Discord, Logic-Jumps folgen demselben Pattern
- Submit-Page-Abschaffung geplant, aber **kein Blocker** für Webhook: Trigger ist
  server-side an `/api/submit`, das wird in beiden Modi (Submit-Page + Skip-Mode)
  identisch aufgerufen

---

## 13. Auf einen Blick — was zu tun ist wenn …

| Situation | Was tun |
|---|---|
| Neuer Output-Mechanismus (Slack, Email, Discord) | Folge dem Webhook-Pattern: eigener Tab + Action-Subscriptions pro Funnel + Trigger-Konfig. KEIN hartkodierter Trigger in `/api/submit`. |
| Tenant fragt nach mid-funnel-Trigger | Issue B oben — Dedup-Logik im track-progress aktivieren |
| Tenant fragt nach editierbarem `field_key` | Optional — heute auto-generated. ~1 Std Editor-Erweiterung |
| Tenant fragt nach Conditional-Webhook | Eigener Sprint (C.4 Logic-Jumps overlap) |
| Webhook spammt? | Subscription pausieren via UI (is_active=false). Sender ignoriert sofort. |
| Tenant verloren Secret | Secret rotieren via UI. Alter Endpoint muss neuen Wert kriegen. |
| Webhook kommt nicht an | Logs-Drawer im Editor → status_code + response_body. Häufig: 4xx vom Tenant-Endpoint (Auth, falsche URL). Wir geben sofort failed = kein Spam-Retry. |
| Production-Cron läuft nicht | Vercel-ENV `CRON_SECRET` setzen + redeploy. Check Vercel Dashboard → Crons-Tab |
