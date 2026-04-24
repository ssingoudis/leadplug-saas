# Current Feature

Funnel Widget Platform – generischer Multi-Tenant iFrame Sales-Funnel für Handwerksbetriebe aller Branchen.

## Status

In Arbeit – Umbau von Solar-only auf generische Platform mit Supabase als primärer Config-Quelle.

## Ziele

- Generischer Funnel (branchenunabhängig): Solar, Wärmepumpe, Heizung, Sanitär, Elektro, …
- Supabase als primäre Konfigurationsquelle (Tenants, Fragen, Optionen)
- JSON-Dateien als Notfall-Fallback erhalten
- Vereinfachter E-Mail-Flow: 2 Mails, kein PDF, keine Preisschätzung
- Honeypot-Spam-Schutz
- postMessage Höhen-Kommunikation Widget → Parent-Frame
- Zwei Billing-Modelle: `per_lead` und `flat_monthly`

Architektur-Details: [`project-overview.md`](project-overview.md).

---

## Aufgaben

### Aufgabe 1 – Supabase Schema einrichten

**Problem:** Das aktuelle Schema ist solar-spezifisch und kennt keine `tenants`-, `funnel_questions`- oder `funnel_options`-Tabellen.

**Lösung:**
- Das neue Schema aus `context/supabase-schema.sql` im Supabase SQL-Editor ausführen
- Tabellen: `tenants`, `funnel_questions`, `funnel_options`, `submissions`
- View: `monthly_billing`

**Betroffene Dateien:** `context/supabase-schema.sql` (nur ausführen, nicht bearbeiten)

**Akzeptanzkriterien:**
- Alle 4 Tabellen + View in Supabase vorhanden
- Schema erneut ausführbar ohne Fehler (idempotent)

---

### Aufgabe 2 – Seed-Daten erstellen und einspielen

**Problem:** Ohne Testdaten in der DB kann kein Ende-zu-Ende-Test durchgeführt werden.

**Lösung:** Datei `context/supabase-seed.sql` erstellen mit:
- **Tenant 1 – Solar-Demo** (`slug: "demo"`, `industry: "solar"`, `billing_model: "per_lead"`, `lead_price_base: 3.00`, Solar-typische Fragen + Optionen mit `icon_key`)
- **Tenant 2 – Wärmepumpe-Demo** (`slug: "demo-waermepumpe"`, `industry: "waermepumpe"`, `billing_model: "flat_monthly"`, `flat_monthly_price: 20.00`, `flat_monthly_lead_limit: 10`, Wärmepumpen-typische Fragen)
- Seed-Daten idempotent gestalten (via `ON CONFLICT (slug) DO NOTHING` für Tenants; Questions/Options mit DELETE + INSERT um Slug)

**Betroffene Dateien:** `context/supabase-seed.sql` (neu erstellen)

**Akzeptanzkriterien:**
- Beide Demo-Tenants in Supabase mit je mindestens 3 Fragen
- Fragen haben unterschiedliche Optionszahlen (2, 3, 4) – damit Aufgabe 5 (Grid-Layout) testbar ist
- Seed erneut ausführbar ohne Fehler

---

### Aufgabe 3 – `getTenantConfig.ts` auf Supabase umstellen

**Problem:** `lib/getTenantConfig.ts` liest aktuell nur JSON-Dateien.

**Lösung:**
- Supabase zuerst: `tenants` JOIN `funnel_questions` JOIN `funnel_options` (sortiert nach `sort_order`)
- Bei DB-Fehler oder fehlendem Eintrag: JSON-Fallback `tenants/[slug].json`
- `is_active = false` → `null` → `notFound()` in `page.tsx`
- Konfigurierbare Texte mit Defaults befüllen wenn DB-Wert `NULL`:

| Feld | Default |
|---|---|
| `funnel_title` | `"Jetzt kostenloses Angebot anfordern"` |
| `submit_button_label` | `"Anfrage absenden"` |
| `success_message` | `"Vielen Dank! Wir melden uns in Kürze bei Ihnen."` |
| `response_time_text` | `"24 Stunden"` |
| `contact_form_subtitle` | `"Wer soll das Angebot erhalten?"` |
| `privacy_text` | `"Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden. Widerrufen geht jederzeit."` |
| `privacy_policy_url` | `"#"` |

**Betroffene Dateien:** `lib/getTenantConfig.ts`, `types/index.ts`

**Akzeptanzkriterien:**
- `localhost:3000/demo` lädt Config aus Supabase (Breakpoint/Log bestätigt)
- Bei `SUPABASE_URL=` leer → JSON-Fallback greift ohne Fehler
- TypeScript-Fehler: keine

---

### Aufgabe 4 – `types/index.ts` aktualisieren

**Problem:** `TenantConfig` enthält noch `PricingConfig` und `PriceEstimate` (werden entfernt). Neue Felder fehlen.

**Lösung:**
- `PricingConfig` Interface entfernen
- `PriceEstimate` Interface entfernen
- `TenantConfig` um neue Felder ergänzen: `industry`, `billingModel`, `leadPriceBase`, `flatMonthlyPrice`, `flatMonthlyLeadLimit`, alle konfigurierbaren Texte
- `FunnelConfig` Interface: konfigurierbare Texte ergänzen (oder in `TenantConfig` flach aufnehmen)

**Betroffene Dateien:** `types/index.ts`

**Akzeptanzkriterien:**
- Kein Import von `PricingConfig` oder `PriceEstimate` irgendwo im Projekt
- TypeScript-Fehler: keine

---

### Aufgabe 5 – `solar-funnel.tsx` → `funnel.tsx` (generisch)

**Problem:** `components/solar-funnel.tsx` ist solar-spezifisch: hardcoded Solar-Icons, hardcoded Texte ("Photovoltaik", "Angebotsvergleich starten"), hardcoded Fragen-Defaults.

**Lösung:**
- Datei umbenennen: `components/solar-funnel.tsx` → `components/funnel.tsx`
- Komponente umbenennen: `SolarFunnel` → `Funnel`
- Hardcoded Texte durch Props aus `TenantConfig` ersetzen (Submit-Label, Datenschutz-Text, Datenschutz-URL, Kontaktformular-Subtitle, Success-Message)
- Hardcoded Fragen-Defaults (`questionsConfig`) entfernen – Fragen kommen ausschließlich aus Props
- `defaultQuestions`-Export entfernen

**Icon-System:**
- Solar-Icons (`SolarSmall`, `SolarMedium`, `SolarLarge`, `SolarXL`) zu einem einzigen `SolarPanel`-Icon zusammenfassen
- Neue Icons hinzufügen: `Thermometer`, `Flame`, `HeatPump`, `Drop`, `Snowflake`, `Wrench`, `Lightning`, `Star`
- `icon_url`-Unterstützung: wenn Option `iconUrl` gesetzt → `<img src={iconUrl}>` statt SVG-Komponente

**Grid-Layout für variable Optionszahlen (wichtig für Generalisierung):**

Das Grid muss für 2, 3, 4 und 5 Optionen gut aussehen – ohne leere halbvolle Zeilen.

| Optionen | Layout-Regel |
|---|---|
| 2 | immer 1×2 (nebeneinander) |
| 3 | immer 1×3 (nebeneinander) |
| 4 | 2×2 → bei ≥ `@lg` 1×4 |
| 5 | 2+3 (erste Zeile 2, zweite Zeile 3) → bei ≥ `@lg` 1×5 |
| 6 | 2×3 → bei ≥ `@lg` 3×2 oder 1×6 |

Die reservierten `min-h`-Werte für den Grid-Container müssen pro Optionszahl und Breakpoint korrekt gesetzt werden, damit die Container-Höhe frageübergreifend stabil bleibt. Werte berechnen und als Lookup-Tabelle im Code ablegen.

**postMessage Höhe:**
- `useEffect` nach jedem `currentStep`-Wechsel und nach `isSubmitted`:
  ```js
  window.parent.postMessage({ type: 'funnel-resize', height: document.documentElement.scrollHeight }, '*')
  ```

**Betroffene Dateien:** `components/solar-funnel.tsx` (umbenennen), `components/TenantFunnelClient.tsx`, `app/[tenant]/page.tsx`, alle weiteren Importe

**Akzeptanzkriterien:**
- Kein Wort "Solar", "Photovoltaik", "Angebotsvergleich" hardcoded in der Komponente
- Solar-Demo (Aufgabe 2) zeigt korrekt an
- Wärmepumpen-Demo (Aufgabe 2) zeigt korrekt an
- Fragen mit 2, 3, 4 Optionen: kein leerer ungefüllter Grid-Platz sichtbar
- postMessage wird bei jedem Schritt gefeuert (in Browser-Konsole des Parent prüfbar)
- TypeScript-Fehler: keine

---

### Aufgabe 6 – API-Route aktualisieren

**Problem:** `app/api/submit/route.ts` generiert PDF, berechnet Preise und sendet 3 Mails.

**Lösung:**
- PDF-Generierung entfernen
- Preisberechnung entfernen
- Platform-Tracking-Mail entfernen (nur noch 2 Mails)
- `lead_price`: bei `billing_model = "per_lead"` → `tenantConfig.leadPriceBase`; bei `"flat_monthly"` → `0`
- `billing_model`-Snapshot in Submission speichern

**Honeypot-Logik (kritisch):**

Der Honeypot-Check ist der **allererste** Schritt. Bei positivem Befund wird die Funktion sofort mit `return NextResponse.json({success:true})` beendet – **bevor** irgendein anderer Code ausgeführt wird. Weder DB-Eintrag noch Mails.

```
if (payload.honeypot) {
  return NextResponse.json({ success: true })  // sofortiges Ende, nichts passiert
}
```

**Reihenfolge:**
1. **Honeypot-Check → sofortiges Return** (kein DB-Eintrag, keine Mail, kein Logging)
2. Payload-Shape-Check → 400
3. `getTenantConfig(slug)` → 404
4. `logSubmission()` (Supabase, mit `lead_price` + `billing_model`)
5. `sendAllEmails()` in try/catch → 2 Mails parallel

**Betroffene Dateien:** `app/api/submit/route.ts`

**Akzeptanzkriterien:**
- Formular normal absenden → Supabase-Eintrag vorhanden, 2 Mails empfangen
- Honeypot gefüllt → 200, **kein** DB-Eintrag, **keine** Mail an Endkunde, **keine** Mail an Betreiber
- Kein Import von `generatePDF` oder `priceCalculator`

---

### Aufgabe 7 – E-Mail-Templates aktualisieren

**Problem:** 3 Mails statt 2, `CustomerConfirmation` enthält Preis, `TenantLeadNotification` referenziert Preis-Felder.

**Lösung:**
- `emails/PlatformTracking.tsx` löschen
- `emails/CustomerConfirmation.tsx`: Preis-Block und PDF entfernen; Danke-Text + `response_time_text` anzeigen
- `emails/TenantLeadNotification.tsx`: `price_min`/`price_max`-Felder entfernen; Kontaktdaten + Antworten-Tabelle behalten
- `lib/sendEmails.ts`: nur noch 2 Mails via `Promise.all`

**Betroffene Dateien:** `emails/PlatformTracking.tsx` (löschen), `emails/CustomerConfirmation.tsx`, `emails/TenantLeadNotification.tsx`, `lib/sendEmails.ts`

**Akzeptanzkriterien:**
- `sendEmails.ts` ruft nur noch 2 Mails auf
- Kunden-Mail enthält kein Preis-Feld
- Kein Import von `PlatformTracking` irgendwo

---

### Aufgabe 8 – Deprecated Files entfernen und Build prüfen

**Problem:** Nach den vorherigen Aufgaben gibt es tote Code-Dateien.

**Lösung:**
- Vor dem Löschen: grep-Suche nach Importen der jeweiligen Datei
- Dann löschen: `lib/generatePDF.ts`, `lib/priceCalculator.ts`, `emails/PlatformTracking.tsx`
- `npm run build` oder `tsc --noEmit` ausführen und alle Fehler beheben

**Betroffene Dateien:** s.o.

**Akzeptanzkriterien:**
- `tsc --noEmit` → 0 Fehler
- `npm run build` → erfolgreich

---

## Notes

### Font-System

Kuratierter Font-Enum: `FunnelFont = "system" | "inter" | "poppins" | "roboto"`. Self-hosted unter `public/fonts/` (DSGVO-konform). Neuen Font: `.woff2` in `public/fonts/<name>/`, `@font-face` in `app/globals.css`, Key in `FunnelFont` und `FONT_STACKS` in `funnel.tsx`.

### Billing-Logik

- `per_lead`: `lead_price` = `tenants.lead_price_base` pro Submission
- `flat_monthly`: `lead_price` = `0` pro Submission; Abrechnung = `flat_monthly_price` pauschal/Monat; Leads über `flat_monthly_lead_limit` erscheinen als `overage_leads` in der View (automatische Overage-Berechnung ist spätere Erweiterung)

### Supabase Free Tier

Pausiert nach Inaktivität (~10 Min Cold Start). Für Produktiv-Einsatz auf Pro upgraden oder Keep-Alive einrichten.

---

## History

Ältere Einträge: [`history-archive.md`](history-archive.md).

- **Aufgabe 7 – E-Mail-Templates bereinigt** – `emails/PlatformTracking.tsx` gelöscht (keine Imports mehr vorhanden). Templates und `sendEmails.ts` wurden bereits in Aufgabe 6 auf das neue Interface umgestellt. Alle Kriterien: kein Preis-Feld in Kunden-Mail, kein PlatformTracking-Import, tsc 0 Fehler. (`emails/PlatformTracking.tsx`)
- **Aufgabe 6 – API-Route aktualisiert** – `route.ts` komplett neu: Reihenfolge Honeypot-Check (sofortiges 200, kein DB/Mail) → Payload-Shape-Check → `getTenantConfig` → `logSubmission` → `sendAllEmails`. `lead_price` wird server-side aus `tenantConfig.billingModel` abgeleitet (`per_lead` → `leadPriceBase`, `flat_monthly` → 0). `logSubmission` auf neues Schema umgestellt (`lead_price`, `billing_model`, `contact_salutation`; `estimate`/`price_min`/`price_max` entfernt). `sendAllEmails` auf 2 Mails reduziert (kein PDF, kein PlatformTracking). E-Mail-Templates `CustomerConfirmation` + `TenantLeadNotification` bereinigt: `estimate` entfernt, Texte aus `tenantConfig.funnel`. Honeypot-Feld im Funnel-Formular + `SubmitPayload`-Typ. (`app/api/submit/route.ts`, `lib/tracking.ts`, `lib/sendEmails.ts`, `emails/CustomerConfirmation.tsx`, `emails/TenantLeadNotification.tsx`, `types/index.ts`, `components/funnel.tsx`, `components/TenantFunnelClient.tsx`)
- **Aufgabe 5 – funnel.tsx generisch** – `solar-funnel.tsx` → `funnel.tsx` (git mv), Komponente `SolarFunnel` → `Funnel`. Hardcoded Texte (Kontaktformular-h1, Subtitle, Privacy-Text+URL, Submit-Label, Success-Message) kommen jetzt aus `funnel`-Prop (`FunnelConfig`). `questionsConfig` + `defaultQuestions`-Export entfernt – Fragen ausschließlich aus Props. Icon-Library: Solar-Varianten → ein `SolarPanel`; neu: `Thermometer`, `Flame`, `HeatPump`, `Drop`, `Snowflake`, `Wrench`, `Lightning`, `Star`. `renderIcon` rendert bei gesetztem `iconUrl` ein `<img>`. Grid generisch für 2/3/4/5/6 Optionen via `getOptionsGridClasses` + col-span-Trick für 5er-Layout (2+3); `getOptionsMinHeightClasses` hält Container-Höhe stabil. `useEffect` postet nach jedem `currentStep`/`isSubmitted`-Wechsel `{type:'funnel-resize', height}` an Parent. (`components/funnel.tsx`, `components/TenantFunnelClient.tsx`, `public/fonts/README.md`)
- **Neues Design** – Option-Cards mit fixer Höhe (`h-32 @md:h-36`) und vertikal zentriertem Inhalt; Container-Queries statt Viewport-Breakpoints; reservierte Grid-Höhen halten Container frageübergreifend stabil; `pageBackgroundColor` trennt iFrame-Hintergrund von Card-Hintergrund. (`components/solar-funnel.tsx`, `app/[tenant]/page.tsx`, `app/layout.tsx`, `app/globals.css`, `types/index.ts`, `tenants/_template.json`)
- **Aufgabe 2 – Seed-Daten** – `context/supabase-seed.sql` erstellt: 2 Demo-Tenants (Solar per_lead/3€, Wärmepumpe flat_monthly/20€ mit 10-Lead-Limit), je 3 Fragen mit 4/3/2 Optionen (testet alle Grid-Layouts), idempotent via ON CONFLICT + DELETE+INSERT. (`context/supabase-seed.sql`)
- **Aufgabe 4 – types/index.ts Cleanup** – `PricingConfig`, `BillingConfig`, `PriceEstimate` entfernt; `pricing?`/`billing?` aus `TenantConfig` entfernt. Deprecated Dateien (priceCalculator, generatePDF, tracking, sendEmails, emails) definieren lokale Typen bis Aufgabe 7/8. (`types/index.ts`, `lib/priceCalculator.ts`, `lib/generatePDF.ts`, `lib/tracking.ts`, `lib/sendEmails.ts`, `emails/CustomerConfirmation.tsx`, `emails/TenantLeadNotification.tsx`, `app/api/submit/route.ts`, `lib/getTenantConfig.ts`)
- **Aufgabe 3 – getTenantConfig auf Supabase** – Supabase als Primärquelle (tenants + funnel_questions + funnel_options per maybeSingle), JSON-Fallback bei DB-Fehler oder fehlendem Eintrag, is_active=false → 404 ohne Fallback, alle konfigurierbaren Texte mit Defaults. `types/index.ts` um `industry`, `billingModel`, `leadPriceBase`, `flatMonthlyPrice?`, `flatMonthlyLeadLimit?`, `responseTimeText`, `contactFormSubtitle`, `privacyText`, `iconUrl?` ergänzt; deprecated Felder bleiben bis Aufgabe 4. (`lib/getTenantConfig.ts`, `types/index.ts`, `app/api/submit/route.ts`)
