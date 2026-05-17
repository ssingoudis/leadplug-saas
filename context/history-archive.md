# History Archive

Ältere abgeschlossene Aufgaben, ausgelagert aus `current-feature.md`.

---

- **Aufgabe 6 – API-Route aktualisiert** – Honeypot-Check zuerst, `lead_price` server-side, `logSubmission` vor E-Mails. (`app/api/submit/route.ts`, `lib/tracking.ts`, `lib/sendEmails.ts`)
- **Aufgabe 7 – E-Mail-Templates bereinigt** – `emails/PlatformTracking.tsx` gelöscht. 2-Mail-Flow. Kein Preis-Feld in Kunden-Mail.
- **Aufgabe 8 – Deprecated Files entfernt** – `lib/generatePDF.ts` und `lib/priceCalculator.ts` gelöscht. `tsc --noEmit` + `npm run build` → erfolgreich.
- **Aufgabe 9 – Dynamische Funnel-Konfiguration** – Alle bisher hardcodierten Texte und das Kontaktformular sind nun vollständig aus Supabase konfigurierbar. DB: 3 neue Textspalten in `funnels` (`privacy_text`, `answers_overview_label`, `footer_text` mit `{{company_name}}`/`{{public_email}}`/`{{public_phone}}`-Template) + `contact_fields JSONB`. `ContactData` ist jetzt `Record<string, string>`. Validierungslogik in `lib/validateContactField.ts` extrahiert. (`components/funnel.tsx`, `components/TenantFunnelClient.tsx`, `lib/getTenantConfig.ts`, `lib/validateContactField.ts`, `app/api/submit/route.ts`, `emails/CustomerConfirmation.tsx`, `emails/TenantLeadNotification.tsx`)
- **Aufgabe 10 – total_views Tracking** – Neue Spalte `total_views INT DEFAULT 0` in `funnels`. PostgreSQL-Funktion `increment_funnel_views` (SECURITY DEFINER). Neuer API-Endpoint `/api/track-view`. Admin-Dashboard zeigt Leads · Aufrufe · Conversion-Rate · letzte Aktivität. (`app/api/track-view/route.ts`, `components/TenantFunnelClient.tsx`)
- **Aufgabe 11 – Dashboard-Rename & Redesign** – `/funnel-overview` → `/dashboard`. `DailyLeadsChart` (21 Tage, reines CSS). Neues Layout: Chart → Funnels → Monatsübersicht. (`proxy.ts`, `app/dashboard/page.tsx`, `app/dashboard/FunnelGrid.tsx`, `app/dashboard/MonthlyStats.tsx`, `app/dashboard/DailyLeadsChart.tsx`)
- **Neue Fragetypen (question_type ENUM + JSONB config)** – PostgreSQL ENUM `question_type` + `config JSONB` in `funnel_questions`. (`lib/getTenantConfig.ts`, `types/index.ts`)
- **Funnel – neue Frage-Renderer** – Cards für `single_choice`/`multiple_choice`, Input/Textarea für Text, Range-Slider. (`components/funnel.tsx`, `app/globals.css`)
- **Design-Overhaul Option-Cards** – Volle Primary-Farbe als Selected-Fill, Auto-Advance 325ms, Zurück-Button als ArrowLeft-Icon. (`components/funnel.tsx`, `components/icons.tsx`)
- **`resolveAnswer` Helper** – Datengetriebener Helper für Options-Label-Auflösung + Unit-Formatierung. (`lib/resolveAnswer.ts`, `emails/`, `components/funnel.tsx`)
- **DB-Cleanup & Refactor** – 6 tote `tenants`-Spalten gedroppt, `industries`-Tabelle entfernt, `themes`-Tabelle aufgelöst (7 Spalten direkt in `funnels`), `emails_sent` → `customer_email_sent` + `tenant_email_sent`, `honeypot_triggers`-Tabelle neu. (`lib/getTenantConfig.ts`, `lib/tracking.ts`, `app/api/submit/route.ts`)
- **Rate Limiting auf `/api/submit`** – Max. 3 Submissions pro IP in 10 Minuten. `isRateLimited()` fail-open. IP in `submissions.ip_address`. (`app/api/submit/route.ts`, `lib/tracking.ts`)
- **Shadow-System refactored** – `CARD_SHADOW_LAYERS` als Single Source of Truth, bottom-fokussierter Two-Layer-Shadow. (`components/funnel.tsx`)
- **iFrame-Einbettung & Fixes** – postMessage auf `containerRef.scrollHeight`, `useEffect` mit `[isSubmitted]`. (`components/funnel.tsx`, `lib/getTenantConfig.ts`)
- **UI-Restyling + Icon-Migration** – Icons auf Lucide React, Option-Cards mit Shadow + Hover-Lift. (`components/funnel.tsx`, `components/icons.tsx`)
- **Admin: E-Mail-Monitoring & Responsive Fixes** – E-Mail-Status-Badges in Monatsübersicht, Responsive Fixes. (`app/dashboard/`)
- **funnel.tsx: 5-Option-Grid, Slider & Container-Queries** – `@[660px]:grid-cols-5`, Slider ohne editierbares Input, Container Queries statt `md:`/`lg:`. (`components/funnel.tsx`)
- **E-Mail-Verbesserungen** – `response_time_text` → `response_message`, Preview-Tag-Fix. (`emails/`, `lib/getTenantConfig.ts`)
- **Admin: E-Mail-Vorschauen** – Lazy-Iframe-Vorschauen für Bestätigungs- und Lead-Mail in `/dashboard/[slug]`. (`app/dashboard/[slug]/EmailPreviewBlock.tsx`, `email-preview/route.tsx`, `lead-preview/route.tsx`)
