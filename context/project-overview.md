# Solar-Konfigurator – Projekt Overview

> Architektur, Business-Logik und Design-Entscheidungen. Code-Details stehen im jeweiligen Quellfile – hier verlinkt, nicht dupliziert.

---

## 1. Projektziel

Einbettbarer **Sales-Funnel als iFrame-Widget** für Photovoltaik-Monteure. Endkunde durchläuft einen mehrstufigen Click-Funnel (6 Fragen + Kontaktformular), gibt E-Mail und Telefonnummer an und erhält eine **PDF mit vorläufiger Preisschätzung** per E-Mail.

**Mandantenfähig (Multi-Tenant):**
- URL pro Kunde: `https://domain.de/[slug]`
- Farben, Schriftart, Logo, Firmendaten, Fragen pro Kunde konfigurierbar
- Konfiguration als JSON (`tenants/[slug].json`)
- Integration per `<iframe>` auf der Kundenseite

**Geschäftsmodell:** pro erfolgreicher Submission zahlt der Tenant eine **individuell pro Tenant verhandelte Gebühr** (`billing.pricePerLead` in der Tenant-JSON – z. B. 0,10 € / 0,20 € / 2,00 €, je nach Vertrag). Jede Submission wird in Supabase geloggt, Monatsabrechnung über die `monthly_billing`-View.

---

## 2. Tech-Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Sprache | TypeScript (strict) |
| Styling | TailwindCSS |
| PDF | `@react-pdf/renderer` (serverless-kompatibel) |
| E-Mail | Resend + React Email |
| Tenant-Config | JSON-Dateien (`tenants/[slug].json`) |
| Tracking-DB | Supabase (Postgres, Free Tier) |
| Deployment | Vercel |

> **Warum Supabase?** Vercel hat kein persistentes Dateisystem. Free Tier 500 MB Postgres reicht für Zehntausende Submissions.

---

## 3. Ordnerstruktur

```
app/[tenant]/page.tsx         # Widget-Seite pro Mandant (iframe-target)
app/[tenant]/layout.tsx       # Minimales Layout ohne Header/Footer
app/api/submit/route.ts       # POST: Formular → Log → PDF → 3 Mails

components/solar-funnel.tsx       # Funnel (Props-fähig, Basis aus v0)
components/TenantFunnelClient.tsx # Client-Wrapper (startedAt, referrer, userAgent)

emails/CustomerConfirmation.tsx   # Mail 1 – Endkunde (+ PDF-Anhang)
emails/TenantLeadNotification.tsx # Mail 2 – Monteur
emails/PlatformTracking.tsx       # Mail 3 – Platform-Owner (Billing)

lib/getTenantConfig.ts   # JSON-Loader mit Slug-Validierung
lib/priceCalculator.ts   # Preisschätzung aus Antworten
lib/generatePDF.ts       # @react-pdf/renderer
lib/sendEmails.ts        # Resend, 3 Mails via Promise.all
lib/tracking.ts          # Supabase: logSubmission, getMonthlyCount

tenants/_template.json   # Vorlage
tenants/demo.json        # Demo (Inter, 0,10 €/Lead)
tenants/musterfirma.json # Beispiel (Poppins, 0,20 €/Lead)

types/index.ts                 # Alle TypeScript-Interfaces
context/supabase-schema.sql    # DB-Schema (idempotent)
public/fonts/                  # Self-hosted Fonts (DSGVO)
```

---

## 4. Tenant-Konfiguration

Schema und Beispiele: [`tenants/_template.json`](../tenants/_template.json), [`tenants/demo.json`](../tenants/demo.json).

**Pflichtfelder:** `slug`, `companyName`, `contactEmail`, `theme.primaryColor`, `funnel.*`, `questions[]`, `pricing.basePrice`, `pricing.storageAddon`.

**Optional:** `logoUrl`, `phone`, `address`, `website`, `theme.{font,textColor,backgroundColor,borderRadius,maxWidth}`, `billing.pricePerLead` (Default 0,10 €).

**Font-Konzept:** `FunnelFont = "system" | "inter" | "poppins" | "roboto"` – kuratierter Enum statt dynamischem Google-Fonts-Loading (DSGVO, LG München 2022). Erweiterung neuer Fonts: siehe Font-System-Notiz in [`current-feature.md`](current-feature.md).

---

## 5. TypeScript-Typen

Siehe [`../types/index.ts`](../types/index.ts). Relevante Interfaces: `TenantConfig`, `FunnelTheme`, `QuestionConfig`, `Option`, `PricingConfig`, `BillingConfig`, `ContactData`, `PriceEstimate`, `SubmitPayload`.

---

## 6. E-Mail-Flow: 3 Mails pro Submission

Parallel via `Promise.all` in [`../lib/sendEmails.ts`](../lib/sendEmails.ts).

**Mail 1 – Endkunde** (`contact.email`)
- Betreff: `Ihre Solar-Preisschätzung von [companyName]`
- Dank + Zusammenfassung der Antworten + **PDF-Anhang** + Monteur-Kontakt
- Hinweis: unverbindliche Erstschätzung

**Mail 2 – Monteur** (`tenantConfig.contactEmail`)
- Betreff: `🔔 Neue Solar-Anfrage von [contact.name]`
- Kontaktdaten klickbar (`mailto:` / `tel:`), 6 Antworten als Tabelle, Preisschätzung, Zeitstempel
- `replyTo = contact.email`

**Mail 3 – Platform-Owner** (`PLATFORM_OWNER_EMAIL` aus `.env`)
- Betreff: `[TRACKING] Submission – [slug] – [Datum]`
- Tenant + Zeitstempel + Audit-Kontaktdaten + Monatszähler × `pricePerLead`
- Menschlich lesbares Backup-Audit-Log; primäre Abrechnungsquelle bleibt Supabase

---

## 7. API-Route

[`../app/api/submit/route.ts`](../app/api/submit/route.ts) – `POST`, runtime `nodejs`.

**Reihenfolge (kritisch):**
1. Payload-Shape-Check → 400 bei ungültig
2. `getTenantConfig(slug)` → 404 bei null
3. `calculateEstimate(answers, tenantConfig.pricing)`
4. **`logSubmission()` ZUERST** – Billing darf nie durch E-Mail-Fehler verloren gehen
5. `Promise.all([generatePDF, getMonthlyCount])`
6. `sendAllEmails()` in try/catch → Endkunde bekommt immer `{success:true}`
7. `pricePerLead` wird server-side aus `tenantConfig.billing?.pricePerLead ?? 0.10` gelesen (manipulationssicher – Client-Wert wird nicht vertraut)

---

## 8. Tracking & Billing (Supabase)

Schema: [`supabase-schema.sql`](supabase-schema.sql) – Tabelle `submissions` + View `monthly_billing`. Idempotent via `ADD COLUMN IF NOT EXISTS`, re-runnable.

**Relevante Spalten:**
- `tenant_slug`, `contact_{name,email,phone}`, `answers` (JSONB), `price_min` / `price_max`
- `source_url` (`document.referrer`), `user_agent`, `started_at`, `price_per_lead NUMERIC(10,4) DEFAULT 0.10`
- `emails_sent`, `billed` (Flag für bereits abgerechnete Submissions)

**Abrechnung:** Die View summiert `SUM(price_per_lead)` pro Tenant/Monat. `price_per_lead` wird pro Zeile persistiert, damit spätere Preisänderungen alte Leads **nicht rückwirkend** neu bepreisen.

Client-Logik in [`../lib/tracking.ts`](../lib/tracking.ts): Lazy Client-Init, Fehler werden geloggt, nie geworfen.

---

## 9. PDF-Inhalt

Generiert via `@react-pdf/renderer` in [`../lib/generatePDF.ts`](../lib/generatePDF.ts) – serverless-kompatibel, kein Headless Browser.

Enthält:
- Firmenkopf (Logo, Name, Adresse, Telefon)
- Überschrift mit Datum (deutsches Format via `Intl.DateTimeFormat`)
- Kundendaten-Block
- Tabelle der 6 Funnel-Antworten
- Preisbox in `primaryColor` des Tenants (`min – max` via `Intl.NumberFormat` EUR)
- Disclaimer (unverbindliche Schätzung)
- Fixed Footer mit Monteur-Kontakt

---

## 10. Preisberechnung

[`../lib/priceCalculator.ts`](../lib/priceCalculator.ts) – `calculateEstimate(answers, pricing)`:

- `basePrice[answers.flaeche]` (Fallback 15 000 € bei fehlendem Key)
- `+ storageAddon` wenn `answers.stromspeicher === "ja"`
- `min = total × 0.9`, `max = total × 1.15` (gerundet)

---

## 11. Routing & iFrame

- [`../app/[tenant]/page.tsx`](../app/[tenant]/page.tsx): lädt Config, `notFound()` bei ungültigem Slug
- [`../app/[tenant]/layout.tsx`](../app/[tenant]/layout.tsx): minimales HTML, optimiert für iFrame
- [`../next.config.mjs`](../next.config.mjs): Header `Content-Security-Policy: frame-ancestors *` und `X-Frame-Options: ALLOWALL`

**Einbindung beim Kunden:**
```html
<iframe src="https://solar-funnel.de/musterfirma" width="100%" height="750" frameborder="0" />
```

---

## 12. Umgebungsvariablen (`.env.local`)

```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@solar-funnel.de
PLATFORM_OWNER_EMAIL=deine@email.de
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx        # nur server-side!
NEXT_PUBLIC_BASE_URL=https://solar-funnel.de
```

---

## 13. Design-Entscheidungen (das „Warum")

| Entscheidung | Begründung |
|---|---|
| JSON für Tenant-Config | Kein DB-Overhead, leicht versionierbar in Git |
| Supabase für Tracking | Persistenz auf Vercel nötig (kein Dateisystem), Free Tier reicht |
| `@react-pdf/renderer` | Serverless-kompatibel, kein Headless Browser |
| Resend + React Email | Native Next.js-Integration, PDF-Anhang problemlos |
| Supabase ZUERST loggen | Billing darf nie durch E-Mail-Fehler verloren gehen |
| 3 Mails via `Promise.all` | Paralleler Versand = minimale Latenz |
| `billed`-Flag in DB | Einfaches Markieren bereits abgerechneter Submissions |
| `price_per_lead` pro Zeile | Preisänderungen wirken nicht rückwirkend auf alte Leads |
| iFrame statt Web Component | Maximale Kompatibilität (WordPress, Jimdo, Squarespace) |
| Kuratierter Font-Enum | Self-Hosting DSGVO-konform (LG München 2022), kein Google-Fonts-Request |
| Kein Double-Opt-In | § 7 UWG gilt für Newsletter, nicht für Angebotsanfragen – bestehende Einwilligungserklärung reicht |
| Keine SMS-Verifizierung | 20–40 % Konversionsverlust; Twilio Verify nachrüstbar, falls Fake-Leads zunehmen |
| Submit-Button nie `disabled` | Disabled-Grau wirkt kaputt; Validierung prüft im `onClick`-Handler, `cursor-not-allowed` signalisiert fehlende Pflichtfelder |
| Fortschritt als Prozent | „14 %" gibt dem Nutzer besseres Fortschrittsgefühl als „Schritt 1 von 7" |

---

## 14. Spätere Erweiterungen (nicht jetzt umsetzen)

- Admin-Dashboard für Mandanten-Anlage ohne Code-Deployment
- Stripe-Integration für automatische Monatsabrechnung (auf Basis `monthly_billing`-View)
- Resend-Webhooks für E-Mail-Öffnungsrate
- Separate Tabellen für Funnel-Starts / Step-Events (Abbruchquote) – sinnvoll ab > 100 Leads/Monat **und** nach geklärtem Consent-Flow
- UTM-Parameter zusätzlich zu `source_url`
- iFrame-Höhe dynamisch via `postMessage` an Eltern-Frame kommunizieren
- A/B-Testing verschiedener Fragen-Reihenfolgen
- Telefon-Verifizierung via Twilio Verify, falls Fake-Leads messbares Problem werden
