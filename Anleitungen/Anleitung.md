# Funnel Widget Platform – Anleitung

Einbettbares iFrame-Widget für Handwerksbetriebe. Jeder Tenant bekommt seinen eigenen konfigurierbaren Sales-Funnel unter einer eigenen URL.

---

## Inhaltsverzeichnis

1. [Was ist dieses Projekt?](#1-was-ist-dieses-projekt)
2. [Tech-Stack](#2-tech-stack)
3. [Lokale Entwicklungsumgebung einrichten](#3-lokale-entwicklungsumgebung-einrichten)
4. [Supabase einrichten](#4-supabase-einrichten)
5. [Resend einrichten](#5-resend-einrichten)
6. [Neuen Tenant & Funnel anlegen](#6-neuen-tenant--funnel-anlegen)
7. [Widget beim Kunden einbetten](#7-widget-beim-kunden-einbetten)
8. [Auf Vercel deployen](#8-auf-vercel-deployen)
9. [Projektstruktur](#9-projektstruktur)
10. [Icons](#10-icons)
11. [Billing](#11-billing)

---

## 1. Was ist dieses Projekt?

Ein mehrstufiger Sales-Funnel, der als `<iframe>` auf der Website eines Handwerksbetriebs eingebettet wird. Der Endkunde klickt sich durch konfigurierbare Fragen und gibt am Ende seine Kontaktdaten ein. Das System:

- Speichert die Anfrage in Supabase
- Schickt eine Dankes-Mail an den Endkunden
- Schickt eine Lead-Benachrichtigung an den Betreiber

**Multi-Tenant:** Jeder Kunde hat einen eindeutigen Slug. Die URL `https://domain.de/musterfirma` zeigt den Funnel mit der Konfiguration von `musterfirma`. Fragen, Farben und Texte werden komplett aus Supabase geladen – kein Code-Deployment für neue Tenants nötig.

---

## 2. Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Sprache | TypeScript |
| Styling | TailwindCSS |
| Datenbank | Supabase (Postgres) |
| E-Mail | Resend + React Email |
| Deployment | Vercel |

---

## 3. Lokale Entwicklungsumgebung einrichten

**1. Dependencies installieren:**
```bash
npm install
```

**2. Umgebungsvariablen anlegen:**
```bash
cp .env.example .env.local
```

`.env.local` befüllen:
```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@deine-domain.de
EMAIL_DOMAIN=deine-domain.de
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx
NEXT_PUBLIC_BASE_URL=http://localhost:3000
SITE_PASSWORD=geheim
```

**3. Entwicklungsserver starten:**
```bash
npm run dev
```

---

## 4. Supabase einrichten

Schema aus `context/supabase-schema.sql` im Supabase SQL-Editor ausführen. Erstellt die Tabellen `tenants`, `funnels`, `funnel_questions`, `submissions`, `honeypot_triggers`.

**Zugangsdaten** unter Project Settings → API:
- `SUPABASE_URL` = Project URL
- `SUPABASE_SERVICE_KEY` = `service_role`-Key (nie mit `NEXT_PUBLIC_` versehen)

---

## 5. Resend einrichten

1. Account auf [resend.com](https://resend.com)
2. API-Key unter **API Keys** erstellen
3. Domain unter **Domains** verifizieren
4. `RESEND_API_KEY`, `EMAIL_FROM` und `EMAIL_DOMAIN` in `.env.local` eintragen

> `EMAIL_FROM` muss von einer in Resend verifizierten Domain kommen.
> `EMAIL_DOMAIN` = nur die Domain ohne Protokoll, z.B. `anfragebestaetigung.de`

---

## 6. Neuen Tenant & Funnel anlegen

Alles über Supabase – kein Code-Deployment nötig. Vollständige Feldübersicht: `Anleitungen/Funnel-Konfigurationsreferenz.md`

### 1. Tenant anlegen

```sql
INSERT INTO tenants (slug, company_name, public_email, notification_email)
VALUES (
  'musterfirma',
  'Musterfirma GmbH',
  'info@musterfirma.de',         -- öffentlich, sichtbar für Anfragenden
  'anfragen@musterfirma.de'      -- intern, nur für Lead-Benachrichtigungen
);
```

### 2. Funnel anlegen

```sql
INSERT INTO funnels (slug, tenant_slug, primary_color, privacy_policy_url)
VALUES (
  'musterfirma',
  'musterfirma',
  '#4648d4',
  'https://musterfirma.de/datenschutz'
);
```

### 3. Fragen anlegen

```sql
INSERT INTO funnel_questions (funnel_slug, sort_order, question_key, question_type, title, options)
VALUES (
  'musterfirma', 0, 'gebaeudetyp', 'single_choice',
  'Was für ein Gebäude haben Sie?',
  '[
    {"label": "Einfamilienhaus", "value": "efh",     "icon_key": "Home"},
    {"label": "Mehrfamilienhaus", "value": "mfh",    "icon_key": "Building2"},
    {"label": "Gewerbe",          "value": "gewerbe","icon_key": "Factory"}
  ]'::jsonb
);
```

Weitere Fragen mit `sort_order = 1, 2, ...` hinzufügen.

### 4. Testen

`http://localhost:3000/musterfirma` aufrufen.

### Funnel deaktivieren

```sql
UPDATE funnels SET is_active = FALSE WHERE slug = 'musterfirma';
```

---

## 7. Widget beim Kunden einbetten

Vollständige Anleitung: → **[Widget-Einbetten.md](Widget-Einbetten.md)**

**Kurzfassung:**
```html
<script src="https://deine-domain.de/embed.js" data-slug="musterfirma"></script>
```

---

## 8. Auf Vercel deployen

1. Repo mit Vercel verbinden (GitHub → New Project)
2. Alle Werte aus `.env.local` unter **Settings → Environment Variables** eintragen
3. Vercel deployed automatisch bei jedem Push auf `main`

---

## 9. Projektstruktur

```
app/
  [slug]/
    page.tsx              # Lädt Config aus Supabase, rendert Funnel oder 404
  api/submit/route.ts     # POST: Honeypot → DB → 2 Mails
  funnel-overview/        # Admin-Übersicht (passwortgeschützt)

components/
  funnel.tsx              # Generischer Funnel-Client
  TenantFunnelClient.tsx  # Client-Wrapper für Submit

emails/
  CustomerConfirmation.tsx      # Danke-Mail an Endkunden
  TenantLeadNotification.tsx    # Lead-Benachrichtigung an Betreiber

lib/
  getTenantConfig.ts      # Lädt Funnel-Config aus Supabase
  sendEmails.ts           # Resend: 2 Mails parallel
  tracking.ts             # Supabase: logSubmission, updateEmailStatus, logHoneypot

types/index.ts            # TypeScript-Interfaces
context/
  supabase-schema.sql     # Aktuelles DB-Schema
  supabase-schema.md      # Tabellenübersicht

Anleitungen/
  Funnel-Konfigurationsreferenz.md  # Alle konfigurierbaren Felder
  Widget-Einbetten.md               # Einbettung beim Kunden
  Icon-Prompt.md                    # KI-Prompt für Icon-Auswahl
```

---

## 10. Icons

Jeder [Lucide-Icon-Name](https://lucide.dev/icons/) funktioniert direkt als `icon_key` in der DB – kein Eintrag im Code nötig.

```json
{ "label": "Einfamilienhaus", "value": "efh", "icon_key": "Home" }
```

Icon-Namen sind PascalCase, z.B. `Home`, `Building2`, `TrendingDown`. Alle verfügbaren Icons unter `/icons` im laufenden Projekt einsehbar.

Prompt zur Icon-Auswahl per KI: → **[Icon-Prompt.md](Icon-Prompt.md)**

---

## 11. Billing

Abrechnung erfolgt als monatlicher Retainer – wird intern eingestellt, kein Kundenkontakt. Die Felder `billing_model`, `lead_price_base`, `flat_monthly_price`, `flat_monthly_lead_limit` in der `tenants`-Tabelle sind vorhanden aber aktuell nicht aktiv genutzt.
