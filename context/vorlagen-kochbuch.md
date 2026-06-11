# Vorlagen-Kochbuch — Funnel-Templates bauen wie in Aufgabe 61/62

> **Zweck:** Reproduzierbare Anleitung, wie die LeadPlug-Funnel-Vorlagen entstanden sind
> und wie die nächsten gebaut werden. **Ziel: 25 Vorlagen** (Stand 2026-06-11: **9 live**).
> Qualitätsanspruch (Stavros): **keine Troll-Vorlagen** — nur fundierte Funnel-Typen, die es
> so konkret in der Realität gibt und die ein Tenant out-of-the-box verkaufen/einsetzen könnte.
> **In-depth Web-Recherche ist pro Branche Pflicht, bevor gebaut wird.**

---

## 0. Was bereits existiert (NICHT doppelt bauen)

| Template-Slug | Demo-Funnel | Kategorie | Besonderheit |
|---|---|---|---|
| `solar` | `demo-solar` | Energie | Mieter-Logik, Slider kWh, Antworten-Übersicht an |
| `waermepumpe` | `demo-waermepumpe` | Energie | Checkbox-Frage (Förder-Check), Mieter-Logik |
| `immobilienbewertung` | `demo-immobilien` | Immobilien | 2 Regeln (Grundstück-Skip, `neq` Verkaufsanlass), Number m², Dropdown |
| `baufinanzierung` | `demo-baufinanzierung` | Finanzen | Number €, Slider €, Objektsuche-Skip |
| `pkv` | `demo-pkv` | Finanzen | **numerische `gte`-Regel** (Alter ≥ 55) + Studenten-Regel |
| `anwalt-arbeitsrecht` | `demo-anwalt` | Recht | Long-Text-Fallbeschreibung, 2 Regeln auf Step 1 |
| `coaching` | `demo-coaching` | Coaching | **Scale 0–10 + Statement-Step**, `gte`-Fast-Track, per Du |
| `recruiting-handwerk` | `demo-recruiting` | Recruiting | Date-Feld, 2 Regeln auf einem Step, per Du, Tel Pflicht |
| `autoankauf` | `demo-autoankauf` | Auto | `lte`-Regel (Erstzulassung), Unfall-Regel, Dropdown Marke |

Dazu: `agenturen` = Dogfood-Akquise-Funnel für LeadPlug selbst (per Du, **kein Template**).
Alle leben in Stavros' Konto, `tenant_id = 'f64b2227-2fbb-4746-83fa-9d71bf8af26f'`,
`notification_email = 'stavrossingoudis@gmail.com'`.

> ⚠️ **Demo-Funnels verschicken KEINE Mails (Stavros-Entscheid 2026-06-11).**
> Die Vorlagen-Vorschau lädt die Demo-Funnels live — Submits dort sind ECHT
> (Leads landen gewollt in Stavros' Posteingang; `?preview=1` unterdrückt nur den
> Aufruf-Zähler). Damit Vorschau-Spieler aber keine Mails von fiktiven Firmen
> bekommen, sind die `email_subscriptions` aller `demo-*`-Funnels auf
> `is_active = false` gesetzt. **Beim Verwenden einer Vorlage müssen die Mails
> dagegen AKTIV ankommen** — die Snapshots tragen sie aktiv (entkoppelt).
> Ausnahme: `agenturen` (Dogfood) behält aktive Mails — echte Akquise.

---

## 1. Prozess in 6 Schritten

### Schritt 1 — Recherche (Pflicht, pro Branche)

WebSearch-Strategien, die in Runde 1+2 funktioniert haben:
- `"<Branche> Leads kaufen Preis pro Lead"` → existiert ein Lead-Markt? Preise = Nachfrage-Signal (Solar 20–120 €, Wärmepumpe 50–120 €, Immobilien ab 25 €).
- `"<Branche> Funnel typische Fragen Schritte Vorqualifizierung"` → welche Fragen stellt die Branche real? (z. B. Solar: Eigentümer/Dachform/Verbrauch/PLZ).
- Template-Galerien der Konkurrenz als Nachfrage-Signal: **Perspective** (DACH-Marktführer Mobile-Funnels; Flaggschiffe: Recruiting, Immobilien), **Funnelcockpit**, Aroundhome/DAA (klassische Lead-Portale = welche Gewerke werden vermittelt).
- Pro Branche klären: Wer kauft die Leads (Zielkunde des Tenants)? Welche Qualifizierungs-Kriterien trennen gute von schlechten Leads (→ daraus werden die Fragen UND die Logik-Regeln)?

**Troll-Filter:** Eine Vorlage ist nur zulässig, wenn (a) es real Agenturen/Portale gibt, die genau diesen Funnel-Typ betreiben, (b) die Fragen fachlich korrekt sind, (c) keine erfundenen Fakten in den Texten stehen (Vorsicht bei Förderquoten, Fristen, Versicherungsgrenzen — lieber generisch formulieren: „bis zu 70 % Zuschuss" nur wenn belegbar, „3-Wochen-Frist" beim Arbeitsrecht ist belegt, konkrete €-Grenzen vermeiden).

### Schritt 2 — Funnel-Design (Regeln aus Runde 1+2)

- **Struktur:** Welcome → 4–6 Qualifizierungs-Fragen → Kontaktdaten-Karte → Success. Reihenfolge: leichte Fragen zuerst, Kontakt IMMER zuletzt.
- **Welcome:** Nutzenversprechen + Zeitangabe + Unverbindlichkeits-Signal („6 kurze Fragen … kostenlos und unverbindlich"), Button mit Pfeil („Jetzt prüfen →").
- **Anrede:** Endkunden-Funnels = **„Sie"** (Wording-Styleguide-Default). Ausnahmen mit Branchen-Norm per Du: Recruiting/Bewerber, Coaching/Info-Marketing. Jede Du-Entscheidung im Doku-Eintrag begründen.
- **Alle Texte nach [`wording-styleguide.md`](wording-styleguide.md)** (sachlich, keine Ausrufezeichen-Inflation, „Anfrage" für die Endkunden-Aktion).
- **Logik:** Jede Vorlage bekommt mind. 1 fachlich sinnvolle Regel (Skip / Fast-Track / Sonderfall-zur-Kontaktkarte). NUR Vorwärts-Sprünge. Ops: `eq|neq` (alle), `contains` (Freitext), `includes` (multi_choice), `gt|gte|lt|lte` (Slider/Zahl/Rating/Skala). Bewährte Muster: „Mieter → direkt Kontakt", „Alter ≥ X → persönliche Beratung", „kein Objekt → Zahlen-Fragen überspringen".
- **Feldtypen:** realistisch einsetzen, nicht zwanghaft — aber die Bandbreite über das Gesamt-Portfolio streuen (alle 9 Typen + rating/scale/statement/checkbox + Kontakt-Typen sind bereits abgedeckt; Wiederholung ist ok).
- **Kontakt-Karte:** Feldtypen `full_name`/`email`/`tel`/`plz` benutzen (NICHT short_text!) — nur diese mappt `deriveContactFromAnswers` auf die Lead-Kontaktdaten. Telefon Pflicht bei Branchen mit Telefon-Vertrieb (Solar, Baufi, Auto), optional bei E-Mail-Lastigem (Coaching). PLZ wo regional vermittelt wird.
- **Theme pro Vorlage:** eigene `primary_color` (Brand-Gefühl der Branche, keine Dopplung mit §0-Tabelle: vergeben sind #f97316, #0d9488, #1d4ed8, #047857, #4f46e5, #b45309, #7c3aed, #dc2626, #0891b2, #22c55e), Font aus `system|inter|poppins|roboto`, Radius `0.5rem|0.75rem`, `title_alignment` left/center mischen. Fiktiver, glaubwürdiger Brand-Name (z. B. „Sonnkraft Solar").
- **2 Drip-Mails pro Funnel:** (1) `tenant`-Benachrichtigung mit Kontakt-Chips + `answers_overview`, (2) `customer`-Bestätigung in der Funnel-Anrede mit 24h-Versprechen. `show_answers_overview = true` bei beratungsartigen Funnels.

### Schritt 3 — Anlage per SQL (DO-Block-Muster)

Pro Funnel **ein** `mcp__supabase__execute_sql`-Call mit einem `DO $do$`-Block (implizit atomar).
**DB-Writes brauchen Stavros' Go** — das Muster ist freigegeben, neue Chargen kurz ankündigen.

```sql
DO $do$
DECLARE
  v_tenant uuid := 'f64b2227-2fbb-4746-83fa-9d71bf8af26f';
  v_funnel uuid;
  p_welcome uuid := gen_random_uuid();
  p_frage1  uuid := gen_random_uuid();
  -- … eine Variable pro Page …
  p_kontakt uuid := gen_random_uuid();
  p_success uuid := gen_random_uuid();
BEGIN
  INSERT INTO funnels (slug, tenant_id, funnel_name, contact_form_title, success_message,
    response_message, contact_form_subtitle, privacy_policy_url, privacy_text,
    answers_overview_label, show_answers_overview, show_progress_bar, show_step_badge,
    title_alignment, notification_email, email_sender_local, primary_color, text_color,
    background_color, page_background_color, font, border_radius, max_width, is_active, redirect_url)
  VALUES ('demo-<branche>', v_tenant, 'Demo — <Branche> (<Brand>)', '<Widget-Titel>',
    'Vielen Dank für Ihre Anfrage!', '<Was passiert als Nächstes — 24h-Versprechen>',
    '<Kontakt-Untertitel>', '', 'Mit dem Absenden stimme ich zu, per E-Mail und Telefon zu meiner Anfrage kontaktiert zu werden.',
    'Ihre Angaben im Überblick:', true, true, true, 'left',
    'stavrossingoudis@gmail.com', '<brand-slug>', '#xxxxxx', '#1f2937', '#ffffff',
    'transparent', 'inter', '0.75rem', '720px', true, NULL)
  RETURNING id INTO v_funnel;

  INSERT INTO pages (id, funnel_id, page_type, sort_order, config) VALUES
    (p_welcome, v_funnel, 'welcome', 0, jsonb_build_object('title','…','subtitle','…',
      'page_key','welcome_<kurz>','button_label','… →','visible',true)),
    (p_frage1, v_funnel, 'question', 1, '{}'::jsonb),
    -- … Fragen: config IMMER '{}' …
    (p_kontakt, v_funnel, 'custom', N, jsonb_build_object('title','Wohin dürfen wir … senden?',
      'subtitle','…','page_key','kontakt_<kurz>','visible',true)),
    (p_success, v_funnel, 'success', N+1, '{}'::jsonb);

  INSERT INTO fields (page_id, field_key, field_type, label, subtitle, placeholder,
                      visible, required, sort_order, options, config) VALUES
    -- Frage-Felder: 1 Field pro question-Page, sort_order 0. Shapes siehe §2-Referenz.
    (p_frage1, '<key>', 'single_choice', '<Frage>', NULL, NULL, true, true, 0,
      '[{"label":"…","value":"<slug>","sort_order":0}, …]'::jsonb, '{}'::jsonb),
    -- Kontakt-Felder: mehrere Fields auf der custom-Page, sort_order 0..n
    (p_kontakt, 'name',    'full_name', 'Name',    NULL, '', true, true,  0, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'email',   'email',     'E-Mail',  NULL, '', true, true,  1, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'telefon', 'tel',       'Telefon', NULL, '', true, true,  2, '[]'::jsonb, '{}'::jsonb),
    (p_kontakt, 'plz',     'plz', 'Postleitzahl',  NULL, '12345', true, true, 3, '[]'::jsonb, '{}'::jsonb);

  INSERT INTO funnel_logic_rules (funnel_id, tenant_id, source_page_id, sort_order,
                                  is_fallback, conditions, target_type, target_page_id) VALUES
    (v_funnel, v_tenant, p_frage1, 0, false,
     '[{"field_key":"<key>","op":"eq","value":"<option-value>"}]'::jsonb, 'page', p_kontakt);
    -- Ziel MUSS höheren sort_order haben als Quelle! Kein Fallback-Row nötig (Default = weiter).

  INSERT INTO email_subscriptions (funnel_id, tenant_id, name, recipient_type,
                                   delay_minutes, subject, body_html, is_active) VALUES
    (v_funnel, v_tenant, 'Lead-Benachrichtigung', 'tenant', 0,
     '<p>Neuer <Branche>-Lead: <span data-variable="contact.name">{{contact.name}}</span></p>',
     '<p><strong>Neuer Lead über den <Branche>-Funnel!</strong></p><p>Name: <span data-variable="contact.name">{{contact.name}}</span><br>E-Mail: <span data-variable="contact.email">{{contact.email}}</span><br>Telefon: <span data-variable="contact.telefon">{{contact.telefon}}</span></p><div section="answers_overview" data-magic-section="answers_overview"></div>', true),
    (v_funnel, v_tenant, 'Bestätigung an den Lead', 'customer', 0,
     '<p><Betreff in Funnel-Anrede></p>',
     '<p>Guten Tag <span data-variable="contact.name">{{contact.name}}</span>,</p><p>vielen Dank für Ihre Anfrage! …24h-Versprechen…</p><div section="answers_overview" data-magic-section="answers_overview"></div><p>Freundliche Grüße<br>Ihr Team von <Brand></p>', true);
END $do$;
```

### Schritt 4 — Verifikation (Pflicht, nach jeder Charge)

```sql
-- Struktur-Counts:
SELECT f.slug,
  (SELECT count(*) FROM pages p WHERE p.funnel_id=f.id) AS pages,
  (SELECT count(*) FROM fields fl JOIN pages p ON p.id=fl.page_id WHERE p.funnel_id=f.id) AS fields,
  (SELECT count(*) FROM funnel_logic_rules r WHERE r.funnel_id=f.id) AS rules,
  (SELECT count(*) FROM email_subscriptions e WHERE e.funnel_id=f.id) AS emails
FROM funnels f WHERE f.slug IN ('demo-…') ORDER BY f.created_at;

-- Alle Logik-Sprünge vorwärts?
SELECT f.slug, src.sort_order AS s, tgt.sort_order AS t, (src.sort_order < tgt.sort_order) AS forward
FROM funnel_logic_rules r JOIN funnels f ON f.id=r.funnel_id
JOIN pages src ON src.id=r.source_page_id LEFT JOIN pages tgt ON tgt.id=r.target_page_id
WHERE f.slug IN ('demo-…');
```
Plus pro Funnel ein WebFetch auf `https://app.leadplug.de/<slug>` (SSR lädt = getTenantConfig ok).

### Schritt 5 — Als Vorlage veröffentlichen

```sql
SELECT snapshot_funnel_to_template(
  'demo-<branche>',        -- Quelle (Demo-Funnel-Slug)
  '<template-slug>',       -- öffentlicher Vorlagen-Slug (ohne demo-Präfix)
  '<Anzeigename>',         -- Galerie-Titel
  '<1-Zeilen-Pitch: was qualifiziert der Funnel, welche Mechanik>',  -- Beschreibung
  '<Kategorie>',           -- bestehende: Energie · Immobilien · Finanzen · Recht · Coaching · Recruiting · Auto (neue sparsam ergänzen + Icon-Map in TemplateShowcase.tsx erweitern!)
  <sort_order>             -- 10er-Schritte; bestehende enden bei 90 → weiter mit 100, 110, …
);
```
Upsert: nach Demo-Polish einfach erneut aufrufen (Republish). Die Snapshot-Funktion ist Owner-only
(EXECUTE für authenticated revoked) — Aufruf via MCP/Service. Neue Kategorie ⇒ in
[`TemplateShowcase.tsx`](../components/dashboard/TemplateShowcase.tsx) `CATEGORY_ICONS` ein lucide-Icon ergänzen (Fallback: Sparkles).

**Schritt 5b — Demo-Mails deaktivieren (Pflicht, NACH dem Veröffentlichen):**
```sql
UPDATE email_subscriptions e SET is_active = false
FROM funnels f
WHERE f.id = e.funnel_id AND f.slug = 'demo-<branche>';
```
Reihenfolge ist wichtig: **erst snapshotten (Mails aktiv) → dann deaktivieren.**

> ⚠️ **Republish-Falle:** `snapshot_funnel_to_template` kopiert `e.is_active` mit in die
> Definition. Ein Republish NACH der Deaktivierung würde die Vorlage mit inaktiven Mails
> ausliefern — Kunden bekämen dann keine Drip-Mails! Vor jedem Republish die Demo-Mails
> kurz auf `is_active = true` setzen, snapshotten, wieder deaktivieren.
> **Geplante Härtung (offen, Stand 2026-06-11):** `snapshot_funnel_to_template` so ändern,
> dass Mails in der Definition IMMER als `is_active: true` publiziert werden — dann entfällt
> das manuelle Hin-und-her. (Umsetzung war durch MCP-Ausfall blockiert; wer das liest und
> die Funktion noch unverändert vorfindet: kleine CREATE-OR-REPLACE-Migration nachholen.)

### Schritt 6 — Doku

Eintrag in [`current-feature.md`](current-feature.md) (Tabelle erweitern: Slug · Brand · Inhalt/Showcase · Logik · Theme) + Memory-Update (Restplan: Zähler X/25).

---

## 2. Technische Referenz (Datenshapes — exakt einhalten!)

**Erste Anlaufstelle für „wo ist was":** [`architecture.md`](architecture.md). Mapping-Wahrheit: [`lib/editorUtils.ts`](../lib/editorUtils.ts).

### pages.config nach page_type
| page_type | config |
|---|---|
| `welcome` | `{title, subtitle, page_key, button_label, visible}` |
| `question` | `{}` (immer leer — Inhalt lebt im Field) |
| `custom` (Kontakt-Karte) | `{title, subtitle, page_key, visible}` |
| `success` | `{}` (leerer Marker, immer letzte Page) |

### fields pro field_type (Frage-Pages: genau 1 Field, sort_order 0)
| field_type | options | config |
|---|---|---|
| `single_choice` / `multi_choice` / `dropdown` | `[{"label","value","sort_order"}]` — value = sprechender Slug (`toKey`-Stil: lowercase, Umlaute ae/oe/ue, `_`) | `{}` |
| `slider` | `[]` | `{"min","max","step","default","unit"}` |
| `number` | `[]` | `{"min","max","step","required", "unit"?}` |
| `date` | `[]` | `{"required"}` (min/max optional als ISO-String) |
| `short_text` / `long_text` | `[]` | `{"placeholder"?, "maxLength"?, "required"}` + placeholder AUCH als Spalte |
| `rating` | `[]` | `{"maxStars","required"}` |
| `scale` | `[]` | `{"min","max","labelLeft","labelRight","required"}` |
| `statement` | `[]` | `{}` (Titel = label, kein Input) |
| `checkbox` | `[]` | `{"label":"<Checkbox-Text>","required"}` |
| Kontakt: `full_name`/`email`/`tel`/`plz` | `[]` | `{}` (required über Spalte) |
| Kontakt: `radio` (selten) | **Plain-String-Array** `["Option 1","Option 2"]` (≠ Frage-Options!) | `{}` |

`field_key`: `^[a-z][a-z0-9_]{0,63}$`, eindeutig pro Funnel (Fragen) bzw. pro Page (Kontakt-Karte).

### funnel_logic_rules
`conditions` = `[{"field_key","op","value"}]` (UND-verknüpft; mehrere Regeln = ODER, erste gewinnt).
`target_type` `'page'|'end'`; bei page: `target_page_id` MUSS später (höherer sort_order) liegen.
Choice-Vergleiche gegen den **value-Slug** der Option, numerische Ops gegen Zahl-Strings (`"55"`).
Kein Fallback-Row anlegen (Default „weiter"); `is_fallback=true` nur mit `conditions: []`.

### email_subscriptions
`recipient_type` `'tenant'` (→ notification_email) oder `'customer'` (→ Lead-E-Mail). Variablen-Chips:
`<span data-variable="contact.name">{{contact.name}}</span>` (name/email/telefon; auch `answer.<field_key>`).
Magic-Section: `<div section="answers_overview" data-magic-section="answers_overview"></div>`.
Betreff darf Chips enthalten (wird gerendert + gestrippt). `delay_minutes 0` = sofort.

### funnels-Spalten (Auswahl)
Fonts: `system|inter|poppins|roboto`. `border_radius`: `0.5rem|0.75rem`. `title_alignment`: `left|center`.
`max_width '720px'`. Slug: `^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$`, Konvention `demo-<branche>`, UNIQUE, nach Anlage unveränderlich.

---

## 3. Kandidaten für die nächsten 16 (Recherche-informiert — final erst NACH eigener Recherche)

Diese Liste stammt aus den Recherchen vom 2026-06-11 (Lead-Portale wie Aroundhome/DAA, Perspective-Use-Cases, Lead-Preis-Märkte). Der nächste Chat verifiziert jede Branche per WebSearch (Schritt 1) und wählt 16:

**Handwerk/Haus (Aroundhome-Klassiker, starke Lead-Märkte):** Badsanierung · Fenster & Türen · Dachsanierung · Küchenplanung · Treppenlift (sehr hohe Lead-Preise, Senioren-Zielgruppe) · Garten-/Landschaftsbau · Umzugsfirma (Umzugsanfragen-Portale).
**Gesundheit (große Paid-Lead-Märkte):** Zahnimplantate/Invisalign · Haartransplantation · Hörgeräte-Beratung.
**Pflege:** Pflege-Recruiting (Pflegekräfte, per Du, Perspective-Klassiker) · Pflegegrad-/24h-Betreuungs-Beratung (Sie, Angehörige).
**Finanzen/Versicherung:** Berufsunfähigkeitsversicherung (BU, klassischer Makler-Lead) · KFZ-Versicherungswechsel (saisonal Nov.).
**Beratung/Dienstleistung:** Steuerberater-Mandantenanfrage · MPU-Beratung (hohe Zahlungsbereitschaft) · Nachhilfe-Institut (Probestunde) · Webdesign-/Marketing-Agentur-Erstgespräch · Fitness/Personal-Training (Probetraining, per Du) · Scheidungs-/Familienrecht-Erstberatung.

Pro Kandidat in der Recherche klären: Lead-Preis/Markt-Beleg, 4–6 fachlich korrekte Qualifizierungs-Fragen, 1–2 sinnvolle Logik-Regeln, Anrede.

---

## 4. Checkliste pro Vorlage (vor dem Veröffentlichen)

- [ ] Web-Recherche belegt: Funnel-Typ existiert real, Lead-Markt vorhanden
- [ ] 5–8 Steps: Welcome → Fragen (leicht→konkret) → Kontakt → Success
- [ ] Anrede korrekt (Sie-Default; Du nur mit Branchen-Norm-Begründung)
- [ ] Mind. 1 fachlich sinnvolle Logik-Regel, alle Ziele vorwärts
- [ ] Kontakt-Karte nutzt `full_name`/`email`/`tel`/`plz` (Lead-Mapping!)
- [ ] Keine erfundenen Fakten/Zahlen in den Texten
- [ ] Eigenes Theme (Farbe ohne Dopplung, glaubwürdiger Brand-Name)
- [ ] 2 Drip-Mails (tenant + customer, Chips + answers_overview)
- [ ] Verifikation: Counts + Forward-Check + Live-URL lädt
- [ ] `snapshot_funnel_to_template` mit Kategorie + fortlaufendem sort_order
- [ ] **NACH dem Veröffentlichen: Demo-Mails deaktivieren** (Schritt 5b — Vorschau darf keine Mails verschicken)
- [ ] Doku-Eintrag current-feature.md + Memory-Zähler

**Harte Regeln aus CLAUDE.md:** `components/funnel.tsx` NIE anfassen · DB-Writes mit User-Go ·
kein Branch nötig für reine DB-Daten/Doku (Code-Änderungen schon) · nichts committen ohne explizite Aufforderung.
