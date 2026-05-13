# Funnel-Konfigurationsreferenz

---

## Tenant (einmalig pro Kunde)

| Feld | Pflicht | Beschreibung |
|---|:---:|---|
| `company_name` | ✅ | Firmenname |
| `public_email` | ✅ | Öffentliche E-Mail – wird dem Anfragenden angezeigt |
| `notification_email` | ✅ | Interne Adresse – hierhin gehen die Lead-Benachrichtigungen, nie sichtbar für den Anfragenden |
| `public_phone` | ☐ | Telefonnummer (öffentlich) |
| `address` | ☐ | Adresse |
| `website` | ☐ | Website-URL |

---

## Funnel

### Pflicht
| Feld | Beschreibung |
|---|---|
| `primary_color` | Primärfarbe als Hex-Code, z.B. `#4648d4` |
| `privacy_policy_url` | URL der Datenschutzseite des Kunden |
| Fragen | Mindestens eine Frage (siehe Abschnitt Fragen) |

### Texte (optional – alle haben Defaults)
| Feld | Default |
|---|---|
| `funnel_title` | `"Jetzt kostenloses Angebot anfordern"` |
| `submit_button_label` | `"Anfrage absenden"` |
| `success_message` | `"Vielen Dank! Wir melden uns in Kürze."` |
| `response_time_text` | `"24 Stunden"` |
| `contact_form_subtitle` | `"Wer soll das Angebot erhalten?"` |
| `email_sender_local` | Lokaler Teil der Absender-E-Mail, z.B. `info` → ergibt `info@anfragebestaetigung.de`. **Nur den Teil vor dem @** eintragen. |

### Style (optional – alle haben Defaults)
| Feld | Default |
|---|---|
| `text_color` | Abgeleitet von Primärfarbe |
| `background_color` | Weiß |
| `page_background_color` | Transparent |
| `font` | System-Font |
| `border_radius` | `0.5rem` |
| `max_width` | `720px` |

---

## Fragen (`funnel_questions`)

### Pro Frage
| Feld | Pflicht | Beschreibung |
|---|:---:|---|
| `title` | ✅ | Fragetext |
| `question_type` | ✅ | Siehe Typen unten |
| `sort_order` | ✅ | Reihenfolge (0, 1, 2, …) |
| `options` | ☐ | Antwortoptionen (bei Choice-Typen) |
| `visible` | ☐ | Standard: `true` |
| `config` | ☐ | Typ-spezifische Einstellungen (siehe unten) |

### Fragetypen
| `question_type` | Beschreibung |
|---|---|
| `single_choice` | Eine Antwort wählbar – geht automatisch weiter |
| `multiple_choice` | Mehrere Antworten wählbar – mit Weiter-Button |
| `short_text` | Einzeiliges Textfeld |
| `long_text` | Mehrzeiliges Textfeld |
| `slider` | Schieberegler mit Zahlenwert |

### Optionen (für `single_choice` / `multiple_choice`)
```json
[
  { "label": "Einfamilienhaus", "value": "efh", "icon_key": "Home" },
  { "label": "Mehrfamilienhaus", "value": "mfh", "icon_key": "Building2" }
]
```
> `icon_key` = Lucide-Icon-Name (PascalCase). Alle verfügbaren Icons: `/icons`

### Config-Felder
**Text-Fragen** (`short_text` / `long_text`):
```json
{ "placeholder": "Bitte beschreiben Sie...", "required": false }
```
> `required: false` macht das Feld optional. Standard ist Pflicht.

**Slider** (`slider`):
```json
{ "min": 50, "max": 500, "step": 10, "unit": "m²", "default": 150 }
```
