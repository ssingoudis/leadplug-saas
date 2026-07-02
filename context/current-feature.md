# Current Feature

LeadPlug — SaaS-Funnel-Builder mit integriertem CRM für **Agenturen und Marketer**, die Funnels für ihre Endkunden bauen (branchen-offen). Multi-Tenant iFrame-Widget + Editor + Lead-Posteingang. Strategische Grundlagen siehe [`../CLAUDE.md`](../CLAUDE.md).

---

## Notes

### Font-System

Kuratierter Font-Enum: `FunnelFont = "system" | "inter" | "poppins" | "roboto"`. Self-hosted unter `public/fonts/` (DSGVO-konform). Neuen Font: `.woff2` in `public/fonts/<name>/`, `@font-face` in `app/globals.css`, Key in `FunnelFont` und `FONT_STACKS` in `funnel.tsx`.

### Billing-Logik

- `per_lead`: `lead_price` aus `tenants.lead_price` pro Submission
- `per_month`: `lead_price` = `0`; Pauschale in `tenants.billing_price`
- `per_year`: `lead_price` = `0`; Jahrespreis in `tenants.billing_price`
- `billing_model` ist PostgreSQL-Enum `billing_model_type`, Default `per_month`

### Tenant-Struktur (DB-Stand 2026-06-11)

3 Tenants, alle Funnels leben in Stavros' Konto (`f64b2227-…`), die 2 anderen Tenants sind leer (Signup-Tests):
- `leadplug` (Test-Funnel Stavros) + 2 Wegwerf-Tests (`mpqqqjcg`, `kwyliuev`)
- Demo-/Template-Funnels seit D.3 (10 Stück): `agenturen` (Dogfood-Akquise), `demo-solar`, `demo-immobilien`, `demo-recruiting`, `demo-waermepumpe`, `demo-baufinanzierung`, `demo-pkv`, `demo-anwalt`, `demo-coaching`, `demo-autoankauf`
- Die alten Demo-Funnels (`demo-solar` v1, `demo-waermepumpe`, …) + der `demo`-Tenant wurden zuvor gelöscht

---

## Aktueller Status (Stand: 2026-05-22)

**Alle 3 Phasen abgeschlossen.** Das Stripe Billing ist vollständig implementiert und in Vercel deployed — aktuell im **Test-Modus** (Stripe Sandbox, `sk_test_...`).

### Stripe-Setup in Vercel (Production-Umgebung)

Folgende Env-Vars sind in Vercel eingetragen:

| Variable | Inhalt |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_51...` (Test-Key — für Production durch `sk_live_...` ersetzen) |
| `STRIPE_PRICE_ID_STANDARD` | `price_1TZygpQ5RyuRWopIg2SVj4PD` (49€/Monat, Test-Produkt) |
| `STRIPE_PRICE_ID_TEST` | `price_1TZzEyQ5RyuRWopIGMR2h0B4` (1€/Monat, Sofortkündigung — nur dev/staging) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (Signing-Secret des Stripe Webhook-Endpoints) |

Webhook-Endpoint in Stripe (Test-Modus): `https://app.leadplug.de/api/stripe/webhook`
Lauscht auf: `customer.subscription.created`, `.updated`, `.deleted`

### Wechsel auf Production (Live-Betrieb)

Wenn echte Zahlungen aktiviert werden sollen:

1. **Stripe Dashboard → Live-Modus** (Toggle oben links von "Test" auf "Live")
2. Neues Live-Produkt + Price anlegen (49€/Monat)
3. In Vercel ersetzen:
   - `STRIPE_SECRET_KEY` → `sk_live_...` (oder Restricted Key `rk_live_...` empfohlen)
   - `STRIPE_PRICE_ID_STANDARD` → neue `price_live_...`-ID
   - `STRIPE_PRICE_ID_TEST` → **leer lassen** oder entfernen (Test-Kachel verschwindet dann automatisch)
4. Neuen Live-Webhook in Stripe anlegen: `https://app.leadplug.de/api/stripe/webhook`
5. `STRIPE_WEBHOOK_SECRET` → neues `whsec_live_...` aus dem Live-Endpoint
6. Redeploy in Vercel

> **Wichtig:** `STRIPE_PRICE_ID_TEST` nur in Test-/Staging-Umgebungen setzen. Wenn die Env-Var fehlt, wird die Test-Kachel auf der Billing-Seite automatisch ausgeblendet.

### Billing-Portal-Konfiguration

Portal-Config-ID: `bpc_1TZypEQ5RyuRWopI3iAIq9DL` (Test-Modus, `mode: 'immediately'` für sofortige Kündigung).
Für Production eine neue Portal-Config im Live-Modus anlegen.

---

## Stripe Billing — Erweiterungsanleitung

### Neuen Plan hinzufügen (z.B. "LeadPlug Pro")

1. **Stripe Dashboard:** Neues Product + Price anlegen (oder via MCP: `create_product` → `create_price`)
2. **`.env.local` + `.env.example`:** Neue Env-Var eintragen:
   ```
   STRIPE_PRICE_ID_PRO=price_xxxxx
   ```
3. **`lib/stripe.ts`:** Export ergänzen:
   ```ts
   export const STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO ?? ''
   ```
4. **`/api/stripe/checkout/route.ts`:** Request-Body um `plan`-Parameter erweitern und je nach Wert den richtigen Price wählen.
5. **`/dashboard/billing/BillingClient.tsx`:** Upgrade-Button für den neuen Plan ergänzen.
6. Kein DB-Schema-Change nötig — `stripe_price_id` speichert die aktive Price-ID als String.

### Webhook lokal testen

```bash
# Stripe CLI installieren: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Das CLI gibt einen whsec_... Key aus → in .env.local als STRIPE_WEBHOOK_SECRET eintragen
```

### Produktions-Webhook einrichten

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://deine-domain.de/api/stripe/webhook`
3. Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Signing Secret in Produktions-Env als `STRIPE_WEBHOOK_SECRET` eintragen

### Free-Status für Testkunden

Direkt in Supabase (Admin-Client oder SQL):
```sql
UPDATE tenants SET billing_model = 'free' WHERE slug = 'kunde-slug';
```
→ Kein Stripe-Check, voller Funktionsumfang, keine Abrechnung.

---

## Aufgabe 78 — Einbett-Feinschliff: Eigene Breite + Schatten-Schalter (2026-07-02)

**Status:** Branch `feature/aufgabe-78-einbett-feinschliff` (stacked auf 77), `tsc --noEmit` grün, E2E-verifiziert per Wegwerf-Funnel (Eigene Breite 640px + Schatten aus → Save → DB-Check → Live-Widget nahtlos → gelöscht). **Migration `20260702140000` (Spalte `show_shadow` + duplicate_funnel-Update) auf Prod angewendet** — diesmal VOR den Code-Änderungen, damit der laufende Dev-Server kein kaputtes Speichern-Fenster hat (Lehre aus 77). `funnel.tsx` mit Freigabe angefasst (Schatten/Padding-Konditional).

**Anlass:** Stavros-Fragen aus der Icon-Abnahme: individuelle Funnel-Breite + nahtloses Einbetten. Konsens: Schatten-Schalter + Hintergrund-Farbe-angleichen ersetzt „Karte transparent" für einfarbige Eltern-Seiten (die Farb-Mathematik rechnet dann korrekt weiter, Icon-Verdeckungs-Weiß deckt richtig ab); echtes Transparent (Verlauf/Bild-Untergründe) bewusst NICHT gebaut — on demand.

**Umsetzung:**
- **Eigene Breite:** `MaxWidthField` in [ThemePanel.tsx](../components/editor/ThemePanel.tsx) — Preset-Select + „Eigene Breite" mit Pixel-Eingabe (280–1920, Draft-State + Clamp on blur; „Eigene" klebt auch wenn der Wert zufällig einem Preset entspricht). **Keine Migration/Mapper-Änderung** — `max_width` ist eine freie text-Spalte, die Pipeline verdaut jeden CSS-Wert.
- **Schatten-Schalter:** `showShadow: boolean` durch die komplette Kette (FunnelConfig + EditorState in [types/index.ts](../types/index.ts), defaults, `buildFunnelConfig`/`editorStateToFunnelRow`/`dbToEditorState`, `mapDbRow`+Select in getTenantConfig, Mail-Preview in EmailsPanel) — exakt das `showProgressBar`-Muster (Aufgabe 56). Widget: `boxShadow` konditional UND `SHADOW_PADDING` → 0 (sonst bliebe ein unsichtbarer Rand im Embed; embed.js misst inklusive Padding). Toggle im Design-Panel (Layout) mit Hint: „Für nahtlose Einbettung: Schatten aus und Funnel-Hintergrund auf die Farbe der Webseite setzen."
- **Spalte:** `show_shadow boolean NOT NULL DEFAULT true` + `duplicate_funnel` kopiert sie mit (Enumeration-Lehre aus dem 77-Review); Seed-Skript copyCols ergänzt. Template-RPCs: weiter gesammelt offen (Instanzen bekommen Default true = Standard-Look).

**Rollback:** Migration hat DOWN (Funktion auf 77-Fassung zurück, Spalte droppen — erst Code zurückrollen). Sonst reiner Code-Change.

**Offen / Folge:** „Karte transparent" für Verlauf-/Bild-Untergründe nur bei belegtem Bedarf (Farb-Ableitungen + `var(--funnel-bg)`-Occlusion brauchen dann definierte Fallbacks).

---

## Aufgabe 77 — Kuratierte Icon-Bibliothek für Bild-Optionen (2026-07-02)

**Status:** Branch `feature/aufgabe-77-icon-bibliothek`, `tsc --noEmit` grün, Browser-verifiziert (Picker, Karten-Grid, Neutral/Brand-Tint). **Keine neue Dependency.** `funnel.tsx` mit expliziter Freigabe angefasst. **Beide Migrationen (`20260702120000` Spalte + `20260702130000` duplicate_funnel) am 2026-07-02 auf Prod angewendet** (Go von Stavros nach Schema-Cache-Fehler beim lokalen Speichern; Branch-Test nicht möglich — `confirm_cost`-Tool fehlt in der MCP-Config). Wording-Entscheidung: **„Icon" kanonisch** (Styleguide-Glossar ergänzt, 76er-Label „Symbol" → „Icon" umbenannt). Picker-Einstieg nach Stavros-Review prominenter: „Icon wählen"-Button statt nacktem Thumbnail, URL-Feld heißt „oder Bild-URL".

**Anlass:** Solar-Funnels brauchen viele passende Motiv-Icons (Dachformen, Gebäudetypen, …). Statt fremde SVGs 1:1 zu übernehmen (Urheberrechts-Risiko bei Redistribution als Produkt-Bibliothek) werden eigene Illustrations-SVGs im Branchen-Stil generiert/nachgezeichnet. Konsens-Doku: Icons einfarbig (`currentColor` + Opacity-Schattierung), kein Multicolor; Lucide bewusst verworfen (zu generisch).

**Umsetzung:**
- **Icon-Kontrakt + Manifest** ([lib/funnel/icons.ts](../lib/funnel/icons.ts)): SVGs in `public/icons/` — viewBox 170×129, nur Präsentations-Attribute (keine `<style>`-Klassen → Inline-Kollisionen), Akzent = `currentColor`, Schattierung = `fill-opacity`, Verdeckungs-Weiß = `var(--funnel-bg, #fff)`. Manifest = Whitelist (Key → file/label/category/keywords); neues Icon = Datei + 1 Manifest-Zeile + Deploy (bewusst: versioniert, atomar, CDN).
- **Datenmodell:** `iconKey?: string` an `Option` + `EditorOption`, jsonb-Key `icon_key` — durch dieselben 4 Mapper gethreadet wie `image_url` (Aufgabe 76). Exklusiv zu `imageUrl` (Editor erzwingt; Render: iconKey gewinnt). Keine DB-Migration fürs jsonb.
- **Widget** ([OptionIcon.tsx](../components/funnel/OptionIcon.tsx) + Slot in `funnel.tsx`): fetcht das SVG same-origin (Modul-Cache, Fehlschläge nicht gecacht) und injiziert es inline — nur Manifest-Keys, nie DB-Pfade (XSS-Guard); Antwort muss mit `<svg` beginnen. Tint via Wrapper-`color` + `currentColor` (Muster RatingStars). Icons ignorieren `imageFit` (immer Symbol-Darstellung, `p-1.5`). Fetch-Fehler → leere Box + `console.warn`.
- **Icon-Farbmodus funnel-weit** (Design-Panel „Icon-Farbe: Neutral | Hauptfarbe"): `FunnelTheme.iconColor`/`EditorState.iconColor`, DB-Spalte `funnels.icon_color` (nullable, NULL = neutral, CHECK neutral|brand; Migration `20260702120000_aufgabe_77_funnels_icon_color.sql` + DOWN). Neutral = `theme.textColor` (schwarz/weiß automatisch), Brand = `theme.primaryColor`. Zweite Migration `20260702130000`: `duplicate_funnel` kopiert `icon_color` mit (explizite Spalten-Liste — Review-Fund; `icon_key` im jsonb überlebte ohnehin). `scripts/seed-demo-account.mjs` copyCols ebenfalls ergänzt. Editor-Vorschau-Tint = geteilte Konstante `EDITOR_ICON_TINT` (= Widget-Neutral-Default `#1f2937`).
- **Editor:** [IconLibraryPicker.tsx](../components/editor/properties/IconLibraryPicker.tsx) (EditorModal, Suche + Kategorie-Chips + Kachel-Grid, Muster AddContactFieldPicker); in `OptionsEditor.tsx` öffnet das Thumbnail der Bild-Zeile den Picker, gewähltes Icon zeigt Label-Chip + Entfernen-X statt des URL-Felds.
- **Probe-Charge (5 Icons, von Claude gezeichnet):** Satteldach · Walmdach · Dachneigung · Mehrfamilienhaus · Wärmepumpe. Von Stavros abgenommen („imo gut gemacht").
- **Haupt-Charge (32 Icons, 2026-07-02):** Nach Stavros' Referenz-Set (37 Real-Funnel-SVGs) als Motiv-Vorlage **nachgebaut, nicht kopiert** — parallel per Workflow in 9 Motiv-Gruppen gezeichnet, alle gegen den Kontrakt validiert (Skript-Check: Root-Element, keine <style>/Klassen/IDs/Text/fremde Farben). Bibliothek jetzt 37 Icons in 10 Kategorien (Dach · Gebäude · Fläche · Personen · Zeitraum · Finanzen · Energie · Heizung · Wohnen). Bewusste Abweichungen vom Referenz-Set: Zahlen/Text in Icons durch Tages-Kästchen/Blitz ersetzt (Label trägt die Semantik), grüne/rote Ja-Nein-Kreise durch einfarbige currentColor-Badges mit Haken/X in `var(--funnel-bg)` (Ein-Farben-Kontrakt; erster realer Einsatz des Occlusion-Musters), Doppel-Motive dedupliziert (freistehend = einfamilienhaus).

**Rollback:** Migration hat DOWN (Spalte droppen, erst Code zurückrollen). `icon_key`-Werte im jsonb sind ohne Render-Pfad inert. Icons/Manifest sind reine Additionen.

**Offen / Folge:** Stil-Abnahme Probe-Charge → Rest-Charge nach Motiv-Liste. Stavros' gesammelte SVGs werden als Motiv-Vorlage nachgebaut (nicht 1:1 übernommen). **Wenn Vorlagen Icons bekommen:** `snapshot_funnel_to_template` + `create_funnel_from_template` tragen `icon_color` noch nicht (Review-Fund, bewusst aufgeschoben — `icon_key` im options-jsonb überlebt beide Richtungen, nur der Brand-Tint fiele auf neutral zurück); dann beide RPCs um `icon_color` erweitern. `supabase-schema.md` ist nachgezogen (icon_color-Spalte + options-jsonb inkl. `image_url`/`icon_key` + config-Beispiel).

---

## Aufgabe 76 — Bild-Optionen für `single_choice` + `multi_choice` (Bild-Funnels) (2026-06-29)

**Status:** Branch `feature/aufgabe-76-bild-optionen`, `tsc --noEmit` grün. Additiv + optional („leer = aus") — **kein DB-Migration** (schema-flexibles `fields.options` jsonb), **keine neue Dependency**, **kein Storage/Upload** (URL betreiber-gesetzt). `funnel.tsx` mit expliziter Freigabe angefasst. CLAUDE.md §10 mit Freigabe ergänzt.

**Anlass:** Erster echter Solar-Kunde will Bild-Karten (Haus/Mehrfamilienhaus/Firma/…) wie im Branchen-Standard. Done-for-you-Setup (Kunde loggt sich nie ein, wird eingerichtet + monatlich verkauft) → Upload-UI/Storage bewusst aufgeschoben; nur `imageUrl` als permanentes Fundament gebaut (Phase 2 = Upload schreibt später in dasselbe Feld).

**Umsetzung:**
- `imageUrl?: string` an `Option` + `EditorOption` (`types/index.ts`); persistiert als jsonb-Key `image_url`.
- Durch alle 4 Option-Mapper gethreadet (keine Spreads → Hand-Arbeit): `buildQuestions`, DB-Write, DB-Read (`lib/editorUtils.ts`) + `mapDbRow` (`lib/getTenantConfig.ts`), mit `typeof`-Guards beim Lesen.
- Aktivierung: 5. Stil unter „Markierung der Optionen" → **„Bild"** (`OptionMarker = 'image'`), bei `single_choice` **und** `multi_choice` (`MarkerStyleControl` in `FieldProperties.tsx`). Erst dann erscheint pro Option ein kompaktes „Bild-URL"-Feld mit Thumbnail-Vorschau (`OptionsEditor.tsx`, opt-in via `allowImages`). Marker-Whitelists in `editorUtils.ts` + `getTenantConfig.ts` um `'image'` ergänzt (sonst Reset auf `letters` beim Neuladen). Der Editor-Panel-Chip spiegelt jetzt den Marker (A/B/C · 1/2/3 · Haken · —) via geteilter `optionMarkerFor` (vorher fest A/B/C).
- Widget (`funnel.tsx`): `imageMode = (single_choice || multi_choice) && optionMarker === 'image'` → `cardLayout` rendert responsives Karten-Grid (Bild oben, `@md`-Container-Query) ↔ gestapelte Reihen (Bild-Thumbnail links) bei schmalem Embed. Kein Letter-Chip; Auswahl = Brand-Rahmen, bei Mehrfachauswahl zusätzlich dezenter Haken auf gewählten Karten. editMode bleibt sortierbare Reihen-Liste (Drag-Reorder unverändert).
- Bilddarstellung pro Frage umschaltbar (`imageFit`, Editor-Schalter „Bilddarstellung: Symbol / Foto", nur bei Bild-Marker sichtbar): `contain` = Symbol/Icon mittig mit Rahmen (Default) vs. `cover` = Foto randlos füllend/beschnitten. Im field-config-jsonb persistiert (nur non-default `cover`). Bug-Fix: langer Optionstext bricht jetzt um (`wrap-break-word`) statt aus der Kachel auszubrechen, plus `overflow-hidden`-Garantie an der Karte.

**Rollback:** Reiner Code-Change. `git revert -m 1 <merge>` stellt den Vorzustand her; bereits gespeicherte `image_url`-Keys im jsonb sind ohne den Render-/Mapper-Pfad inert (werden ignoriert). Kein DB-Eingriff nötig.

**Offen / Folge:** Phase 2 (Supabase-Storage-Bucket + RLS + Upload-UI für Self-Service-Agenturen) erst bei belegtem Bedarf. `dropdown` bleibt textbasiert. Bild-Quelle bislang nur per URL; Stavros hostet die Bilder selbst (z. B. manueller öffentlicher Bucket).

---

## Aufgabe 74 — Builder-Optik-Pass + Dashboard-Header/Tooltip-Vereinheitlichung (2026-06-17)

**Status:** Branch `feature/aufgabe-74-builder-optik`, `tsc --noEmit` durchgehend grün, reine UI/Präsentation — **kein DB-Change, keine neue Dependency** (lucide-react + react-dom bereits da), `funnel.tsx` (Widget) unberührt. Hell + Dunkel geprüft.

**Anlass:** Optische Überarbeitung des Funnel-Visual-Builders (`/dashboard/funnels/[slug]/edit`) anhand von Konkurrenz-Editoren (youform/niceform/collectform). Über den Editor hinaus auf Dashboard-Konsistenz erweitert.

**Editor:**
- **Icon-/Farb-System konsolidiert:** [fieldMeta.ts](../components/editor/fieldMeta.ts) ist die EINZIGE Quelle — lucide-Icons statt Unicode-Glyph/Emoji-Strings; Farbe pro **Kategorie** (`CATEGORY_TINT`: frage=blau · karte=bernstein · feld=smaragd · start=slate · abschluss=grün) statt Regenbogen pro Typ. 3 Duplikat-Maps gelöscht (AddElementModal/AddContactFieldPicker/PropertiesPanel). Konsumenten: StepPill · AddElementModal · AddContactFieldPicker · PropertiesPanel · FieldRow · LogicMapPanel. „Zahl" = `Calculator` (statt `#`).
- **Frame:** echtes Vollbild ([EditorShell](../components/editor/EditorShell.tsx): `left-0` + `z-50` deckt die Dashboard-Nav), Breadcrumb „← Funnels › Name", beschrifteter „Vorschau"-Button oben rechts (statt kryptisches ↗).
- **Canvas:** EINE Bottom-Toolbar (Gerät · Funnel testen · Design) statt zweier gestapelter Menüs; „Live" entdoppelt; Kontaktwarnung → Badge oben rechts ([CenterCanvas](../components/editor/CenterCanvas.tsx)).
- **Design als rechts-rein-slidendes Overlay** (statt Inhalt|Design-Toggle) mit leichtem Scrim + Klick-daneben-schließt; löst nebenbei den verbotenen `bg-primary/10`-Aktiv-Toggle.
- **Sichtbarkeit = Auge** im Properties-Header (alle Step-Typen); „Sichtbar"-Toggle-Zeilen raus (auch im Karten-Feld); irreführendes Auge an „Pflichtfeld" entfernt.
- **ThemePanel aufgeräumt:** geteilter `Controls.Select` (dark-aware Chevron), `SegmentedControl` (weiße-Pille-aktiv) + `ColorRow` entdoppelt, kein Doppel-Border im Slide-in.
- Step-Pille Eyebrow „Schritt N" (Typ-Wort raus, Icon trägt den Typ); TopTabs aktiver Text Indigo + toter badge/disabled-Pfad raus; „Frage hinzufügen" + alle `EditorButton` auf `py-2.5`.

**Dashboard/global:**
- **`--radius` zentralisiert** ([globals.css](../app/globals.css)): 12→**10px**, `--radius-2xl` an `--radius` gekoppelt → EIN Radius-Regler app-weit.
- **`PageHeader`-Bauteil** ([components/ui/PageHeader.tsx](../components/ui/PageHeader.tsx)) — alle Nav-Seiten (Dashboard/Funnels/Vorlagen/Abrechnung/Admin/Statistiken/Leads) nutzen es; vorher hardcodete jede Seite ihren Header (Größen + Button-Höhen drifteten). Überschriften einheitlich `text-xl`.
- **`Tooltip`-Bauteil** ([components/ui/Tooltip.tsx](../components/ui/Tooltip.tsx)) — dependency-frei, Portal (kein Clipping), dunkle Bubble. Angewandt: Step-Liste (volle Frage beim Hovern) + „Vorschau"-Button.

**Bewusst aufgeschoben (eigene Aufgabe):** projektweiter Ersatz der restlichen nativen `title="`-Tooltips durch das `Tooltip`-Bauteil — Layout-Risiko beim Wrappen, vor der Beta nicht angefasst. Komponenten-Props namens `title` (Card/Modal/Section/PageHeader/SectionCard) + das Widget bleiben ohnehin außen vor.

---

## Aufgabe 73 — Öffentliche Widget-Config: interne Tenant-Daten nicht mehr an den Client (2026-06-14)

**Status:** Branch `feature/aufgabe-73-public-funnel-config`, Build grün (`tsc --noEmit` + `next build`), kein DB-Change, keine neue Dependency, `funnel.tsx` unberührt.

**Anlass (Go-Live-Audit):** `getTenantConfig` baut die volle `TenantConfig` (inkl. `notificationEmail`, `emailSenderLocal`, `billingModel`/`leadPrice`/`billingPrice`, tenant-/funnel-ids). [`app/[slug]/page.tsx`](../app/[slug]/page.tsx) reichte das **komplette** Objekt als Prop an die Client-Komponente `TenantFunnelClient` — Next.js serialisiert Client-Props in den öffentlichen Seiten-Payload, d.h. diese internen Agentur-Daten standen im Quelltext jeder eingebetteten Funnel-Seite. **Kein RLS-/Daten-Bruch** (Lead-Daten bleiben durch RLS geschützt), aber Hygiene-Leak — v.a. `notificationEmail`; die Billing-Felder werden relevant, sobald zahlende Kunden existieren.

**Gemacht:** Neue öffentliche Projektion `PublicFunnelConfig = Pick<TenantConfig, slug|theme|funnel|questions|redirectUrl|logicRules|metaPixelId|googleAdsConversion>` ([types/index.ts](../types/index.ts)) + Helper `toPublicFunnelConfig` ([lib/getTenantConfig.ts](../lib/getTenantConfig.ts)). `page.tsx` gibt nur noch `toPublicFunnelConfig(config)` an den Client; `generateMetadata` nutzt weiter die volle Config (server-only, kein Leak). [`TenantFunnelClient`](../components/TenantFunnelClient.tsx) typt den Prop jetzt als `PublicFunnelConfig`. **Verifiziert vor dem Bauen:** der Client liest exakt diese 8 Felder (Grep über alle `config.`-Zugriffe), `TenantFunnelClient` wird nur in `page.tsx` verwendet (sonst nur Kommentar-Erwähnungen), `Funnel` bekommt nur die destrukturierten Props → kein Zugriff auf gestrippte Felder möglich.

---

## Aufgabe 72 — Ordner-Umbau Schritt 3: `lib/` clustern (Phase B) (2026-06-14)

**Status:** Branch `feature/aufgabe-72-lib-clustern`, Build grün (`tsc --noEmit` + `next build`), kein DB-Change, keine neue Dependency. Plan: [`context/struktur-plan.md`](struktur-plan.md) Phase B. **Damit ist die Ordner-Aufräumung abgeschlossen** (Phase C/funnel.tsx-Umzug bleibt bewusst gestrichen).

**Gemacht (alles `git mv`, von git als Renames erkannt):**
- **`lib/logic/`** ← funnelLogic.ts · logicDisplay.ts · logicRuleMapping.ts (7 Import-Stellen aktualisiert).
- **`lib/hooks/`** ← useHistoryState.ts · useMinWidth.ts · useSaveStatus.ts (6 Import-Stellen).
- **`lib/email/`** ← emails.ts · emailTemplates.ts (8 Stellen; `emails.ts` importiert `emailTemplates` jetzt relativ als `./emailTemplates`).
- **Eine Zeile in `funnel.tsx`** (Z. 35: `@/lib/funnelLogic` → `@/lib/logic/funnelLogic`) — reiner Import-Pfad, keine Logik, von Stavros ausdrücklich freigegeben (kein „Rumfummeln" an der Datei).
- Im `lib/`-Wurzel bleiben die „großen Einzelstücke": getTenantConfig · editorUtils · tracking · webhooks · billing · stripe · csv · embedSnippet · resolveAnswer · validateContactField · utils · templates. `supabase/` · `auth/` · `admin/` unverändert.
- Verifiziert per Grep: 0 verbleibende alte `@/lib/...`-Pfade auf verschobene Module; vor dem Verschieben geprüft, dass die 3 Logik-Dateien/Hooks sich nicht gegenseitig importieren (keine internen Relativ-Brüche).

---

## Aufgabe 71 — Ordner-Umbau Schritt 2: `dashboard/` aufräumen (Phase A) (2026-06-14)

**Status:** Branch `feature/aufgabe-71-dashboard-aufraeumen`, Build grün (`tsc --noEmit` + `next build`), kein DB-Change, keine neue Dependency, `funnel.tsx` unberührt. **Reiner Struktur-Umbau.** Plan: [`context/struktur-plan.md`](struktur-plan.md) Phase A (A1+A2+A3).

**Gemacht (alles `git mv`, von git als Renames erkannt):**
- **A1 — Share-Helfer gebündelt:** `CodeSnippet.tsx` · `TrackingSettings.tsx` · `PlatformGuides.tsx` → `components/editor/share/` (nur `editor/SharePanel.tsx` nutzt sie; `SharePanel` bleibt im Editor-Wurzel = Muster „Panel im Wurzel, Teile im Unterordner" wie `editor/email/`). SharePanel-Importe auf `./share/*` umgestellt.
- **A2 — Daten raus aus den Komponenten:** `components/dashboard/templates.ts` → `lib/templates.ts` (ist Mapper + RPC-Helper, keine UI). 6 Import-Stellen aktualisiert (3 app-Pages + 3 Dashboard-Komponenten, alle auf `@/lib/templates`).
- **A3 — `dashboard/` sub-gruppiert:** neuer `dashboard/nav/` (DashboardShell · Sidebar · LogoMark · navItems.ts) + `dashboard/funnels/` (FunnelCard · NewFunnelModal · DeleteFunnelModal · CreateFromTemplateDialog · TemplateShowcase). Im `dashboard/`-Wurzel bleiben nur noch BetaFeedback · OnboardingNameModal · Sparkline. Interne Relativ-Importe zogen mit; nur FunnelCard→DeleteFunnelModal (war absoluter Selbst-Bezug) auf `./DeleteFunnelModal` + die app-Page-Importe auf die neuen Pfade umgestellt.
- Verifiziert per Grep: 0 verbleibende alte `@/components/dashboard/...`-Pfade auf verschobene Dateien. Vor dem Verschieben alle intra-dashboard Relativ-/Selbst-Importe geprüft (kein Relativ-Pfad bricht über die Ordnergrenze).

**Phase C (funnel.tsx-Umzug) bleibt gestrichen** (siehe struktur-plan.md). Nächster möglicher Schritt: Phase B (`lib/` clustern).

---

## Aufgabe 70 — Ordner-Umbau Schritt 1: `tenant-editor/v2` → `editor` (2026-06-14)

**Status:** Branch `feature/aufgabe-70-editor-ordner-umbau`, Build grün (`tsc --noEmit` + `next build`), kein DB-Change, keine neue Dependency, `funnel.tsx` unberührt. **Reiner Struktur-Umbau, kein Verhaltens-Change.**

**Anlass:** Erster Schritt eines schrittweisen „Ordner-Struktur sauber machen"-Vorhabens (Stavros: step by step, nicht alles auf einmal). „v2" war ein Legacy-Name (kein v1 mehr seit C.1d), und es ist kein „tenant-editor", sondern schlicht der Editor.

**Gemacht:**
- `components/tenant-editor/v2/*` → `components/editor/*` (alle 30 Dateien inkl. `ui/`, `properties/`, `email/`) via `git mv` (History bleibt erhalten, von git als Renames erkannt).
- `components/tenant-editor/defaults.ts` → `components/editor/defaults.ts` (lag eine Ebene zu hoch, wird nur vom Editor genutzt) — EditorShell importiert es jetzt relativ als `./defaults` (Geschwister-Stil wie die übrigen Editor-Module).
- **Toter Code gelöscht:** `vorlagen.ts` (verifiziert 0 Importe; die alte v1/v2-Vorlagen-Idee wurde durch das DB-Vorlagen-System Aufgabe 61–63 ersetzt). Der leere `components/tenant-editor/`-Ordner ist weg.
- **4 Code-Import-Stellen** angepasst: `new/FunnelEditorClient.tsx`, `[slug]/edit/FunnelEditorClient.tsx`, `new/blank/page.tsx`, `editor/EditorShell.tsx`. Verifiziert per Grep: 0 verbleibende `tenant-editor`/`editor/v2`-Referenzen im Code.
- **Doku nachgezogen** (lebende Referenzen): CLAUDE.md (§5, §11 inkl. der veralteten „Ordner bleibt bewusst"-Parenthese), architecture.md (Layout-Baum + Code-Karten) + architecture.html, conversion-tracking.md, email-drip-architektur.md, webhook-architecture.md, webhook-erklaert.md, public/fonts/README.md. Historische Logs (history-archive.md, alte datierte Einträge hier) bewusst unangetastet — sie protokollieren den damaligen Stand (inkl. echter v1-Pfade + der Aufgabe-49-Entscheidung „v2 bleibt").
- Next.js-16-Doku gegengeprüft: Ordner außerhalb `app/` sind frameworkseitig unkonventioniert; `@/`-Alias (tsconfig `@/* → ./*`) trägt die Imports — konfliktfrei.

---

## Aufgabe 69 — Vorschau-Modal-Fix · CSV-Lead-Export · Feedback-Datei-Upload (2026-06-13)

**Status:** Branch `feature/aufgabe-69-export-upload-modalfix`, Build grün (`tsc --noEmit` + `next build`), von Stavros abgenommen + nach `main` gemerged (`--no-ff`). Kein Schema-Change, keine neue Dependency, `funnel.tsx` unberührt.

**Feature 1 — Vorschau-Modal abgeschnitten gefixt** ([TemplateShowcase.tsx](../components/dashboard/TemplateShowcase.tsx)): Auf kleinen Laptops (~650 px Höhe) schnitt das Vorlagen-Vorschau-Modal (`/dashboard/vorlagen`) hohe Funnel-Schritte ab — kein Scroll möglich. Ursache war **modal-seitig, nicht das Widget**: der iframe wurde auf `window.innerHeight*0.9-90` gekappt und weder iframe noch Modal-Body scrollten. Fix: Kappung raus (nur noch `PREVIEW_MIN_HEIGHT`-Boden), iframe in einen `min-h-0 overflow-y-auto`-Body gekapselt, Header `shrink-0`; Modal bleibt `max-h-[90vh]`. Kurze Schritte fitten unverändert (kein Scrollbalken auf großen Screens — `overflow-y-auto` greift nur bei echtem Überlauf), hohe Schritte scrollen im Modal-Body statt abzuschneiden. Die iframe-Höhe folgt weiter exakt der `funnel-resize`-Meldung des Widgets (funnel.tsx unverändert).

**Feature 2 — CSV-Export pro Funnel** (neu [lib/csv.ts](../lib/csv.ts) + [TenantLeadsTable.tsx](../app/dashboard/TenantLeadsTable.tsx)): Standard-CRM-Export im Lead-Posteingang. `lib/csv.ts` = generischer `toCsv(rows, dialect)` mit **zwei Dialekten** + `downloadCsv`. Export-Button rechts in der Listen-Toolbar (`trailing`-Slot nach „Neueste zuerst"), aktiv **nur im Einzel-Funnel-Kontext** (`funnelFilter !== 'alle' || funnels.length === 1`), sonst deaktiviert mit **eigenem Hover-Tooltip** (sofort, App-Stil — kein natives `title`) „Zum Export zuerst einen Funnel wählen". **Bewusst OHNE Einzelauswahl** (Stavros-Entscheid Runde 2): exportiert wird immer die **aktuell gefilterte Liste** — die Filter (Funnel · Status · Zeitraum · Suche) sind die „Auswahl". Klick öffnet ein **Format-Auswahl-Modal** (`ExportFormatModal`, „CSV-Format wählen"): **Excel (Deutschland)** = Semikolon + UTF-8-BOM (öffnet per Doppelklick in DE-Excel) vs. **Standard (Komma)** = Komma, RFC 4180, kein BOM (Tools/Google Sheets). Begründung Stavros: die Möglichkeit, im korrekten Format zu exportieren, muss gegeben sein. **Smarte Spalten** (`buildLeadsMatrix`): Kontaktfelder + genau die Fragen des Funnels, leere Spalten automatisch weggelassen, Choice-Slugs→Labels + Checkbox→Ja/Nein via vorhandenem `resolveAnswer`. Dateiname `leads_<slug>_<datum>.csv`. Toolbar bekam `flex-wrap` (gegen abgeschnittenes Layout bei ~720 px). Board-Ansicht unberührt. **Verworfen (Runde 1, zurückgebaut):** Zeilen-Checkboxen + adaptiver „Ausgewählte exportieren"-Button → zu viel Cram in der Toolbar, Checkboxen-immer-an unschön.

**Feature 3 — Feedback-Datei-Upload + Modal-Politur** ([BetaFeedback.tsx](../components/dashboard/BetaFeedback.tsx) + [api/feedback/route.ts](../app/api/feedback/route.ts)): Optionale Anhänge im Beta-Feedback-Modal für Screenshots bei Bug-Reports — **bis zu 3 Dateien, zusammen ≤ 4 MB** (Gesamt-Cap, sicher unter Vercels ~4,5 MB Body-Limit). „📎 Datei anhängen" unter dem Textfeld, je Datei ein Chip mit ✕, „anhängen" sichtbar solange < 3. Client-Validierung (PNG/JPG/JPEG/PDF, Anzahl, Gesamtgröße). Request von JSON auf `FormData` umgestellt (mehrere `file`-Felder; kein `Content-Type`-Header → Browser setzt den multipart-Boundary). Route prüft **server-seitig erneut** (Anzahl + Gesamtgröße + MIME **und** Endung jeder Datei — Client nie vertrauen), säubert Dateinamen (Whitelist-Regex `[^A-Za-z0-9._ -]`) und hängt alle als Resend-Anhänge (Buffer) an + „Anhänge"-Zeile in der Mail-Meta-Tabelle. Bleibt **„Nur-Mail"** — keine Storage, kein DB-Schreibzugriff (Stavros-Entscheid 2026-06-12). **Modal-Politur:** Erfolgs-Subtext „Wir melden uns zeitnah." entfernt (kein Versprechen bei Bug-Reports); Schließen-Button von `secondary` (hatte keine `dark:`-Klassen → weiß-auf-weiß im Hellmodus) auf `primary` (lila, beide Modi); Titel „Nachricht senden" bleibt (Stavros wollte ihn zurück — gibt dem Kopf Gewicht).

---

## Aufgabe 68 — Demo-Funnels in eigenes Demo-Konto umgezogen (2026-06-12)

**Status: ✅ ausgeführt auf Produktion (mit Stavros-Go), verifiziert. Reine Daten-Verschiebung, KEIN Code, KEIN Schema-Change.**

**Anlass (Beta-Optimierungs-Sprint, Punkt 6):** 37 Demo-Funnels lebten in Stavros' persönlichem Konto — Galerie-Spieler erzeugten Leads/Aufrufe in seinem echten Posteingang/seiner Statistik, versehentliche Edits hätten die öffentliche Galerie-Vorschau verändert. Beratungs-Entscheid: Umzug in separates Konto (Option „Flag + Filter im selben Konto" verworfen — wäre Schema-Change + Filter an jeder Query + löst das Edit-Risiko nicht).

**Ausführung:** Eine atomare DO-Block-Transaktion mit Zeilenzahl-Sicherung (Abbruch bei Abweichung von den vorab gezählten Beständen). Verschoben zu Tenant `cf2ed310-d5e6-403c-bd90-9a697f5dbea1` (demo@leadplug.de, umbenannt in **„LeadPlug Demos"** — erscheint im Funnel-Tab-Titel): **37 funnels** (`slug LIKE 'demo-%'`) · **74 email_subscriptions** · **44 funnel_logic_rules** · **45 submissions** (Demo-Leads) · **30 funnel_view_logs**. Webhooks: 0. **Bei Stavros verblieben:** `agenturen` (Dogfood-Akquise), `leadplug` (TestFunnel), `592053d8`.

**Verifiziert:** Demo-Konto hält exakt 37/74/44, Stavros' Konto 0 Demo-Leads, Prod-Check `https://app.leadplug.de/demo-solar` → 200 + Titel „… – LeadPlug Demos" (Galerie-Vorschau funktioniert, Tenant aktiv).

**Rollback-Pfad (dokumentiert, kein Auto-Script):** identische UPDATEs zurück auf `tenant_id = 'f64b2227-2fbb-4746-83fa-9d71bf8af26f'` (gleiche WHERE-Klauseln: funnels/submissions via `slug/funnel_slug LIKE 'demo-%'`, email_subscriptions/funnel_logic_rules/funnel_view_logs via funnel_id-Subquery) + `tenants.company_name` zurück auf 'demo'.

**Künftige Vorlagen-Chargen:** per SQL direkt mit `v_tenant := 'cf2ed310-…'` anlegen (Kochbuch-Muster, neue Tenant-ID). Demo-Edits: Login als demo@leadplug.de (Tipp: zweites Browser-Profil) oder SQL/MCP.

---

## Aufgabe 67 — Beta-Kontaktkanal: Feedback-Widget + WhatsApp + Signup-Politur (2026-06-12)

**Status:** gebaut, Build grün, Stavros-Test bestanden (Mail + WhatsApp kamen an). **Feedback ist NUR-Mail** — eine DB-Archiv-Tabelle (`beta_feedback`) wurde vorgeschlagen und von Stavros **abgelehnt** (2026-06-12); die vorbereiteten Migrations-Dateien wurden wieder entfernt, die Route hat bewusst keinen DB-Schreibzugriff. Nicht erneut vorschlagen.

**Inhalt (Beta-Optimierungs-Sprint, Punkt 7):**
- **Feedback-Widget** ([BetaFeedback.tsx](../components/dashboard/BetaFeedback.tsx)): Floating-Button unten rechts im Dashboard → Panel „Feedback" mit Kategorie (Feedback/Problem/Frage) + Nachricht + optionalem WhatsApp-Link. Blendet sich im Vollbild-Editor (`/edit`) selbst aus. Eingehängt in [app/dashboard/layout.tsx](../app/dashboard/layout.tsx). Copy nach Stavros-Review: neutraler Support-Ton („Nachricht angekommen / Wir melden uns zeitnah."), kein Bedanken, keine Platzhaltertexte.
- **API `/api/feedback`** ([route.ts](../app/api/feedback/route.ts)): Auth via User-Client, Validierung (Kategorie-Whitelist, 1–5000 Zeichen), dann Resend-Mail an `SUPPORT_EMAIL` mit reply-to = Absender (direkt antwortbar), From `noreply@EMAIL_DOMAIN_PLATFORM`. Tenant-Name nur lesend für den Mail-Kontext.
- **Env:** `SUPPORT_EMAIL` (server-side) + `NEXT_PUBLIC_SUPPORT_WHATSAPP` (internationale Ziffern ohne `+`; leer = kein Link). In `.env.example` dokumentiert, in `.env.local` gesetzt — **in Vercel noch eintragen**.
- **Signup-Bestätigungsseite poliert** ([app/signup/page.tsx](../app/signup/page.tsx)): E-Mail-Adresse bricht nie mittendrin um (inline-block + nowrap), Hinweis dass der Link direkt ins Dashboard führt, „Zurück zur Anmeldung" als Primary-Button (einzige Aktion der Seite). Bewusst Seite statt Modal/Login-Redirect (nächstes Ziel des Users ist sein Postfach; der Mail-Link loggt ohnehin direkt ein).
- **Erst-Login-Onboarding: Kontoname-Modal** ([OnboardingNameModal.tsx](../components/dashboard/OnboardingNameModal.tsx)): Die Auto-Tenant-Anlage setzt KEINEN Verlegenheits-Namen mehr aus dem E-Mail-Localpart (`company_name` bleibt NULL); solange kein Name gesetzt ist, rendert das Layout ein nicht wegklickbares, geblurrtes Modal („Kontoname festlegen", min. 2 Zeichen, Enter speichert, Hinweis „jederzeit änderbar"). Speicherpfad identisch zur Konto-Seite (UPDATE tenants via User-Client/RLS) + `router.refresh()`. Begriff bewusst „Konto", NICHT „Workspace" — der ist laut Wording-Styleguide fürs Whitelabel-Feature reserviert (Stavros' „Workspace"-Wunsch entsprechend übersteuert, mit Hinweis). Bestands-Tenants mit Auto-Namen sehen das Modal nicht. WhatsApp-Prefill seit dieser Runde neutral: nur `(Konto: X · E-Mail: Y)` + Leerzeile.
- **Polish-Runden nach Stavros-Tests:** Feedback-Panel → **zentriertes Standard-Modal** (Scrim dunkel + Blur, Button öffnet nur noch, Schließen via X/Scrim/„Schließen"); Titel „Nachricht senden" (kein doppeltes „Feedback", kein „an LeadPlug"); Copy strikt neutral (kein Danke, keine Platzhalter — Wording-Styleguide, 3× korrigiert → Memory `wording-neutral-kein-gruss`); **Feedback-Mail formatiert** (Kategorie-Badge, Meta-Tabelle Von/Konto/Seite/**Gesendet** in Europe/Berlin, mailto-Link, Nachricht-Box); **WhatsApp-Prefill** `(Konto: X · E-Mail: Y)` + Leerzeile (wa.me ?text=, sichtbar/editierbar; Business-Konto = nur Nummer tauschen); Signup-Bestätigung auf Standard-Text zurück („Über den Link wird das Konto aktiviert."); **Admin-UI Workspace→Konto** (Übersicht + Detail + Gefahrenzone + Modals — Styleguide: „Workspace" bleibt fürs Whitelabel reserviert, Stavros bestätigt).
- **Kalender-Farb-Bug gefixt (wichtigster Fund des Sprints)** ([DateInlinePicker.tsx](../components/funnel/DateInlinePicker.tsx)): Die Theme-CSS-Variablen lagen auf einem Wrapper-Div, aber react-day-picker deklariert dieselben Variablen in seinem Stylesheet direkt auf `.rdp-root` — direkte Deklaration schlägt Vererbung, der Kalender war daher IMMER im Bibliotheks-Blau (fiel nie auf, weil die Test-Funnels blau/indigo waren; entdeckt durch Stavros' Orange-Test). Fix: Variablen als Inline-Style auf das DayPicker-Root (`style`-Prop). Dazu: ausgewählter Tag als **gefüllter Kreis** in Funnel-Farbe mit weißer Zahl (Google-Pattern, `.lp-daypicker`-Overrides in globals.css) statt Outline-Ring, und **heutiger Tag wird beim Anzeigen als Antwort committed** (Slider-Muster aus Aufgabe 55, geklemmt auf min/max, Editor-Default hat Vorrang) → Kreis sichtbar ab dem ersten Render, OK sofort aktiv. Farb-verifiziert via Playwright auf demo-recruiting (rot): OK-Button und Kalender-Kreis pixelidentisch `#dc2626`.

---

## Aufgabe 66 — Font-Ausbau: 6 neue Familien, 10 gesamt (2026-06-12)

**Status:** gebaut, Build grün. Kein DB-Change.

**Inhalt (Beta-Optimierungs-Sprint, Punkt 5):** Da `@font-face` lazy lädt (nur die im Funnel gewählte Familie wird heruntergeladen), kostet mehr Auswahl keine Ladezeit — Stavros-Go für 6 neue self-hosted Familien (gwfh, latin, DSGVO-konform wie gehabt): **Montserrat v31 · Open Sans v44 · Lato v25 · Nunito v32 · DM Sans v17 · Merriweather v33** (die Serife im Set, eigener Georgia-Fallback-Stack). Je regular/500/600/700 — außer Lato (hat kein 500/600; Browser mappt 500→400, 600→700). Bewusst KEINE 300er-Weights (würden Bestands-Funnels sichtbar dünner machen — `font-light` mappt weiter auf 400). Touchpoints: 22 woff2 in [public/fonts/](../public/fonts/) + `@font-face` in [globals.css](../app/globals.css) + `FunnelFont` ([types/index.ts](../types/index.ts)) + `FONT_STACKS` ([funnel.tsx](../components/funnel.tsx)) + `FONT_OPTIONS` alphabetisch ([ThemePanel.tsx](../components/tenant-editor/v2/ThemePanel.tsx)) + [fonts/README.md](../public/fonts/README.md) (inkl. neuem Schritt 5).

---

## Aufgabe 65 — Widget-Polish: Kalender im Mittig-Layout + Checkbox-Marker (2026-06-12)

**Status:** Branch `feature/aufgabe-65-widget-polish`, Build grün, Stavros-Sichttest im Editor bestanden.

**Inhalt (Beta-Optimierungs-Sprint, Punkte 1+3):**
- **Kalender folgt dem „Mittig"-Layout** ([funnel.tsx](../components/funnel.tsx)): DateInlinePicker ist ein kompaktes Inline-Element wie Rating/Skala und wird bei `title_alignment='center'` jetzt zentriert — in BEIDEN Render-Zweigen (Einzelfrage + Karten-Feld; der Karten-Zweig ist seit dem Karten-Modell der Standard-Pfad und war zunächst übersehen). War ein Versäumnis aus Aufgabe 59.
- **Kein Feld-Label überm Kalender** (Stavros-Entscheid): „Datum" über einem Kalender ist redundant — Label im Karten-Zweig entfernt, Kontext liefert der Karten-Titel. (Trade-off dokumentiert: „(optional)"-Zusatz entfällt mit.)
- **Vierter Marker-Stil `checkbox`** ([types/index.ts](../types/index.ts) `OptionMarker`): leere Box, die bei Auswahl einen Haken in Brand-Farbe bekommt (Tally-Pattern). Gilt für single_choice UND multi_choice (ersetzt dort die bisherige Zusatz-Box — keine Doppelung); im editMode übernimmt die Box die Drag-Handle-Rolle des Letter-Chips. Editor-UI: Sektion heißt jetzt „Markierung der Optionen" (statt „Nummerierung"), 4 Stile in [FieldProperties.tsx](../components/tenant-editor/v2/properties/FieldProperties.tsx) (`MarkerStyleControl`, SquareCheck-Icon). Lese-Whitelists in [editorUtils.ts](../lib/editorUtils.ts) + [getTenantConfig.ts](../lib/getTenantConfig.ts) erweitert; Persistenz im config-jsonb wie gehabt (alles ≠ letters wird geschrieben) — **kein DB-Change**, Bestands-Funnels unberührt (Default letters). Tastatur-Auswahl (A–Z/1–9) unabhängig vom Marker-Stil.

---

## Aufgabe 64 — Widget-Performance: GPU-Folienübergang + Browser-Zurück + Bundle-Diät (2026-06-12)

**Status:** Branch `feature/aufgabe-64-slide-smoothness`, Build grün, Playwright-verifiziert (Production-Build), Stavros-Sichttest in Chrome/Firefox/VSCode bestanden.

**Anlass (Beta-Optimierungs-Sprint, Punkt 1):** Folienübergang ruckelte in Firefox + war „ok, nicht perfekt" in Chrome, ultra-smooth nur im VSCode-Browser — klassisches Muster von JS-Main-Thread-Animation (framer-motion berechnet jeden Frame per JS). 

**Inhalt:**
- **Folienübergang = reine CSS-Animation** ([globals.css](../app/globals.css) `.funnel-step-enter-fwd/-back`): alte Folie verschwindet im Schnitt, neue gleitet richtungsabhängig rein (600ms — Stavros-Wahl nach Stufen-Test 300/450/600, `cubic-bezier(0.22,1,0.36,1)`, 40px Weg, `prefers-reduced-motion` respektiert). transform/opacity laufen auf dem Compositor → lagfrei in jedem Browser inkl. Mobile. Kein Slide beim Initial-Render (`hasNavigatedRef` = Ersatz für `initial={false}`). Zwischenstand „AnimatePresence popLayout + LazyMotion" wurde verworfen — auch überlappende framer-Springs bleiben Main-Thread.
- **framer-motion komplett raus aus [funnel.tsx](../components/funnel.tsx)** (~30 KB weniger Widget-Bundle; Editor/Dashboard nutzen es weiter in CenterCanvas + TenantLeadsTable).
- **embed.js: iFrame-Höhe animiert** (`height 250ms ease`) — aktiviert erst NACH dem ersten Sizing (Doppel-rAF), damit der initiale 500px→Ist-Sprung nicht sichtbar „wächst". Beseitigt den Host-Seiten-Reflow-Ruck mitten im Folienwechsel.
- **DateInlinePicker-Preload**: Funnels mit Datumsfeld laden den react-day-picker-Chunk 800ms nach Mount — nie mehr Chunk-Nachladen + Skeleton mitten in der Slide-Animation. Funnels ohne Datum laden weiterhin nichts.
- **Browser-Zurück = eine Frage zurück** (Stavros-Wunsch, Typeform-Parität): pro Step-Advance ein `history.pushState` mit gemergtem Next-Router-State (URL unverändert), `popstate` führt den Schritt aus (vorwärts wie rückwärts, nur bereits besuchte = validierte Steps). Widget-Zurück-Pfeil läuft im Live-Modus ebenfalls über `history.back()` — EIN Pfad, Browser/Geste/Widget bleiben synchron. Funktioniert im iFrame-Embed (geteilte Session-History). Guards: Builder-Canvas/Test-Modus/read-only-Preview fassen die History nie an (`historyEnabled = !editMode && !onFieldClick && !onStepChange`); nach Submit bleibt der Success-Screen stehen.

([components/funnel.tsx](../components/funnel.tsx) · [public/embed.js](../public/embed.js) · [app/globals.css](../app/globals.css))

---

## Aufgabe 63 — Vorlagen-Chargen 2–6 (29 Branchen) + Snapshot-Härtung (2026-06-11 vorbereitet, **2026-06-12 angewendet**)

**Status:** Branch `feature/aufgabe-63-vorlagen-charge2`. Recherche für 29 Branchen abgeschlossen (Stavros-Auftrag mehrfach erweitert — Ziel jetzt 38 Vorlagen), alles anwendungsfertig vorbereitet. **Transfer-Session 2026-06-12 (mit Stavros-Go für alle DB-Writes): KOMPLETT auf Produktion angewendet** — Migration `aufgabe_63_snapshot_mails_active` via apply_migration, danach Chargen 2–6 je Datei als ein execute_sql-Call. Alle Verify-Soll-Werte exakt getroffen (Pages/Fields/Rules/Emails-Counts + alle Logik-Sprünge vorwärts), alle 29 Live-URLs `https://app.leadplug.de/demo-*` per SSR geprüft (laden mit korrektem Titel), 29 Templates publiziert (sort_order 100–380), Demo-Mails aller 29 Funnels deaktiviert (Gegenprobe: 0 aktive Subscriptions). Finale Gegenprobe über alle 38 Templates: `definition->emails[*].is_active` überall `[true, true]`. Ablauf-Tabelle: [`supabase/demo-funnels/README.md`](../supabase/demo-funnels/README.md).

**Inhalt:**
- **Snapshot-Härtung** (Kochbuch-Nacharbeit): Migration `20260611230000_aufgabe_63_snapshot_mails_active` (+ DOWN) — `snapshot_funnel_to_template` schreibt Drip-Mails in der Template-Definition IMMER als `is_active: true`. Die Republish-Falle ist damit konstruktiv weg.
- **Charge 2 (10–15):** Badsanierung · Treppenlift · Umzug · Pflege-Recruiting (Du) · BU-Versicherung · Zahnimplantate (sort_order 100–150).
- **Charge 3 (16–21):** Dachsanierung · Fenstertausch · Haartransplantation (lt < 25) · Hörgeräte · 24h-Betreuung · Küchenplanung (gte auf Budget-Slider) (160–210).
- **Charge 4 (22–27):** Garten-/Landschaftsbau · MPU-Beratung (Cross-Step-Condition: Punkte→Abstinenz-Skip) · Steuerberater · KFZ-Versicherungswechsel · Personal-Training (Du) · Nachhilfe (220–270).
- **Charge 5 (28–33):** Scheidung/Familienrecht · Webdesign (gte 15k auf Slider) · Fertighaus · Augenlasern · Entrümpelung · Alarmanlagen (280–330).
- **Charge 6 (34–38, nur 5):** Wintergarten/Terrassendach · Gebäudereinigung B2B (gte 5.000 m² auf number) · Privatkredit/Umschuldung (Selbstständige/Schufa→Beratung) · Bestattungsvorsorge (Trauerfall→Sofortkontakt, würdevoller Ton) · Schädlingsbekämpfung (Notfall + HACCP-Gastro→Sofortkontakt) (340–380).
- Alle 29 mit Web-Recherche-Beleg im SQL-Header (Lead-Markt + fachliche Qualifizierer), Welcome→5–6 Fragen→Kontaktkarte→Success, je 2 Drip-Mails, je 1–2 fachlich begründete Logik-Regeln, eigene Themes ohne Farb-Dopplung. Dateien `charge2–6_*` in [`supabase/demo-funnels/`](../supabase/demo-funnels/) (Anlage + Verify mit Soll-Counts + Publish + Mail-Deaktivierung pro Charge).
- **5 neue Galerie-Kategorien** Handwerk/Dienstleistung/Gesundheit/Pflege/Bildung: `CATEGORY_ICONS` in [`TemplateShowcase.tsx`](../components/dashboard/TemplateShowcase.tsx) um Wrench/Briefcase/HeartPulse/HeartHandshake/GraduationCap ergänzt (einzige Code-Änderung, Type-Check grün).

**Apply erledigt (2026-06-12):** README-Schritte 0–7 abgearbeitet, Kochbuch §0-Tabelle + Zähler nachgezogen (inkl. Republish-Falle als behoben markiert), Memory-Restplan aktualisiert. **Offen:** Branch `feature/aufgabe-63-vorlagen-charge2` mergen + deployen (CATEGORY_ICONS für Handwerk/Dienstleistung/Gesundheit/Pflege/Bildung + Galerie-Filter — bis dahin zeigt die Galerie für diese Kategorien das Sparkles-Fallback-Icon, kein Fehler).

**Nachpolitur nach Stavros-Galerie-Review (2026-06-12) — Triage-Mandat an Claude („polierbar → polieren, sonst raus"):**
- **Haartransplantation GELÖSCHT** (Template + Demo-Funnel; 1 Test-Lead bleibt als Snapshot im Posteingang): Branche lebt von Bild-Selbsteinschätzung (Norwood = Picture-Choice, bewusst nicht im Produkt) + Preis-/Türkei-Vergleich — Text-Funnel kann die echten Qualifizierer nicht abbilden, Umbau wäre Neubau. **Jetzt 37 Vorlagen.** Troll-Filter-Lektion im Kochbuch ergänzt („funktioniert die Vorqualifizierung ohne Bilder?"). Rollback: `charge3_03` + Publish-Snippet.
- **3 Regel-Polituren + 1 Seitentausch** (je 1-Zeilen-UPDATE, danach Republish der 4 Templates, Forward-Check grün): Entrümpelung-Express überspringt nur noch die Anlass-Frage (Festpreis braucht Fläche/Füllgrad — Widerspruch behoben) · Nachhilfe-Prüfungs-Weiche als Cross-Step-Regel an den Format-Step (überspringt nur Starttermin statt Format+Start) · Steuerberater-Privatperson überspringt auch die unpassende Leistungs-Auswahl (Lohn/Buchhaltung) · Schädlingsbekämpfung fragt Dringlichkeit vor Objekt (Gastro-Leads verlieren die Notfall-Info nicht mehr, Tenant-Mail referenziert sie).
- **Kategorie-Filter-Chips in der Vorlagen-Galerie** ([TemplateShowcase.tsx](../components/dashboard/TemplateShowcase.tsx)): Chip-Leiste „Alle (37)" + pro Kategorie (Icon + Anzahl, Reihenfolge = erstes Vorkommen, Toggle-Klick), Filter client-seitig — Antwort auf die 7000px-Scrollwand bei 37 Karten. Stavros-Entscheide: 2-Spalten-Layout bleibt (große Karten kaschieren bewusst die fehlenden Bilder), keine Suche/Pagination. Type-Check grün.
- Bewusst NICHT umgesetzt: Statement-Karte vor Sonderfall-Kontakten (~12 Vorlagen, würde Friction erhöhen — nur als Idee notiert), Treppenlift/GaLaBau-Grenzfälle (fachlich vertretbar, gelassen).
- **Mobile-Nachbesserung (Stavros-Screenshot-Review, Pixel 7):** (1) Chip-Leiste stapelte mobil auf 5 Zeilen → jetzt EINE horizontal scrollbare Zeile (`overflow-x-auto`, Scrollbar versteckt, Chips `shrink-0`), ab sm weiter mit Umbruch. (2) **Chip-Reihenfolge von Build-Chronologie auf Anzahl absteigend** umgestellt (Begründung: vordere Plätze = höchste Trefferchance, Handwerk (9) + Dienstleistung (8) = Kern der Zielgruppe statt „Energie (2)/Immobilien (1)" vorn; Gleichstand alphabetisch, pflegt sich selbst). (3) Vorschau-Modal-Header mobil: Zeile 1 = Name + X, „Vorlage verwenden" als volle eigene Zeile, erklärender Untertitel nur noch ab sm (war auf 412px ein gequetschtes 4-Zeilen-Knäuel mit truncated Titel).

**Platzhalter- + Number-UX-Politur (2026-06-12, Stavros-Befund, explizites Go für funnel.tsx):**
- **Widget-Kontaktfeld-Defaults** ([funnel.tsx](../components/funnel.tsx) Default-Fallback-Block): `full_name` „Voller Name"→**„Vor- und Nachname"**, NEU `email`→„name@beispiel.de", `tel`→„0151 23456789", `plz`→„z. B. 10115" — wirkt zentral für alle 37 Demos UND jeden künftig angelegten Funnel (Editor erzeugt Kontaktkarten ohne Platzhalter).
- **Number-Input entschlackt** (beide Render-Stellen): native Spinner per CSS weg (`[appearance:textfield]` + WebKit-Pseudos), `inputMode="numeric"` (mobile Zifferntastatur), Platzhalter-Support (`NumberConfig.placeholder` in [types/index.ts](../types/index.ts)). Einzelfrage zusätzlich: **Einheit klebt an der Zahl** via `field-sizing: content` (`supports-`-Fallback: alte Browser behalten volle Breite), Wrapper jetzt `<label>` (Klick auf die Zeile fokussiert).
- **Editor-Round-Trip** ([editorUtils.ts](../lib/editorUtils.ts)): `buildQuestionConfig` number trägt `placeholder` (sonst hätte der erste Editor-Save die Daten-Platzhalter gestrippt), `hasPlaceholder`-Spaltenliste + number, neues Feld „Platzhalter (optional)" im Number-Properties-Panel ([FieldProperties.tsx](../components/tenant-editor/v2/properties/FieldProperties.tsx)).
- **Daten:** 15 Number-Felder mit Beispielwert in Range-Mitte (Spalte + config — Einzelfragen lesen config, Karten die Spalte), 21 PLZ-Felder „12345"→„z. B. 10115". **Alle 37 Templates republished** (meta-getriebener Loop über `funnel_templates`), Gegenprobe: Platzhalter in Snapshots, 0 inaktive Mails. Type-Check grün. Long-/Short-Text hatten bereits gute „z. B. …"-Platzhalter, Dropdowns haben „Bitte wählen…" ✓. **Noch nicht committet/deployt.**

**Realitäts-Review Runde 2 (2026-06-12, Stavros-Befund „nach einer Frage zu den Kontaktdaten springen ist schlecht aufgebaut" — bestätigt):** Disqualifikations-Sprünge zur Kontaktkarte in **14 Funnels zurückgebaut** (alle 37 geprüft, alte 9 inklusive). Neues Design-Prinzip im Kochbuch (Schritt 2, „Drei Regel-Typen"): Skips immer gut · Fast-Track zur Kontaktkarte NUR bei Nutzer-Absicht (Notfall/Trauerfall/dringend) oder Formular-passt-nicht (B2B) · **Disqualifikations-Weichen (Mieter etc.) NIE als früher Sprung — Weichen-Frage stattdessen als letzte Frage vor der Kontaktkarte** (Kontaktabfrage am Punkt maximalen Commitments, Lead kommt vollständig an; das alte „bewährte Muster ‚Mieter→Kontakt'" aus Aufgabe 61 war ein Anti-Pattern). Konkret: Eigentums-Frage ans Ende + Mieter-Sprung raus bei Solar, Wärmepumpe, Badsanierung, Dachsanierung, Fenster, GaLaBau, Wintergarten (Solar/WP NEU: Gewerbe→Projektberatung — der Privat-kWh/m²-Slider passt für Gewerbe nicht; Fenster NEU: defekt→Terminfrage-Skip statt „>10→Kontakt"; Wintergarten: „Bauart unklar" zielt auf die Eigentums-Frage). Frühe Kontakt-Sprünge gelöscht bei PKV (Ü55; Studenten-Regel als Cross-Step nur noch Einkommens-Skip), Autoankauf (≤1999), BU (Ü50), KFZ (Wohnmobil), Personal-Training (jetzt bewusst regelfrei — 0 Regeln sind laut Kochbuch erlaubt). Retargets: Baufinanzierung (Objektsuche überspringt nur Kaufpreis), Zahnimplantate (ganzer Kiefer überspringt nur Bestandsdauer). Unverändert (sauber): Immobilien, Anwalt, Coaching, Recruiting, Umzug (B2B), alle Fast-Tracks. Verifikation: alle 7 neuen Strecken lückenlos mit Eigentum an vorletzter Position, alle Regeln vorwärts, 14 Templates republished (Beschreibungen angepasst), Gegenprobe 37/0-inaktive-Mails, demo-solar live geprüft.

---

## Aufgabe 62 — Vorlagen-Galerie + Funnel-Duplizieren (2026-06-11)

**Status:** Branch `feature/aufgabe-62-vorlagen-galerie`, Type-Check + Build grün. **Migration auf Produktion angewendet** (mit Stavros-Go), RPCs SQL-seitig getestet (Instanziierung + Duplikat erzeugt, Regeln korrekt auf neue Page-UUIDs gemappt, Test-Funnels danach gelöscht). 9 Templates veröffentlicht. **Manueller UI-Test durch Stavros ausstehend.**

**Warum:** Stavros verkauft die Demo-Funnels (Aufgabe 61) auch als Templates — dafür fehlte jeder Duplizier-/Vorlagen-Mechanismus. Architektur-Entscheide (abgefragt): **Snapshot-Tabelle** statt Live-Verweis (Demo-Edits ändern Templates NICHT — Veröffentlichen ist ein bewusster Schritt), Duplizieren für eigene Funnels gleich mit (Agentur kopiert Funnel je Endkunde), Drip-Mails Teil des Templates, Webhooks + Tracking-IDs werden NIE mitkopiert (kundenspezifisch).

**Migration** (`aufgabe_62_funnel_templates`, additiv, DOWN vorhanden — erst Code zurückrollen, dann droppen):
- **Tabelle `funnel_templates`**: `slug (unique) · name · description · category · preview_funnel_slug · definition jsonb · sort_order · is_active` + updated_at-Trigger. RLS: SELECT für `authenticated` (nur aktive), **keine Write-Policies** (Pflege nur Owner/Service). Definition-Format: `{funnel: {Theme+Texte}, pages: [{…, fields}], logic_rules: [Index-Referenzen], emails}` — Seiten via Array-Index, bei Instanziierung → frische UUIDs.
- **RPC `snapshot_funnel_to_template(funnel_slug, template_slug, name, description, category, sort_order)`**: veröffentlicht einen Live-Funnel als Vorlage (Upsert). EXECUTE für authenticated/anon revoked — Owner-only.
- **RPC `create_funnel_from_template(template_slug, tenant_id, notification_email)`**: instanziiert atomar (Funnel+Pages+Fields+Logik+Mails, eine Transaktion). SECURITY INVOKER — RLS-INSERT-Policies erzwingen den eigenen Tenant. Verwaiste Logik-Ziele werden übersprungen.
- **RPC `duplicate_funnel(source_slug)`**: Kopie im selben Tenant („Kopie von X", neuer Random-Slug). SECURITY INVOKER — RLS-SELECT blendet fremde Funnels aus → cross-tenant unmöglich. Kopiert auch `email_sender_local`/`redirect_url`/`hide_contact_warning`; NICHT `meta_pixel_id`/`google_ads_conversion` (falsches Pixel auf der Kopie wäre schädlich).

**Code:**
- [app/api/tenant/funnels/from-template/route.ts](../app/api/tenant/funnels/from-template/route.ts) — POST `{template}` → RPC → `{slug}`.
- [app/api/tenant/funnels/[slug]/duplicate/route.ts](../app/api/tenant/funnels/%5Bslug%5D/duplicate/route.ts) — POST → RPC → `{slug}`.
- **`/dashboard/funnels/new` = Vorlagen-Galerie** ([page.tsx](../app/dashboard/funnels/new/page.tsx) + [TemplateGallery.tsx](../components/dashboard/TemplateGallery.tsx)): „Leer starten"-Karte (dashed) + 9 Template-Karten (Brand-Farb-Chip, Kategorie-Badge, „Vorschau" → Live-Demo im neuen Tab, „Verwenden" → erstellt + springt in den Editor). Galerie lädt nur Metadaten + `definition->funnel->>primary_color` (nicht die volle definition).
- **Leerer Editor-Start nach `/dashboard/funnels/new/blank`** verschoben ([blank/page.tsx](../app/dashboard/funnels/new/blank/page.tsx)); `isEditorRoute` in [DashboardShell.tsx](../components/dashboard/DashboardShell.tsx) angepasst — die Galerie bekommt normales Dashboard-Chrome.
- **FunnelCard „Duplizieren"** ([FunnelCard.tsx](../components/dashboard/FunnelCard.tsx)): CopyPlus-Icon in der Hover-Aktionsreihe, Pending-Spinner, Fehler als rotes Icon (3 s, kein alert) — Erfolg refresht die Liste („Kopie von X" erscheint).

**Veröffentlichte Templates (9):** solar · waermepumpe · immobilienbewertung · baufinanzierung · pkv · anwalt-arbeitsrecht · coaching · recruiting-handwerk · autoankauf — Quelle = die Demo-Funnels, `preview_funnel_slug` zeigt auf die Live-Demos. Republish nach Demo-Polish: `SELECT snapshot_funnel_to_template('demo-solar','solar','Solar & Photovoltaik','…','Energie',10);` etc.

**Offen:** Admin-Button „Als Vorlage veröffentlichen" (heute via SQL-Funktion, Owner-only) · Monetarisierung der Templates (Beta: alle kostenlos enthalten).

**Runde 2 (Stavros-Review, 2026-06-11) — Vorlagen-Schaufenster + Funnel-Verwaltung:**
- **Eigener Menüpunkt „Vorlagen"** (`/dashboard/vorlagen`, [navItems.ts](../components/dashboard/navItems.ts) + [vorlagen/page.tsx](../app/dashboard/vorlagen/page.tsx) + [TemplateShowcase.tsx](../components/dashboard/TemplateShowcase.tsx)): große **Hero-Karten** (Brand-Farbverlauf via color-mix + Branchen-Icon-Wasserzeichen + Kategorie-Eyebrow — bewusst CSS statt Bild-Assets; echte Bilder können später ergänzt werden, Stavros-Konsens). **Vorschau-Modal** mit dark-blurred Backdrop und dem ECHTEN, durchspielbaren Funnel im iframe (`/{previewSlug}?preview=1` → zählt keinen Aufruf); „Vorlage verwenden" direkt im Modal.
- **„Neuer Funnel" = Modal mit Dark-Blur** ([NewFunnelModal.tsx](../components/dashboard/NewFunnelModal.tsx), Stavros: Erstellen ist eine „externe Aktion"): „Leer starten" prominent + kompakte Vorlagen-Schnellwahl + Link „Alle Vorlagen ansehen". Alle 4 CTAs (Dashboard-Kopf, Funnels-Kopf, Empty-State, Dashed-Karte) auf `NewFunnelButton` umgestellt. Die alte Galerie-Route `/dashboard/funnels/new` = Redirect auf `/dashboard/vorlagen` (TemplateGallery.tsx gelöscht); `isEditorRoute` matcht jetzt `/new/blank`.
- **Funnel-Karte: ⋯-Menü** ([FunnelCard.tsx](../components/dashboard/FunnelCard.tsx), Stavros-Befund „Deaktivieren/Löschen nicht auffindbar"): immer sichtbarer ⋯-Button (nicht hover-gated) mit beschrifteten Punkten **Duplizieren · Aktivieren/Deaktivieren · Löschen**. Löschen jetzt für ALLE Funnels (vorher nur inaktive) — der Dialog warnt bei aktiven explizit vor dem sterbenden öffentlichen Link. Neue PATCH-Route [active/route.ts](../app/api/tenant/funnels/%5Bslug%5D/active/route.ts) (User-Client + RLS, Muster contact-warning). [DeleteFunnelButton.tsx](../components/tenant-editor/DeleteFunnelButton.tsx) refactored: `DeleteFunnelModal` als eigener Export (Menü schließt sich beim Klick — ein im Menü gerenderter Trigger würde sein Modal mit abräumen). Geteiltes Vokabular in [templates.ts](../components/dashboard/templates.ts) (TemplateItem, Row-Mapper, Select-String, Fetch-Helper).
- **Entscheide aus dem Review:** Calculator abgelehnt (post-Beta) · File-Upload verschoben (post-Beta) — beide bewusst nicht Beta-Scope.

**Runde 3 (Stavros-Review mit Screenshots, 2026-06-11) — 4 Fixes:**
- **z-index ⋯-Menü:** Aktions-Container `z-10` → `z-20` — der Titel-Link (z-10, später im DOM) malte sich sonst ÜBER das aufgeklappte Menü ([FunnelCard.tsx](../components/dashboard/FunnelCard.tsx)).
- **Aufruf-Zähler beim Eigen-Ansehen:** „Funnel ansehen" auf der Karte verlinkt jetzt `/{slug}?preview=1` (Skip in TenantFunnelClient) — Betreiber-Blicke zählen keine Aufrufe mehr.
- **Vorschau-Modal in echter Funnel-Größe:** statt starrem `h-[70vh]` (leerer weißer Kasten) folgt die iframe-Höhe live der `funnel-resize`-postMessage des Widgets (dieselbe Mechanik wie `embed.js`, Source-gecheckt auf das eigene iframe, geclampt auf 260px–90vh, animiert).
- **Namens-Abfrage vor „Vorlage verwenden"** (Stavros: gleiche UX wie beim leeren Funnel): neuer [CreateFromTemplateDialog.tsx](../components/dashboard/CreateFromTemplateDialog.tsx) (spiegelt das NamePromptModal des Editors, Name vorbefüllt mit Vorlagen-Name, z-60 über den Modals) — genutzt vom Showcase, vom Vorschau-Modal und vom Neuer-Funnel-Modal (Esc dort gated, solange die Abfrage offen ist). **Migration `aufgabe_62_template_funnel_name`** (auf Prod, mit Test + DOWN): `create_funnel_from_template` um optionalen `p_funnel_name` erweitert (Signatur-Wechsel: alte 3-Param-Fassung gedroppt, Grants neu); leer → Fallback Vorlagen-Name.

**Runde 4 (Stavros-Screenshot-Review, 2026-06-11) — Lösch-Dialog war eine Sackgasse:**
Der DELETE-Endpoint blockt aktive Funnels (bewusster Server-Schutz) — das Modal aus Runde 2 bot aktiven Funnels aber einen „Dauerhaft löschen"-Button an, der nie funktionieren konnte; die Server-Fehlermeldung ging im Rot unter, dazu hässliche Umbrüche in der Konsequenzen-Liste. Fix (statt Stavros' Alternative „Modal bei aktiv gar nicht öffnen" — die würde 3 Aktionen erzwingen):
- **Neues [DeleteFunnelModal.tsx](../components/dashboard/DeleteFunnelModal.tsx)** (umgezogen aus `tenant-editor/DeleteFunnelButton.tsx`, ungenutzter Button-Wrapper gelöscht): bei aktiven Funnels erklärt ein **AMBER-Block** den Zwischenschritt (Zustand ≠ Konsequenz — hebt sich vom Rot ab) und der Primär-Button heißt **„Deaktivieren und löschen"** — führt PATCH `active=false` + DELETE nacheinander aus; der Server-Guard bleibt Backstop. Schlägt DELETE nach erfolgreicher Deaktivierung fehl, refresht die Karte auf den echten Stand.
- Konsequenzen-Liste als `<ul>` mit hängendem Einzug (Bullet + Text getrennt, kein Umbruch unters „—"), nicht mehr fett; Fehler als richtiger Banner mit Icon statt Mini-Zentrumstext.

**Runde 5 (Stavros, 2026-06-11) — Type-to-confirm im Lösch-Dialog:** Sicherheitsabfrage nach GitHub-Muster — der **Funnel-Name muss eingetippt werden** (bestätigt Absicht UND Ziel; Name statt „löschen"-Wort gewählt, damit bei vielen Karten der richtige Funnel bestätigt wird), Groß-/Kleinschreibung egal, Lösch-Button bis dahin disabled, Enter im Feld löst bei Übereinstimmung aus ([DeleteFunnelModal.tsx](../components/dashboard/DeleteFunnelModal.tsx)).

**Runde 6 (Stavros, 2026-06-11) — Dark-Mode-Kanon-Sweep + Vorlagen-Kochbuch:**
- **Design-System-Kanon nachgezogen** (Stavros-Befund „Standard-Dark-Mode vergessen"): Showcase-Karten bekommen die Dashboard-Hover-Tönung (`hover:bg-gray-50 dark:hover:bg-gray-800`), alle neuen Modal-Scrims auf Kanon `bg-black/50 dark:bg-black/40`, Inputs auf Input-Standard (`border-gray-300 dark:border-gray-600`, Placeholder `gray-300/gray-600`), erhöhte Hover IN gehoverter Karte auf `dark:hover:bg-gray-700` (Kanon „Noch höher").
- **[`vorlagen-kochbuch.md`](vorlagen-kochbuch.md)** geschrieben (+ CLAUDE.md §6-Eintrag): reproduzierbarer 6-Schritte-Prozess für die nächsten Vorlagen (Recherche-Strategien + Troll-Filter, Design-Regeln, SQL-DO-Block-Muster, exakte Datenshape-Referenz, Verifikations-SQL, snapshot-Publishing, Kandidaten-Liste). **Ziel: 25 Vorlagen, Stand 9** — die nächsten 16 baut ein frischer Chat nach dem Kochbuch.

**Runde 7 (Stavros, 2026-06-11) — Demo-Funnels verschicken keine Mails mehr:**
Vorschau-Submits sind ECHT (Leads landen gewollt in Stavros' Posteingang, `?preview=1` skippt nur den Aufruf-Zähler) — aber Vorschau-Spieler sollen keine Mails von fiktiven Firmen bekommen. **Alle 18 `email_subscriptions` der 9 `demo-*`-Funnels auf `is_active = false`** (per SQL, vor MCP-Ausfall verifiziert via RETURNING); `agenturen` (Dogfood) bleibt scharf. Die veröffentlichten Vorlagen-Snapshots sind entkoppelt und tragen die Mails aktiv → „Vorlage verwenden" liefert weiterhin scharfe Drip-Mails. Kochbuch ergänzt: Schritt 5b (Deaktivieren nach Publish) + **Republish-Falle** dokumentiert (snapshot kopiert `is_active` — vor Republish kurz aktivieren, ODER offene Härtung: snapshot publiziert Mails immer als aktiv; Umsetzung durch Supabase-MCP-Ausfall vertagt).

---

## Aufgabe 61 — Demo-Funnels (D.3): Dogfood + 9 Branchen-Demos live in der DB (2026-06-11)

**Status:** **Live auf Produktion** (reine Daten-Inserts, kein Code-Change, kein Schema-Change — deshalb kein Branch). Alle 10 Widget-URLs verifiziert (SSR lädt sauber). **Editor-Review durch Stavros ausstehend.** Stavros-Entscheid nach Runde 1: die Demos werden später auch **als Templates verkauft** — deshalb out-of-the-box-tauglich gebaut.

**Was:** Die Verkaufswaffe für Direct-Sales an DACH-Agenturen — 10 vollständige Funnels in Stavros' Konto, direkt per SQL angelegt (Stavros-Entscheid; Vorgehen + Konto + Anrede vorab abgefragt). Branchen-Wahl in 2 Web-Recherche-Runden: Runde 1 **Solar/PV** (größter DACH-Lead-Markt, 20–120 €/Lead), **Immobilienbewertung** (DER klassische Quiz-Funnel), **Recruiting Handwerk** (Perspectives Flaggschiff-Use-Case). Runde 2 (Erweiterung 4→10): **Wärmepumpe** (50–120 €/Lead, Förder-Welle), **Baufinanzierung + PKV** (Kern-Verticals der Finanz-Lead-Gen), **Anwalt Arbeitsrecht/Abfindung**, **Business-Coaching** (Termin-Funnel), **Autoankauf** (Bewertungs-Pattern wie Immobilien).

| Slug | Brand | Inhalt / Showcase |
|---|---|---|
| `agenturen` | LeadPlug selbst (Dogfood, **per Du**) | Welcome → Rolle → Tool → Bewertung (Rating) → Schmerz → Multi-Choice → Kontakt. Logik: „Noch gar nicht" überspringt Rating+Schmerz. Grün/Inter/zentriert |
| `demo-solar` | „Sonnkraft Solar" (Sie) | Gebäude → Eigentümer → Dachform → Verbrauch (Slider 1000–10000 kWh) → Zusatzinteresse (Multi) → Zeitraum → Kontakt (Name/E-Mail/Tel/PLZ). Logik: Mieter springen direkt zu Kontakt. Antworten-Übersicht AN. Orange/Poppins |
| `demo-immobilien` | „Wertblick Immobilien" (Sie) | Art → Wohnfläche (Number m²) → Baujahr → Zustand → Anlass (Dropdown) → Zeithorizont → Kontakt. **2 Logik-Regeln**: Grundstück überspringt Fläche/Baujahr/Zustand; Anlass ≠ Verkauf überspringt Zeithorizont (`neq`-Op). Blau/Inter |
| `demo-recruiting` | „Elektro Schneider" (**per Du** — Branchen-Norm im Handwerk-Recruiting) | Erfahrung → Vorerfahrung (Multi) → Führerschein → Starttermin (Date) → Kontakt (Tel Pflicht, E-Mail optional). **2 Regeln auf einem Step** (beide Ausgelernt-Werte überspringen Vorerfahrung). Rot/Roboto/zentriert |
| `demo-waermepumpe` | „WärmeWerk Haustechnik" (Sie) | Gebäudetyp → Eigentümer → Heizung → Wohnfläche (Slider) → Dämmung → **Förder-Checkbox (optional)** → Kontakt. Logik: Mieter → Kontakt. Teal/Inter |
| `demo-baufinanzierung` | „FinanzKompass" (Sie) | Vorhaben (Dropdown) → Kaufpreis (Number €) → Eigenkapital (Slider €) → Dringlichkeit → Kontakt. Logik: „suche noch Objekt" überspringt Kaufpreis+Eigenkapital. Grün/Inter |
| `demo-pkv` | „VersichertPro" (Sie) | Beruf → Alter (Number) → Einkommen → Status → Kontakt. **2 Regeln: Student (eq) + Alter ≥ 55 (`gte`, numerische Op!)** → direkt Kontakt. Indigo/Inter |
| `demo-anwalt` | „Kanzlei Berger Arbeitsrecht" (Sie) | Situation → Wann → Betriebszugehörigkeit (Number Jahre) → Betriebsgröße → **Fallbeschreibung (Long-Text, optional, maxLength 1000)** → Kontakt. 2 Regeln auf Step 1 („droht"/„anderes" überspringen je passende Fragen). Gold/Inter |
| `demo-coaching` | „Skala Business-Coaching" (**per Du** — Branchen-Norm) | Status → Umsatz → Themen (Multi) → **Dringlichkeit (Scale 0–10)** → **Statement-Step** („Coaching ist Arbeit") → Kontakt. Logik: Scale ≥ 8 (`gte`) überspringt Statement. Violett/Poppins/zentriert |
| `demo-autoankauf` | „AutoFair Ankauf" (Sie) | Marke (Dropdown 8) → Erstzulassung (Number) → km-Stand (Slider) → Zustand → Zeitpunkt → Kontakt (+PLZ Abholung). **2 Regeln: Erstzulassung ≤ 1999 (`lte`) + Unfall (eq)** → direkt Kontakt. Cyan/Roboto/zentriert |

**Pro Funnel zusätzlich:** 2 aktive Drip-Mails (Lead-/Bewerber-Benachrichtigung an `tenant` + Bestätigung an `customer`, beide delay 0, mit `contact.*`-Chips + `answers_overview`-Magic-Section) — im Sales-Call zeigt der E-Mails-Tab damit echten Inhalt. **Feldtyp-Abdeckung über alle 10 jetzt komplett:** single/multi_choice, slider, number, date, dropdown, rating, **scale, statement, checkbox, long_text**, short_text, full_name/email/tel/plz, welcome — und **15 Logik-Regeln** (eq, neq, **gte, lte**; Skip-, Fast-Track- und Disqualifikations-Patterns).

**Rollback:** `DELETE FROM funnels WHERE slug IN ('agenturen','demo-solar','demo-immobilien','demo-recruiting','demo-waermepumpe','demo-baufinanzierung','demo-pkv','demo-anwalt','demo-coaching','demo-autoankauf');` (pages/fields/rules/emails hängen per CASCADE dran; keine Submissions vorhanden).

**Strategie-Hinweis Templates:** Zum „als Template verkaufen" fehlt produktseitig noch ein **Funnel-Duplizier-/Vorlagen-Mechanismus** (Funnel in ein anderes Konto kopieren bzw. Vorlagen-Galerie beim Erstellen) — heute existieren Vorlagen nur auf Karten-Ebene (Kontakt/Adresse/Ja-Nein). Eigene Aufgabe, braucht Stavros-Go.

**Offen:** Stavros-Review im Editor (Texte/Farben nachpolieren); Landingpage für den Dogfood-Funnel existiert noch nicht (`app/page.tsx` redirectet zu `/dashboard`) — Funnel ist solange direkt via `app.leadplug.de/agenturen` verlinkbar; Vorschlag: Wegwerf-Funnels `mpqqqjcg`/`kwyliuev` löschen.

---

## Aufgabe 60 — Small-Screen-Verhalten: Editor-Guard + MobileNav + E-Mail-Vorschau-Umschalter (2026-06-11)

**Status:** Branch `feature/aufgabe-60-editor-small-screens`, Type-Check + Build grün, **manueller Test durch Stavros ausstehend**. Kein DB-Change, kein funnel.tsx-Touch.

Befund vom Test-Tag: der 3-Pane-Editor braucht real ≥1024px (StepList `clamp(280–340px)` + Properties `clamp(340–400px)` + Canvas), unterhalb quetschte sich das Layout kommentarlos kaputt UND es gab dort keinerlei Navigation (Icon-Sidebar ist `hidden lg:flex`, Editor-Routen rendern keinen MobileNav). Engster Punkt war der E-Mails-Tab: feste 680px-Vorschau-Spalte ließ dem TipTap-Editor bei 1280px nur ~250px, bei 1024px ~0px. Leitprinzip (Stavros): Dashboard überall nutzbar, Editor ehrlich guarden — „Ansicht auf klein" liefert die Live-Vorschau (`/slug?preview=1`), das Widget ist von Haus aus mobil.

- **Small-Screen-Guard** ([EditorShell.tsx](../components/tenant-editor/v2/EditorShell.tsx)): unter lg ersetzt eine Hinweis-Karte den Editor („Bearbeitung nur am großen Bildschirm" — Wording-Platzhalter für Stavros' Wort-Runde) mit Funnel-Name, „Funnel ansehen" (`?preview=1`, nur Edit-Modus) + „Zurück zur Übersicht" (läuft über `handleBack` → Ungespeichert-Dialog greift). Rein CSS (`lg:hidden` / Editor-Container `hidden lg:flex`): kein matchMedia, kein Hydration-Flicker, Editor-State bleibt beim Resize/Tablet-Drehen erhalten (nur versteckt, nicht unmounted). Name-Prompt im Create-Modus unter lg mitversteckt (`hidden lg:contents` — Namens-Abfrage ohne Editor dahinter wäre eine Sackgasse); ExitModal bewusst auf allen Breiten sichtbar.
- **MobileNav auf Editor-Routen** ([DashboardShell.tsx](../components/dashboard/DashboardShell.tsx)): Editor-Branch rendert jetzt den MobileNav mit (selbst `lg:hidden` → Desktop unverändert). Unter lg gibt es damit Logo, Theme-Toggle + volles Menü zurück; MobileNav nutzt `guardedClick` → Exit-Guard funktioniert automatisch.
- **E-Mails-Tab: „Bearbeiten | Vorschau"-Umschalter** ([EmailsPanel.tsx](../components/tenant-editor/v2/EmailsPanel.tsx)): Side-by-Side (Editor + resizable 632–1100px-Vorschau) bleibt ab `SPLIT_PREVIEW_MIN_WIDTH = 1440px`; darunter 2-Spalten-Grid (Liste + Arbeitsfläche) mit zentriertem Segmented-Control (TopTabs-Optik) — Arbeitsfläche zeigt Editor ODER Vorschau. Die Vorschau ist legitim ~600px breit (E-Mail-Standard), deshalb Umschalter statt Quetschen. Der TipTap-Editor bleibt beim Umschalten **gemountet** (nur `hidden`) → Cursor/Undo-Stack überleben; Vorschau-Spalte als geteiltes Fragment (`previewColumn`), es rendert immer nur EINE `PreviewPane`-Instanz. Draft-Lift/Auto-Save unangetastet — die Vorschau zeigt weiterhin den Live-Draft.
- **Neuer Hook** [lib/useMinWidth.ts](../lib/useMinWidth.ts): `useMinWidth(px)` via `useSyncExternalStore` + matchMedia — SSR-Snapshot true (breit), Client korrigiert nach Hydration ohne Mismatch-Fehler; reagiert live auf Resize.
- **Review-Runde (Stavros):** (a) E-Mail-Umschalter von TopTabs-Pill-Optik auf den **Inhalt|Design-Inspektor-Stil** umgestellt (`bg-primary/10 text-primary` aktiv, `max-w-xs` zentriert, h-14 fluchtet mit dem Listen-Header) — zwei identische Segmented-Controls direkt übereinander sahen nach doppelter Navigation aus. (b) Guard-Karte war nicht vertikal zentriert (min-h-calc griff nicht) → Wrapper jetzt `fixed inset-x-0 bottom-0 top-14` (gleiche Mechanik wie der Editor-Container) + `m-auto`-Karte; füllt garantiert den Rest-Viewport, degradiert zu Scroll. (c) Entscheid bestätigt: **kompletter Editor-Shell guarded** (alle Tabs) — jeder Tab ist Bearbeitungsfläche (Automations inkl.), „Link kopieren" für unterwegs gibt es bereits auf der FunnelCard im Dashboard.
- **Review-Runde 2 (Stavros):** (a) **E-Mail-Vorschau fluid** (mit Go): die Mail-Card war schon `w-full max-w-150`, nur das Drag-Minimum (632) erzwang Desktop-Breite. Jetzt: Drag-Min 440 (schmaler = Mobil-Darstellung — die echte Mail ist via `DynamicEmail.tsx maxWidth:600` genauso fluid), Grid-Spalte `minmax(0, rightWidth)` + Editor-Spalte `minmax(360px, 1fr)` → CSS clampt die Vorschau auf den verfügbaren Platz, der TipTap-Editor wird nie unter 360px gedrückt. Dadurch `SPLIT_PREVIEW_MIN_WIDTH` 1440→**1200** — 1280/1366er-Laptops behalten Side-by-Side, der Umschalter greift erst darunter. (b) **Funnel-Name im Editor-Header**: Stift-Button entfernt (redundant — Klick auf den Namen editiert direkt, Hover zeigt Rahmen + Tooltip) und die `ch`-Schätzbreite durch einen unsichtbaren Spiegel-Span im `inline-grid` ersetzt (Input exakt so breit wie der Text, `max-w-72`-Cap) — der Live-Vorschau-Button hing durch Slack-Breite + unsichtbaren Stift ~50px vom Namen entfernt. **Wichtig fürs Muster:** das Input braucht zusätzlich `size={1}`, sonst zählt die Browser-Default-Eigenbreite von Inputs (`size=20` ≈ 170px) im Grid als Mindest-Spaltenbreite und der Span greift erst ab ~20 Zeichen (Stavros-Befund: Restplatz rechts im Feld). (c) Umschalter-Buttons kompakt (Breite = Inhalt statt `flex-1`-Stretch — Labels standen als verlorene Inseln auseinander). (d) Hinweis-Zeile „Mail-Container max. 600 px" über der Vorschau entfernt (Stavros: braucht keiner).
- **Runde 4 (Stavros):** (a) **alert() komplett raus aus der App**: die letzten 3 nativen Browser-Alerts (Cockpit-PATCH-Fehler, DangerZone Toggle/Delete) durch dismissbare Inline-Fehlerbanner im Design-System-Stil ersetzt (rot, TriangleAlert + X; Modal schließt bei Fehler, Banner in der Karte erklärt; Cockpit-Banner bestätigt explizit den Optimistic-Rollback). (b) **Defense-in-Depth Admin-Reads**: `lib/admin/queries.ts` gated sich jetzt selbst (`assertSuperadmin()` in getWorkspaces/getWorkspaceDetail — Next rendert Layout+Page parallel, die Service-Key-Reads verlassen sich nicht mehr allein aufs Layout-Gate). (c) **Architektur-Diagramme komplett nachgezogen** ([architektur-diagramme.md](architektur-diagramme.md), gegen Code + Live-DB verifiziert): ER + `funnel_logic_rules` (fehlte komplett!) + `email_delivery_attempts.is_test` + 4 funnels-Spalten (56/57D); Sequenz Rate-Limit 3→10-completed korrigiert + computePath-Backstop + Logik-Hinweis; App-Komponenten AdminWorld→/dashboard/admin + adminApi + admin/queries; Funnel-Journey + Logik-Sprung-Verzweigung; Produkt-Überblick + „Logik"; Capability-Map 10→11 Sektionen (neue Karte „Logik-Sprünge") + Admin-Schnittstelle aktualisiert. Eraser-Online-Ansicht: Einpflege ausstehend (MCP-Auth bzw. Copy-Paste der DSL-Blöcke).
- **Admin-Bereich → /dashboard/admin (Stavros-Wunsch, Runde 3):** `/admin` war eine losgelöste Eigen-Welt (eigenes Layout, eigener Header, 0 % responsive). Jetzt: Routen nach [app/dashboard/admin/](../app/dashboard/admin/) gezogen → erben DashboardShell (Sidebar, MobileNav, Container, Dark-Mode, Responsive-Standards); Superadmin-Gate (notFound) bleibt im Admin-Layout, Standalone-Chrome ersetzt durch Seiten-Überschrift im Dashboard-Stil. Alte URL `/admin` = gated Redirect (Bookmarks; `/admin/[tenantId]`-Deep-Links bewusst nicht — 404). Links umgestellt (Sidebar ×2 inkl. neuem Aktiv-Zustand `bg-amber-500/10`, Cockpit ×2, DangerZone, Detail-Backlink); `track-view`-Referrer-Filter (`includes('/admin/')`) matcht den neuen Pfad weiter. **Workspaces-Tabelle responsive:** `-mx-4 overflow-x-auto px-4`-Wrapper (x-Scroll in der Karte statt Seiten-Overflow), `whitespace-nowrap` im Kopf (kein zweizeiliges „Letzter Lead" mehr), Spalte w-20→w-24. Lead-Zeilen im Workspace-Detail: Datum erst ab `sm` (Phone-Breite gehört dem Namen).

---

## Aufgabe 59 — Logic-Map: read-only Logik-Übersicht im „Logik"-Tab (2026-06-11)

**Status:** Branch `feature/aufgabe-59-logic-map`, Type-Check + Build grün, **manueller Test durch Stavros ausstehend**. Kein DB-Change, kein funnel.tsx-Touch.

Stufe 2 der Logik-Sprünge (das Demo-/Verkaufsargument): der bisher deaktivierte „Logik"-Tab zeigt jetzt den Funnel-Fluss als horizontale Karten-Kette mit Sprung-Bögen — **custom SVG, KEIN React Flow, keine neue Dependency**. Read-only by design (User-Entscheid): das LogicRuleModal aus Aufgabe 58 bleibt der einzige Schreibweg.

- **Neue Komponente** [LogicMapPanel.tsx](../components/tenant-editor/v2/LogicMapPanel.tsx): Steps (inkl. Welcome als erste Karte + ausgegraute Hidden-Steps mit EyeOff) + „Ende"-Node (SUCCESS_META) in einer Reihe; Standard-Fluss = graue Kanten zwischen Nachbarn; Sprung-Regeln = emerald Bézier-Bögen darüber (vorwärts-only ⇒ alle Bögen nach rechts; Bogen-Höhe ∝ Sprungdistanz + Lane-Stacking bei Kollision). Fallback-Regeln („Alle anderen Fälle") gestrichelt. **Warn-Fälle amber zum Nachbarn degradiert** (wie die Runtime es tut): Ziel gelöscht (`target_page_id NULL`/Step entfernt) und ungespeichert-rückwärts (Step vor die Quelle gezogen) — Tooltip erklärt jeweils warum. Bogen-Hover = `<title>`-Tooltip mit Regel-Lesefassung.
- **Interaktionen (nach Stavros-Review umgebaut — „Topform, nicht ok"):** **Karten-Klick öffnet das LogicRuleModal** (Logik ist die Hauptaktion dieser Seite — die ursprüngliche Navigation in den Bearbeiten-Tab fühlte sich falsch an); Stift-Icon (Hover, oben rechts an der Karte) springt in den „Bearbeiten"-Tab; Welcome/Ende-Karten (keine Logik möglich) navigieren direkt. Status-Zeile unten an jeder Karte zeigt den Logik-Stand („2 Sprung-Regeln" emerald / „Logik hinzufügen" / „Erst speichern" bei ungespeicherten Steps, Karte dann disabled mit Tooltip). Modal lebt am Shell-Root, funktioniert tab-übergreifend. Ohne Regeln: Info-Banner mit CTA über der trotzdem sichtbaren Kette.
- **Canvas-UX (Polish-Runde):** **Auto-Fit beim Öffnen** (ganzer Funnel sofort sichtbar, kein Scroll-Zwang) · **Drag-Pan mit Linksklick** (Pointer-Capture, grab/grabbing-Cursor, Karten/Controls via `data-map-stop-pan` ausgenommen) · **Zoom 25–175 %** via Strg/Cmd+Mausrad (non-passive Listener, zoomt um den Cursor) + Figma-Stil-Controls unten rechts (−/%-Reset/+/Fit) · **Hover-Emphasis**: Karte oder Bogen hovern hebt die zugehörigen Sprünge hervor (dicker, voll opak) und dimmt alles andere · **Custom-Tooltips** (sofort, gestylt, fixed-positioniert) statt nativer title-Tooltips · **Klartext-Legende** unten links („Standard-Ablauf (der Reihe nach)" / „Sprung bei passender Antwort" / „Sprung für alle anderen Antworten" / „Regel ohne Wirkung — Ziel fehlt oder liegt davor" — der v1-Jargon „Sprung-Regel/Hinweis" war nicht selbsterklärend). Zoom via CSS-Transform (Größen-Wrapper trägt skalierte Maße für korrekte Scroll-Geometrie/Zentrierung). **Feinschliff-Runden 2+3 (Stavros):** Anleitungs-Satz aus dem Header raus (Interaktionen müssen sich selbst erklären) — stattdessen **Nutzwert im Header**: Kennzahlen („8 Schritte · 3 Regeln"), **amber Warn-Chip** „N Regeln ohne Wirkung — anzeigen" (klickbar: zentriert die betroffene Regel auf der Map, zoomt auf min. 85 %, hebt den Bogen hervor + zeigt das Erklär-Callout am Scheitel; bei mehreren springt jeder Klick zur nächsten; Fokus endet bei der nächsten Bühnen-Interaktion) und **„Funnel testen"-Button** (springt in den Bearbeiten-Tab + aktiviert den Test-Modus — Logik bauen → sofort durchspielen). Scrollbalken bleiben sichtbar (Stavros-Entscheid: Verstecken ist ein No-Go) — aber schmal/dezent gestylt statt OS-Default; Legende + Zoom-Controls auf `bottom-6`, damit der sichtbare Abstand zur linken Marge passt. Start-Fit-Untergrenze 65 % (Fit-Button weiterhin grenzenlos), Icon-Pille vertikal mittig (`items-center`), Wording „Sprung-Regeln" → „Regeln" (finale Wort-Runde macht Stavros produktweit). **Browser-Zurück-Fix (EditorShell):** der aktive Editor-Tab lebt jetzt in der URL (`?tab=logic|emails|webhooks|share`, Bearbeiten = ohne Param) via shallow `history.pushState` — Next synct `useSearchParams` ohne Server-Roundtrip, Editor-State bleibt erhalten. Browser-Zurück/Vor (+ Maustasten) wechseln damit zwischen Tabs statt aus dem Editor zu werfen; Tab-Deep-Links sind refresh-fest und teilbar.
- **Geteilte Lesefassung** [lib/logicDisplay.ts](../lib/logicDisplay.ts) (neu): `stepNumbersByDbId` (Welcome zählt nicht) · `logicOpPrefix` · `conditionValueLabel` (Choice-Slug→Label) · `ruleConditionText` · `ruleTargetLabel` — aus `PropertiesPanel.LogicSection` herausgehoben, Panel auf die Lib umgestellt (Verhalten identisch). Map + Panel sprechen dieselbe Sprache.
- **Verkabelung:** [TopTabs.tsx](../components/tenant-editor/v2/TopTabs.tsx) Tab `logic` enabled („bald"-Badge weg); [EditorShell.tsx](../components/tenant-editor/v2/EditorShell.tsx) neuer full-width-Branch nach Webhooks-Muster inkl. „Funnel zuerst speichern"-Hinweis im Create-Modus. Alle Daten (`state.questions` + `logicRules`) lebten schon im Shell — kein neuer Fetch.
- **Feinschliff-Runde 4 (Stavros):** (a) Konsistenz Legende↔Canvas: **„kaputt" überstimmt den Fallback-Stil** — Regeln ohne Wirkung rendern immer durchgezogen amber, nie gestrichelt (vorher konnte ein kaputter Fallback gestrichelt-amber erscheinen, Legende zeigte aber durchgezogen). (b) **Test-Modus als Spotlight**: solange der Test läuft, dunkeln Blur-Overlays ALLES außer dem Widget ab — StepList + Properties-Spalte (`TestModeOverlay` in EditorShell) UND die Canvas-Bühne inkl. Punktraster/Banner (Overlay z-10 in CenterCanvas; Widget-Wrapper hebt sich mit z-20 darüber, die schwebenden Controls bleiben z-20 bedienbar). Klick auf jede abgedunkelte Fläche beendet den Test. (c) Entscheid: **kein Zoom im Bearbeiten-Tab** (WYSIWYG zeigt echte Größe; Desktop/Mobile-Toggle ist dort das Äquivalent). (d) Entscheid: **Undo/Redo bleibt exklusiv am Bearbeiten-Tab** — der Verlauf gehört zum Dokument (EditorState); Ressourcen-Tabs speichern server-seitig pro Eintrag, ein Undo dort wäre eine versteckte destruktive Aktion bzw. ein totes Versprechen. (e) **Kontaktierbarkeits-Banner schwebt** jetzt unter der Control-Zeile (absolute, top-16, Breite = Karten-maxWidth, shadow-lg) statt im Dokumentfluss — die Karte bleibt exakt zentriert, ob Banner oder nicht (Stavros-Befund: Banner schob die Frage nach unten). (f) Modal-Backdrop-Konsistenz: Account-Lösch-Dialog auf den App-Standard `bg-black/50 + backdrop-blur-sm` angeglichen (einziger Ausreißer; alle Editor-Modals teilen die EditorModal-Chrome, die das schon hatte). (g) **Danger-Button-System** (Stavros-Entscheid): Inline-Löschen-Trigger hovern dezent getönt (`hover:bg-red-50` / dark `red-900/20`) statt Voll-Rot — geändert am geteilten `EditorButton danger` ([Controls.tsx](../components/tenant-editor/v2/ui/Controls.tsx), trifft E-Mail-/Webhook-Löschen etc.) + „Account löschen"-Trigger; das satte `bg-red-600` bleibt exklusiv den finalen Bestätigungs-Buttons in Dialogen (ConfirmModal & Co). Warnbanner-Abstand zur Control-Zeile vergrößert (top-16→top-20). (h) **„Mittig" ist jetzt ein Karten-Layout-Modus** (mit User-Go für funnel.tsx): `titleAlignment === "center"` zentriert zusätzlich Rating-Sterne, Skala-Chips und die Bottom-Button-Zeile (Zurück + OK — auf der Mittelachse, bewusst nicht rechts: rechtsbündige Buttons sind die Konvention linksbündiger Wizards). Vollbreite Elemente (Choice-Optionen, Text-Inputs, Slider, Checkbox-Box) bleiben unverändert — zentrierter Input-Text wäre UX-Murks. ThemePanel-Label „Überschriften-Ausrichtung"→„Ausrichtung", Hint angepasst. Kein DB-Change (Spalte `title_alignment` bleibt, Wirkung breiter). Nachschliff: Bei Auto-Advance-Steps (single_choice) ankert der Zurück-Pfeil im Mittig-Layout absolut links (Chrome ≠ Inhalt) — zentriert klebte er als Paar am Schritt-Badge; Badge-Zeile mit fester h-5 gegen Höhen-Kollaps. (i) **beforeunload-Guard**: Tab schließen / F5 / externe Navigation mit ungespeicherten Änderungen → nativer Browser-Dialog (der `__editorGuard` fängt nur In-App-Links; bekannte Rest-Lücke: Soft-Navigation via Browser-Zurück zu anderen App-Routen ist nicht blockierbar). (j) **Logik an ausgeblendeten Schritten = „Regel ohne Wirkung"**: hidden Steps fliegen live aus `visibleQuestions` — ihre Regeln laufen nie, Sprünge auf sie degradieren zu „weiter". Jetzt sichtbar: amber Bogen auf der Map (Quelle ODER Ziel hidden, Tooltip erklärt), `ruleTargetLabel` + neues `hiddenPageIdSet` in [logicDisplay.ts](../lib/logicDisplay.ts) (Panel zeigt „Schritt N ist ausgeblendet → weiter" + amber Hinweis am hidden Quell-Step); Warn-Chip zählt die Fälle mit. (k′) **Lang-Text-Felder wachsen mit dem Inhalt** (funnel.tsx, beide Renderer — Karte + Einzelfrage): `rows={3}`→`rows={1}` + `autoGrowTextarea` (ref für restaurierte Antworten + onInput beim Tippen, overflow-hidden gegen Scrollbar-Flackern) — vorher klebte der Platzhalter oben in einer hohen leeren Box, die Underline hing zwei Zeilen tiefer (Stavros-Befund); jetzt sitzt er wie bei allen Underline-Feldern direkt über der Linie (Typeform-Pattern). (l) **Tastatur-Bedienung im Widget** (funnel.tsx, mit User-Go — Typeform-Parität): A–Z bzw. 1–9 wählen Antwort-Optionen (beide Tastengruppen unabhängig vom Marker-Stil; single_choice advanced wie ein Klick, multi_choice toggelt), Enter bestätigt OK/Weiter/Start. Guards: nie im editMode/nach Submit, nie bei Fokus in Input/Textarea/Select/contentEditable (Felder regeln Enter selbst), Enter nicht bei fokussiertem Button (nativer Klick reicht, sonst doppelt), keine Modifier-Keys. (m) **Admin-Bereich aufs Design-System angeglichen**: Inline-`fontFamily: system-ui` am `/admin`-Root entfernt (lief nicht auf App-Font Inter → wirkte fremd), Header trägt die `border-b-2 border-primary`-Signatur, Workspaces-Tabelle bekommt `shadow-sm` (Card-Look), `window.confirm` im Cockpit durch das gestylte `ConfirmModal` ersetzt (aus [WorkspaceDangerZone](../components/admin/WorkspaceDangerZone.tsx) exportiert); `alert()`-Fallbacks in Fehlerpfaden bewusst belassen. (n) **Leads-Board-Toolbar** ([TenantLeadsTable](../app/dashboard/TenantLeadsTable.tsx)): Board hatte eine fast leere Kopfzeile + vollbreite Solo-Suche (Stavros: „total schlecht gelöst") — jetzt EINE Zeile: kompakte Suche (sm:w-72) + Funnel-/Zeit-Filter links, View-Umschalter rechts (`renderToolbar` um `compact`/`trailing` erweitert); die Tab-Zeile rendert nur noch in der Liste (Board-Spalten SIND der Status). Liste unverändert (abgenommen). (o) **Admin-Lead-Detail = Dashboard-Muster**: aufgeklappte Leads in `/admin/[tenantId]` nutzen jetzt exakt das LeadDetailBody-Layout der Leads-Liste (border-t primary/20, zwei graue rounded-xl-Boxen, Label über Wert gestapelt) statt flacher „Label: Wert"-Zeilen. (p) **Long-Text-Entscheid**: bleibt einzeilig + Auto-Grow (Typeform macht es exakt so; 3 Zeilen mit Platzhalter „unten auf der Linie" sind technisch nicht sauber machbar — Platzhalter sitzt immer am Text-Einfügepunkt oben). Unterschied zu Kurz-Text jetzt sichtbar: Hinweis „Shift ⇧ + Enter ↵ für eine neue Zeile" unter der Einzelfrage (funnel.tsx; Karten-Felder brauchen ihn nicht — dort macht Enter ohnehin den Umbruch). (q) **Funnel-Karten modernisiert** ([FunnelCard.tsx](../components/dashboard/FunnelCard.tsx), Stavros: „outdated"): ganze Karte klickbar → Editor (Overlay-Link-Pattern, Titel bleibt echter Link); Hover = App-Standard der Dashboard-Karten (Karte tönt sich `hover:bg-gray-50 dark:hover:bg-gray-800` + `border-primary/40` + Schatten, kein Lift — Stavros-Korrektur Runde 2; Icon-Buttons hovern eine Flächen-Stufe höher `dark:gray-700`), Kennzahlen als Typografie statt grauer Kästen, Brand-Farb-Chip des Funnels neben dem Titel (Wiedererkennung pro Endkunde), Sekundär-Aktionen (Öffnen · Link kopieren · Löschen bei inaktiv) als Hover-Icon-Reihe oben rechts (Touch: immer sichtbar), Footer-Text-Links entfallen. Dazu Fixes: Kanban-Spalten bekommen `mt-3` Luft zur Toolbar; `DeleteFunnelButton` icon-/badge-Varianten hatten **keine** Hover-Styles → dezente rote Tönung nach dem Danger-Trigger-System. (k) **Totes `?v=2`-Flag entfernt** (`withV2Flag` in EditorShell): beide Editor-Seiten rendern EditorShell seit dem v1-Aus bedingungslos, Alt-URLs mit v=2 bleiben gültig (Param wird ignoriert). Ordner-Umbenennung `tenant-editor/v2/` bewusst aufgeschoben (reiner Kosmetik-Refactor, nicht vor dem Test-Tag).
- **Bugfix Sichtbarkeit Welcome-/Custom-Pages (in Runde 4 entdeckt):** „Sichtbar im Funnel" persistierte für Welcome- und Karten-Steps **nie** — der Save-Pfad schrieb kein `visible` (nur Question-Pages speichern es am Field), Editor-Load + `getTenantConfig` setzten hart `visible: true` → nach Reload wieder sichtbar, auch im Live-Widget. Fix additiv im jsonb (kein Schema-Change): [`editorStateToPagesAndFields`](../lib/editorUtils.ts) schreibt `visible` ins page-config von welcome/custom, beide Load-Pfade ([editorUtils](../lib/editorUtils.ts) + [getTenantConfig](../lib/getTenantConfig.ts)) lesen `pageCfg.visible !== false` (Alt-Rows ohne Key → sichtbar). Widget + Submit-Backstop filtern bereits auf `visible` — Kette jetzt durchgängig.

---

## Aufgabe 58 — Logik-Sprünge Stufe 1 (Logic Jumps, C.4) (2026-06-11)

**Status:** Branch `feature/aufgabe-58-logic-rules`, Type-Check + Build grün, Migration auf Prod (mit User-Go) + RPC SQL-getestet, **manueller Test durch Stavros ausstehend**.

Konzept aus 2 Diskussionsrunden (Typeform-Screenshots): Regeln werden **an der Frage** definiert (bewusste Abweichung vom Action-Element-Pattern — Logik ist der Fluss, kein Output), **nur Vorwärts-Sprünge** (Zyklen per Konstruktion unmöglich), Stufe 2 = read-only Logic-Map (Aufgabe 59).

- **DB:** Tabelle `funnel_logic_rules` + RLS + RPC `replace_page_logic_rules` (atomar, SECURITY INVOKER) — Details `context/supabase-schema.md`. Regeln überleben das Funnel-Speichern (stabile Page-UUIDs aus Aufgabe 54); Step-Löschung CASCADEt die Regeln, Ziel-Löschung → SET NULL → Regel degradiert zu „weiter" + Editor-Warnung.
- **Shared Evaluation** [lib/funnelLogic.ts](../lib/funnelLogic.ts): `evaluateConditions` (Ops: eq/neq · contains [Freitext-Substring] · includes [multi_choice] · gt/gte/lt/lte [numerisch], UND) · `resolveNext` (sort_order, erste matcht, sonst Fallback, sonst null=weiter) · `computePath` (Pfad-Simulation, vorwärts-only ⇒ terminiert). Row-Mapping geteilt in [lib/logicRuleMapping.ts](../lib/logicRuleMapping.ts). **Vergleichs-Semantik typ-tolerant** (Stavros-Testbefunde „Stavros ≠ stavros" + „Slider braucht ≥/≤"): trim + case-insensitiv, Zahlen numerisch inkl. Dezimal-Komma, numerische Ops matchen nie auf Nicht-Zahlen (leere Antwort springt nie). Das Modal bietet pro Feldtyp nur passende Ops an (Choice: ist/ist nicht · Text: +enthält · Numerisch: ist/≥/≤/>/</ist nicht); Panel-Kurzfassung zeigt Operator-Präfix („Wenn ≥ „4" → Schritt 5").
- **Widget-Runtime** ([funnel.tsx](../components/funnel.tsx), mit User-Go): `resolveAdvanceIndex` in handleNext/handleSelect (Ziel-Index nur > aktuell, `end` → autoFinish), **History-Stack** (`stepHistoryRef`) — „Zurück" geht den tatsächlich besuchten Weg; übersprungene Pages feuern keine after_page-Webhooks (advancen nie). `logicRules` reist via `TenantConfig` → [TenantFunnelClient](../components/TenantFunnelClient.tsx); ohne Regeln exakt lineares Verhalten.
- **Server-Backstop pfad-sensitiv** ([/api/submit](../app/api/submit/route.ts)): `computePath` mit denselben Regeln/Antworten → Pflichtfelder nur **besuchter** Custom-Pages validiert (die bekannte Stolperfalle: übersprungene Pflicht-Karte darf Leads nicht blocken).
- **getTenantConfig** lädt Regeln defensiv (eigene Query + catch — Fehler ⇒ linear, Widget stirbt nie).
- **API:** GET [`/logic`](../app/api/tenant/funnels/[slug]/logic/route.ts) (LogicRule[] camelCase) · PUT [`/logic/[pageId]`](../app/api/tenant/funnels/[slug]/logic/[pageId]/route.ts) (ersetzt via RPC; validiert Limits, Ops-Whitelist, max 1 Fallback, **Vorwärts-only via sort_order-Vergleich** — zweites Schloss).
- **Editor:** Panel-Sektion „Logik" (Kurzfassung mit Operator-Präfix + „Logik bearbeiten", Hinweis bei ungespeicherten Steps) · [LogicRuleModal](../components/tenant-editor/v2/LogicRuleModal.tsx) (Typeform-Layout: Wenn/ist/Wert → gehe zu, „+ Bedingung" UND, ↑/↓-Reihenfolge, „Alle anderen Fälle", Wert-Picker je Feldtyp, Value-Ableitung = Save-Pfad `o.value || toKey(o.label)`) · **StepList-Badges** (emerald `Split`-Icon, Klick öffnet Modal) · **Test-Modus führt Sprünge aus** (`buildQuestions` reicht `dbId` als `pageId` durch, CenterCanvas übergibt Regeln nur im Test-Modus).
- **Review-Fixes (Stavros-Tests):** (a) **questionKey-Merge nach Save** — unbetitelte Frage-Steps hatten editor-seitig leeren `questionKey` (DB-Key wird beim Save generiert) → Logik-Speichern blieb grau; jetzt gibt `editorStateToPagesAndFields` den finalen Key im `pageIdByClientId`-Mapping zurück und der Save merged ihn (wie dbId, `_keyTouched: true`); Modal zeigt für Alt-Steps ohne Key einen amber Hinweis „einmal speichern". (b) Operator-Dropdown war zu schmal (`w-28`→`w-44`, „mindestens (≥)" wurde abgeschnitten). (c) Canvas-Options-Selektion ringt nur noch das Options-Textfeld, nicht die ganze Panel-Zeile (Chip/Mülleimer raus — Konsistenz zur 57C-Regel „Ring nur auf dem Eingabefeld").

---

## Aufgabe 57 — Restposten-Sprint (2026-06-10, laufend)

Plan: Block A Hygiene → Block B Test-Mails in Versand-Historie → Block C Karten-Felder im Canvas verkabeln. Danach Block D (Demo-Templates / Logik-Tab / Config-Cache) als je eigene Aufgaben.

- **Block D (ad hoc) — Kontaktierbarkeits-Warnung entschärft** (Branch `feature/aufgabe-57d-contact-warning-polish`, Stavros-Wunsch „muss entfernbar sein"): Banner hat X → quittiert pro Funnel (Migration `aufgabe_57d_hide_contact_warning`, additiv, auf Prod mit User-Go; PATCH [`/contact-warning`](../app/api/tenant/funnels/[slug]/contact-warning/route.ts), Best-Effort + bewusst außerhalb EditorState/Undo — wirkt sofort, kein Save). Nach Quittierung: dezenter Amber-Dreieck-Marker neben dem Geräte-Umschalter (Tooltip, Klick holt Banner zurück). Zwei Warnstufen statt Vollwarnung: **hard** (kein sichtbares E-Mail-/Telefon-Feld, amber) / **soft** (Feld vorhanden, aber optional — grauer Info-Hinweis „Nur Leads, die das Feld ausfüllen, sind kontaktierbar") / nichts bei sichtbarem Pflichtfeld. Create-Modus: Toggle nur Session (noch kein Funnel in DB). **Lesson learned:** DB-Absichten früh und explizit ankündigen, nicht erst nach dem Bauen — Stavros braucht Kontrolle über jede Schema-Änderung.
- **Block C — Karten-Felder im Canvas verkabelt** (Branch `feature/aufgabe-57c-card-field-canvas`, **mit User-Go für funnel.tsx**): letzte tote Zone aus dem Inline-Edit-Audit (56 Runde 4) geschlossen. Alle ~10 Feld-Wrapper der Karten-Render-Map in [funnel.tsx](../components/funnel.tsx) tragen `data-edit-field="card_field_<id>"` (+ editCursor/Highlight) — Attribut-only, `id = _clientId ?? key` = exakt die Panel-Row-Identität; im Live-Widget inert. EditorShell reicht `selectedFieldRef` neu ans [PropertiesPanel](../components/tenant-editor/v2/PropertiesPanel.tsx) durch; `CustomPageProps`-Effect klappt bei `card_field_`-Refs die passende Feld-Zeile auf (nur `selectedFieldRef` als Dependency — manuelles Zuklappen bleibt möglich) + scrollt sie via `data-card-field-row`-Anker ins Sichtfeld (Achtung Shadowing: `globalThis.CSS.escape`, das nackte `CSS` ist der dnd-kit-Import). **Selektions-Ring** (Stavros-Nachschärfung, 2 Runden): JEDES Canvas-Selektionsziel markiert rechts sein Eingabe-Element mit `ring-2 ring-primary`, solange die Selektion steht — wandert mit, verschwindet mit Esc/Deselect. Mechanik: neue [properties/selection.tsx](../components/tenant-editor/v2/properties/selection.tsx) (`SelectedFieldRefContext` + `SelMark`-Wrapper + `selRing`); PropertiesPanel stellt den Provider + einen generischen `data-sel-target`-Scroll-Effect. Abgedeckt: Karten-Feld-Rows (`highlighted`-Prop an [FieldRow](../components/tenant-editor/v2/properties/FieldRow.tsx)) · Options-Zeilen (`option_<idx>` im OptionsEditor) · Titel/Untertitel (Frage/Karte/Welcome) · `text_input` → Platzhalter-Block bzw. Number/Date-Grid bzw. Dropdown-Optionsliste · Slider-Min/Max/Schritt/Standard · Checkbox-Label · Welcome-Button · Success-Texte. Rating/Scale haben im Canvas keine Klick-Refs (nichts zu markieren). **Stufe 2 (Label-Inline-Edit im Canvas) auf User-Entscheid bewusst nicht gebaut.**
- **Block B — Test-Mails in der Versand-Historie** (Branch `feature/aufgabe-57b-test-mail-logging`): Konsistenz zu Webhook-Tests (Stavros-Befund aus 56). Migration `aufgabe_57b_email_test_logging` (`email_delivery_attempts.is_test boolean NOT NULL DEFAULT false`, additiv, auf Prod mit User-Go). `sendTestEmail` ([lib/emails.ts](../lib/emails.ts)) loggt jeden tatsächlichen Send als Attempt-Row (submission_id NULL, Status terminal, delivered_at bei success wegen CHECK `delivered_when_success`; Log-Fehler: loggen statt werfen). Früh-Returns (Sub fehlt, Empfänger fehlt) loggen nicht — wie beim Webhook-Test. Logs-Route liefert `is_test` mit, `LogsSection` (EmailsPanel) zeigt violettes „Test"-Badge. Cron/Aggregation nachweislich unberührt (terminal + submission_id-Filter). Schema-Referenz dabei entdriftet: fehlende 54/54b/56-Migrationen + 56er-funnels-Spalten in [supabase-schema.md](supabase-schema.md) nachgetragen.
- **Block A — `funnels.submit_button_label` gedroppt** (Branch `feature/aufgabe-57a-drop-submit-button-label`): Code war seit dem 56er-Deploy referenzfrei (in 56 Runde 4 entfernt), Migration `aufgabe_57a_drop_submit_button_label` nach Verifikation direkt auf Prod appliziert (mit User-Go, skip_submit_step-Pattern). Datenlage beim Drop: nur 2 Funnels mit Wert (beide Standard-Label) — exakter Snapshot-Restore im DOWN-File. Prod-Widget nach Drop verifiziert (200). Doku bereinigt: `supabase-schema.md`, `architektur-diagramme.md` (ER), `architecture.md` (EditorState-Liste), `Anleitungen/Funnel-Konfigurationsreferenz.md`. **Befund nebenbei:** die Funnel-Konfigurationsreferenz in `Anleitungen/` ist insgesamt veraltet (beschreibt Vor-52D-Kontaktformular-Felder) — Kandidat für Doku-Cleanup.

---

## Aufgabe 56 — Dark-Mode-Sweep: Flächen-Kanon vereinheitlicht (2026-06-10)

**Status:** Branch `feature/aufgabe-56-dark-mode-sweep`, Type-Check + Build grün, visuelles Review durch Stavros ausstehend.

Auslöser: Stavros-Befund „Einbinden-Seite passt nicht ins Farbschema, Dashboard ist die Referenz". Inventar ergab 4 konkurrierende Dunkel-Quellen (gray-Palette, `background`-Token #0f172a, hartkodiertes #0d1117, gray-950 ad hoc). Kernproblem: `CodeBlock` hardcodete `#0f172a` = **exakt die Seiten-Hintergrundfarbe** → Code-Blöcke wirkten wie Löcher in den Karten.

- **Flächen-Kanon verbindlich in [`design-system.md`](design-system.md)** (Graustufen-Hierarchie-Sektion neu geschrieben): Seiten-/Bühnen-BG = `dark:bg-background`-Token · Karte gray-900 · Inputs/Insets gray-800 · Code-Flächen `bg-[#0f172a] dark:bg-gray-950` · Scrims black/40-50. Verbote: kein Flächen-Hex-Hardcoding, kein gray-950 außerhalb Code. Die frühere Doku-Ausnahme („#0d1117 bewusst") aufgehoben — das Dashboard hat sie nie benutzt, daher die Drift.
- **Migriert:** 7× `dark:bg-[#0d1117]` → Token (error/login/signup/not-found, CenterCanvas-Bühne, EditorShell-Root) · CodeBlock + 2× SharePanel-`<pre>` → Code-Kanon (Inline-Styles raus, `text-slate-300`) · E-Mail-Vorschau-Bühne gray-950 → Token · 3× Inline-Rename-Fokus gray-950 → gray-800 · „Erweitert"-Inset (FieldProperties) gray-950/30 → gray-800/40 (Insets gehen im Dark Mode heller, nicht dunkler).
- **Runde 2 (Stavros-Review: „Webhook-JSON-Modal = Gold-Standard, Logs/Einbinden = Katastrophe, Aufklapp-Zustand unsichtbar, Light Mode bitte auch"):**
  - **Code-Kanon final = Modal-Look:** `bg-[#0f172a] ring-1 ring-white/10 font-mono` (immer dunkel, light + dark). Erkenntnis: Modal und Logs hatten dieselbe Farbe — das Modal wirkte nur durch Syntax-Farben + Scrim; auf Karten tarnte sich `#0f172a` als Seiten-BG. Die white/10-Kante löst das. gray-950 (Runde 1) war zu schwarz → komplett raus (0 Vorkommen). Angewendet auf: CodeBlock (full-bleed: `border-y`), 2× SharePanel-GTM-`<pre>`, 2× Webhook-Log-`<pre>` (Inline-Styles raus), JSON-Modal (Ring dazu), E-Mail-Log-`<pre>`.
  - **Aufklapp-Pattern = Leads-Rezept:** offener Header `bg-gray-100 dark:bg-gray-800` (via `group-open:` bzw. conditional). Angewendet auf: PlatformGuides, SharePanel-GTM-Details, iFrame-Fallback-Toggle, FieldProperties „Erweitert", EmailsPanel Test-Mail + Versand-Historie.
  - **Light Mode vereinheitlicht:** Editor-Stages `bg-gray-50` → `bg-gray-100` (= Dashboard, 8 Stellen); Karten-Rezept `border-gray-100 + shadow-sm` (= ui/Card) auf SectionCard/SharePanel-Details/PlatformGuides. Hover-Konvention war bereits konsistent (weiß→gray-50, gray-900→gray-800).
- **Runde 3 (Stavros-Review):** Code-Flächen waren mit `#0f172a` „kaum als Code wahrnehmbar" (zu nah an Karte #111827) → neuer **Token `--color-code-surface` (#0b1220)** in [`globals.css`](../app/globals.css), alle 7 Code-Flächen auf `bg-code-surface` (kein Flächen-Hex mehr im JSX). Statistik-Monats-Header bekam das Aufklapp-Rezept (offen = gray-100/gray-800).
- **Bewusst belassen:** `dark:bg-black/40`-Scrim (Hidden-Page-Overlay), EmailsPanel-innere Collapsibles behalten border-gray-200 (sitzen auf weißer Spalte, nicht auf der Stage).
- **Runde 4 (Pre-Go-Live-Feinschliff):** (a) **Slider-Polish** (User-Go für funnel.tsx): Brand-Fill bis zum Daumen via `--slider-fill`-CSS-Var ([`globals.css`](../app/globals.css) `.funnel-slider`), Rest = Brand-Tint, Track 6px; Karten-Slider von nativem accent-color auf dieselbe Klasse vereinheitlicht. (b) **Live-Preview**: `?preview=1` skippt NUR den View-Zähler ([`TenantFunnelClient`](../components/TenantFunnelClient.tsx)) — Submits/Mails/Webhooks bleiben echt (E2E-Test-Feature); Links: ↗-Icon in der Editor-Topbar + „Live"-Button an der Canvas-Bühne (zeigt gespeicherten Stand). (c) **`submitButtonLabel` komplett entfernt** (tot seit 52D — nichts renderte ihn; verifiziert): aus `FunnelConfig`/`EditorState`/defaults/editorUtils/getTenantConfig/EmailsPanel-Mock. **DB-Spalte `funnels.submit_button_label` bleibt vorerst — Drop-Migration nach Deploy** (skip_submit_step-Pattern). (d) **Inline-Edit-Lücken geschlossen** (Audit im Chat): Antworten-Übersicht-Überschrift, Welcome-Button-Text (Button im editMode nicht mehr disabled — disabled schluckte alle Klicks), Checkbox-Frage-Label (mit Toggle-Guard im editMode) jetzt echte EditableTexts + Routes; Untertitel ohne Content = Hover-Ghost-Slot (`group/title`, opacity 0→60% bei Hover). **Bewusst nicht inline:** Platzhalter (sieht aus wie Antworten), Slider-Zahlen (Format+Einheit), Consent-Markdown-Label, Dropdown-Options. **Offen:** Karten-Felder haben weiterhin keine Canvas-Verkabelung (Klick-Selektion → Panel-Expand als eigener Block).
- **Runde 5 — Design-Schalter + Lead-Gate (Stavros-Entscheidungen nach test.html-Vorfall):**
  - **3 Anzeige-Schalter** (Migration `aufgabe_56_design_toggles`, additiv mit Defaults, auf Prod): `funnels.show_progress_bar` / `show_step_badge` (boolean, Default true) / `title_alignment` ('left'|'center', CHECK). Kette: types → defaults → editorUtils (buildFunnelConfig/Row/dbToEditorState) → getTenantConfig → Widget → neue „Anzeige"-Sektion im [`ThemePanel`](../components/tenant-editor/v2/ThemePanel.tsx). Badge-Zeile rendert weiter, wenn nur der Zurück-Pfeil sie braucht; bei `center` wird auch die Badge-Zeile zentriert.
  - **Lead-Gate gelockert** (Vorfall: Stavros' Test-Submission ohne E-Mail-Feld war „unsichtbar"): **Completed-Submissions erscheinen IMMER** im Posteingang + Dashboard-Pipeline (ermöglicht anonyme Quiz-Funnels); Abbrecher weiterhin nur mit E-Mail/Telefon ([`leads/page.tsx`](../app/dashboard/leads/page.tsx) + [`dashboard/page.tsx`](../app/dashboard/page.tsx) konsistent). Kontaktlose Zeilen zeigen „Keine Kontaktdaten" statt Leere.
  - **Editor-Warnung Kontaktierbarkeit** ([`CenterCanvas`](../components/tenant-editor/v2/CenterCanvas.tsx)): Amber-Banner über der Bühne, wenn kein sichtbares Pflichtfeld E-Mail/Telefon auf einer sichtbaren Karte existiert.
  - Befund derselben Session: Mail-Versand funktionierte korrekt (4× Kunden-Mail sauber „Lead hat keine E-Mail" gefailed, Tenant-Mails success via Resend) — Ursache war ausschließlich das fehlende E-Mail-Feld + Test-Subscriptions mit Wegwerf-Adressen.
- **Runde 6 — dezentes Validierungs-Feedback in Karten** ([`funnel.tsx`](../components/funnel.tsx), Stavros-Wunsch „subtil, Ausrufezeichen rechts"): Invalide Karten-Felder (Text/E-Mail/Tel/PLZ/Name, Zahl, Lang-Text) zeigen ein amber `CircleAlert` rechts im Feld — **erst nachdem das Feld einmal den Fokus verlor** (touched-Set; frische Karte bleibt ruhig), verschwindet live beim Korrigieren, Meldung aus [`validateContactField`](../lib/validateContactField.ts) als nativer Tooltip (`title`). editMode: nie. Bewusst nicht bei Einzel-Frage-Steps (ein leeres Feld + deaktivierter Button ist selbsterklärend) und nicht bei Interaktions-Widgets (Radio/Checkbox/Slider/…).
- **Notierter Folgepunkt (nicht in 56):** Test-Mails erscheinen — anders als Test-Webhooks — bewusst NICHT in der Versand-Historie (Aufgabe-41-Design: Tests laufen außerhalb der Drip-Queue). Stavros empfindet das als Inkonsistenz zu Webhooks → Angleichung (Attempt-Row `email.test` ohne Submission + Filter in `aggregateEmailStatusForSubmission` + Logs-UI) als kleiner eigener Task.

---

## Aufgabe 55 — Editor-Uplift: Undo/Redo + Builder-Bühne + Slider-Fix (2026-06-10)

**Status:** Branch `feature/aufgabe-55-editor-uplift`, Type-Check + `next build` grün, **manuell getestet durch Stavros („funktioniert alles")**, gemerged + deployed. Logic Jumps bewusst verschoben (Konzept steht, Chat 2026-06-10). Leaked-Password-Protection: Stavros-Entscheidung = bewusst aus (Beta, kein CIA).

**Feedback-Runde (gleiche Session):**
6. **StepPill-Bugfix:** `min-w-0` am Titel-Button — bei langen (Auto-)Titeln schob der nicht-schrumpfende Flex-Button die Hover-Actions aus dem `overflow-hidden`-Pill (Mülleimer unsichtbar).
7. **Theme-Toggle-Platzierung** ([`Sidebar.tsx`](../components/dashboard/Sidebar.tsx)): Menü-Ansatz nach Stavros-Feedback verworfen → wiederverwendete [`ThemeToggle`](../components/ui/ThemeToggle.tsx)-Komponente **oben rechts in der Logo-Zeile** (Stavros-Spot, `mr-3` Abstand zum Zuklapp-Pfeil). Eingeklappter Rail zeigt bewusst KEINEN Toggle (reine Navigation; Mount-Apply des Themes übernimmt das CSS-versteckte MobileNav-`ThemeToggle`). Footer = nur noch Workspace-Karte.
8. **E-Mail-Tab-Kontrast:** Eingabeflächen (Betreff/TipTap-Body/Link-Popover/Test-Empfänger/Name-Inline) von `dark:bg-gray-950` auf App-Standard `dark:bg-gray-800` — Vorschau-Bühne + Error-Log-`<pre>` bewusst dunkel belassen.

1. **Undo/Redo im Editor** (neu [`lib/useHistoryState.ts`](../lib/useHistoryState.ts), [`EditorShell`](../components/tenant-editor/v2/EditorShell.tsx)): Snapshot-Modell — Drop-in-Ersatz für das eine `useState<EditorState>`, kein Handler angefasst. Pause-Coalescing 600ms (Tipp-Burst = 1 Undo-Schritt), Stack-Limit 50, StrictMode-sicher (pure Updater). Strg+Z / Strg+Shift+Z / Strg+Y (Input/contentEditable-Fokus ausgenommen → natives Text-Undo), ↶/↷-Buttons in der Topbar (nur Bearbeiten-Tab — Ressourcen-Tabs speichern server-seitig, UI-Undo wäre dort eine Lüge). **`applyToAll`** für den dbId-Merge nach Save: gilt in present+past+future OHNE History-Eintrag — sonst würde Undo über den Save-Punkt die Page-UUIDs verlieren und der nächste Save würde after_page-Webhook-Bindings zerstören (Aufgabe-54-Invariante). Selection-Clamp-Effect gegen out-of-range nach Undo.
2. **Builder-Bühne** ([`CenterCanvas`](../components/tenant-editor/v2/CenterCanvas.tsx)): Karte vertikal zentriert (`my-auto` im Flex-Scroll — degradiert sauber zu Scroll), Stage-Hintergrund = `pageBackgroundColor` des Funnels (echtes WYSIWYG; bei transparent: Punktraster statt toter Fläche), Ambient-Glow hinter der Karte im Dark Mode (nur Default-Bühne), sanfter framer-motion-Auftritt beim Step-Wechsel (Test-Modus: stabiler Key, keine Re-Animation).
3. **StepList-Uplift**: Auto-Titel für unbenannte Steps (Karten → Feld-Labels „Name · E-Mail …", Fragen → Options-Labels; [`StepList`](../components/tenant-editor/v2/StepList.tsx) `derivedStepTitle`), neutraler „Unbenannt"-Fallback statt kursivem „Ohne Titel" ([`StepPill`](../components/tenant-editor/v2/StepPill.tsx)), **Hover-Quick-Actions Duplizieren/Löschen** pro Step-Pill (ohne Confirm — Undo ist das Sicherheitsnetz). **Step-Duplizieren ist neu** (`handleDuplicateQuestion`: Deep-Copy mit frischen `_id`/`_clientId`s, `dbId` bewusst nicht kopiert → neue Page-UUID beim Save; questionKey-Dedup macht der Save-Pfad via ensureUniqueKey).
4. **Fragetyp als Icon-Galerie** ([`PropertiesPanel`](../components/tenant-editor/v2/PropertiesPanel.tsx) `TypeSelect`): 2-spaltiges Popover mit denselben Typ-Chips (Icon + Pill-Farbe) wie StepList statt nacktem `<select>`. Verhalten identisch (onChange → questionType-Patch).
5. **Widget: Slider-Default-Commit** ([`funnel.tsx`](../components/funnel.tsx), mit User-Go): Step-Entry-Effect committet fehlende Slider-Werte in `answers` — exakt mit der Anzeige-Fallback-Kette (Frage-Slider: `default ?? min`; Karten-Slider: `sliderDefault ?? Mitte`). Vorher übermittelte „Default akzeptiert + weitergeklickt" keinen Wert. editMode/isSubmitted ausgenommen.

---

## Aufgabe 54 — Pre-Launch-Fixes: 5 Sicherheits-/Robustheits-Befunde aus Codebase-Audit (2026-06-09)

**Status:** Auf Branch `feature/aufgabe-54-pre-launch-fixes`. Migration **auf Produktion angewendet** (additiv: 1 RPC + 1 Index, mit Stavros-Go), RPC SQL-seitig mit Wegwerf-Funnel getestet (3 Läufe inkl. Atomicity-Rollback, danach gelöscht). Type-Check + `next build` grün, Framing-Header per `curl` gegen alle Routen-Typen verifiziert, echter Funnel-Slug rendert weiter mit `frame-ancestors *`.

Auslöser: vollständige Codebase-Analyse (Architektur/Security/Performance/toter Code). Die 5 Launch-Blocker wurden gefixt, Stripe-Webhook-Fix (200-bei-DB-Fehler) auf User-Wunsch zurückgestellt (Beta läuft kostenlos):

1. **E-Mail-Bug `recipient_value`** ([`lib/emails.ts`](../lib/emails.ts)): 3 SELECTs (processAttempt, sendTestEmail, scheduleAttemptsForSubmission) luden `recipient_value` nicht → Custom-Empfänger-Mails wären beim nächsten echten Lead als „Custom-Empfänger leer" gefailed, `@me`-Erkennung (From/Reply-To) lief im Versandpfad falsch. Prod-Check: 2 custom-Subs existieren, 0 Attempts betroffen (latent). Fix: Spalte in alle 3 Selects.
2. **Rate-Limiter-Lead-Verlust** ([`lib/tracking.ts`](../lib/tracking.ts), [`/api/submit`](../app/api/submit/route.ts)): zählte auch Partial-Rows → 3 parallele Nutzer hinter geteilter IP (Büro-NAT, Mobilfunk-CGNAT) blockten sich gegenseitig still die Submits. Jetzt: nur completed zählen, eigene `session_id` ausgenommen, Schwelle 3→10/10min, Rate-Check nach Shape-Check. Neuer partial Index `idx_submissions_ip_completed`.
3. **Clickjacking** ([`next.config.mjs`](../next.config.mjs)): `frame-ancestors *` + ungültiges `X-Frame-Options: ALLOWALL` galten für ALLE Pfade inkl. `/dashboard`/`/login`/`/admin`. Jetzt: Widget-Default bleibt (Slug-Embedding unverändert), App-Bereiche überschreiben mit `frame-ancestors 'none'` + `X-Frame-Options: DENY` (Next-Header-Override-Semantik), ALLOWALL entfernt.
4. **Submit-Idempotenz** ([`lib/tracking.ts`](../lib/tracking.ts), [`/api/submit`](../app/api/submit/route.ts)): doppelter POST (Doppelklick/Netzwerk-Retry) feuerte Webhooks + Drip-Mails doppelt. `upsertSubmissionProgress` gibt jetzt `{ id, alreadyCompleted }` zurück (Race-Guard für beide Pfade); bei `alreadyCompleted` antwortet `/api/submit` mit success **ohne** erneute Trigger und ohne Daten-Überschreiben.
5. **Atomares Funnel-Speichern + stabile Page-UUIDs** ([`app/api/tenant/funnels/[slug]/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/route.ts), [`lib/editorUtils.ts`](../lib/editorUtils.ts), Migration `aufgabe_54_replace_funnel_content_rpc`): PUT machte delete-then-insert ohne Transaktion (Insert-Fehler = Funnel leer, Datenverlust) **und** rotierte alle Page-UUIDs pro Save → `webhook_subscriptions.trigger_page_id` (FK SET NULL) wurde genullt = `after_page`-Webhooks starben still beim Speichern (Prod-Check: noch keine after_page-Subs betroffen, latent). Jetzt: RPC `replace_funnel_content(p_funnel_id, p_pages, p_fields)` — eine Transaktion, Pages werden **upserted** (bestehende `dbId` aus dem EditorState wird wiederverwendet, nur entfernte Pages gelöscht, Fields delete+insert), SECURITY INVOKER → RLS gilt vollständig. Außerdem: PUT validiert `req.json()` + `state.questions` jetzt (400 statt 500). **Nachfix (2026-06-10):** auch brandneue Steps haben ab dem ersten Save eine stabile UUID — `editorStateToPagesAndFields` gibt `pageIdByClientId` (EditorQuestion._id → Page-UUID) zurück, der PUT reicht es als `pageIds` an den Editor, [`EditorShell`](../components/tenant-editor/v2/EditorShell.tsx) mergt die dbIds identisch in State + Snapshot (isDirty-JSON-Vergleich bleibt korrekt). Webhook-Binding auf neue Steps geht damit ohne Editor-Reload, keine UUID-Rotation bei Folge-Saves mehr.

**Rollback:** Code via Branch-Revert; Migration via `..._DOWN.sql` (erst Code zurückrollen, dann Funktion droppen — Reihenfolge im DOWN-File dokumentiert).

**Nachschlag 54b (2026-06-10, gleicher Branch) — restliche Korrektheits-/Härtungs-Befunde aus dem Audit gefixt:**

1. **Stripe-Webhook** ([`app/api/stripe/webhook/route.ts`](../app/api/stripe/webhook/route.ts)): DB-Fehler → jetzt 500 (Stripe retried mit Backoff; Updates sind idempotent). Entdeckt dabei: das alte try/catch war wirkungslos — der Supabase-Client wirft nicht, Fehler kamen im Result-Objekt und wurden komplett verschluckt (nicht mal geloggt). Jetzt explizite `{ error }`-Checks.
2. **Cron** ([`app/api/cron/webhook-retry/route.ts`](../app/api/cron/webhook-retry/route.ts)): (a) **Claim-first** — `abandoned_webhook_fired_at` wird VOR dem Trigger gesetzt (mit `.is(NULL)`-Guard, race-sicher); vorher konnte ein Function-Kill zwischen Trigger und Marker Doppel-Webhooks erzeugen. At-most-once statt at-least-once (bewusst: lieber selten einen Abandoned-Hook verlieren als Tenant-CRMs Duplikate schicken). (b) **Zeitbudget 45s** — alle 4 Loops (Webhook-Retry, Abandoned, Mail-Pending, Mail-Retry) brechen sauber ab statt in den 60s-maxDuration-Kill zu laufen (Worst-Case war 200 × 10s-Timeout); Rest holt der nächste 5-Min-Run, Response meldet `budget_exhausted`.
3. **Webhook-URL-Härtung (SSRF)**: neuer `validateWebhookUrl` in [`lib/webhooks.ts`](../lib/webhooks.ts) — nur https, blockt localhost/.local/.internal, private/Loopback/Link-Local/CGNAT-IPv4-Ranges, IPv6- + numerische Literale. In POST + PATCH ([`webhooks/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/webhooks/route.ts), [`webhooks/[id]/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/webhooks/%5Bid%5D/route.ts)) verdrahtet; Client-Check im [`WebhookAddModal`](../components/tenant-editor/v2/WebhookAddModal.tsx) auf https angeglichen. Bestehende Subs unberührt (Prod-Check: alle https). Best-Effort (DNS-Rebinding bleibt theoretisch).
4. **JSON-Robustheit**: ungefangene `req.json()` in leads-PATCH + beiden Webhook-Routes → 400 statt 500.
5. **`maybeSingle()`-Zukunftssicherheit**: Tenant-/Membership-Lookups ([`funnels/[slug]/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/route.ts), [`funnels/route.ts`](../app/api/tenant/funnels/route.ts) GET+POST, [`dashboard/layout.tsx`](../app/dashboard/layout.tsx)) mit `order(created_at) + limit(1)` — maybeSingle errort bei >1 Row, wäre bei Multi-Membership (Phase E) hart gebrochen.
6. **Hygiene**: `typescript.ignoreBuildErrors` entfernt (Build-Typecheck läuft jetzt scharf — Build grün), tote `logSubmission` gelöscht, `email`/`tel` aus `VALID_QUESTION_TYPES` raus (DB-verifiziert: 0 solcher Fields), `package.json`-Name `solar-funnel-widget` → `leadplug-saas`.
7. **Widget-Robustheit (54c, mit User-Go für funnel.tsx):** (a) `normalizeHex` in [`funnel.tsx`](../components/funnel.tsx) — Theme-Farben aus der DB werden vor der Color-Math validiert (3-stellig expandiert, Ungültiges → Default; vorher hätte ein kaputter DB-Wert alle abgeleiteten Farben zu NaN zerschossen). (b) Submit-Retry in [`TenantFunnelClient`](../components/TenantFunnelClient.tsx) — 1 Retry nach 1,5s bei Netzwerkfehler/5xx (nicht bei 4xx), `keepalive: true` (POST überlebt redirectUrl-Navigation); safe weil `/api/submit` seit 54 idempotent. **Bewusst verschoben:** Slider-Default-Commit (braucht Klick-Test), Inline-Validierungs-Fehlermeldungen (Design-Aufgabe mit visueller Abnahme), Undo/Redo (eigene Aufgabe, Konzept steht im Chat 2026-06-10).
8. **Migration `aufgabe_54b_advisor_hardening`** (additiv, auf Prod appliziert, DOWN vorhanden): EXECUTE auf `rls_auto_enable()` für public/anon/authenticated revoked (Event-Trigger braucht keine RPC-Grants), `update_updated_at()` mit gepinntem `search_path` (Trigger danach funktional verifiziert). Advisor-Nachprüfung: beide WARNs weg; verbleibend nur Gewolltes (honeypot_triggers ohne Policy = Service-Key-only; current_tenant_ids/role = RLS-Helper) + **Leaked-Password-Protection = Dashboard-Toggle, manuell aktivieren** (Authentication → Passwords).

**Offen aus dem Audit (bewusst separat, keine Bugs):** `getTenantConfig`-TTL-Cache (heißester Pfad; Produkt-Frage: Widget darf Config bis TTL verspätet sehen) · Dashboard-Pagination/Aggregation (lädt ganze Tabellen; erst bei echtem Traffic) · Service-Key-Client-Konsolidierung (7 Duplikate, reiner Refactor) · Flooding-Schutz für track-progress/track-view (bräuchte IP-Spalte in view_logs bzw. neuen Index — Kosten/Nutzen pre-launch negativ) · [`funnel.tsx`](../components/funnel.tsx)-Aufteilung (2000+ LOC, nur in Absprache).

---

## Pre-Go-Live UI-Politur: Dashboard-Cockpit, Admin-Cockpit, Leads/Webhooks/Billing-Feinschliff + DB-Cleanup (2026-06-08)

**Status:** Auf Branch `feature/dashboard-ui-politur`, Type-Check durchgehend grün, visuell vom User abgenommen. Reine UI-/Doku-Politur + ein Prod-Daten-Cleanup — keine Schema-Migration.

- **Dashboard-Cockpit** (`app/dashboard/page.tsx`, neu `components/dashboard/Sparkline.tsx`, gelöscht `components/dashboard/DailyLeadsChart.tsx`): aufgeblasenes 14-Tage-Balkendiagramm raus → 4 klickbare KPI-Karten (30-Tage Leads/Aufrufe mit **Mini-Sparkline** · Conversion · aktive Funnels), Begrüßung + „Neuer Funnel"-CTA, klickbare „Neueste Leads", Pipeline (→ gefilterte Leads), neuer „Deine Funnels"-Block (Leads/Aufrufe pro Funnel). Trend lebt als Sparkline; volle Tages-Charts bleiben auf Statistiken.
- **Admin-Cockpit** (neu `components/admin/WorkspacesCockpit.tsx` + `WorkspaceDangerZone.tsx`, `app/admin/page.tsx`, `app/admin/[tenantId]/page.tsx`, `lib/admin/queries.ts`, neu `app/api/admin/workspaces/[id]/route.ts`): 4 Kennzahlen (aktive Workspaces/Formulare/Aufrufe/Leads), durchsuch-/sortierbare Tabelle mit **Status-Spalte** (Kein Funnel/Ohne Traffic/Live/Leads ✓), Plan-Badge, „letzter Lead", Owner-E-Mail-Klick-Kopieren. ⋯-Menü (Details · Anschreiben · Plan · Deaktivieren-mit-Warnung) — Löschen **nicht** im Menü, sondern als **Gefahrenzone** in der Workspace-Einsicht (Deaktivieren-Warnpopup + Löschen im Funnel-Modal-Stil mit Tippe-den-Namen-Sicherung). API superadmin-gated (404 statt 403). `queries.ts` um `viewCount`/`lastLeadAt`/`activeFunnelCount` erweitert.
- **Leads** (`app/dashboard/TenantLeadsTable.tsx`): kompakte 1-Zeilen-Filterleiste (Suche füllt Breite), **Zeitraum-Dropdown mit Presets** statt nativem Kalender (Benutzerdefiniert blendet Datumsfelder ein), Kanban-Spalten mit max-Höhe + Eigenscroll, Liste „erst 25, dann Mehr laden".
- **Webhooks** (`components/tenant-editor/v2/WebhooksPanel.tsx`): „**Beispiel-Daten**"-Popup (funnel-spezifisches JSON mit Syntax-Highlight + Copy, gespiegelt aus `lib/webhooks.ts`), native `confirm()` → `ConfirmModal` (Löschen + Secret-Rotation), „Letzte Versuche" im dunklen Code-Look, Listen-Wording „feuert am Funnel-Ende" → „Am Funnel-Ende".
- **Einbinden** (`SharePanel.tsx`, `components/dashboard/PlatformGuides.tsx`): Unicode-`▶` → lucide-`ChevronDown` (konsistent zum Rest), Header-Trennlinie bei den Plattform-Anleitungen.
- **Statistik** (`StatistikenCockpit.tsx`, `DonutChart.tsx`): 2 „letzte 30 Tage"-Kacheln, Donut dünner + größer.
- **Billing** (`billing/page.tsx`, `BillingClient.tsx`, `lib/billing.ts`, `components/dashboard/navItems.ts`): Open-Beta-Texte (kein Dev-Jargon, keine Angst-Phrasen), Badge „Kostenlos" statt „Kostenlos (Admin)", Überschrift/Nav „Billing" → „Plan & Abrechnung"/„Abrechnung". Free-bei-Registrierung war bereits aktiv (kein Eingriff nötig).
- **Sidebar** (`components/dashboard/Sidebar.tsx`): Dark-Mode-Eintrag „springt" nicht mehr beim Auf-/Einklappen (Label `truncate` wie die Navi-Punkte).
- **DB-Cleanup** (direkt auf Produktion, mit User-Go): 6 ownerlose Alt-/Test-Workspaces gelöscht (5 leer + `demo` mit 9 Funnels/1 Lead; submissions-first, dann Tenant-Cascade). Ursache = Alt-Seed (`per_month`-Default) + manuelle Auth-User-Löschungen — **kein** Bug im Registrierungs-Flow. Danach nur noch 3 echte Accounts.
- **Doku-Fixes** (`architecture.md` §13, `architektur-diagramme.md`): Payload-Beispiel `lead_price` entfernt (echter Sender schickt es nicht — `lead_price`/`per_lead` ist deprecated, siehe Memory), DailyLeadsChart-Diagramm-Label → „Overview-Cockpit (KPIs + Sparkline)".

---

## Aufgabe 53 — E-Mail-Editor-Überhaul: dynamische Variablen, Empfänger, Link, Dark-Mode (2026-06-06)

**Status:** Fertig + gemergt. Build durchgehend grün, vom User live im Editor (Hell + Dunkel) verifiziert + abgenommen. Branch `feature/aufgabe-53-mail-variablen-dynamisch`.

**1. Dynamische Mail-Variablen** (vorher nur statische 3er-Liste Lead-Name/-E-Mail/-Telefon):
- Picker baut sich dynamisch aus den Funnel-Feldern ([funnelVariables.ts](../components/tenant-editor/v2/email/funnelVariables.ts) `buildFunnelVariables`): **„Lead-Kontakt"** (Name/E-Mail/Telefon, gefiltert auf das, was der Funnel erfasst) · **„Weitere Felder"** (alle übrigen, per Feld-Label, dedupliziert — E-Mail/Telefon/voller Name nicht doppelt; Beispiel-Werte rechts; `unbenannt`-Marker bei fehlendem Label) · **„Datum/Zeit"**. Auch im **Betreff**.
- `resolveVar` ([emailTemplates.ts](../lib/emailTemplates.ts)) löst `answer.<field-key>` auf den Anzeige-Wert auf (`resolveAnswerVar` + `resolveCustomFieldDisplay`): Choice → Label (nicht Slug), checkbox → Ja/Nein, date → lokalisiert.
- `VariableNode` ([VariableNode.ts](../components/tenant-editor/v2/email/VariableNode.ts)): dynamische Chip-Labels via `extraLabels`-Option. `buildPreviewConfig` keyt Fragen jetzt nach `field_key` (vorher dbId) — sonst trifft die Vorschau die `answer.<key>`-Variablen nicht.

**2. Tote `funnel.*`-Chips aufgeräumt:** Migration `aufgabe_53_strip_funnel_var_chips` (Dry-Run-verifiziert, UP+DOWN im Repo, angewendet + geprüft: 0 funnel.*-Reste, contact.*/Magic-Sections intakt) strippte die toten Chips aus 15 `email_subscriptions` (body_html + subject). Safe für jede Code-Version. Code-Default `DEFAULT_NEW_BODY`: `funnel.email`-Chip raus.

**3. Link-Setzer:** 3× `window.prompt()` → **Inline-Popover** (`LinkButton` in [EmailEditor.tsx](../components/tenant-editor/v2/email/EmailEditor.tsx), URL + optional Text + Anwenden/Entfernen, URL-Normalisierung, Enter/Esc). Links im Editor sichtbar (blau + unterstrichen via Link-Extension-Klasse); Versand-Mail-Links unterstrichen.

**4. Empfänger-Modell** (vorher single-select customer/tenant/custom, kein Multi bei „an dich") — **KEIN DB-Change, deploy-sicher:**
- **2 Modi:** „An den Lead" (customer) | „An feste Adresse(n)" = Chip-basierte Multi-Adress-Liste (bis 5) + dynamischer **„Mein Postfach"-Marker** `RECIPIENT_ME = '@me'` ([emailTemplates.ts](../lib/emailTemplates.ts)).
- **Sender** ([emails.ts](../lib/emails.ts)): `resolveRecipient` löst `@me` → `notification_email` auf (folgt der Account-Adresse); `isInternalRecipient` (tenant ODER custom-mit-@me) steuert From-Adresse + reply-to=Lead; Test-Versand nutzt jetzt `resolveRecipient` (DRY, @me-aware); Status-Aggregation zählt custom-mit-@me als „Tenant benachrichtigt".
- `recipient_type` bleibt {customer,tenant,custom}; `@me` sieht alter Prod-Code nie → Bestandsmails verschicken 1:1 wie bisher.
- UI: `FixedRecipients` (ersetzt `CustomRecipientList`/`serializeRecipients`) — Mein-Postfach-Box + lila Adress-Chips (×) + „Adresse hinzufügen" (Reveal-Feld, Enter → Chip).

**5. UI-Polish (auf User-Feedback):**
- **Toggle-Knopf-Bug** app-weit gefixt (3× dupliziert: Controls/PropertiesPanel/FieldProperties): An-Zustand sitzt symmetrisch ganz rechts (`translate-x-4.5` statt `-4`). Label dynamisch „aktiv"/„inaktiv".
- **Dark-Mode-Inputs:** rohe DOM-Inputs (CTA-Button, Antworten-Box) → `.lp-node-input`-Klasse ([globals.css](../app/globals.css)) mit klarer Affordance (Rahmen + kontrastierender Hintergrund) in Hell + Dunkel.
- **Dark-Mode-Scrollbars:** Track gedimmt dunkel statt weiß ([globals.css](../app/globals.css), nur unter `.dark`; Widget unberührt).
- **Verzögerungs-Feld:** Layout-Bug (TextInput-`w-full` überschrieb `w-20`) → feste Wrapper-Breiten (Zahl schmal, Einheit-Select breit).

---

## Aufgabe 52 — Firmen-/Footer-Cleanup + Submit-Page-Rip-out (A–D komplett) (2026-06-06)

**Status:** A–C gemergt (Merge-Commit `d46aee3`). **Teil D fertig** — Submit-Page/Kontaktformular restlos aus Code **und DB** entfernt. Type-Check + Production-Build grün, Widget-Smoke-Test bestanden (Honeypot am Root + persistiert über Step-Wechsel, 0 `<form>`, Karten/A-B-C-D rendern, keine Console-Errors).

**Erledigt (A–C):**
- **A — Firmen-E-Mail-Variablen raus:** `{{funnel.name/email/phone}}` aus `AVAILABLE_TOKENS` + `resolveVar` + Default-Templates ([emailTemplates.ts](../lib/emailTemplates.ts), [EmailsPanel.tsx](../components/tenant-editor/v2/EmailsPanel.tsx)). Mails nutzen nur Lead-Daten (`{{contact.*}}`/`{{answer.*}}`).
- **B — Footer-Daten weg:** tote Code-Kette + **DB-Spalten `funnels.footer_company_name/email/phone/text` GEDROPPT** (`aufgabe_52_drop_footer_columns`). `companyName` bleibt (aus `tenant.company_name`).
- **C — Render-Fallbacks:** `footerText`-Fallback weg, `answersOverviewLabel` → Editor-Default; `successMessage` behält „never-bare"-Default.

**Erledigt (D — Submit-Page-Rip-out):** Das inerte Kontaktformular-Gerüst ist restlos entfernt (kein `contactFields` mehr im Code).
- **Widget** ([funnel.tsx](../components/funnel.tsx)): Kontaktformular-Zweig (~465 Zeilen `<form>`) + `isContactStep` + `contactData`/`errors`/`hasTriedSubmit` + `handleContactChange/handleFormSubmit/handleSubmit` + `isValid` + `visibleContactFields` raus. **Honeypot an den Widget-Root relocatet** (immer gerendert, persistiert über Step-Wechsel — Bot-Schutz bleibt). Submit jetzt für ALLE Funnels am Funnel-Ende (`autoFinish`); `skipSubmitStep`-Prop + `contactFields`-Prop entfernt.
- **Geld-Pfad:** `enrichContact` gelöscht ([tracking.ts](../lib/tracking.ts)); `/api/submit` + `/api/track-progress` leiten contact nur noch aus `deriveContactFromAnswers` (Karten-Antworten) ab, Card-Backstop-Validierung bleibt. `resolveAnswerEntries` (webhooks) + `collectFieldMetas` (tracking) ohne contactFields-Loop (Custom-Karten-Pfad `pushContactFieldEntry` bleibt). `contactFields` aus `getTenantConfig` + `TenantConfig`/`EditorState`.
- **Editor:** `SubmitProps` + Submit-Pill + `SelectedStep.submit` + Submit-Branch in CenterCanvas + Contact-Field-Handler in EditorShell + `SUBMIT_META` raus; Submit-Page-Erzeugung aus `editorStateToPagesAndFields` entfernt; `dbToEditorState` liest keine Submit-Page mehr.
- **E-Mails:** `contact_summary`-Magic-Section ersatzlos entfernt (renderContactSummary + Token + Block-Picker-Eintrag + Default-Template). Gespeicherte contact_summary-Blöcke in Alt-Mails degradieren sauber zu `''`. Der reale Funnel (`leadplug`) nutzt `answers_overview` → unberührt.
- **DB-Cleanup (auf User-Wunsch nachgezogen):** orphaned Submit-Pages **gelöscht** — Migration `aufgabe_52d_delete_orphaned_submit_pages` (`DELETE FROM pages WHERE page_type='submit'`, 12 Pages + 52 Fields via `ON DELETE CASCADE`). Vorher geprüft: 0 Webhooks zeigen darauf, `submissions` haben keinen FK auf `pages` → leadplugs 28 Leads unberührt (verifiziert). Rollback: `..._DOWN.sql` (exakte Re-INSERTs) + tägliches Backup. **DSGVO-Bonus:** die Alt-Demo-Submit-Felder (Name/E-Mail/Telefon-Defs, keine echten Leads) sind damit auch weg.
- **`skip_submit_step` voll abgebaut (User-Wunsch):** alle `skipSubmitStep`/`skip_submit_step`-Code-Referenzen raus (Typen, `getTenantConfig` SELECT+Return, `editorStateToFunnelRow`, `dbToEditorState`, `DEFAULT_EDITOR_STATE`, `EmailsPanel`-Preview). **Spalten-DROP als Migration `aufgabe_52d_drop_skip_submit_step` vorbereitet, aber NOCH NICHT angewendet** — Deploy-Reihenfolge: erst 52D mergen+deployen (sonst liest der alte Prod-Code eine gedroppte Spalte → 500), DANN den DROP anwenden. UP+DOWN liegen im Repo.
- **Bewusst gelassen:** Die 11 Alt-Demo/Test-Funnels (0 echte Leads) verlieren ihr Kontaktformular — **pre-launch freigegeben** (User-Entscheidung 2026-06-06).

---

## Aufgabe 51 — Kontaktformular abgeschafft + Success-Seite + Nummerierung (2026-06-06)

**Status:** Branch `feature/aufgabe-51-kontaktformular-abschaffen`. Type-Check durchgehend grün, Production-Build erfolgreich. Iterativ mit Stavros abgenommen. **1 additiver DB-Change** (`funnels.show_answers_overview`, direkt auf Prod mit User-Go). **Alte Funnels dürfen brechen (pre-launch) → keine Migration.**

Das hartkodierte **Kontaktformular** (`page_type='submit'`) ist abgeschafft — Lead-Erfassung läuft als normale Card (Kontaktdaten-Preset), Submit am Funnel-Ende. Tiefenanalyse vorab ergab: der Backend-Pfad war **schon submit-page-agnostisch** (`skip_submit_step` + `deriveContactFromAnswers` + „Absenden"-Button existierten) → reine Editor-/Widget-Änderung, kein Backend-Umbau.

**Kontaktformular raus (für neue Funnels):**
- [`defaults.ts`](../components/tenant-editor/defaults.ts) `DEFAULT_EDITOR_STATE`: `skipSubmitStep: true`, `contactFields: []`.
- [`StepList.tsx`](../components/tenant-editor/v2/StepList.tsx): Submit-Pill nur noch bei Alt-Funnels (`!skipSubmitStep`); „Abschluss" = nur End-Screen.
- [`editorUtils.ts`](../lib/editorUtils.ts) `editorStateToPagesAndFields`: keine Submit-Page mehr im skip-mode. Default-/Delete-Selektion ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx)) fällt auf `success` statt den versteckten `submit`.
- **Server-Backstop** ([`/api/submit`](../app/api/submit/route.ts)): im skip-mode werden Pflicht-Card-Felder serverseitig validiert (gegen Direct-POST; lenient).

**Consent = Checkbox mit Link:** [`funnel.tsx`](../components/funnel.tsx) parst `[Text](https://…)` im Checkbox-Label → klickbarer `<a>` (`renderLabelWithLinks`). Editor-Hint an beiden Checkbox-Feldern ([`FieldProperties.tsx`](../components/tenant-editor/v2/properties/FieldProperties.tsx)).

**Success-/End-Screen ([`funnel.tsx`](../components/funnel.tsx) + [`PropertiesPanel.tsx`](../components/tenant-editor/v2/PropertiesPanel.tsx)):**
- **Header-Banner (Firmenname) + Footer (Kontakt) entfernt** — zogen den Agentur-Account-Namen + Platzhalter, nicht editierbar, inkonsistent. Stattdessen: **gefüllter Marken-Häkchen-Kreis** (weißer Haken) als zentrierter Akzent.
- **Antworten-Übersicht optional** (Default AUS) — neue Spalte `funnels.show_answers_overview`, Widget-gated, Toggle in SuccessProps.
- **Titel** nie leer (interim Default-Fallback „Vielen Dank für Ihre Anfrage!"). **Antwort-Text** optional (leer = zweite Zeile ausgeblendet).
- **Architektur-Prinzip (Stavros, 2026-06-06):** „wenn null → Default einfügen" am Render ist ein Relikt. Defaults gehören **vorausgefüllt in den Editor** (`DEFAULT_EDITOR_STATE`), das Widget zeigt was da ist. Für `responseMessage` umgesetzt (Render-Fallbacks raus). **Offen für den Cleanup:** dasselbe für die restlichen `TEXT_DEFAULTS`-Texte.

**Nummerierung:** nur Fragen/Cards zählen. `StepPill.number` optional → Welcome + Abschluss-Steps ohne Nummer; Fragen via Flow-Position (`pos+1`) → 1. Frage = „1". Im Widget zählt das Badge nur Nicht-Welcome-Steps.

**Offen / nächster Task (eigener Plan):** (1) Firmen-E-Mail-Variablen `{{funnel.name/email/phone}}` raus (E-Mails nutzen nur Lead-Daten) + Default-Templates bereinigen. (2) Orphaned `footer_*`-Spalten + die `companyName/publicEmail/phone`-Kette aus DB + Code. (3) Render-Fallbacks (`TEXT_DEFAULTS`) → Editor-Defaults.

---

## Aufgabe 50 — Editor-Uplift: Bearbeiten-Tab + Karten-Model + Konsistenz (go-live-reif) (2026-06-06)

**Status:** Branch `feature/aufgabe-50-bearbeiten-tab-uplift`. Type-Check durchgehend grün, Production-Build erfolgreich. Iterativ visuell mit Stavros abgenommen. **Kein DB-Change** (Marker-Stil nutzt die bestehende `fields.config`-jsonb-Spalte).

Der finale Pre-Go-Live-Pass über den Editor — funktional **und** optisch. Highlights:

**Save-Modell & Layout-Chrome:**
- **Speichern entkoppelt vom Navigieren** ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx) `handleSave({ leaveAfter })`): Edit-Modus speichert + **bleibt** (Badge „Gespeichert"), nur ExitModal/Create navigieren. Status + Aktion sind EIN Element oben rechts (kein separates Badge mehr).
- **Top-Bar = eine Zeile** (Name · Tabs mittig · Speichern). „Funnel testen" + Geräte-Umschalter **schweben im Canvas** (Schatten, kein Kasten), kein eigener Balken.
- **clamp-Spaltenbreiten** + geteilte `EDITOR_LEFT_COL` (clamp 280–340) → linke Spalte springt beim Tab-Wechsel nicht mehr. Alle Pane-Header einheitlich `h-14`/text-sm via `PanelListHeader` ([`ui/Panel.tsx`](../components/tenant-editor/v2/ui/Panel.tsx)).

**Karten-Model (Kernstück) — siehe [[feature_card_model]]:**
- Add-Menü ([`AddElementModal.tsx`](../components/tenant-editor/v2/AddElementModal.tsx)) = **Frage** (immersiv, eigener Schritt) · **Karten** (Kontaktdaten/Adresse/Eigene Karte) · **Einzelne Felder** (kompakt) · **Start** (Welcome).
- **Felder → in die gewählte Karte** (footer) oder neue Karte (`handleAddCardField` in EditorShell); Spezial-Typen = eigenständige Schritte. **Cards halten nur kompakte Felder** (Slider/Rating/Skala/Multi raus aus dem In-Card-Picker — würden sonst schrumpfen).
- **1-Feld-Karte rendert wie saubere Einzelfrage** (Feld-Label ausgeblendet bei genau 1 Feld + vorhandenem Titel) — `customFieldLabel` in [`funnel.tsx`](../components/funnel.tsx). **Canvas-„+"** auf nicht-leeren Karten. Neue Preset-Card **„Kontaktdaten"** (`makeContactCard` in [`defaults.ts`](../components/tenant-editor/defaults.ts)).

**Widget-Fixes ([`funnel.tsx`](../components/funnel.tsx)):**
- Mehrfachauswahl: doppelter Buchstabe entfernt; Option auch am Letter-Chip ziehbar.
- **Marker-Stil A/B/C · 1/2/3 · ohne** pro Choice-Frage (Inspektor-Segmented-Control), persistiert in `fields.config.optionMarker`, gerendert via `optionMarkerFor`. Mapping in [`editorUtils.ts`](../lib/editorUtils.ts) + [`getTenantConfig.ts`](../lib/getTenantConfig.ts).
- **Bugfix `visibleQuestions`:** im Editor wird NICHT mehr nach `visible` gefiltert (`editMode ? questions : filter`) → Off-by-one behoben, der bei einem deaktivierten Step vor dem selektierten auftrat (z.B. hidden Welcome an Index 0).

**Modals & Inspektor:**
- Alle Editor-Dialoge auf geteiltes [`EditorModal`](../components/tenant-editor/v2/ui/EditorModal.tsx) (+ `dismissible`-Prop für Pflicht-Dialoge) — behebt den Scroll-/Out-of-screen-Bug des Feld-Pickers. Natives `confirm()` → gestyltes [`ConfirmModal`](../components/tenant-editor/v2/ui/ConfirmModal.tsx). Frage-Inspektor flacher (kein „Feld dieser Seite"-Wrapper). Löschen-Buttons full-width zentriert.
- **Webhooks** ([`WebhooksPanel.tsx`](../components/tenant-editor/v2/WebhooksPanel.tsx)): Name **inline im Header editierbar** (on-blur), Config-Name-Feld raus; Detail-Body `max-w-3xl` zentriert; „Aktiv"-Toggle am Content-Rand (nicht mehr „lost").
- **StepList**: Welcome in eigener „Start"-Sektion, Footer-„Frage hinzufügen"-Button, Insert-„+" nach **jeder** Frage (inkl. letzter).
- **Design-Tab** ([`ThemePanel.tsx`](../components/tenant-editor/v2/ThemePanel.tsx)): „Funnel-weit/Design"-Header weg, **Seiten-Hintergrund = Segmented „Transparent | Eigene Farbe"**, Farb-Picker als sauberer Chip (globals.css `.lp-color-chip`), unnötiger Fußnoten-Hinweis weg.
- **Datenschutz editierbar** im Kontaktformular-Inspektor (`privacyText` + `privacyPolicyUrl` — waren im State, nicht im UI). **Bridge-Fix** — das Kontaktformular bleibt aber ein Relikt.

**Linke Nav** ([`Sidebar.tsx`](../components/dashboard/Sidebar.tsx)): Hover-Expand smoother (300ms + 130ms Grace-Delay beim Zuklappen). Overlay-Verhalten im Editor verifiziert (kein Reflow).

**Bewusst NICHT gemacht:** Paket „D" (lokale Inspektor-Controls auf `ui/Controls` vereinheitlichen) — reines DRY, Regressions-Risiko, kein User-Nutzen → gestrichen (Stavros: „UX-Prio 1, keine Konsistenz um der Konsistenz willen").

**Offen / nächster fokussierter Task (NACH Go-Live, in-depth analysieren):** **Kontaktformular card-ifizieren** — den hartkodierten Submit-Schritt abschaffen, Lead-Erfassung als normale Cards, Submit am Funnel-Ende, Consent optional. Go-live-kritisch (Billing-Pfad) → erst nach Validierung mit Sicherheitsnetz. Siehe CLAUDE.md „Submit-Page-Abschaffung geplant".

---

## Aufgabe 49 — Editor-UX-Uplift + Autosave-Pattern + Funnel-Cards + Webhook-Namen (2026-06-03)

**Status:** Branch `feature/aufgabe-49-funnel-cards`. Type-Check grün durchgehend. Visuell abgenommen. **1 additiver DB-Change** (`webhook_subscriptions.name`).

**Editor-Design-System erweitert — alle /edit-Tabs auf ein Vokabular (Bearbeiten war seit Aufgabe 45 schon Benchmark, jetzt der Rest dazu):**
- Kanonische Controls [`ui/Controls.tsx`](../components/tenant-editor/v2/ui/Controls.tsx): `EditorButton` (primary/secondary/ghost/danger + loading-Spinner), `TextInput`, `Textarea`, `Select`, `Toggle`. Verfeinert den bestehenden hellen Look, kein Stilbruch. (Lokale Controls in `FieldProperties.tsx` sind optisch identisch — bewusst nicht refactored, wäre rein DRY + riskant.)
- [`ui/Panel.tsx`](../components/tenant-editor/v2/ui/Panel.tsx) ergänzt: `SectionCard` (rounded-2xl Card mit optionalem Header) + `EmptyState` (Icon-Kreis + Headline + CTA).
- Geteilte Modal-Chrome [`ui/EditorModal.tsx`](../components/tenant-editor/v2/ui/EditorModal.tsx): Overlay+blur, Header (Scope+Titel+X), Scroll-Body, optionaler Footer, ESC + Klick-außen. [`AddElementModal`](../components/tenant-editor/v2/AddElementModal.tsx) + [`WebhookAddModal`](../components/tenant-editor/v2/WebhookAddModal.tsx) beide darauf gezogen.
- **Webhooks** + **E-Mails** + **Einbinden** ([`SharePanel.tsx`](../components/tenant-editor/v2/SharePanel.tsx)) auf SectionCard/EmptyState/Controls re-skinnt (Logik 1:1). „Signatur verifizieren"-Code-Snippet-Sektion aus Webhooks entfernt (für Nutzer ohne Mehrwert). Einbinden-Breite `max-w-3xl`→`max-w-5xl`.
- **Bearbeiten-Tab**: Canvas-Toolbar Desktop/Mobile-Umschalter auf TopTabs-Pill-Stil, Platzhalter (keine Frage / Submit übersprungen) auf `EmptyState` [`CenterCanvas.tsx`](../components/tenant-editor/v2/CenterCanvas.tsx).

**Autosave-on-blur-Pattern (projektweit, neu):**
- [`lib/useSaveStatus.ts`](../lib/useSaveStatus.ts) (Hook idle→saving→saved→idle / error) + [`components/ui/SaveStatus.tsx`](../components/ui/SaveStatus.tsx) (Indikator „Speichern…/Gespeichert ✓/Nicht gespeichert" — nie still, Kernprinzip „Daten gehen nicht verloren").
- Angewendet: **Funnel-Name** (Top-Bar inline editierbar mit Hover-Stift; schlanker `PATCH /api/tenant/funnels/[slug]` nur Metadaten — **kein** voller Dokument-Save, bewegliche Dirty-Baseline) · **Account-Profil** (Anzeigename+Telefon on-blur, [`account/page.tsx`](../app/dashboard/account/page.tsx)) · **Lead-Notizen** (immer editierbar + Auto-Grow-Textarea statt Stift-Modus, [`TenantLeadsTable.tsx`](../app/dashboard/TenantLeadsTable.tsx)). **Bewusst NICHT:** Mehrfeld-Draft-Editoren (E-Mail/Webhook-Eintrag) + Funnel-Inhalt → bleiben Dokument-Save mit Verwerfen.

**Webhook-Namen (DB-Change):**
- Migration `aufgabe_50_webhook_name`: `webhook_subscriptions.name text NULL` + Backfill bestehender Rows aus URL-Host. Rollback: `DROP COLUMN name`. Additiv, direkt auf Prod (mit User-Go, Präzedenz Aufgabe 43).
- POST leitet Default aus Host ab (`deriveWebhookName`), PATCH erlaubt `name`-Update, GET/Selects um `name` erweitert. UI: Liste zeigt **Name primär** + URL/Trigger, Detail-Header Name+Status, Name als Feld in der **Konfiguration** (mit dem Eintrag gespeichert), Anlegen-Modal optionales Name-Feld.

**Funnel-Cards-Redesign** [`FunnelCard.tsx`](../components/dashboard/FunnelCard.tsx):
- Bunter Per-Funnel-Akzentstreifen entfernt (war inkonsistent — jeder Funnel andere Farbe) → einheitliches **Status-Badge** (grün Aktiv / grau Inaktiv). Conversion-Chip raus. Kennzahlen als **Stat-Kacheln** (Leads + Aufrufe). Kompakter (`p-5`, Footer mit Trennlinie). Grid **3 Spalten** auf breiten Screens [`funnels/page.tsx`](../app/dashboard/funnels/page.tsx).

**Editor-Rename + Top-Bar/Sidebar (Branch-Basis, vor dem Uplift):**
- **`EditorShellV2` → `EditorShell`** (Symbol + Datei via `git mv` + alle Code-Refs + Doku-Sweep über alle `context/*`-Files; der Ordner `tenant-editor/v2/` + das `?v=2`-Routing-Flag bleiben bewusst unberührt).
- 3-Zonen-Top-Bar (Name links editierbar · Pill-Tabs mittig · Speichern/Status rechts) [`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx) + [`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx). Sidebar Hover-Expand im Editor-Modus [`Sidebar.tsx`](../components/dashboard/Sidebar.tsx).

> **Nächster + finaler Schritt vor Go-Live:** „Bearbeiten"-Tab perfektionieren (Funktionalität + Optik) — der Haupt-Arbeitsplatz des Users.

---

## Aufgabe 47 + 48 — Statistik-Feinschliff + Admin-Cockpit v1 (2026-06-02)

**Status:** Branch `feature/aufgabe-47-cockpit-polish`. Type-Check grün. Visuell abgenommen. **Kein DB-Change.**

**Aufgabe 47 — Cockpit-Feinschliff:**
- **Linien-Chart-X-Achse = Balken-Chart-Mechanik** ([`ViewsLeadsTrend.tsx`](../app/dashboard/statistiken/ViewsLeadsTrend.tsx)): Punkte sitzen in Spalten-Mitten (`xPct=(i+0.5)/n`), Labels als `flex-1`-Felder darunter (statt absolut positioniert), Desktop Wochentag+Tag, Mobile jedes N-te. Wochentag kommt als optionales `sublabel` aus [`MonthlyTable.tsx`](../app/dashboard/statistiken/MonthlyTable.tsx) (`getWeekday`). Behebt das „Labels verzogen / nicht responsive"-Problem.
- **Stripe-Entwicklungshinweis** (Webhook-Listen-Box) aus [`BillingClient.tsx`](../app/dashboard/billing/BillingClient.tsx) entfernt (unnötig, zeigte sich im Dev).

**Aufgabe 48 — Admin-Cockpit v1 (read-only Plattform-Owner-Sicht):**
- **Gating** [`lib/auth/superadmin.ts`](../lib/auth/superadmin.ts): `isSuperadmin(email)` über bestehende Env `SUPERADMIN_EMAIL` (komma-separiert, server-only). Kein neues Schema.
- **Route-Group** `app/admin/*`: [`layout.tsx`](../app/admin/layout.tsx) gated hart (`notFound()` für Nicht-Superadmins, verrät Bereich nicht) + schlanke Chrome. [`page.tsx`](../app/admin/page.tsx) = Workspace-Liste (Totals + Tabelle: Name·Owner·#Funnels·#Leads·zuletzt aktiv·Billing; verwaiste Tenants „kein Owner", eigener „du"). [`[tenantId]/page.tsx`](../app/admin/%5BtenantId%5D/page.tsx) = read-only Drill-in (Tenant-Header, Stat-Kacheln, Funnel-Liste, Leads aufklappbar via natives `<details>` — kein Client-JS).
- **Datenschicht** [`lib/admin/queries.ts`](../lib/admin/queries.ts): `getWorkspaces()` + `getWorkspaceDetail()` via Service-Key (`createAdminClient`), JS-Assembly (tenants + tenant_members + `auth.admin.listUsers/getUserById` für E-Mail+`last_sign_in_at` + funnels + submissions + view_logs). **Nur hinter dem Gate aufgerufen.**
- **Entry-Point**: Superadmin-only „Admin"-Link (Shield, amber) in [`Sidebar.tsx`](../components/dashboard/Sidebar.tsx) (Desktop + Mobile), `isSuperadmin` via [`dashboard/layout.tsx`](../app/dashboard/layout.tsx) → `DashboardShell` → `Sidebar`.
- **Read-only**, keine Aktionen (Billing einheitlich `free`). **Stufe 2 später:** Impersonation, Aktionen (sperren/löschen/Billing), Live-Presence, Such-/Sortier-UI, Cleanup der 6 verwaisten Test-Tenants.
- **Live-Hinweis:** `SUPERADMIN_EMAIL` muss im Vercel-Env gesetzt sein, sonst /admin = 404 für alle (fail-safe).

---

## Aufgabe 46 — Leads zu Mini-CRM + Kontakte-Merge + Billing-Box (2026-06-01)

**Status:** Code auf Branch `feature/aufgabe-46-leads-crm`. Migration `aufgabe_46_submissions_notes` **auf Produktion appliziert** (1 nullable Spalte, additiv, DOWN vorhanden). Type-Check grün. Tenant `Stavros` auf `billing_model='free'` gesetzt. Visuelle Abnahme offen. Teil 1 des Programms „Dashboard-Konsolidierung & Mini-CRM".

**Warum:** Das Dashboard-Areal zeigte dieselben `submissions`-Daten dreifach (Dashboard-Tabelle, Leads-Seite, Kontakte-Seite). Das CRM-Rückgrat (`submissions.status` + PATCH-Route `app/api/leads/[id]`) existierte seit Aufgabe 20, war aber **in keinem UI verdrahtet**. Ziel: ein schlankes Mini-CRM hinter dem Funnel-Leadmagnet.

**Entschieden (mit Stavros):**
- Status behält DB-Werte `offen/kontaktiert/abgeschlossen`, UI labelt neu → **Neu · Kontaktiert · Erledigt** (kein Enum-Change).
- **Türsteher**: nur kontaktierbare Submissions (E-Mail ODER Telefon) erscheinen als Leads; kontaktlose Tracking-Spuren werden ausgeblendet (zählen weiter in Statistik). Live: 32 Submissions → 26 Leads.
- Die alten 3 Bucket-Tabs (Abgeschlossen / Abbrecher-mit-Mail / Abbrecher-ohne-Mail) + „Kunde/Info"-Mail-Badges **komplett raus** (technisches Rauschen).
- **Kontakte-Seite entfernt** (war redundant zu Leads-„Abgeschlossen", kein Dedup).

**Umsetzung:**
- **Migration** `aufgabe_46_submissions_notes`: `submissions.notes text NULL` (freie interne CRM-Notiz pro Lead). Additiv, kein Backfill, kein CHECK (Längen-Cap ~5000 app-seitig).
- **API** [`app/api/leads/[id]/route.ts`](../app/api/leads/%5Bid%5D/route.ts): PATCH akzeptiert jetzt `{ status?, notes? }` (mind. eins). Status-Validierung wie gehabt, `notes` getrimmt, leer → NULL. User-Client + RLS.
- **Leads-Seite** [`app/dashboard/leads/page.tsx`](../app/dashboard/leads/page.tsx): Select um `status, notes` erweitert, Mail-Felder raus, Türsteher-Filter im Enrich, Bucket-Logik entfernt.
- **CRM-Tabelle** [`app/dashboard/TenantLeadsTable.tsx`](../app/dashboard/TenantLeadsTable.tsx) neu: Status-Tabs `Alle/Neu/Kontaktiert/Erledigt` mit Zählern; klickbarer **Status-Badge pro Zeile** (Dropdown → optimistic PATCH); Detail mit Status-Segmented-Control + **Notiz-Textarea (debounced Autosave ~800 ms)**. `resolveAnswer`/Detail/Filter wiederverwendet. Keine Mail-Badges.
- **Dashboard** [`app/dashboard/page.tsx`](../app/dashboard/page.tsx): Mapping an neue Shape angeglichen (Interim — Phase 2 baut Dashboard um).
- **Kontakte entfernt**: `app/dashboard/kontakte/page.tsx` + `components/leads/LeadsTable.tsx` gelöscht, Nav-Eintrag + `Users`-Icon-Import in [`navItems.ts`](../components/dashboard/navItems.ts) raus.
- **Billing** [`app/dashboard/billing/BillingClient.tsx`](../app/dashboard/billing/BillingClient.tsx): grüne Kostenlos-Info-Box bei `status==='free'`. Kein Feature-Gate aktiv (`isBillingActive()` nirgends aufgerufen) → rein kosmetisch. Abo-Button + Test-Kachel blenden sich für `free` automatisch aus. Stripe-Pfad intakt.

**Iteration (gleiche Session, Stavros-Feedback):**
- **Kanban-Board** in [`TenantLeadsTable.tsx`](../app/dashboard/TenantLeadsTable.tsx): List/Board-Umschalter oben. Board = 3 Spalten (Neu/Kontaktiert/Erledigt) via `@dnd-kit/core` (`useDraggable`/`useDroppable`/`DragOverlay`, schon vorhandene Dep) — Karte in andere Spalte ziehen = optimistischer Status-PATCH. Klick auf Karte → `LeadDetailModal` (geteilter `LeadDetailBody`: Kontakt+Antworten+Status+Notiz). `justDragged`-Ref unterdrückt Klick direkt nach Drag.
- **CRM-Notizfeld gesperrt**: `NotesEditor` jetzt Anzeige-Modus (Notiz-Text + ✎ / „+ Notiz hinzufügen") → Klick öffnet Textarea mit Speichern/Abbrechen. Autosave entfernt (explizites Speichern, nicht permanent editierbar).
- **Status-Sortierung** „Neu → Erledigt" als Sort-Option in der Liste.
- **Sanfter Status-Wechsel**: Listen-Zeilen via `framer-motion` `AnimatePresence` (Opacity-Exit) — kein abruptes Wegspringen mehr beim Statuswechsel.
- **„Feldname im Export" gehärtet** ([`FieldProperties.tsx`](../components/tenant-editor/v2/properties/FieldProperties.tsx) `FieldKeyEditor`): gesperrter Zustand ist jetzt ein eindeutig-gelockter Button (🔒 + „Ändern") statt input-artiger Box.

**Iteration 2 — Phasen 2-4 des Programms (2026-06-01, Commit 2):**
- **P2 Dashboard als Übersicht** [`app/dashboard/page.tsx`](../app/dashboard/page.tsx): volle Lead-Tabelle raus → 14-Tage-Chart + 3 KPIs (Leads gesamt/Aufrufe/Conversion) + **Pipeline-Karte** (Neu/Kontaktiert/Erledigt, klickbar → `/dashboard/leads?status=…`) + **Neueste-Leads-Teaser**. Leads-Seite liest `?status=`-Param ([`leads/page.tsx`](../app/dashboard/leads/page.tsx) → `TenantLeadsTable.initialStatus`). _(4 Zusatz-Cards waren testweise drin, auf Stavros-Wunsch wieder entfernt — Dashboard-Feinschliff bleibt für ganz am Ende.)_
- **P3 Statistik-Cockpit** ([`statistiken/`](../app/dashboard/statistiken/)): **Aufruf-Quelle vereinheitlicht** — `funnel_view_logs` ist jetzt die *einzige* Quelle für „Aufrufe"/Conversion (überall: Dashboard, Statistiken, Funnel-Liste). `total_views`-Zähler + `increment_funnel_views` aus dem Code raus, `track-view` schreibt nur noch den Log. Grund: nur Logs haben Zeitstempel → einzige konsistente, periodenfähige Quelle (Zahlen ändern sich: dein Funnel 114→291, Demos ohne Logs 0). **Chart-Ausrichtung gefixt** (Labels exakt unter Balken, `pl-8`-Hack raus). Neuer **Dual-Linien-Chart** `ViewsLeadsTrend` (Aufrufe vs. Ausgefüllt, generisch monatlich+täglich). **Funnel-Filter** als Client-Cockpit `StatistikenCockpit` (instant, kein Reload; filtert alles). Monats-Aufklapp: Dual-Linie (Überblick) + die zwei Tages-Balken (Detail, alle Tage beschriftet). Monats-Header ausgeschrieben (April 2026).
- **P4 Account** [`account/page.tsx`](../app/dashboard/account/page.tsx): **Danger Zone — Account löschen** mit Tipp-Bestätigung (Agentur-Name) + Server-Route [`api/account/delete`](../app/api/account/delete/route.ts) (Owner-geprüft, löscht Submissions + Tenant-Cascade + Auth-User, Service-Key). Website/Logo/Team bewusst weggelassen (nicht genutzt).
- **`tenants.website` deprecated**: Code-Refs raus (`getTenantConfig`/`emailTemplates`/`TenantConfig`), Daten geleert (6 Demo-Tenants → NULL). Spalte bleibt physisch (Prod-Sicherheit), Drop nach Deploy.
- **DB**: `total_views` + `increment_funnel_views` per Migration [`aufgabe_46b_drop_total_views`](../supabase/migrations/20260601130000_aufgabe_46b_drop_total_views.sql) gedroppt (Stavros-Go nach dem Commit — Prod-Dashboard auf altem `main` betroffen bis Deploy; öffentliche Widgets nicht, da `getTenantConfig` den Zähler nie las).

**Folgephasen (Plan, noch offen):** Cockpit-Stats optional (Antworten-Auswertung/Drop-off/Eingangs-Zeiten) · P5 Admin-Cockpit (Cross-Tenant, Owner-gated) · Dashboard-Feinschliff ganz am Ende · `tenants.website` physisch droppen nach Deploy.

---

## Aufgabe 45 — Editor-Design-System: Voll-Unifizierung der /edit-Tabs (2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking` (uncommitted, mit 42–44). Type-Check grün. Visuell iterativ mit Stavros abgenommen. Kein DB-/API-Touch.

**Warum:** Editor war Tab-für-Tab gewachsen → 5 Tabs, 4 Layout-Skelette, 2 Speichern-Modelle, 3 Sektion-Stile. Stavros: „insgesamt unstimmig". Gewählt: gemeinsames Editor-Design-System.

**Umsetzung (phasiert, mit visuellen Checkpoints):**
- **Geteilte Primitive** [`components/tenant-editor/v2/ui/Panel.tsx`](../components/tenant-editor/v2/ui/Panel.tsx): `PanelShell · PanelHeader · Section · Field · FieldHint` — kanonisiert aus dem bis dahin in jedem Panel duplizierten ThemePanel-Code. `ThemePanel` + `PropertiesPanel` laufen jetzt darauf (eine Quelle statt 2 Kopien).
- **Ein Speichern-Modell** ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx)): globaler Top-„Speichern" nur auf dem Dokument-Tab „Bearbeiten" (bzw. wenn ungesicherte Dokument-Änderungen bestehen). Ressourcen-Tabs (E-Mails/Webhooks/Einbinden) speichern pro Eintrag → kein doppeltes Speichern mehr.
- **Webhooks → Master-Detail** ([`WebhooksPanel.tsx`](../components/tenant-editor/v2/WebhooksPanel.tsx)): von zentrierter Karten-Liste + Modal auf Liste·Detail umgebaut — gleiches Layout wie E-Mails (`SubscriptionCard`→`WebhookDetail`, `selectedId` statt expand). Logik (CRUD/Test/Logs/Secret) unverändert wiederverwendet. Add-Modal bleibt vorerst fürs Anlegen.
- **Inhalt + Design zu einem Tab „Bearbeiten" zusammengelegt** ([`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx) + `EditorShell`): 3-Pane (StepList · Canvas · Inspektor). Rechter Inspektor hat einen **Umschalter „Inhalt | Design"** (`inspectorMode`): Inhalt = Schritt-Eigenschaften (`PropertiesPanel`), Design = funnel-weites Theme (`ThemePanel`). Scope wird vom `PanelHeader` angesagt. Top-Tabs jetzt: Bearbeiten · Logik (bald) · E-Mails · Webhooks · Einbinden (6 → 5).

**Konsens-Entscheidungen:**
- Drei kanonische Templates: A Canvas+Properties (Bearbeiten), B Master-Detail (E-Mails, Webhooks), C Einzelspalte-Config (Einbinden).
- Design nicht als eigener Tab (wirkte „verloren" als 2-Pane) → in „Bearbeiten" integriert mit Inspektor-Umschalter (gleiches Skelett wie Inhalt, Theme-Vorschau je Schritt).
- Funnel-Brand-Farbe nur im Canvas; Editor-Chrome bleibt Indigo. Widget (`funnel.tsx`) unberührt.

**Offen / Nice-to-have:** Einbinden-Section-Feinschliff, StepList-/Listen-Breiten-Angleich, Dark-Mode-/Abstands-Durchgang — fein-granular, am besten mit visueller Kontrolle.

---

## Aufgabe 44 — Navigations-Refactor: Side-Nav-Shell + Vollbild-Editor-Takeover (2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking` (weiterhin uncommitted mit 42+43). Type-Check grün, Smoke-Test grün (App bootet, Auth-Guard intakt, 0 Konsolen-Fehler). **Visuelle Abnahme durch Stavros offen** (Shell ist hinter Login — headless nicht prüfbar).

**Warum:** „Doppel-Navigation" — globale Top-Navbar + Editor-Tab-Leiste lagen als zwei gleich-aussehende Horizontal-Bars direkt übereinander (Ursache: Editor rendert im Dashboard-Layout, saß per `top:64px` unter dem Header). Beratung → Entscheidung: zwei Modi trennen.

**Umsetzung:**
- **Verwaltungs-Modus → linke Side-Nav** (Vercel-Stil, einklappbar): [`components/dashboard/Sidebar.tsx`](../components/dashboard/Sidebar.tsx) (Desktop-Rail `w-60`/`w-16` collapse + localStorage `lp_sidenav_collapsed`; Mobile = Top-Bar + Drawer als `MobileNav`-Export). Nav-Daten zentral in [`navItems.ts`](../components/dashboard/navItems.ts).
- **Bau-Modus → Icon-Leiste bleibt (VS-Code-Muster, KEIN Takeover):** [`DashboardShell.tsx`](../components/dashboard/DashboardShell.tsx) schaltet per `usePathname()`: Editor-Routen → `<Sidebar forceCollapsed/>` (fixierte 64px-Icon-Leiste, links) + Editor daneben; sonst volle Side-Nav. [`EditorShell`](../components/tenant-editor/v2/EditorShell.tsx) Container `top:64px` → `inset-y-0 right-0 left-0 lg:left-16` (sitzt rechts neben der Leiste). Die Nav verschwindet nie.
- **Layout:** [`app/dashboard/layout.tsx`](../app/dashboard/layout.tsx) rendert `DashboardShell` statt `DashboardHeader`+Wrapper (Auth/Tenant-Logik unverändert).
- **Footer = konsolidiertes User-Menü** (Vercel-Stil): Avatar + Name/Email + „…"-Trigger → Popover mit Account · Theme-Umschalter · Abmelden. Ersetzt den inkonsistenten nackten Theme-Icon. Theme-Init (dark-class on mount) lebt jetzt hier (Desktop) bzw. in `MobileNav`-`ThemeToggle` (Mobile).
- **Collapse-Toggle** als ruhige Zeile unten („‹ Einklappen") statt floatendem Pfeil oben rechts.
- **Gelöscht:** `app/dashboard/DashboardHeader.tsx` + `app/dashboard/TabNav.tsx`. Reuse: `__editorGuard`-Unsaved-Guard (Nav-Links im Editor bleiben klickbar → Guard schützt).

**Iteration 1 (Stavros-Feedback nach erstem Bild):** (a) Vollbild-Takeover war Überkorrektur — Side-Nav ist vertikal, löst die Doppel-Leiste schon → im Editor bleibt die Icon-Leiste stehen. (b) Footer-Theme-Icon inkonsistent → User-Menü-Popover. (c) Collapse-Pfeil oben rechts → ruhige Zeile unten.

**Offen:** erneute visuelle Abnahme; danach Nachzug der Nav-Beschreibungen in `architecture.md` + HTML-Diagrammen (Top-Nav → Side-Nav). Kein DB-/API-Touch, voll reversibel.

---

## Aufgabe 43 — Turnkey-Conversion-Tracking + Plattform-Anleitungen (2026-05-31)

**Status:** Code auf Branch `feature/aufgabe-42-conversion-tracking` (direkte Fortsetzung von Aufgabe 42, gleicher Branch). Migration **auf Produktion angewendet** (2 nullable Spalten, additiv). Type-Check grün. E2E-Browser-Test grün. Vollreferenz: [`conversion-tracking.md`](conversion-tracking.md).

**Warum:** Aufgabe 42 ließ den Kunden seinen Pixel selbst in GTM/Code verdrahten — laut Stavros nach dem Anschauen zu kompliziert („Copy-Paste ist das Maximum, niemand fummelt im Code"). Turnkey: Pixel-ID **einmal in ein Feld** eintragen, Snippet bleibt die 2 Zeilen, `embed.js` feuert automatisch.

**Migration** (`aufgabe_43_funnel_tracking`, additiv, DOWN vorhanden): `funnels` + `meta_pixel_id text NULL` + `google_ads_conversion text NULL`. Nullable, kein Backfill, kein CHECK (Format app-seitig). Direkt auf Produktion appliziert (mit Stavros-Go — Branch-Test für 2 Spalten unverhältnismäßig).

**Umsetzung:**
- **Config-Fluss:** `getTenantConfig` lädt die 2 Spalten → `TenantConfig.metaPixelId` / `.googleAdsConversion` ([`types/index.ts`](../types/index.ts)). `TenantFunnelClient` sendet sie **PII-frei** im `funnel-submit`-postMessage mit (`meta`/`google`).
- **[`public/embed.js`](../public/embed.js):** `funnel-submit`-Handler erweitert — IDs aus der Message (Vorrang) oder Fallback data-Attribute. `fireMeta` (init+track, Basiscode-Injection wenn `fbq` fehlt) + `fireGoogle` (gtag-Injection wenn `gtag` fehlt). **Format-Whitelist** vor jeder Injection (`^[0-9]{5,20}$` / `^AW-[0-9]+(/[\w-]+)?$`) — XSS/Injection-Schutz.
- **Save/Load:** [`app/api/tenant/funnels/[slug]/tracking/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/tracking/route.ts) — `GET` (Prefill) + `PATCH` (speichern), user-client + RLS, serverseitige Format-Whitelist.
- **UI — Editor-Reiter „Einbinden" (statt globaler Seite):** Nach Stavros-Feedback („zwei Einbinden-Reiter verwirren; Tracking ist pro Funnel") wurde der **deaktivierte Editor-Reiter `share` aktiviert** ([`TopTabs.tsx`](../components/tenant-editor/v2/TopTabs.tsx)) und ein **[`SharePanel`](../components/tenant-editor/v2/SharePanel.tsx)** gebaut (Snippet + `TrackingSettings` + `PlatformGuides` + GTM/Callback-Details), full-width wie Webhooks/E-Mails ([`EditorShell.tsx`](../components/tenant-editor/v2/EditorShell.tsx), mit „Funnel zuerst speichern"-Guard im Create-Modus).
- **Komponenten:** [`TrackingSettings.tsx`](../components/dashboard/TrackingSettings.tsx) (Eingabe + PATCH + DSGVO-Hinweis), [`PlatformGuides.tsx`](../components/dashboard/PlatformGuides.tsx) (WordPress/Wix/Squarespace/Webflow/Jimdo via `<details>`), [`CodeSnippet.tsx`](../components/dashboard/CodeSnippet.tsx) (CodeBlock+CopyBar, aus EmbedBlock extrahiert).
- **Entfernt (Konsolidierung):** globale Menü-Seite `app/dashboard/embed/page.tsx` + `components/dashboard/EmbedBlock.tsx` + Nav-Eintrag in [`TabNav.tsx`](../app/dashboard/TabNav.tsx) + Icon in [`DashboardHeader.tsx`](../app/dashboard/DashboardHeader.tsx). Eine Agentur nutzt je Endkunde ein anderes Pixel → Tracking gehört pro Funnel, nicht global.

**E2E verifiziert (Headless-Browser):** gültige IDs → `fbq('init',<id>)`+`fbq('track','Lead')` + `gtag('event','conversion',{send_to})` + dataLayer + onLead. Ungültige IDs (`abc` / `https://evil…`) → von Whitelist geblockt (kein fbq/gtag), dataLayer+onLead feuern weiter.

**Bewusst ausgeklammert (on-demand):** mehrere Pixel pro *einzelnem* Funnel; Server-CAPI.

> _Ältere Einträge (Aufgabe 42 und davor) wurden nach `history-archive.md` ausgelagert (2026-06-07)._
