# Datenbank-Bedienungsanleitung – widget-funnel

> Supabase-Projekt: **widget-funnel**
> Schema-Datei: [`supabase-schema-v2.sql`](supabase-schema-v2.sql)
> Seed-Daten: [`supabase-seed-v2.sql`](supabase-seed-v2.sql)

---

## Aufbau auf einen Blick

```
industries        Branchenliste (Dropdown-Quelle, fix vorgegeben)
tenants           Kunden / Handwerksbetriebe
  └── themes      Design-Konfigurationen (pro Tenant oder global)
  └── funnels     Widgets (Slug, Branche, Texte, Theme-Zuweisung)
        └── funnel_questions   Fragen pro Widget
              └── funnel_options   Antwortmöglichkeiten pro Frage
submissions       Eingegangene Leads (pro Funnel + Tenant)

View: monthly_billing   Monatsabrechnung aggregiert pro Tenant
```

**Faustregel:** Tenant = die Firma. Funnel = das Widget das eingebettet wird. Eine Firma kann mehrere Widgets haben (z.B. Solar + Wärmepumpe).

---

## Neuen Kunden anlegen

### Schritt 1 – Tenant anlegen
```sql
INSERT INTO tenants (company_name, contact_email, billing_model, lead_price_base)
VALUES ('Musterfirma GmbH', 'info@musterfirma.de', 'per_lead', 3.00);
```

Für Pauschalmodell stattdessen:
```sql
INSERT INTO tenants (company_name, contact_email, billing_model, flat_monthly_price, flat_monthly_lead_limit)
VALUES ('Musterfirma GmbH', 'info@musterfirma.de', 'flat_monthly', 29.00, 15);
```

### Schritt 2 – Theme anlegen
Globale Vorlage klonen und anpassen (z.B. andere Primärfarbe):
```sql
INSERT INTO themes (tenant_id, name, primary_color, font, border_radius, max_width)
VALUES (
  (SELECT id FROM tenants WHERE contact_email = 'info@musterfirma.de'),
  'Musterfirma Theme',
  '#dc2626',   -- Rot als Beispiel
  'inter',
  '0.75rem',
  '720px'
);
```

Oder einfach eine globale Vorlage direkt im Funnel referenzieren (Schritt 3), dann entfällt dieser Schritt.

### Schritt 3 – Funnel anlegen
```sql
INSERT INTO funnels (slug, tenant_id, theme_id, industry, funnel_title)
VALUES (
  'musterfirma-solar',
  (SELECT id FROM tenants WHERE contact_email = 'info@musterfirma.de'),
  (SELECT id FROM themes  WHERE name = 'Musterfirma Theme'),
  'solar',
  'Jetzt kostenloses Solarangebot anfordern'   -- NULL = generischer Default
);
```

Die URL des Widgets ist danach: `https://domain.de/musterfirma-solar`

---

## Fragen und Antwortoptionen hinzufügen

### Neue Frage hinzufügen
```sql
WITH q AS (
  INSERT INTO funnel_questions (funnel_id, sort_order, question_key, title)
  VALUES (
    (SELECT id FROM funnels WHERE slug = 'musterfirma-solar'),
    7,                    -- Reihenfolge (sort_order)
    'dachform',           -- Eindeutiger Key (wird in answers gespeichert)
    'Welche Dachform haben Sie?'
  )
  RETURNING id
)
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
SELECT q.id, s.sort_order, s.label, s.value, s.icon_key FROM q, (VALUES
  (1, 'Satteldach',   'sattel',  'House'),
  (2, 'Flachdach',   'flach',   'House'),
  (3, 'Walmdach',    'walm',    'House'),
  (4, 'Sonstiges',   'sonst',   'Question')
) AS s(sort_order, label, value, icon_key);
```

### Frage temporär ausblenden (ohne löschen)
```sql
UPDATE funnel_questions SET visible = FALSE
WHERE funnel_id = (SELECT id FROM funnels WHERE slug = 'musterfirma-solar')
  AND question_key = 'dachform';
```

### Option nachträglich hinzufügen
```sql
INSERT INTO funnel_options (question_id, sort_order, label, value, icon_key)
VALUES (
  (SELECT fq.id FROM funnel_questions fq
   JOIN funnels f ON fq.funnel_id = f.id
   WHERE f.slug = 'musterfirma-solar' AND fq.question_key = 'dachform'),
  5,
  'Pultdach',
  'pult',
  'House'
);
```

---

## Verfügbare Branchen (`industries`)

| id | Bezeichnung |
|---|---|
| `solar` | Photovoltaik / Solar |
| `waermepumpe` | Wärmepumpe |
| `heizung` | Heizung |
| `sanitaer` | Sanitär |
| `elektro` | Elektro |
| `general` | Allgemein |

**Neue Branche hinzufügen** (kein Schema-Change nötig):
```sql
INSERT INTO industries (id, label, sort_order)
VALUES ('lueftung', 'Lüftung / Klimaanlage', 6);
```

---

## Verfügbare Icons (`icon_key`)

Alle Icons sind SVG-Komponenten in `components/funnel.tsx` im `Icons`-Objekt.

| icon_key | Verwendung |
|---|---|
| `House` | Einfamilienhaus |
| `Apartment` | Mehrfamilienhaus |
| `Factory` | Gewerbe / Fabrik |
| `HousePartial` | Teilweise |
| `Thermometer` | Temperatur |
| `Flame` | Gas / Öl / Heizung |
| `HeatPump` | Wärmepumpe |
| `SolarPanel` | Photovoltaik |
| `Drop` | Wasser / Sanitär |
| `Snowflake` | Kälte / Klimaanlage |
| `Lightning` | Elektro / Strom |
| `Wrench` | Handwerk / Umbau |
| `Check` | Ja / Bestätigung |
| `Cross` | Nein / Ablehnung |
| `Question` | Weiß nicht / Sonstiges |
| `Calendar` | Zeitraum / Termin |
| `Euro` | Kaufen / Preis |
| `Document` | Mieten / Vertrag |
| `Star` | Highlight |

**Externes Bild statt Icon:** `icon_url` in `funnel_options` setzen – hat Vorrang über `icon_key`.

---

## Globale Theme-Vorlagen

Drei Vorlagen sind beim Schema-Setup eingefügt und können direkt in Funnels verwendet werden:

| id | name | primary_color |
|---|---|---|
| `00000000-0000-0000-0000-000000000001` | Standard Grün | `#22c55e` |
| `00000000-0000-0000-0000-000000000002` | Standard Blau | `#2563eb` |
| `00000000-0000-0000-0000-000000000003` | Standard Orange | `#f97316` |

---

## Texte eines Funnels anpassen

Alle Textfelder sind optional – `NULL` aktiviert den generischen Default.

```sql
UPDATE funnels SET
  funnel_title          = 'Solar-Angebot anfordern',
  submit_button_label   = 'Jetzt anfragen',
  success_message       = 'Danke! Wir melden uns innerhalb von 48 Stunden.',
  response_time_text    = '48 Stunden',
  contact_form_subtitle = 'An wen sollen wir das Angebot schicken?',
  privacy_policy_url    = 'https://musterfirma.de/datenschutz'
WHERE slug = 'musterfirma-solar';
```

---

## Leads anzeigen (Submissions)

### Alle Leads eines Funnels
```sql
SELECT
  created_at,
  contact_name,
  contact_email,
  contact_phone,
  answers
FROM submissions
WHERE funnel_slug = 'musterfirma-solar'
  AND honeypot_triggered = FALSE
ORDER BY created_at DESC;
```

### Alle Leads eines Kunden (über alle Funnels)
```sql
SELECT
  s.funnel_slug,
  s.created_at,
  s.contact_name,
  s.contact_email,
  s.lead_price
FROM submissions s
JOIN tenants t ON s.tenant_id = t.id
WHERE t.contact_email = 'info@musterfirma.de'
  AND s.honeypot_triggered = FALSE
ORDER BY s.created_at DESC;
```

### Monatsabrechnung
```sql
SELECT * FROM monthly_billing
WHERE company_name = 'Musterfirma GmbH'
ORDER BY month DESC;
```

---

## Funnel deaktivieren (ohne löschen)

```sql
-- Nur diesen Funnel deaktivieren (→ 404 für den slug)
UPDATE funnels SET is_active = FALSE WHERE slug = 'musterfirma-solar';

-- Ganzen Kunden deaktivieren (alle seine Funnels → 404)
UPDATE tenants SET is_active = FALSE
WHERE contact_email = 'info@musterfirma.de';
```

---

## Zweiten Funnel für bestehenden Kunden anlegen

```sql
INSERT INTO funnels (slug, tenant_id, theme_id, industry, funnel_title)
VALUES (
  'musterfirma-waermepumpe',
  (SELECT id FROM tenants WHERE contact_email = 'info@musterfirma.de'),
  (SELECT id FROM themes  WHERE name = 'Musterfirma Theme'),
  'waermepumpe',
  'Jetzt kostenloses Wärmepumpen-Angebot anfordern'
);
```

Anschließend Fragen + Optionen für `musterfirma-waermepumpe` anlegen (s. oben).
Billing läuft weiter über denselben Tenant – beide Funnels werden in `monthly_billing` zusammengezählt.
