# Funnel Widget Platform – Projekt Overview

> Architektur, Business-Logik und Design-Entscheidungen. Code-Details stehen im jeweiligen Quellfile.

---

## 1. Projektziel

Einbettbarer **Sales-Funnel als iFrame-Widget** für Handwerksbetriebe aller Branchen (Solar, Wärmepumpe, Heizung, Sanitär, Elektro, etc.). Endkunde durchläuft einen mehrstufigen Click-Funnel (konfigurierbare Fragen + Kontaktformular) und hinterlässt seine Kontaktdaten.

**Mandantenfähig (Multi-Tenant):**
- URL pro Funnel: `https://domain.de/[slug]` – Slug ist global eindeutig und kundenwählbar
- Ein Tenant-Eintrag = ein Funnel. Braucht ein Kunde zwei Branchen → zwei Slugs, z.B. `musterfirma-solar` und `musterfirma-waermepumpe`
- Alle Werte (Farben, Texte, Fragen, Preise) konfigurierbar in Supabase
- JSON-Dateien in `tenants/[slug].json` bleiben als Notfall-Fallback
- Integration per `<iframe>` auf der Kundenseite

**Geschäftsmodell:** Pro erfolgreicher Submission zahlt der Tenant eine **individuell verhandelte Gebühr** (`tenants.lead_price_base`, z.B. 3,00 €). Jede Submission wird in Supabase geloggt, Monatsabrechnung über die `monthly_billing`-View.

---

## 2. Tech-Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Sprache | TypeScript (strict) |
| Styling | TailwindCSS |
| E-Mail | Resend + React Email |
| Tenant-Config | Supabase (primär) + JSON-Dateien (Fallback) |
| Tracking-DB | Supabase (Postgres) |
| Deployment | Vercel |

> **Kein PDF, keine Preisschätzung.** `generatePDF.ts` und `priceCalculator.ts` sind entfernt. Die Dankes-Mail enthält keine Preise.

---

## 3. Ordnerstruktur

```
app/[tenant]/page.tsx              # Widget-Seite pro Mandant (iframe-target)
app/[tenant]/layout.tsx            # Minimales Layout ohne Header/Footer
app/api/submit/route.ts            # POST: Formular → Log → 2 Mails

components/funnel.tsx              # Generischer Funnel (branchenunabhängig)
components/TenantFunnelClient.tsx  # Client-Wrapper (startedAt, referrer, userAgent)

emails/CustomerConfirmation.tsx    # Mail 1 – Endkunde (Danke, kein PDF, kein Preis)
emails/TenantLeadNotification.tsx  # Mail 2 – Betreiber (Kontaktdaten + Antworten)

lib/getTenantConfig.ts   # Supabase-Loader mit JSON-Fallback
lib/sendEmails.ts        # Resend, 2 Mails via Promise.all
lib/tracking.ts          # Supabase: logSubmission, getMonthlyCount

tenants/_template.json   # Fallback-Vorlage (wird nicht aktiv gepflegt)
tenants/demo.json        # Demo-Tenant Fallback

types/index.ts                 # Alle TypeScript-Interfaces
context/supabase-schema.sql    # DB-Schema (idempotent)
context/supabase-seed.sql      # Seed-Daten für Tests (Solar + Wärmepumpe Demo)
public/fonts/                  # Self-hosted Fonts (DSGVO)
```

---

## 4. Supabase Datenbank-Schema

Vollständiges Schema: [`supabase-schema.sql`](supabase-schema.sql), Seed-Daten: [`supabase-seed.sql`](supabase-seed.sql).

### Tabellen

**`tenants`** – Haupt-Konfiguration pro Funnel
- Alle Theme-Felder (`primary_color`, `font`, `border_radius`, `max_width`, …)
- Konfigurierbare Funnel-Texte mit sinnvollen Defaults (s. Abschnitt 5)
- `industry` – Branchenkenner für interne Auswertung (`solar`, `waermepumpe`, `heizung`, …)
- `lead_price_base` – Preis pro Lead in EUR (individuell pro Tenant)
- `is_active` – deaktivierte Tenants → 404

**`funnel_questions`** – Fragen pro Tenant, geordnet
- `tenant_id`, `sort_order`, `question_key` (= Key im `answers`-JSONB), `title`, `visible`

**`funnel_options`** – Antwortoptionen pro Frage
- `question_id`, `sort_order`, `label`, `value`
- `icon_key` (String → Built-in SVG in `funnel.tsx`) **oder** `icon_url` (externes Bild, Vorrang)

**`submissions`** – ein Eintrag pro Formular-Submission
- `tenant_id`, `tenant_slug` (denormalisiert), Kontaktdaten, `answers` (JSONB)
- `lead_price` – Preis zum Zeitpunkt der Submission (historisch korrekt, nicht rückwirkend änderbar)
- `honeypot_triggered` – Bot-Analyse; diese Einträge zählen **nicht** in `monthly_billing`
- `emails_sent`, `billed`

**View `monthly_billing`** – eine Zeile pro Tenant/Monat, `SUM(lead_price)` nur für legitime Submissions.

### Fallback-Verhalten

`getTenantConfig(slug)` fragt zuerst Supabase ab. Bei DB-Fehler oder fehlendem Eintrag: JSON-Datei `tenants/[slug].json` laden. JSON-Dateien werden nicht aktiv gepflegt – sie dienen nur als Notfall-Fallback.

> **Supabase Free Tier Warnung:** Pausiert nach Inaktivität (~10 Min Cold Start). Für Produktiv-Einsatz auf Pro upgraden oder Keep-Alive-Ping einrichten.

---

## 5. Konfigurierbare Texte (mit Defaults)

Alle Texte sind pro Tenant in Supabase einstellbar. Wenn `NULL`, greift der generische Default.

| Feld in `tenants` | Default |
|---|---|
| `funnel_title` | `"Jetzt kostenloses Angebot anfordern"` |
| `submit_button_label` | `"Anfrage absenden"` |
| `success_message` | `"Vielen Dank! Wir melden uns in Kürze bei Ihnen."` |
| `response_time_text` | `"24 Stunden"` |
| `contact_form_subtitle` | `"Wer soll das Angebot erhalten?"` |
| `privacy_text` | generischer Text ohne Branchennennung |
| `privacy_policy_url` | `"#"` |

---

## 6. Icon-System

**Eine Komponenten-Datei:** `components/funnel.tsx` enthält ein `Icons`-Objekt mit allen SVG-Komponenten. Referenzierung per `icon_key` (String). Neue Icons = neuer Eintrag im `Icons`-Objekt. Kein separates Icon-File.

**Built-in Icons (wachsende Liste):**
- Allgemein: `House`, `Apartment`, `Factory`, `Check`, `Cross`, `Question`, `Calendar`, `Euro`, `Document`, `HousePartial`, `Star`
- Energie/Heizung: `Thermometer`, `Flame`, `HeatPump`, `SolarPanel`, `Drop`, `Snowflake`
- Handwerk: `Wrench`, `Lightning`

**Custom Image:** Wenn `icon_url` in `funnel_options` gesetzt → `<img>` statt SVG. Vorrang über `icon_key`.

---

## 7. E-Mail-Flow: 2 Mails pro Submission

Parallel via `Promise.all` in [`../lib/sendEmails.ts`](../lib/sendEmails.ts).

**Mail 1 – Endkunde** (`contact.email`)
- Betreff: `Ihre Anfrage bei [companyName]`
- Danke-Nachricht + Antwortzeit aus `response_time_text`
- **Kein PDF, keine Preisschätzung**

**Mail 2 – Betreiber** (`tenants.contact_email`)
- Betreff: `Neue Anfrage von [contact.name]`
- Kontaktdaten klickbar (`mailto:` / `tel:`), Antworten als Tabelle, Zeitstempel
- `replyTo = contact.email`

---

## 8. API-Route

[`../app/api/submit/route.ts`](../app/api/submit/route.ts) – `POST`, runtime `nodejs`.

**Reihenfolge (kritisch):**
1. Honeypot-Check → bei ausgelöstem Honeypot `{success:true}` ohne DB-Eintrag zurückgeben
2. Payload-Shape-Check → 400 bei ungültig
3. `getTenantConfig(slug)` → 404 bei null / inaktiv
4. **`logSubmission()` ZUERST** – Billing darf nie durch E-Mail-Fehler verloren gehen
5. `sendAllEmails()` in try/catch → Endkunde bekommt immer `{success:true}`
6. `lead_price` server-side aus `tenants.lead_price_base` lesen – Client-Wert wird nie vertraut

---

## 9. Bot-Schutz

**Honeypot-Feld:** Unsichtbares Input-Feld im Formular (`visibility:hidden` + `position:absolute`). Bots füllen es aus, Menschen nicht. Server-Side: wenn gefüllt → `{success:true}` ohne DB-Eintrag (Bots sollen keinen 400-Fehler sehen, sonst lernen sie das Muster).

---

## 10. postMessage Höhen-Kommunikation

Das Widget sendet nach jedem Render seine aktuelle Inhaltshöhe an den Parent-Frame:

```js
window.parent.postMessage({ type: 'funnel-resize', height: document.body.scrollHeight }, '*')
```

Ohne Listener im Parent: Widget funktioniert weiter mit fixer iFrame-Höhe, kein Fehler.

**Empfohlenes Einbettungs-Snippet für Kunden:**
```html
<iframe id="funnel" src="https://domain.de/[slug]" width="100%" height="600" frameborder="0"></iframe>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'funnel-resize') {
      document.getElementById('funnel').height = e.data.height;
    }
  });
</script>
```

---

## 11. Routing & iFrame

- [`../app/[tenant]/page.tsx`](../app/[tenant]/page.tsx): lädt Config, `notFound()` bei ungültigem Slug oder `is_active = false`
- [`../app/[tenant]/layout.tsx`](../app/[tenant]/layout.tsx): minimales HTML, optimiert für iFrame
- [`../next.config.mjs`](../next.config.mjs): `frame-ancestors *` und `X-Frame-Options: ALLOWALL`

---

## 12. Umgebungsvariablen (`.env.local`)

```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@domain.de
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx        # nur server-side!
NEXT_PUBLIC_BASE_URL=https://domain.de
```

---

## 13. Design-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Ein Slug = ein Funnel | Einfaches Routing, stabile iFrame-URLs; zwei Branchen = zwei Slugs |
| Supabase als primäre Config | Tenant-Management ohne Code-Deployment |
| JSON-Fallback behalten | Kein harter Ausfall bei DB-Problemen; Migrations-Pfad |
| Supabase ZUERST loggen | Billing darf nie durch E-Mail-Fehler verloren gehen |
| Kein PDF, keine Preisschätzung | Branchenunabhängig; vereinfachte Architektur |
| 2 Mails via `Promise.all` | Paralleler Versand, minimale Latenz |
| Honeypot statt CAPTCHA | Kein Konversionsverlust; unsichtbar für den Nutzer |
| postMessage für Höhe | Eltern-Frame kann iFrame dynamisch anpassen |
| Generischer Funnel (eine Datei) | Neue Branche = neue DB-Einträge, keine neue Komponenten-Datei |
| `icon_key` + optionale `icon_url` | 80% mit Built-in-Icons abgedeckt; Custom-Bilder möglich |
| Konfigurierbare Texte mit Defaults | Kein Branchenbezug hardcoded; Tenant kann anpassen, muss aber nicht |
| iFrame statt Web Component | Maximale Kompatibilität (WordPress, Jimdo, Squarespace) |
| Kuratierter Font-Enum | Self-Hosting DSGVO-konform (LG München 2022) |
| `lead_price` pro Submission | Preisänderungen wirken nicht rückwirkend auf alte Leads |

---

## 14. Spätere Erweiterungen (nicht jetzt umsetzen)

- Admin-Dashboard für Tenant-Anlage ohne SQL
- SMS-Verifizierung als optionaler Lead-Tier (`lead_price_sms`, `sms_verification_enabled`)
- Stripe-Integration für automatische Monatsabrechnung
- UTM-Parameter in `submissions`
- Funnel-Start- und Step-Events (Abbruchquote)
- A/B-Testing verschiedener Fragen-Reihenfolgen
