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
