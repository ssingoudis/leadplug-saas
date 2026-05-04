# Current Feature

Funnel Widget Platform – generischer Multi-Tenant iFrame Sales-Funnel für Handwerksbetriebe aller Branchen.

---

## Notes

### Font-System

Kuratierter Font-Enum: `FunnelFont = "system" | "inter" | "poppins" | "roboto"`. Self-hosted unter `public/fonts/` (DSGVO-konform). Neuen Font: `.woff2` in `public/fonts/<name>/`, `@font-face` in `app/globals.css`, Key in `FunnelFont` und `FONT_STACKS` in `funnel.tsx`.

### Billing-Logik

- `per_lead`: `lead_price` = `tenants.lead_price_base` pro Submission
- `flat_monthly`: `lead_price` = `0` pro Submission; Abrechnung = `flat_monthly_price` pauschal/Monat; Leads über `flat_monthly_lead_limit` erscheinen als `overage_leads` in der View

### Supabase Free Tier

Pausiert nach Inaktivität (~10 Min Cold Start). Für Produktiv-Einsatz auf Pro upgraden oder Keep-Alive einrichten.

---

## History

- **Shadow-System refactored** – `CARD_SHADOW_LAYERS` als Single Source of Truth: Shadow-Padding (top/bottom) wird automatisch aus den Layer-Definitionen berechnet. Bottom-fokussierter Two-Layer-Shadow (`0 8px 20px -16px / 0 0px 10px -3px`) für minimale horizontale Ausdehnung (~7px) bei sichtbarem Elevation-Effekt. Kein seitliches Padding nötig. Dokumentationen `Anleitungen/postMessage-Erklaerung.md` + `Anleitungen/embed-js-Erklaerung.md` neu erstellt. (`components/funnel.tsx`, `Anleitungen/`)
- **iFrame-Einbettung & Fixes** – postMessage-Höhenmessung auf `containerRef.scrollHeight` umgestellt (statt `document.body.scrollHeight`, das durch `min-h-dvh` verfälscht wurde). `paddingTop: 8px` + `paddingBottom: 28px` für Shadow-Sichtbarkeit. Bug gefixt: `useEffect` mit `[isSubmitted]` statt `[]` (ResizeObserver beobachtete nach Submission falsches Element). Anrede: "Divers" entfernt. Toter Code entfernt (alte Supabase-Abfrage in `getTenantConfig.ts`). CLAUDE.md Icon-Pfad korrigiert. Anleitungen `iFrame-Code.md` + `Widget-Einbetten.md` neu erstellt/aktualisiert. (`components/funnel.tsx`, `lib/getTenantConfig.ts`, `CLAUDE.md`, `Anleitungen/`)
- **UI-Restyling + Icon-Migration** – Icons auf Lucide React umgestellt (`icons.tsx` komplett neu, `ICON_MAP` exportiert, `renderIcon` nimmt jetzt `color`). Option-Cards: Shadow, Hover zeigt vollen Selected-Look, Icon-Wrapper mit primaryColor-Tint. Progress-Bar dicker. Widget-Container: Shadow + `borderRadius` aus Theme. (`components/funnel.tsx`, `components/icons.tsx`, `types/index.ts`)
- **Aufgabe 8 – Deprecated Files entfernt** – `lib/generatePDF.ts` und `lib/priceCalculator.ts` gelöscht. `tsc --noEmit` + `npm run build` → erfolgreich.
- **Aufgabe 7 – E-Mail-Templates bereinigt** – `emails/PlatformTracking.tsx` gelöscht. 2-Mail-Flow. Kein Preis-Feld in Kunden-Mail.
- **Aufgabe 6 – API-Route aktualisiert** – Honeypot-Check zuerst, `lead_price` server-side, `logSubmission` vor E-Mails. (`app/api/submit/route.ts`, `lib/tracking.ts`, `lib/sendEmails.ts`)
- **Neue Fragetypen (question_type ENUM + JSONB config)** – DB-Schema erweitert: PostgreSQL ENUM `question_type` (`single_choice`, `multiple_choice`, `short_text`, `long_text`, `slider`) + `config JSONB` Spalte in `funnel_questions`. Migration: `context/migration-question-types.sql`. Schema-Referenz: `context/supabase-schema-neu.sql`. (`lib/getTenantConfig.ts`, `types/index.ts`)
- **Funnel – neue Frage-Renderer** – `funnel.tsx` rendert je nach `questionType`: Cards für `single_choice` + `multiple_choice`, `<input>` für `short_text`, `<textarea>` für `long_text`, Range-Slider + Zahleneingabe für `slider`. Slider nutzt `.funnel-slider` CSS-Klasse (grauer Track, farbiger Thumb via `--funnel-primary`). Weiter-Button nur für Nicht-`single_choice`-Typen. (`components/funnel.tsx`, `app/globals.css`)
- **Design-Overhaul Option-Cards** – Kein Default-Border; volle Primary-Farbe als Selected-Fill (weißes Icon/Text); 44px Icons ohne Pill-Wrapper; Hover: Border + Shadow-Lift ohne Scale; 325 ms Auto-Advance-Delay. Zurück-Button als `ArrowLeft`-Icon + Text mit größerem Gap. Progress-Bar oberhalb, darunter `justify-between`-Zeile mit Zurück links und Weiter rechts. (`components/funnel.tsx`, `components/icons.tsx`)
- **`resolveAnswer` Helper** – Generischer, datengetriebener Helper für alle Fragetypen: Options → Label-Auflösung, Unit → formatierte Zahl + Einheit, Fallback → Rohtext. Neue Typen werden automatisch abgefangen ohne Code-Änderungen. Eingesetzt in Success-Screen, `CustomerConfirmation.tsx` und `TenantLeadNotification.tsx`. (`lib/resolveAnswer.ts`, `emails/CustomerConfirmation.tsx`, `emails/TenantLeadNotification.tsx`, `components/funnel.tsx`)
- **Rate Limiting auf `/api/submit`** – Max. 3 Submissions pro IP in 10 Minuten. `isRateLimited()` in `lib/tracking.ts` prüft Supabase, schlägt fail-open (lässt durch bei DB-Fehler). Silent reject wie Honeypot. IP-Adresse wird in neuer Spalte `ip_address` in `submissions` gespeichert. Migration: `context/migration-rate-limiting.sql`. (`app/api/submit/route.ts`, `lib/tracking.ts`, `context/migration-rate-limiting.sql`)
- **openMax-Anzeige rückgängig gemacht** – `> X`-Anzeige bei Slider-Maximum aus `funnel.tsx` entfernt (Typ-Feld `openMax` in `types/index.ts` bleibt). (`components/funnel.tsx`)
- **Funnel-Übersicht (Admin-Dashboard)** – Passwortgeschütztes Admin-Dashboard unter `/funnel-overview`: Alle aktiven Funnels als Karten-Grid (Firmenname, Slug, URL, Primärfarbe, Lead-Zähler, letzte Aktivität, Embed-Code kopieren). Suche nach Firmenname. Monatsübersicht (letzte 12 Monate, Leads pro Monat) als Tabelle darunter. Passwortschutz via `middleware.ts` + Cookie (`SITE_PASSWORD` in `.env.local`). Login-Seite unter `/locked` (Indigo-Design). Root `/` leitet auf `/funnel-overview` um. (`middleware.ts`, `app/locked/page.tsx`, `app/funnel-overview/page.tsx`, `app/funnel-overview/FunnelGrid.tsx`, `app/funnel-overview/MonthlyStats.tsx`, `app/page.tsx`, `.env.example`)
