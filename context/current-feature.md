# Current Feature

Solar Funnel Widget – Multi-Tenant iFrame Sales Funnel für Photovoltaik-Monteure

## Status

Completed

## Goals

- Einbettbares iFrame-Widget als Click-Funnel (6 Fragen + Kontaktformular)
- Multi-Tenant: Jeder Kunde bekommt eigene URL `/[slug]` mit eigener JSON-Konfiguration
- 3 automatische E-Mails pro Submission (Endkunde, Monteur, Platform-Owner)
- PDF-Generierung mit vorläufiger Preisschätzung als Anhang
- Supabase-Tracking für Abrechnung (0,10€ pro Submission)
- Vollständige Details: siehe `context/project-overview.md`

## Notes

- Basis-Komponente `components/solar-funnel.tsx` stammt aus v0-Export – überarbeiten, nicht neu schreiben
- Alle hardgecodierten Werte müssen durch Props aus TenantConfig ersetzt werden
- Supabase IMMER zuerst loggen, bevor E-Mails versendet werden
- SUPABASE_SERVICE_KEY niemals mit NEXT_PUBLIC_ Prefix verwenden

## History

- Initial Next.js project setup (Create Next App, App Router, TypeScript, Tailwind CSS v4)
- Projekt aufräumen – v0/shadcn-Boilerplate entfernt; behalten: app/, components/solar-funnel.tsx, lib/utils.ts, context/, public/icons, Konfigurationsdateien (components/ui/, hooks/, styles/, components/theme-provider.tsx, components.json, pnpm-lock.yaml, env.example, public/placeholder-*)
- Ordnerstruktur anlegen – Stub-Dateien für Tenants, Emails, Types und Lib-Module erstellt (types/index.ts, lib/getTenantConfig.ts, lib/priceCalculator.ts, lib/tracking.ts, lib/generatePDF.ts, lib/sendEmails.ts, tenants/_template.json, tenants/demo.json, tenants/musterfirma.json, emails/CustomerConfirmation.tsx, emails/TenantLeadNotification.tsx, emails/PlatformTracking.tsx)
- Dependencies installieren – resend, @react-email/components, @react-pdf/renderer, @supabase/supabase-js via npm hinzugefügt (package.json, package-lock.json)
- Typen definieren – Alle Interfaces aus Abschnitt 5 der Overview implementiert: FunnelTheme, Option, QuestionConfig, FunnelConfig, PricingConfig, TenantConfig, ContactData, PriceEstimate, SubmitPayload (types/index.ts)
- Tenant-System – _template.json, demo.json und musterfirma.json mit vollständiger Config (Theme, Funnel-Texte, 6 Fragen, Pricing) befüllt; getTenantConfig.ts implementiert mit Slug-Validierung und ENOENT→null Handling (tenants/_template.json, tenants/demo.json, tenants/musterfirma.json, lib/getTenantConfig.ts)
- Dynamic Route – app/[tenant]/page.tsx lädt TenantConfig async, ruft notFound() bei ungültigem Slug, rendert SolarFunnel mit theme/questions Props; minimales Layout für iFrame-Einbettung; iFrame-Header (CSP frame-ancestors *, X-Frame-Options ALLOWALL) in next.config.mjs (app/[tenant]/page.tsx, app/[tenant]/layout.tsx, next.config.mjs)
- Preisrechner – calculateEstimate() implementiert: basePrice aus PricingConfig anhand answers.flaeche, +storageAddon wenn stromspeicher===ja, min=total*0.9 / max=total*1.15 gerundet, Fallback 15000€ bei fehlendem basePrice-Key (lib/priceCalculator.ts)
- Supabase Tracking – logSubmission() und getMonthlyCount() implementiert mit lazy Client-Init (SUPABASE_URL/SUPABASE_SERVICE_KEY server-side); Fehler werden geloggt aber nie geworfen (Endkunde darf nie einen Tracking-Fehler sehen); SQL-Schema mit submissions-Tabelle, Billing-Indizes und monthly_billing-View angelegt (lib/tracking.ts, context/supabase-schema.sql)
- PDF-Generierung – generatePDF() mit @react-pdf/renderer via renderToBuffer; Layout enthält Firmenkopf (Name/Adresse/Tel/E-Mail), Titel mit Datum, Kontaktdaten-Block, Antworten-Tabelle, farblich hervorgehobene Preisbox (primaryColor aus Theme), Disclaimer und fixed Footer; Intl.NumberFormat für EUR-Formatierung und Intl.DateTimeFormat für deutsches Datum (lib/generatePDF.ts)
- E-Mail-Templates – 3 React-Email-Templates implementiert: CustomerConfirmation (Dank + Preisbox in Tenant-Primary + Angaben-Überblick + Ansprechpartner), TenantLeadNotification (Kontaktdaten mit klickbarem mailto:/tel:, Antworten-Liste, berechnete Preisspanne, Handlungsempfehlung), PlatformTracking (Tenant/Zeitstempel + Audit-Kontaktdaten + gelbe Billing-Box mit Monatszähler × 0,10€) (emails/CustomerConfirmation.tsx, emails/TenantLeadNotification.tsx, emails/PlatformTracking.tsx)
- E-Mail-Versand – sendAllEmails() implementiert: lazy Resend-Client (RESEND_API_KEY), alle 3 Mails via Promise.all parallel; Customer-Mail mit PDF-Anhang (solar-angebot-[slug]-[YYYY-MM-DD].pdf), Tenant-Mail mit replyTo=contact.email, Platform-Mail nur wenn PLATFORM_OWNER_EMAIL gesetzt; jeder Send-Fehler wird geloggt aber nie geworfen, Rückgabe {customer,tenant,platform} Booleans für API-Route (lib/sendEmails.ts)
- API-Route – app/api/submit/route.ts (POST, runtime=nodejs) implementiert: JSON-Parse + isValidPayload-Shape-Check (tenant/answers/contact.name/email/telefon/anrede) → 400 bei ungültigem Payload, 404 wenn getTenantConfig null liefert; Reihenfolge laut CLAUDE.md: Config laden → calculateEstimate → logSubmission ZUERST (Billing darf nie verloren gehen) → Promise.all([generatePDF, getMonthlyCount]) → sendAllEmails; PDF/Email-Pipeline in try/catch gewrappt, damit der Endkunde immer {success:true} erhält (app/api/submit/route.ts)
- Aufräumen – v0-Boilerplate entfernt: app/page.tsx gelöscht (Root geht direkt auf /[tenant]); app/layout.tsx bereinigt (ungenutzte Geist-Font-Imports und v0.app-Generator-Metadata raus); @import 'tw-animate-css' aus globals.css entfernt (Funnel nutzt nur Vanilla-Tailwind transition-*); generatePDF.ts ReactElement<DocumentProps> Typ korrigiert (renderToBuffer-Signatur); package.json auf tatsächlich genutzte Deps reduziert (radix-ui, lucide-react, react-hook-form, zod, recharts, date-fns, sonner, vaul, embla-carousel, cmdk, input-otp, next-themes, class-variance-authority, tw-animate-css, @hookform/resolvers entfernt → 135 npm-Pakete weniger); `npm run build` läuft grün (Routes: /_not-found, /[tenant], /api/submit), `tsc --noEmit` ohne Fehler (app/page.tsx [gelöscht], app/layout.tsx, app/globals.css, lib/generatePDF.ts, package.json)

<!-- Claude: Nach jeder abgeschlossenen Aufgabe hier einen Eintrag hinzufügen -->
<!-- Format: - [Aufgabe] – [kurze Beschreibung was gemacht wurde] (welche Dateien erstellt/geändert) -->
