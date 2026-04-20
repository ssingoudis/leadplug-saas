# Solar-Konfigurator – Projekt Overview

> **Für Claude Code:** Dieses Dokument beschreibt vollständig die Architektur, den Tech-Stack, die Ordnerstruktur und alle Implementierungsdetails. Bitte lies es vollständig, bevor du mit der Implementierung beginnst.

---

## 1. Projektziel

Ein einbettbarer **Sales-Funnel als iFrame-Widget** für Photovoltaik-Monteure. Ziel ist die automatisierte Angebotserstellung: Der Endkunde durchläuft einen mehrstufigen Click-Funnel (6 Fragen + Kontaktformular), gibt am Ende seine E-Mail-Adresse und Telefonnummer an und erhält automatisch eine **PDF mit einer vorläufigen Preisschätzung** per E-Mail.

Das Widget ist **mandantenfähig (Multi-Tenant)**:

- Jeder Kunde (Solarmontagebetrieb) erhält eine eigene URL: `https://domain.de/[kundenname]`
- Farben, Schriftart, Logo, Firmendaten und Fragen sind pro Kunde konfigurierbar
- Konfiguration liegt in einer **JSON-Datei pro Mandant** (`/tenants/[slug].json`)
- Integration per `<iframe src="https://domain.de/[kundenname]" />` auf der Kundenseite

**Geschäftsmodell (Platform-Owner):**

- Pro erfolgreich abgeschickter Anfrage im Widget → **0,10 € Gebühr** an den Tenant
- Jede Submission wird in einer Datenbank geloggt (Tenant, Zeitstempel, Kontaktdaten)
- Monatliche Abrechnung pro Tenant auf Basis der geloggten Submissions

---

## 2. Tech-Stack

| Layer                | Technologie                                     |
| -------------------- | ----------------------------------------------- |
| Framework            | **Next.js 14+ (App Router)**                    |
| Sprache              | **TypeScript** (strict mode)                    |
| Styling              | **TailwindCSS**                                 |
| PDF-Generierung      | **@react-pdf/renderer** (serverless-kompatibel) |
| E-Mail-Versand       | **Resend** + **React Email** für Templates      |
| Tenant-Konfiguration | JSON-Dateien (`/tenants/[slug].json`)           |
| Tracking-Datenbank   | **Supabase** (PostgreSQL, Free Tier)            |
| Deployment           | **Vercel**                                      |

> **Warum Supabase für Tracking?** Vercel hat kein persistentes Dateisystem. Supabase Free Tier bietet 500MB PostgreSQL – reicht für Zehntausende Submissions. Kein eigener DB-Server nötig.

---

## 3. Ordnerstruktur

```
/
├── app/
│   ├── [tenant]/
│   │   ├── page.tsx               # Haupt-Seite pro Mandant (iframe-target)
│   │   └── layout.tsx             # Minimales Layout ohne Header/Footer (für iFrame)
│   └── api/
│       └── submit/
│           └── route.ts           # POST: Formular → PDF → 3x E-Mail → DB-Log
│
├── components/
│   └── funnel/
│       ├── SolarFunnel.tsx        # Haupt-Funnel-Komponente (aus v0-Prototyp, Props-fähig)
│       ├── FunnelStep.tsx         # Einzelner Schritt (Frage + Optionskacheln)
│       ├── ContactForm.tsx        # Letzter Schritt: Kontaktdaten
│       ├── ProgressBar.tsx        # Fortschrittsbalken
│       ├── SuccessScreen.tsx      # Bestätigungsscreen nach Absenden
│       └── icons/
│           └── SolarIcons.tsx     # Alle SVG-Icons aus dem v0-Prototyp
│
├── emails/                        # React Email Templates
│   ├── CustomerConfirmation.tsx   # Mail 1 → An Endkunden (mit PDF-Anhang)
│   ├── TenantLeadNotification.tsx # Mail 2 → An Monteur (Lead-Details)
│   └── PlatformTracking.tsx       # Mail 3 → An Platform-Owner (Billing)
│
├── lib/
│   ├── getTenantConfig.ts         # Lädt JSON-Config für einen Mandanten
│   ├── generatePDF.ts             # Erstellt das Angebots-PDF
│   ├── sendEmails.ts              # Versendet alle 3 E-Mails via Resend
│   ├── priceCalculator.ts         # Berechnet Preisschätzung aus Funnel-Antworten
│   └── tracking.ts                # Schreibt Submission in Supabase
│
├── tenants/
│   ├── _template.json             # Vorlage für neue Mandanten
│   ├── demo.json                  # Demo-Mandant (zum Testen)
│   └── musterfirma.json           # Beispiel-Mandant
│
├── types/
│   └── index.ts                   # Alle TypeScript-Interfaces
│
└── public/
    └── tenants/
        └── [slug]/
            └── logo.png           # Logos der Mandanten
```

---

## 4. Mandanten-Konfiguration (`/tenants/[slug].json`)

```json
{
  "slug": "musterfirma",
  "companyName": "Muster Solar GmbH",
  "contactEmail": "anfragen@musterfirma.de",
  "logoUrl": "/tenants/musterfirma/logo.png",
  "phone": "+49 761 123456",
  "address": "Musterstraße 1, 79100 Freiburg",
  "website": "https://musterfirma.de",

  "theme": {
    "primaryColor": "#22c55e",
    "font": "inter",
    "borderRadius": "0.5rem",
    "maxWidth": "720px"
  },

  "funnel": {
    "title": "Solar-Konfigurator",
    "subtitle": "In nur 6 Schritten zu Ihrem individuellen Angebot",
    "submitButtonLabel": "Angebotsvergleich starten",
    "successMessage": "Vielen Dank! Sie erhalten in Kürze Ihre Preisschätzung per E-Mail.",
    "privacyPolicyUrl": "https://musterfirma.de/datenschutz"
  },

  "questions": [
    {
      "id": "gebaeudetyp",
      "title": "Worauf soll die Solaranlage installiert werden?",
      "visible": true,
      "defaultValue": "efh",
      "options": [
        {
          "label": "Ein-/Zweifamilienhaus",
          "value": "efh",
          "iconKey": "House"
        },
        { "label": "Mehrfamilienhaus", "value": "mfh", "iconKey": "Apartment" },
        { "label": "Firmengebäude", "value": "firma", "iconKey": "Factory" },
        { "label": "Sonstiges", "value": "sonstiges", "iconKey": "Question" }
      ]
    },
    {
      "id": "flaeche",
      "title": "Wie groß ist die Fläche bzw. die geplante Anlage?",
      "visible": true,
      "defaultValue": "21-100",
      "options": [
        { "label": "Bis 20 qm", "value": "bis-20", "iconKey": "SolarSmall" },
        {
          "label": "21 bis 100 qm",
          "value": "21-100",
          "iconKey": "SolarMedium"
        },
        {
          "label": "101 bis 200 qm",
          "value": "101-200",
          "iconKey": "SolarLarge"
        },
        { "label": "Über 200 qm", "value": "ueber-200", "iconKey": "SolarXL" }
      ]
    },
    {
      "id": "ausrichtung",
      "title": "Haben Sie eine südlich ausgerichtete Dachfläche?",
      "visible": true,
      "defaultValue": "ja",
      "options": [
        { "label": "Ja", "value": "ja", "iconKey": "Check" },
        { "label": "Nein", "value": "nein", "iconKey": "Cross" },
        {
          "label": "Teilweise",
          "value": "teilweise",
          "iconKey": "HousePartial"
        },
        {
          "label": "Bin nicht sicher",
          "value": "unsicher",
          "iconKey": "Question"
        }
      ]
    },
    {
      "id": "stromspeicher",
      "title": "Sind Sie an einem Stromspeicher interessiert?",
      "visible": true,
      "defaultValue": "ja",
      "options": [
        { "label": "Ja", "value": "ja", "iconKey": "Check" },
        { "label": "Nein", "value": "nein", "iconKey": "Cross" },
        { "label": "Weiß nicht", "value": "unsicher", "iconKey": "Question" }
      ]
    },
    {
      "id": "kaufmiete",
      "title": "Möchten Sie einen Angebotsvergleich zu Kauf und Miete?",
      "visible": true,
      "defaultValue": "beides",
      "options": [
        {
          "label": "Ja, beides interessant",
          "value": "beides",
          "iconKey": "Check"
        },
        { "label": "Kaufen", "value": "kaufen", "iconKey": "Euro" },
        { "label": "Mieten", "value": "mieten", "iconKey": "Document" },
        {
          "label": "Weiß nicht / bitte Beratung",
          "value": "unsicher",
          "iconKey": "Question"
        }
      ]
    },
    {
      "id": "zeitraum",
      "title": "Wann soll das Projekt umgesetzt werden?",
      "visible": true,
      "defaultValue": "1-3",
      "options": [
        {
          "label": "Umgehend",
          "value": "umgehend",
          "iconKey": "Calendar",
          "iconProps": { "text": "<1" }
        },
        {
          "label": "In 1 bis 3 Monaten",
          "value": "1-3",
          "iconKey": "Calendar",
          "iconProps": { "text": "1-3" }
        },
        {
          "label": "In 3 bis 6 Monaten",
          "value": "3-6",
          "iconKey": "Calendar",
          "iconProps": { "text": "3-6" }
        },
        { "label": "Weiß nicht", "value": "unsicher", "iconKey": "Question" }
      ]
    }
  ],

  "pricing": {
    "basePrice": {
      "bis-20": 8000,
      "21-100": 18000,
      "101-200": 45000,
      "ueber-200": 90000
    },
    "storageAddon": 4500,
    "currency": "EUR"
  }
}
```

---

## 5. TypeScript-Typen (`/types/index.ts`)

```typescript
// "system" = System-Font-Stack (kein Download). Weitere Werte entsprechen self-hosted Fonts unter public/fonts/.
export type FunnelFont = "system" | "inter" | "poppins" | "roboto";

export interface FunnelTheme {
  primaryColor: string;         // Markenfarbe (Pflicht). Hover/Border/Muted-Text/Input-BG werden abgeleitet.
  textColor?: string;           // Optional. Default "#1f2937". Nur setzen bei Dark-Themes.
  backgroundColor?: string;     // Optional. Default "#ffffff". Nur setzen bei Dark-Themes.
  font?: FunnelFont;            // Optional. Default "system".
  borderRadius?: string;        // Optional. Default "0.5rem".
  maxWidth?: string;            // Optional. Default "720px".
}

export interface Option {
  label: string;
  value: string;
  iconKey: string;
  iconProps?: Record<string, string>;
}

export interface QuestionConfig {
  id: string;
  title: string;
  options: Option[];
  defaultValue?: string;
  visible: boolean;
}

export interface FunnelConfig {
  title: string;
  subtitle: string;
  submitButtonLabel: string;
  successMessage: string;
  privacyPolicyUrl: string;
}

export interface PricingConfig {
  basePrice: Record<string, number>;
  storageAddon: number;
  currency: string;
}

export interface TenantConfig {
  slug: string;
  companyName: string;
  contactEmail: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  website?: string;
  theme: FunnelTheme;
  funnel: FunnelConfig;
  questions: QuestionConfig[];
  pricing: PricingConfig;
}

export interface ContactData {
  anrede: string;
  name: string;
  telefon: string;
  email: string;
}

export interface PriceEstimate {
  min: number;
  max: number;
  currency: string;
}

export interface SubmitPayload {
  tenant: string;
  answers: Record<string, string>;
  contact: ContactData;
}
```

---

## 6. E-Mail-Flow: 3 Mails pro Submission

Bei jeder erfolgreichen Formular-Einreichung werden **exakt 3 E-Mails** versendet (parallel via `Promise.all`):

### Mail 1 – An den Endkunden

- **An:** `contact.email`
- **Betreff:** `Ihre Solar-Preisschätzung von [companyName]`
- **Inhalt:**
  - Dankes-Text mit Firmenlogo des Monteurs
  - Zusammenfassung der 6 Funnel-Antworten
  - **PDF als Anhang** (vorläufige Preisschätzung)
  - Kontaktdaten des Monteurs (Telefon, E-Mail, Website)
  - Hinweis: „Unverbindliche Erstschätzung – wir melden uns in Kürze bei Ihnen."

### Mail 2 – An den Monteur (Tenant)

- **An:** `tenantConfig.contactEmail`
- **Betreff:** `🔔 Neue Solar-Anfrage von [contact.name]`
- **Inhalt:**
  - Name, E-Mail, Telefon des Interessenten (klickbar)
  - Alle 6 Funnel-Antworten als übersichtliche Tabelle
  - Berechnete Preisschätzung (zur Info des Monteurs)
  - Zeitstempel der Anfrage
  - Hinweis: „Kontaktieren Sie den Kunden zeitnah für maximale Abschlussrate."

### Mail 3 – An den Platform-Owner (Billing-Tracking)

- **An:** `PLATFORM_OWNER_EMAIL` (aus `.env`)
- **Betreff:** `[TRACKING] Submission – [slug] – [Datum]`
- **Inhalt:**
  - Tenant-Slug + Firmenname
  - Zeitstempel
  - Kontaktdaten (für manuelle Überprüfung bei Streitigkeiten)
  - Monatlicher Zählerstand des Tenants (aus Supabase)
  - Betrag: `Anzahl × 0,10 € = X,XX €`

> Mail 3 ist das menschlich lesbare Backup-Audit-Log. Die primäre Abrechnungsquelle ist Supabase.

---

## 7. API-Route (`/api/submit/route.ts`)

```typescript
export async function POST(req: Request) {
  const body: SubmitPayload = await req.json();
  const { tenant, answers, contact } = body;

  // 1. Tenant-Config laden
  const tenantConfig = await getTenantConfig(tenant);
  if (!tenantConfig) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  // 2. Preisschätzung berechnen
  const estimate = calculateEstimate(answers, tenantConfig.pricing);

  // 3. PDF generieren
  const pdfBuffer = await generatePDF({
    contact,
    answers,
    estimate,
    tenantConfig,
  });

  // 4. Submission in Supabase loggen (ZUERST – damit Billing nie verloren geht)
  await logSubmission({ tenantSlug: tenant, contact, answers, estimate });

  // 5. Monatszähler für Tracking-Mail laden
  const monthlyCount = await getMonthlyCount(tenant);

  // 6. Alle 3 Mails parallel versenden
  await sendAllEmails({
    contact,
    answers,
    estimate,
    tenantConfig,
    pdfBuffer,
    monthlyCount,
  });

  return Response.json({ success: true });
}
```

---

## 8. Tracking & Billing (Supabase)

### Tabelle: `submissions`

```sql
CREATE TABLE submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tenant_slug   TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  answers       JSONB NOT NULL,
  price_min     INTEGER,
  price_max     INTEGER,
  emails_sent   BOOLEAN DEFAULT FALSE,
  billed        BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_submissions_tenant ON submissions(tenant_slug);
CREATE INDEX idx_submissions_billing ON submissions(tenant_slug, billed, created_at);
```

### View für Monatsabrechnung:

```sql
CREATE VIEW monthly_billing AS
SELECT
  tenant_slug,
  DATE_TRUNC('month', created_at)  AS month,
  COUNT(*)                          AS submission_count,
  COUNT(*) * 0.10                   AS amount_eur,
  SUM(CASE WHEN billed THEN 1 ELSE 0 END) AS already_billed
FROM submissions
GROUP BY tenant_slug, DATE_TRUNC('month', created_at)
ORDER BY month DESC, tenant_slug;
```

### `/lib/tracking.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!, // Nur server-side!
);

export async function logSubmission(params: {
  tenantSlug: string;
  contact: ContactData;
  answers: Record<string, string>;
  estimate: PriceEstimate;
}) {
  const { error } = await supabase.from("submissions").insert({
    tenant_slug: params.tenantSlug,
    contact_name: params.contact.name,
    contact_email: params.contact.email,
    contact_phone: params.contact.telefon,
    answers: params.answers,
    price_min: params.estimate.min,
    price_max: params.estimate.max,
    emails_sent: true,
  });
  if (error) console.error("Supabase logging error:", error);
  // Fehler nicht weiterwerfen – Tracking-Fehler darf Endkunden nicht betreffen
}

export async function getMonthlyCount(tenantSlug: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("tenant_slug", tenantSlug)
    .gte("created_at", startOfMonth.toISOString());

  return count ?? 0;
}
```

---

## 9. PDF-Inhalt (`/lib/generatePDF.ts`)

Verwendet `@react-pdf/renderer` (serverless-kompatibel, kein Headless Browser nötig).

Das PDF enthält:

- Logo des Monteurs oben links + Firmenname + Adresse + Telefon
- Überschrift: „Vorläufige Preisschätzung – Solar-Anfrage vom [Datum]"
- Kundendaten-Block: Name, E-Mail, Telefon, Anrede
- Tabelle der 6 Funnel-Antworten (Frage → Gewählte Antwort)
- Preisschätzungs-Box: „ca. X.XXX € – Y.XXX €" (farblich hervorgehoben)
- Hinweistext: „Diese Schätzung ist unverbindlich und dient als erste Orientierung. Ein verbindliches Angebot erhalten Sie nach einer kostenlosen Beratung."
- Footer: Kontaktdaten des Monteurs + Generierungsdatum

---

## 10. Preisberechnung (`/lib/priceCalculator.ts`)

```typescript
export function calculateEstimate(
  answers: Record<string, string>,
  pricing: PricingConfig,
): PriceEstimate {
  const base = pricing.basePrice[answers.flaeche] ?? 15000;
  const storageAddon =
    answers.stromspeicher === "ja" ? pricing.storageAddon : 0;
  const total = base + storageAddon;
  return {
    min: Math.round(total * 0.9), // -10%
    max: Math.round(total * 1.15), // +15%
    currency: pricing.currency,
  };
}
```

---

## 11. Routing & iFrame

### `app/[tenant]/page.tsx`

- Lädt Config via `getTenantConfig(params.tenant)`
- Gibt 404 zurück wenn kein JSON gefunden
- Rendert `<SolarFunnel>` mit allen Props aus der Config

### `app/[tenant]/layout.tsx`

- Minimales HTML – kein Header, kein Footer, transparent
- Optimiert für iFrame-Einbettung

### `next.config.ts`

```typescript
async headers() {
  return [{
    source: '/:tenant*',
    headers: [
      { key: 'Content-Security-Policy', value: "frame-ancestors *" },
      { key: 'X-Frame-Options', value: 'ALLOWALL' },
    ],
  }]
}
```

### Einbindung beim Kunden (Copy-Paste-Code)

```html
<iframe
  src="https://solar-funnel.de/musterfirma"
  width="100%"
  height="750"
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);"
></iframe>
```

---

## 12. Umgebungsvariablen (`.env.local`)

```env
# Resend
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@solar-funnel.de
PLATFORM_OWNER_EMAIL=deine@email.de

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx

# App
NEXT_PUBLIC_BASE_URL=https://solar-funnel.de
```

---

## 13. Implementierungs-Reihenfolge für Claude Code

1. **Projekt initialisieren**
   ```bash
   npx create-next-app@latest solar-funnel --typescript --tailwind --app
   ```
2. **Dependencies installieren**
   ```bash
   npm install resend @react-email/components @react-pdf/renderer @supabase/supabase-js
   ```
3. `/types/index.ts` anlegen
4. Tenant-System: `_template.json`, `demo.json`, `musterfirma.json`, `getTenantConfig.ts`
5. Funnel-Komponente aus v0-Code übernehmen – vollständig Props-fähig machen (kein Hardcode)
6. `app/[tenant]/page.tsx` + `layout.tsx` + `next.config.ts` (iFrame-Header)
7. `priceCalculator.ts`
8. Supabase-Tabelle anlegen + `tracking.ts`
9. `generatePDF.ts` mit `@react-pdf/renderer`
10. 3 React-Email-Templates unter `/emails/`
11. `sendEmails.ts` – alle 3 Mails via `Promise.all`
12. `/api/submit/route.ts` – alles zusammenführen
13. End-to-End-Test: Funnel lokal → PDF prüfen → alle 3 Mails prüfen → Supabase-Eintrag prüfen

---

## 14. Design-Entscheidungen

| Entscheidung               | Begründung                                                            |
| -------------------------- | --------------------------------------------------------------------- |
| JSON für Tenant-Config     | Kein DB-Overhead, leicht versionierbar in Git                         |
| Supabase für Tracking      | Persistenz auf Vercel nötig (kein Dateisystem), Free Tier ausreichend |
| `@react-pdf/renderer`      | Serverless-kompatibel, kein Headless Browser, läuft auf Vercel        |
| Resend + React Email       | Native Next.js-Integration, beste DX, PDF-Anhang problemlos           |
| Supabase ZUERST loggen     | Billing darf nie durch E-Mail-Fehler verloren gehen                   |
| 3 Mails via `Promise.all`  | Paralleler Versand = minimale Latenz                                  |
| `billed`-Flag in DB        | Einfaches Markieren bereits abgerechneter Submissions                 |
| iFrame statt Web Component | Maximale Kompatibilität (WordPress, Jimdo, Squarespace etc.)          |

---

## 15. UI: Titel & Subtitle entfernen

**Problem:** Das Widget zeigt aktuell eine Überschrift („Solar-Konfigurator") und einen Untertitel („In nur 6 Schritten zu Ihrem individuellen Angebot") über dem Fragebereich. Der Monteur hat diese Information bereits auf seiner eigenen Webseite – im iFrame ist sie doppelt und verschwendet wertvollen Platz.

**Lösung:**

- `title` und `subtitle` aus der sichtbaren Funnel-Darstellung entfernen
- Die Felder bleiben im JSON-Schema und in `TenantConfig` erhalten (werden im PDF und in E-Mails weiterhin genutzt), werden aber im Widget selbst nicht mehr gerendert
- Betroffene Datei: `components/solar-funnel.tsx` (oder äquivalente Komponente)

---

## 16. UI: Fortschrittsanzeige als Prozent

**Problem:** „Schritt 1 von 7" wirkt nüchtern und gibt dem Nutzer kein Gefühl für den tatsächlich zurückgelegten Weg.

**Lösung:**

- Anzeige als aufgerundete Prozentzahl: `Math.ceil((currentStep + 1) / totalSteps * 100) + '%'`
- Startwert ist 14% (nicht 0%), damit der Nutzer sofort Fortschritt sieht
- Letzter Schritt (Kontaktformular) zeigt 100%
- Darstellung: kleine Prozentangabe rechts neben oder unter dem Fortschrittsbalken, z.B. `„14%"` statt `„Schritt 1 von 7"`
- Der Balken selbst bleibt unverändert (grüne Füllanimation)
- Betroffene Datei: `components/solar-funnel.tsx` (Progress-Bereich unten)

---

## 17. UI: Widget-Zentrierung & max-width

**Problem:** Das Widget ist für die iFrame-Einbettung gedacht, sitzt aber nicht optimal zentriert und hat eine zu enge `maxWidth`, die auf manchen Screens Texte in den Kacheln abschneidet.

**Lösung:**

- Widget-Container: `width: 100%`, `max-width: 720px`, `margin: 0 auto`
- Kachel-Labels: `white-space: normal`, `word-break: break-word`, `text-align: center`
- Kein `overflow: hidden` auf Label-Elementen
- Der `maxWidth`-Wert in der TenantConfig-JSON wird von `"640px"` auf `"720px"` erhöht
- Das Widget zentriert sich automatisch im iFrame, unabhängig von der Breite des Eltern-Elements
- Betroffene Dateien: `components/solar-funnel.tsx`, `tenants/_template.json`, `tenants/demo.json`, `tenants/musterfirma.json`

---

## 18. UI: Responsive Design (Mobile-First)

**Problem:** Das Widget ist auf Desktop gut nutzbar, auf Mobilgeräten aber suboptimal – Schriftgrößen, Abstände und das 4-Kacheln-Grid passen sich nicht an kleine Screens an.

**Lösung:**

**Typografie (fluid):**

- Frage-Titel: `text-lg md:text-xl lg:text-2xl`
- Kachel-Labels: `text-xs sm:text-sm`
- Hinweistexte: `text-xs`
- Button-Text: `text-sm sm:text-base`

**Grid-Layout der Optionskacheln:**

- 2 Optionen → immer `grid-cols-2`
- 3 Optionen → `grid-cols-3` auf allen Screens
- 4 Optionen → `grid-cols-2 sm:grid-cols-4` (mobile: 2×2, Desktop: 1×4)

**Abstände:**

- Innenabstand der Kacheln: `p-2 sm:p-3 md:p-4`
- Icon-Größe: `w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16`

**Kontaktformular:**

- Input-Felder: `text-base` (verhindert Auto-Zoom auf iOS bei `font-size < 16px`)
- Anrede-Radio-Buttons: ausreichend Klickfläche (`min-h-[44px]`) für Touch

**Betroffene Dateien:** `components/solar-funnel.tsx` (alle Kachel- und Form-Elemente)

---

## 19. UI: Submit-Button ohne hässliches Disabled-Grau

**Problem:** Der Submit-Button auf dem Kontaktformular ist im `disabled`-Zustand komplett ausgegraut und sieht kaputt aus. Er vermittelt den falschen Eindruck, das Widget funktioniere nicht.

**Lösung:**

- `disabled`-Attribut wird **nicht** auf den Button gesetzt
- Stattdessen prüft der `onClick`-Handler selbst ob alle Pflichtfelder gefüllt sind
- Wenn nicht ausgefüllt: Handler bricht ab (kein Submit), kein visuelles Feedback nötig
- Cursor zeigt `cursor-not-allowed` beim Hovern solange Felder fehlen
- Button behält volle Farbe (`primaryColor`) in allen Zuständen

```tsx
<button
  onClick={() => {
    if (!isValid) return;
    handleSubmit();
  }}
  style={{
    backgroundColor: theme.primaryColor,
    cursor: isValid ? "pointer" : "not-allowed",
  }}
>
  Angebotsvergleich starten
</button>
```

**Betroffene Datei:** `components/solar-funnel.tsx` (Submit-Button im Kontaktformular)

---

## 20. Rechtliches: Kein Double-Opt-In, keine Telefon-Verifizierung

**Double-Opt-In:**

- Ist für Angebotsanfragen **rechtlich nicht erforderlich**
- Double-Opt-In gilt als empfohlen nur für Newsletter-Abonnements (§ 7 UWG)
- Die vorhandene Einwilligungserklärung beim Absenden ist für einmaligen Kontakt zwecks Angebotsvergleich vollständig DSGVO-konform
- Keine Änderung am Code nötig

**Telefon-Verifizierung via SMS:**

- Wird vorerst **nicht implementiert**
- Nutzer die 7 Fragen beantwortet haben, haben nachgewiesenes Eigeninteresse
- Konvertierungsrate sinkt bei SMS-Schritt erfahrungsgemäß um 20–40%
- Kann später via Twilio Verify nachgerüstet werden, wenn Fake-Leads ein messbares Problem werden

---

## 21. Formular-Validierung (Kontaktformular)

**Problem:** Das Kontaktformular akzeptiert aktuell ungültige Eingaben – E-Mail ohne `@`, Telefonnummern wie `123`, und ein Submit ohne gewählte Anrede. Dadurch landen unbrauchbare Leads beim Monteur und das automatische Anschreiben im PDF/E-Mail kann nicht personalisiert werden.

**Lösung: Validierung für alle 4 Pflichtfelder vor dem Submit**

**Anrede:**

- Pflichtfeld – ohne Auswahl (Herr / Frau / Divers) kann nicht abgeschickt werden
- Fehlermeldung direkt unter den Radio-Buttons: `„Bitte wählen Sie eine Anrede aus."`

**Name:**

- Bereits vorhanden, bleibt wie bisher (nicht leer)

**E-Mail:**

- Validierung via Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Fehlermeldung unter dem Feld: `„Bitte geben Sie eine gültige E-Mail-Adresse ein."`

**Telefonnummer:**

- Mindestens 6 Ziffern, erlaubte Zeichen: `0-9`, `+`, `(`, `)`, `-`, Leerzeichen
- Regex: `/^[+\d\s\-()]{6,}$/`
- Fehlermeldung unter dem Feld: `„Bitte geben Sie eine gültige Telefonnummer ein."`

**Verhalten:**

- Fehlermeldungen erscheinen erst beim Verlassen des Feldes (`onBlur`) – nicht sofort beim Tippen
- Beim Klick auf den Button werden alle Felder gleichzeitig geprüft und alle Fehler angezeigt
- Fehlermeldungen in `theme.primaryColor` oder einem neutralen Rot (`#ef4444`)
- `isValid` ist nur `true` wenn Anrede gesetzt + alle 3 Felder valide → steuert `cursor-not-allowed` (siehe Aufgabe 19)
- Kein externes Validierungs-Framework nötig – simples lokales State-Management reicht

**Betroffene Datei:** `components/solar-funnel.tsx` (Kontaktformular-Bereich)

---

## 22. Spätere Erweiterungen (nicht jetzt umsetzen)

- Admin-Dashboard zum Anlegen neuer Mandanten ohne Code-Deployment
- Abrechnungs-Übersicht pro Tenant (Monatsrechnung aus Supabase-View)
- Stripe-Integration für automatisierte Monatsabrechnung
- Resend-Webhooks für E-Mail-Öffnungsrate tracken
- A/B-Testing verschiedener Fragen-Reihenfolgen
- iFrame-Höhe dynamisch via `postMessage` an Eltern-Frame kommunizieren
- Telefon-Verifizierung via SMS (z.B. Twilio Verify) wenn Fake-Leads zunehmen
