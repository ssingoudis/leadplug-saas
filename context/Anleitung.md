# Funnel Widget Platform – Anleitung

Einbettbares iFrame-Widget für Handwerksbetriebe. Jeder Tenant bekommt seinen eigenen konfigurierbaren Sales-Funnel unter einer eigenen URL.

---

## Inhaltsverzeichnis

1. [Was ist dieses Projekt?](#1-was-ist-dieses-projekt)
2. [Tech-Stack](#2-tech-stack)
3. [Lokale Entwicklungsumgebung einrichten](#3-lokale-entwicklungsumgebung-einrichten)
4. [Supabase einrichten](#4-supabase-einrichten)
5. [Resend einrichten](#5-resend-einrichten)
6. [Neuen Tenant anlegen](#6-neuen-tenant-anlegen)
7. [Widget beim Kunden einbetten](#7-widget-beim-kunden-einbetten)
8. [Auf Vercel deployen](#8-auf-vercel-deployen)
9. [Projektstruktur](#9-projektstruktur)
10. [Icons hinzufügen](#10-icons-hinzufügen)
11. [Abrechnung & Billing](#11-abrechnung--billing)

---

## 1. Was ist dieses Projekt?

Ein mehrstufiger Sales-Funnel, der als `<iframe>` auf der Website eines Handwerksbetriebs eingebettet wird. Der Endkunde klickt sich durch konfigurierbare Fragen (z.B. Gebäudetyp, Fläche, Wunschtermin) und gibt am Ende seine Kontaktdaten ein. Das System:

- Speichert die Anfrage in Supabase
- Schickt eine Dankes-Mail an den Endkunden
- Schickt eine Lead-Benachrichtigung an den Betreiber

**Multi-Tenant:** Jeder Kunde (Tenant) hat einen eindeutigen Slug. Die URL `https://domain.de/musterfirma` zeigt den Funnel mit der Konfiguration von `musterfirma`. Fragen, Farben, Texte und Preise werden komplett aus Supabase geladen – kein Code-Deployment für neue Tenants nötig.

---

## 2. Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Sprache | TypeScript (strict) |
| Styling | TailwindCSS |
| Datenbank / Config | Supabase (Postgres) |
| E-Mail | Resend + React Email |
| Deployment | Vercel |

---

## 3. Lokale Entwicklungsumgebung einrichten

### Voraussetzungen

- Node.js 18+
- Ein Supabase-Projekt (kostenloser Free Tier reicht)
- Ein Resend-Account (kostenloser Free Tier reicht)

### Schritt-für-Schritt

**1. Repository klonen und Dependencies installieren:**

```bash
git clone <repo-url>
cd solar-widget
npm install
```

**2. Umgebungsvariablen anlegen:**

```bash
cp .env.example .env.local
```

`.env.local` befüllen (Details in Abschnitt 4 und 5):

```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@deine-domain.de
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**3. Entwicklungsserver starten:**

```bash
npm run dev
```

Erreichbar unter `http://localhost:3000/demo` (sofern Demo-Daten in Supabase eingespielt).

---

## 4. Supabase einrichten

### Schema erstellen

Im [Supabase SQL-Editor](https://supabase.com/dashboard) das komplette Schema einspielen:

1. Datei `context/supabase-schema.sql` öffnen
2. Inhalt kopieren und im SQL-Editor ausführen

Erstellt die Tabellen `tenants`, `funnel_questions`, `funnel_options`, `submissions` sowie die View `monthly_billing`. Das Script ist idempotent (beliebig oft ausführbar ohne Fehler).

### Demo-Daten einspielen

Für lokale Tests zwei Demo-Tenants laden:

1. Datei `context/supabase-seed.sql` öffnen
2. Inhalt kopieren und im SQL-Editor ausführen

Erstellt:
- **`demo`** – Solar-Funnel, 6 Fragen, Billing `per_lead` à 3,00 €
- **`demo-waermepumpe`** – Wärmepumpen-Funnel, 3 Fragen, Billing `flat_monthly` 20 €/Monat

Erreichbar unter `localhost:3000/demo` und `localhost:3000/demo-waermepumpe`.

### Supabase-Zugangsdaten holen

Im Supabase Dashboard unter **Project Settings → API**:

- `SUPABASE_URL` = Project URL
- `SUPABASE_SERVICE_KEY` = `service_role`-Key (nicht der `anon`-Key)

> **Wichtig:** Den Service Key niemals mit `NEXT_PUBLIC_`-Prefix versehen – er darf nur server-side verwendet werden.

### Hinweis: Free Tier

Supabase Free Tier pausiert das Projekt nach ~10 Minuten Inaktivität. Beim nächsten Aufruf gibt es einen Cold-Start von bis zu 30 Sekunden. Für Produktiv-Einsatz auf den Pro-Plan upgraden oder einen Keep-Alive-Ping einrichten.

---

## 5. Resend einrichten

1. Account anlegen auf [resend.com](https://resend.com)
2. API-Key erstellen unter **API Keys**
3. Domain verifizieren unter **Domains** (für Produktion)
4. `RESEND_API_KEY` und `EMAIL_FROM` in `.env.local` eintragen

Für lokale Tests kann `EMAIL_FROM` eine beliebige Adresse sein – Resend liefert im Free Tier an verifizierte Adressen.

---

## 6. Neuen Tenant anlegen

Neuen Tenant ausschließlich über Supabase anlegen – kein Code-Deployment nötig.

### 1. Tenant-Eintrag erstellen

Im Supabase SQL-Editor oder direkt in der `tenants`-Tabelle:

```sql
INSERT INTO tenants (
  slug, industry, is_active,
  company_name, contact_email,
  primary_color, text_color, background_color, page_background_color,
  font, border_radius, max_width,
  funnel_title, submit_button_label, success_message,
  response_time_text, contact_form_subtitle,
  billing_model, lead_price_base
) VALUES (
  'musterfirma',        -- eindeutiger Slug (URL: /musterfirma)
  'solar',              -- Branche: solar | waermepumpe | heizung | sanitaer | elektro
  TRUE,
  'Musterfirma GmbH', 'anfragen@musterfirma.de',
  '#22c55e', '#1f2937', '#ffffff', '#f0fdf4',
  'inter', '0.5rem', '720px',
  'Jetzt kostenloses Angebot anfordern',
  'Anfrage absenden',
  'Vielen Dank! Wir melden uns in Kürze bei Ihnen.',
  '24 Stunden',
  'Wer soll das Angebot erhalten?',
  'per_lead', 3.00    -- oder: 'flat_monthly', dann flat_monthly_price + flat_monthly_lead_limit setzen
);
```

Texte die nicht gesetzt werden (`NULL`) bekommen automatisch generische Defaults.

### 2. Fragen anlegen

```sql
WITH q AS (
  INSERT INTO funnel_questions (tenant_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM tenants WHERE slug = 'musterfirma'),
    1, 'gebaeudetyp', 'Was für ein Gebäude haben Sie?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key
FROM q, (VALUES
  (1, 'Einfamilienhaus', 'efh',     'House'),
  (2, 'Mehrfamilienhaus','mfh',     'Apartment'),
  (3, 'Gewerbe',         'gewerbe', 'Factory')
) AS s(sort_order, label, value, icon_key);
```

Weitere Fragen analog mit `sort_order = 2, 3, ...` hinzufügen.

### 3. Testen

`http://localhost:3000/musterfirma` aufrufen – der Funnel lädt die Konfiguration aus Supabase.

### Tenant deaktivieren

```sql
UPDATE tenants SET is_active = FALSE WHERE slug = 'musterfirma';
```

Der Funnel zeigt dann eine 404-Seite.

---

## 7. Widget beim Kunden einbetten

Auf der Kundenseite (WordPress, Jimdo, Squarespace, beliebiges HTML) einfügen:

```html
<iframe
  id="funnel-widget"
  src="https://deine-domain.de/musterfirma"
  width="100%"
  height="600"
  frameborder="0"
  scrolling="no"
  style="border:none;"
></iframe>

<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'funnel-resize') {
      document.getElementById('funnel-widget').height = e.data.height;
    }
  });
</script>
```

Das Widget sendet nach jedem Schritt seine aktuelle Höhe per `postMessage` – der Listener passt die iFrame-Höhe automatisch an, damit kein internes Scrollen entsteht. Ohne Listener funktioniert der Funnel trotzdem, nur mit fixer Höhe.

---

## 8. Auf Vercel deployen

**1. Repository mit Vercel verbinden:**

Im [Vercel Dashboard](https://vercel.com) → New Project → GitHub-Repo auswählen.

**2. Umgebungsvariablen in Vercel eintragen:**

Unter **Settings → Environment Variables** alle Werte aus `.env.local` eintragen:

```
RESEND_API_KEY
EMAIL_FROM
SUPABASE_URL
SUPABASE_SERVICE_KEY
NEXT_PUBLIC_BASE_URL    # = https://deine-vercel-domain.vercel.app
```

**3. Deploy:**

Vercel deployed automatisch bei jedem Push auf `main`. Danach ist der Funnel unter der Vercel-URL erreichbar.

**Custom Domain:** Unter **Settings → Domains** eine eigene Domain hinzufügen.

---

## 9. Projektstruktur

```
app/
  [tenant]/
    page.tsx          # Lädt Tenant-Config, rendert Funnel oder 404
    layout.tsx        # Minimales Layout (kein Header/Footer) – iFrame-optimiert
  api/
    submit/
      route.ts        # POST-Endpunkt: Honeypot → Validierung → DB → 2 Mails

components/
  funnel.tsx          # Generischer Funnel (alle Branchen), enthält Icon-Bibliothek
  TenantFunnelClient.tsx  # Client-Wrapper (startedAt, referrer, userAgent)

emails/
  CustomerConfirmation.tsx    # Mail 1 – Danke-Mail an Endkunden
  TenantLeadNotification.tsx  # Mail 2 – Lead-Benachrichtigung an Betreiber

lib/
  getTenantConfig.ts  # Supabase-Loader mit JSON-Fallback
  sendEmails.ts       # Resend: 2 Mails parallel via Promise.all
  tracking.ts         # Supabase: logSubmission()

tenants/
  demo.json           # Fallback-Config für Demo-Tenant (nur bei DB-Ausfall)
  _template.json      # Vorlage für neue JSON-Fallbacks

types/
  index.ts            # Alle TypeScript-Interfaces (TenantConfig, QuestionConfig, …)

context/
  supabase-schema.sql # DB-Schema – im Supabase SQL-Editor ausführen
  supabase-seed.sql   # Demo-Daten – optional, für lokale Tests
  project-overview.md # Architektur & Design-Entscheidungen
  Anleitung.md        # Diese Datei

public/
  fonts/              # Self-hosted Fonts (Inter, Poppins, Roboto) – DSGVO-konform
```

---

## 10. Icons hinzufügen

Alle Icons sind SVG-Komponenten im `Icons`-Objekt in `components/funnel.tsx`. Referenziert werden sie per `icon_key` (String) in der Datenbank.

**Aktuell verfügbare Icons:**

| Key | Verwendung |
|---|---|
| `House` | Einfamilienhaus, Gebäude |
| `Apartment` | Mehrfamilienhaus |
| `Factory` | Gewerbe, Fabrik |
| `HousePartial` | Teilweise, gemischt |
| `SolarPanel` | Solaranlage, Dachfläche |
| `Thermometer` | Temperatur, Heizung |
| `Flame` | Gas, Öl, Feuer |
| `HeatPump` | Wärmepumpe |
| `Drop` | Wasser, Sanitär |
| `Snowflake` | Kälte, Klimaanlage |
| `Wrench` | Handwerk, Gewerbe |
| `Lightning` | Strom, Stromspeicher |
| `Star` | Favorit, Empfehlung |
| `Check` | Ja, bestätigt |
| `Cross` | Nein, abgelehnt |
| `Question` | Weiß nicht, sonstiges |
| `Calendar` | Zeitraum, Termin |
| `Euro` | Kauf, Preis |
| `Document` | Vertrag, Miete |

**Neues Icon hinzufügen:**

In `components/funnel.tsx` im `Icons`-Objekt einen neuen Eintrag ergänzen:

```typescript
const Icons = {
  // ... bestehende Icons ...
  MeinIcon: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      {/* SVG-Pfade */}
    </svg>
  ),
};
```

Danach ist `"MeinIcon"` als `icon_key` in der Datenbank verwendbar.

**Externes Bild statt Icon:**

In `funnel_options` das Feld `icon_url` setzen (z.B. `https://cdn.../logo.png`). Hat Vorrang über `icon_key`.

---

## 11. Abrechnung & Billing

### Billing-Modelle

**`per_lead`:** Für jeden eingegangenen Lead wird `tenants.lead_price_base` (z.B. 3,00 €) in der Submission gespeichert.

**`flat_monthly`:** Für jeden Lead wird `lead_price = 0` gespeichert. Die Abrechnung erfolgt pauschal über `flat_monthly_price` pro Monat. `flat_monthly_lead_limit` begrenzt die inkludierten Leads – Leads darüber erscheinen als `overage_leads` in der `monthly_billing`-View.

### Monatsauswertung

```sql
SELECT * FROM monthly_billing
WHERE tenant_slug = 'musterfirma'
ORDER BY month DESC;
```

Gibt pro Tenant und Monat: Anzahl Submissions, Summe der Lead-Preise (nur legitime Submissions, kein Honeypot).

### Preisänderung

`lead_price` wird zum Zeitpunkt der Submission gespeichert und ist historisch unveränderlich. Eine Änderung von `lead_price_base` wirkt sich nur auf neue Submissions aus.
