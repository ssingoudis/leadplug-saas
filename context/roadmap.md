# LeadPlug Roadmap

> Phasenplan, geplante Aufgaben und v2/Premium-Features.
> Strategische Entscheidungen (Tenant-Modell, Pricing, Builder-Richtung): siehe [`../CLAUDE.md`](../CLAUDE.md).

---

## Übersicht der Phasen

| Phase | Fokus | Status |
|---|---|---|
| **A** | Doku-Reset (CLAUDE.md, project-overview, schema, HTML-Files) | 🟡 in Arbeit (Mai 2026) |
| **B** | Schema-Refactor & Architektur-Foundation | ⚪ geplant (vor MVP) |
| **C** | Builder-MVP-Sprint (Logic Jumps, Feldtypen, Polish) | ⚪ nach Phase B |
| **D** | MVP-Launch + Partner-Pitches | ⚪ Ziel |
| **E** | Pro-Plan-Features (Twilio, Web-Component-Embed, Kanban, …) | ⚪ Post-MVP |

---

## Phase A — Doku-Reset (laufend)

Ziel: alle Dokumente entsprechen der aktuellen Realität, bevor neue Architektur-Arbeit beginnt.

| Schritt | Was | Status |
|---|---|---|
| 1 | `CLAUDE.md` neu schreiben | ✅ |
| 2 | `context/project-overview.md` neu schreiben | ✅ |
| 3 | `context/supabase-schema.md` aus DB regenerieren | ✅ |
| 4 | HTML-Files in `context/` inspizieren und klassifizieren | 🟡 in Arbeit |

---

## Phase B — Schema-Refactor & Architektur-Foundation

> Ein einziger großer Refactor in einem Supabase-Branch. Pre-MVP. ~8-12 Tage Vollzeit.

Strategischer Hintergrund: Wir sind heute auf einem Schema, das für das alte Tenant-Modell (Tenant = Handwerker) gewachsen ist. Vor MVP bauen wir es auf das neue Modell um (Tenant = Agentur, Multi-User, sauberes RLS, UUID-FKs).

### B.1 — `tenant_members` + komplette RLS-Refactor

**~2-3 Tage.**

- Neue Tabelle `tenant_members(id, tenant_id, auth_user_id, role, created_at)` mit Enum `tenant_member_role` (`owner` / `admin` / `member`).
- **Minimal** — keine Profile-Felder (kein `display_name`, kein `phone`). Wenn je nötig: separate `user_profiles`-Tabelle (v2).
- Daten-Migration: für jeden bestehenden Tenant mit `auth_user_id` einen `tenant_members`-Eintrag mit `role='owner'`.
- Alle bestehenden 5 RLS-SELECT-Policies neu schreiben (Auflösung über `tenant_members`).
- **Zusätzlich neue Policies für INSERT, UPDATE, DELETE** auf allen 6 Tabellen.
- `tenants.auth_user_id` bleibt als Owner-Shortcut, kann später entfallen.
- App-Code: Auth-Checks in API-Routes können vereinfacht werden (RLS übernimmt).

### B.2 — UUID-FKs überall

**~1-2 Tage.**

- `funnels.tenant_slug` → neue Spalte `tenant_id uuid REFERENCES tenants(id)`.
- `funnel_questions.funnel_slug` → `funnel_id uuid REFERENCES funnels(id)`.
- `funnel_view_logs.funnel_slug` / `tenant_slug` → UUIDs.
- `submissions` behält `funnel_slug` + `tenant_slug` (Snapshot-Design, kein FK).
- App-Code anpassen: alle Joins gehen über UUIDs.
- Slugs bleiben für öffentliche URLs (`funnels.slug`) — werden nach Anlage unveränderlich.
- Evaluate: `tenants.slug` ganz droppen (taucht nirgends öffentlich auf).

### B.3 — Legacy `submissions.contact_*`-Spalten droppen

**~0.5 Tag.**

- Backfill-Check: ist `submissions.contact` jsonb für alle 25 Zeilen befüllt? Falls nein → Migration zum Befüllen.
- Drop `contact_anrede`, `contact_name`, `contact_email`, `contact_phone`.
- App-Code: alle Reads gehen nur noch über `contact` jsonb.

### B.4 — `tenants` zur reinen Agentur-Account-Tabelle

**~1 Tag.**

- Drop von `tenants`: `notification_email`, `public_email`, `public_phone`, `address`.
- `tenants.company_name` bleibt als optionaler Agentur-Anzeigename.
- Funnel-Footer-Daten (`footer_company_name`, `footer_email`, `footer_phone`) bleiben — das sind Endkunden-Daten.
- `funnels.notification_email` wird Pflicht (kein Tenant-Fallback mehr). Default beim Anlegen: Email des erstellenden Users (aus `auth.users.email`).
- App-Code: `getTenantConfig()` Override-Hierarchie auflösen — kein `|| tenant.public_email` mehr.

### B.5 — `pages` + `fields` (Page → 1:N Refactor)

**~3-4 Tage.**

- Neue Tabellen:
  - `pages(id, funnel_id, sort_order, page_type, created_at, updated_at)` mit `page_type`-Enum (z.B. `question`, `success`, `submit`)
  - `fields(id, page_id, sort_order, field_key, field_type, label, required, visible, config, options, created_at, updated_at)` mit `field_type`-Enum
- **`field_type`** wird breit gefasst: `single_choice`, `multi_choice`, `short_text`, `long_text`, `email`, `tel`, `number`, `date`, `dropdown`, `checkbox`, `slider`
- **Kontaktfelder werden zu regulären Field-Types** (`email`, `tel`, `text`) — kein separates `contact_fields` jsonb mehr.
- Daten-Migration der bestehenden 58 Fragen + `contact_fields` jsonb der 12 Funnels.
- App-Code: Editor + Widget-Renderer auf neue Struktur umstellen.
- **Builder-UI-Regel:** Funnel muss mindestens 1 Field mit `field_type='email'` enthalten — sonst kein "Veröffentlichen".

### B.6 — Webhook-Schema (nur Struktur, kein Code)

**~0.5 Tag.**

- `webhook_subscriptions(id, tenant_id, url, secret, event_types[], is_active, created_at, updated_at)` — pro Tenant 1..N Webhooks
- `webhook_delivery_attempts(id, subscription_id, submission_id, attempt_count, status, last_error, delivered_at, created_at)` — Audit & Retry-Foundation
- RLS-Policies: Tenant kann eigene Subscriptions lesen/schreiben.
- **Kein Code für Webhook-Versand** in Phase B — kommt mit Webhook-Tier-Launch.

### B.7 — `updated_at` Trigger Konsistenz

**~0.5 Tag.**

- Trigger `update_updated_at()` auf alle relevanten Tabellen anwenden: `funnel_questions` (bzw. neue `pages`/`fields`), `submissions`, `tenant_members`, `webhook_subscriptions`.
- `funnel_view_logs` und `honeypot_triggers` bleiben ohne (Append-only, keine Updates erwartet).

### Phase-B-Workflow (verbindlich)

1. **Supabase-Branch erstellen**: `mcp__supabase__create_branch('phase-b-refactor')`
2. Alle Migrationen (B.1 → B.7) in dieser Reihenfolge auf dem Branch applizieren
3. App-Code auf Branch-DB testen (lokal mit Branch-Connection-String)
4. User Review der gesamten Migration-Kette + App-Funktionalität
5. **Merge in Production** wenn alles passt — oder Branch verwerfen falls Probleme
6. `supabase-schema.md` regenerieren
7. `roadmap.md` aktualisieren (Phase B abgeschlossen)

---

## Phase C — Builder MVP-Sprint

> Nach Phase B. Sichtbares Feature-Building, das den MVP "demo-tauglich" macht.

Reihenfolge laut [`../CLAUDE.md`](../CLAUDE.md) §5:

| Schritt | Was | Geschätzter Aufwand |
|---|---|---|
| C.1 | Pages + Layers Tabs im Editor (Hierarchie-Sicht) | 4-6 Tage |
| C.2 | Theme-Panel im Editor (exponiert vorhandene CSS-Vars + Logo-Upload) | 2-3 Tage |
| C.3 | Mehr Feldtypen im Builder (Email, Tel, Date, Number, Dropdown, Checkbox) — Foundation aus B.5 nutzen | 3-5 Tage |
| C.4 | **Logic Jumps** (per Frage: "springe zu X wenn Antwort = Y") — neue Tabelle oder JSONB | 3-4 Tage |
| C.5 | Webhook-Export Code (Delivery, Retry, Signatur) — nutzt B.6-Schema | 3-5 Tage |
| C.6 | Antwortoptionen-UX-Polish + icon_url Layout-Anpassung (Bild oben vs. SVG zentriert) | 1-2 Tage |
| C.7 | Smooth Slide-Übergänge zwischen Fragen im Widget (Typeform-Stil) via framer-motion `LazyMotion` — postMessage-Resize erst nach `onAnimationComplete`, `prefers-reduced-motion` respektieren | 2-3 Tage |

**Total Phase C realistisch: 18-28 Tage Vollzeit.**

---

## Phase D — MVP-Launch & Partner-Pitches

- Stripe von Test- auf Live-Modus umstellen (Anleitung: `project-overview.md` §9)
- Domain `app.leadplug.de` final konfigurieren
- Mindestens 1 Demo-Funnel pro Branche als Showcase (Solar, Anwalt, etc.)
- Onboarding-Flow für neue Tenants
- Domain-Marktführer kontaktieren für Partner-Pitches (laut CLAUDE.md §4)

---

## Phase E — Pro-Plan-Features (Post-MVP)

Nicht-MVP-Features, sortiert nach strategischer Priorität sobald Pre-Launch-Validierung steht:

### Hohe Priorität (wenn Pro-Plan-Nachfrage kommt)

- **Multi-User-UI**: Invite-Flow, Role-Management, User-Avatare im Header. Backend ist schon in Phase B fertig.
- **`contacts`-Tabelle + Dedup-Logik**: gleiche E-Mail-Adresse über mehrere Submissions = 1 Kontakt mit Historie. CRM-Voraussetzung.
- **Script- / Web-Component-Embed**: nahtlose Integration ohne iFrame-Sandbox. Differenzierungs-Feature für Pro-Plan.
- **`user_profiles`-Tabelle**: falls Phone für Twilio gebraucht wird.

### Mittlere Priorität

- **Twilio-Integration**: Telefonie aus dem Dashboard, Audio-Aufzeichnung, Auto-Summaries via Claude API
- **Kanban-Board**: Lead-Pipeline visualisieren (offen → kontaktiert → abgeschlossen).
- **Call-Dialer**: Lead-Liste durchtelefonieren mit Notizen.
- **Whitelabel-Endkunden-Portal**: Endkunden der Agentur können sich einloggen und ihre eigenen Leads sehen.
- **A/B-Testing**: zwei Funnel-Varianten gegeneinander, Conversion-Tracking.

### Builder-Erweiterungen

- **Per-Page-Theme-Override**: einzelne Pages können vom Funnel-Theme abweichen (z.B. dunklere Erfolgsseite).
- **File-Upload-Feld** (z.B. Foto-Upload bei Solar-Anfragen).
- **Signature-Feld** (DSGVO-Einwilligungsunterschrift).
- **Calculator/Scoring-Felder**: Antworten aufsummieren, basierend auf Score weiterleiten oder routen.
- **Erweiterte Logic Jumps**: Mehrere Bedingungen mit AND/OR-Verknüpfung.

### Skalierung / Plattform

- **Custom-Domain-Support**: Tenants können eigene Domain für Funnels einbinden (`funnel.solar-betrieb.de`).
- **API für Drittsysteme**: REST-API zum externen Anlegen/Auslesen von Funnels.
- **Audit-Log**: alle Änderungen an Funnels/Settings/Leads protokolliert.
- **Team-Workspaces**: für sehr große Agenturen mit getrennten Bereichen (vs. heutiger Single-Workspace-Tenant).

---

## Ideenliste (unsortiert, noch nicht eingeplant)

> Hier landen spontane Ideen, bis sie strategisch bewertet werden.

- Funnel-Vorlagen-Galerie pro Branche (Solar-Template, Anwalt-Template, etc.) als Quick-Start
- Slack-/Discord-Integration für Lead-Notifications
- E-Mail-Vorlage pro Funnel anpassbar (statt globaler Resend-Templates)
- Mehrsprachige Funnels (DE/EN/...)
- Lead-Magnet-Anhänge (z.B. PDF-Ratgeber nach Submission)
- Re-engagement-Sequenzen für nicht-konvertierte Funnel-Starter (E-Mail-Drip)

---

## Wartungs-Notiz

Dieses File wird **manuell gepflegt**. Bei jeder abgeschlossenen Phase:

1. Status der abgeschlossenen Aufgabe auf ✅ setzen
2. Erkenntnisse oder Scope-Änderungen am Ende der Aufgabe dokumentieren
3. Bei neuen Ideen → Ideenliste oder passende Phase einsortieren
4. Bei neuen v2-Features → Phase E erweitern
