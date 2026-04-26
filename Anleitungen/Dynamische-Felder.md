# Dynamische Felder – Alle konfigurierbaren Werte pro Tenant

Vollständige Referenz aller Felder in Supabase. Für jeden neuen Kunden relevant.

---

## Tabelle: `tenants`

### Identifikation

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `slug` | TEXT | Ja | URL-Kürzel, ich erstelle ihn aus dem Firmennamen. `domain.de/[slug]` |
| `is_active` | BOOL | — | `true` = aktiv, `false` = 404. Default: `true` |
| `industry` | TEXT | Ja | Branche: `solar`, `waermepumpe`, `heizung`, `sanitaer`, `elektro`, `general` |

### Unternehmensdaten

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `company_name` | TEXT | **Ja** | Firmenname – erscheint in beiden E-Mails |
| `contact_email` | TEXT | **Ja** | Wohin kommen die Lead-E-Mails |
| `phone` | TEXT | Nein | Telefonnummer (aktuell ungenutzt) |
| `address` | TEXT | Nein | Adresse (aktuell ungenutzt) |
| `website` | TEXT | Nein | Website (aktuell ungenutzt) |

> `logo_url` wurde entfernt – der Funnel sitzt im iFrame auf der Kundenseite, sein Logo ist bereits auf der Website sichtbar.

### Theme / Design

| Feld | Default | Wer entscheidet | Beschreibung |
|---|---|---|---|
| `primary_color` | `#22c55e` | **Kunde** | Markenfarbe – Buttons, Highlights |
| `text_color` | `#1f2937` | Ich | Nur bei Dark-Theme relevant, sonst nie anfassen |
| `background_color` | `#ffffff` | Ich | Hintergrund der Widget-Card |
| `page_background_color` | `transparent` | Ich | Hintergrund des iFrames – `transparent` passt immer |
| `font` | `inter` | Ich | Schriftart: `system`, `inter`, `poppins`, `roboto` |
| `border_radius` | `0.75rem` | Ich | Rundung der Karten/Buttons – nach Gefühl |
| `max_width` | `720px` | Ich | Maximale Breite des Widgets |

### Funnel-Texte

| Feld | Default | Wer entscheidet |
|---|---|---|
| `funnel_title` | `"Jetzt kostenloses Angebot anfordern"` | Kunde (optional) |
| `submit_button_label` | `"Anfrage absenden"` | Kunde (optional) |
| `success_message` | `"Vielen Dank! Wir melden uns in Kürze bei Ihnen."` | Kunde (optional) |
| `response_time_text` | `"24 Stunden"` | Kunde (optional) |
| `contact_form_subtitle` | `"Wer soll das Angebot erhalten?"` | Kunde (optional) |
| `privacy_text` | Generischer DSGVO-Text | **Nie ändern** – gilt für alle |
| `privacy_policy_url` | `#` | **Kunde Pflicht** – URL seiner Datenschutzseite |

### Billing (intern – kein Kundenkontakt)

| Feld | Beschreibung |
|---|---|
| `billing_model` | `per_lead` oder `flat_monthly` |
| `lead_price_base` | Preis pro Lead in € (für `per_lead`) |
| `flat_monthly_price` | Monatspauschale in € (für `flat_monthly`) |
| `flat_monthly_lead_limit` | Max. Leads pro Monat in der Pauschale |

---

## Tabelle: `funnel_questions`

Eine Zeile pro Frage. Reihenfolge über `sort_order`.

| Feld | Beschreibung |
|---|---|
| `tenant_id` | Referenz auf den Tenant |
| `sort_order` | Reihenfolge der Frage (1, 2, 3 …) |
| `question_key` | Interner Key im answers-JSONB, z.B. `gebaeudetyp` |
| `title` | Fragetext der dem Endkunden angezeigt wird |
| `visible` | `true` = sichtbar, `false` = übersprungen |

---

## Tabelle: `funnel_options`

Eine Zeile pro Antwortoption. Reihenfolge über `sort_order`.

| Feld | Beschreibung |
|---|---|
| `question_id` | Referenz auf die Frage |
| `sort_order` | Reihenfolge der Option |
| `label` | Anzeigetext, z.B. `"Einfamilienhaus"` |
| `value` | Gespeicherter Wert im answers-JSONB, z.B. `"efh"` |
| `icon_key` | Built-in SVG-Icon (siehe Liste unten) |
| `icon_url` | Externes Bild-URL – hat Vorrang über `icon_key` |

### Verfügbare Icons (`icon_key`)

| Key | Verwendung |
|---|---|
| `House` | Einfamilienhaus, Wohngebäude |
| `Apartment` | Mehrfamilienhaus |
| `Factory` | Firmengebäude, Gewerbe |
| `HousePartial` | Teilweise, gemischt |
| `Check` | Ja, bestätigt |
| `Cross` | Nein |
| `Question` | Weiß nicht, Sonstiges |
| `Calendar` | Zeitraum, Termin |
| `Euro` | Kauf, Preis |
| `Document` | Miete, Vertrag |
| `Star` | Empfehlung, Highlight |
| `Thermometer` | Heizung, Temperatur |
| `Flame` | Gas, Öl, Heizung |
| `HeatPump` | Wärmepumpe |
| `SolarPanel` | Solar, Photovoltaik |
| `Drop` | Wasser, Sanitär |
| `Snowflake` | Kälte, Klimaanlage |
| `Wrench` | Handwerk, Sanierung |
| `Lightning` | Elektro, Strom |
