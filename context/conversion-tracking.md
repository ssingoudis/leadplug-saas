# Conversion-Tracking + `embed.js` Script-Loader (Aufgabe 42 / D.2)

> **Erste Anlaufstelle für „wie kommen Funnel-Leads als Conversion zu Meta/Google".**
> Strategische Einordnung: D.2 ist laut Fokus-Roadmap der Performance-Marketing-Blocker —
> ohne Conversion-Signal können Agenturen ihre Ads nicht auf Leads optimieren.

## Das Grundproblem

Der Funnel läuft in einem **iFrame** auf `app.leadplug.de` — also einer anderen Domain als
die Kundenseite, auf der der Meta-Pixel / Google-Tag sitzt. Der Pixel kann nicht „in" den
iFrame schauen. Brücke: **`postMessage`** vom iFrame an die Elternseite, die daraufhin ihren
Pixel feuert.

## Gewähltes Modell (A — event-basiert)

LeadPlug speichert **keine** Pixel-IDs und hat **kein** Editor-UI dafür. Der Funnel feuert ein
sauberes Event; die (technische) Agentur verdrahtet ihre Pixel selbst — bevorzugt über Google
Tag Manager. Turnkey (Pixel-ID im Editor + DB) und Server-CAPI sind bewusst spätere
On-Demand-Optionen (siehe „Spätere Ausbaustufen").

## End-to-End-Fluss

```
Besucher schickt Funnel ab
      │
      ▼
components/funnel.tsx ── onSubmit ──▶ components/TenantFunnelClient.tsx (läuft IM iFrame)
                                            │
                                            │ window.parent.postMessage({ type:'funnel-submit',
                                            │   funnel:<slug>, meta:<pixelId|null>, google:<sendTo|null> }, '*')
                                            ▼                            ↑ KEINE PII (Pixel-IDs sind öffentlich)
                                     Elternseite (Kundenwebsite)
                                            │  /embed.js message-Listener (origin+source-gehärtet)
                                            ▼
                    ┌───────────────────────┼───────────────────────────┐
                    ▼                       ▼                           ▼
        dataLayer.push(             fbq('init',meta);              gtag('event','conversion',
          {event:'leadplug_lead'})   fbq('track','Lead')            {send_to:google})
                    │               (Basiscode-Injection            (gtag.js-Injection wenn nötig)
                    │                wenn nötig)              + window.LeadPlug.onLead({funnel})
                    ▼
            GTM-Trigger der Agentur → ihre Meta/Google-Tags (Bonus-Weg für Profis)
```

**Turnkey (Aufgabe 43):** Die Pixel-IDs kommen primär aus den pro-Funnel gespeicherten Feldern
(`funnels.meta_pixel_id` / `funnels.google_ads_conversion`), die der Tenant im Editor-Reiter
„Einbinden" einträgt → über `getTenantConfig` → in die `funnel-submit`-Message → `embed.js` feuert
automatisch. Fallback bleibt das `data-meta-lead`/`data-google-conversion`-Attribut am Container.

## Code-Layout

| Datei | Rolle |
|---|---|
| [`components/TenantFunnelClient.tsx`](../components/TenantFunnelClient.tsx) | `handleSubmit` sendet **vor** dem `await fetch` ein PII-freies `funnel-submit`-postMessage an `window.parent` (guard: `window.parent !== window`). Deckt Submit- + Skip-Mode ab. |
| [`public/embed.js`](../public/embed.js) | **Upgrade des bestehenden Loaders** (abwärtskompatibel). Statisch ausgeliefert, self-deriving Origin aus der eigenen `<script src>`-URL. Erzeugt iFrames pro Slug-Container, eine globale Message-Bridge (Resize + Submit), feuert Conversions. Erkennt `data-leadplug` (neu, kanonisch) + Legacy `data-funnel-slug` (div) / `data-slug` (script). Zentrale Updates greifen beim nächsten Deploy. |
| [`lib/embedSnippet.ts`](../lib/embedSnippet.ts) | `buildScriptEmbed(slug, origin)` → empfohlenes 2-Zeilen-Snippet. `buildEmbedSnippet(...)` → klassisches iFrame-Snippet (Fallback, ohne Tracking). |
| [`lib/getTenantConfig.ts`](../lib/getTenantConfig.ts) | Lädt `meta_pixel_id` / `google_ads_conversion` aus `funnels` → `TenantConfig.metaPixelId` / `.googleAdsConversion`. |
| [`components/editor/SharePanel.tsx`](../components/editor/SharePanel.tsx) | **Editor-Reiter „Einbinden" pro Funnel** (Aufgabe 43): Snippet (Script primär + iFrame-Fallback) · Conversion-Tracking-Felder (`TrackingSettings`) · Plattform-Anleitungen (`PlatformGuides`) · GTM/Callback-Details. Lädt Tracking via GET, speichert via PATCH. |
| [`components/dashboard/TrackingSettings.tsx`](../components/dashboard/TrackingSettings.tsx) | Eingabefelder Meta-Pixel-ID + Google-Ads-Conversion + Speichern (PATCH). Client-Format-Validierung + DSGVO-Hinweis. |
| [`app/api/tenant/funnels/[slug]/tracking/route.ts`](../app/api/tenant/funnels/%5Bslug%5D/tracking/route.ts) | `GET` (Prefill) + `PATCH` (speichern), user-client + RLS. Format-Whitelist serverseitig (identisch zu embed.js). |
| [`components/dashboard/CodeSnippet.tsx`](../components/dashboard/CodeSnippet.tsx) | Wiederverwendbarer `CodeBlock` + `CopyBar` (aus dem gelöschten EmbedBlock extrahiert). |

> **Platzierung (Aufgabe 43):** Embed-Code + Tracking leben pro Funnel im **Editor-Reiter „Einbinden"** (konsistent zu Webhooks/E-Mails). Die frühere globale Menü-Seite `/dashboard/embed` + `EmbedBlock` wurden entfernt (Tracking ist pro Funnel — eine Agentur nutzt je Endkunde ein anderes Pixel).

## Tenant-Einbettung

```html
<div data-leadplug="dein-funnel-slug"></div>
<script src="https://app.leadplug.de/embed.js" defer></script>
```

Drei Wege, das Lead-Signal abzugreifen:

1. **Google Tag Manager (empfohlen):** Trigger „Benutzerdefiniertes Ereignis" auf
   `leadplug_lead`, daran die eigenen Meta-/Google-Conversion-Tags hängen.
2. **Ohne GTM — data-Attribute am `<div>`:**
   - `data-meta-lead` → feuert `fbq('track','Lead')`, sobald `fbq` vorhanden ist.
   - `data-google-conversion="AW-123456789/AbCdEfGh"` → feuert `gtag('event','conversion',{send_to})`.
   - Opt-in by design — verhindert Doppel-Feuern, wenn dieselbe Conversion bereits über GTM läuft.
3. **Eigener Code:** `window.LeadPlug = { onLead: (e) => { /* e.funnel */ } }`.

## Sicherheit / Datenschutz

- **Keine PII** im postMessage (kein `email`/`name`) — `targetOrigin: '*'` ist von jedem
  Skript auf der Elternseite lesbar. Nur `type` + `funnel`-Slug. Meta-`Lead` / Google-`conversion`
  brauchen clientseitig keine personenbezogenen Daten.
- `/embed.js`-Listener prüft **`e.origin === <app-origin>`** UND **`e.source === iframe.contentWindow`** —
  identisch gehärtet wie das Alt-iFrame-Snippet. Schützt gegen Fremd-iFrames auf der Tenant-Seite.
- Höhe wird auf 100–10000 px geclampt (Schutz gegen scrollHeight-Ausreißer).

## Verifikation (lokal)

1. `next dev`, eine Test-HTML mit dem Script-Snippet gegen einen Demo-Funnel laden.
2. Vor dem Laden stubben: `window.dataLayer=[]`, `window.fbq`, `window.gtag`, `window.LeadPlug={onLead:…}`.
3. Funnel absenden → `dataLayer` enthält `{event:'leadplug_lead'}`; bei gesetzten data-Attributen
   feuern `fbq`/`gtag`; `onLead` wird aufgerufen. Resize funktioniert weiter; gespoofte Fremd-Message wird verworfen.

## Turnkey ✅ gebaut (Aufgabe 43)

Pixel-ID-Felder pro Funnel im Editor-Reiter „Einbinden" → DB-Spalten `funnels.meta_pixel_id` /
`funnels.google_ads_conversion` → `getTenantConfig` → `funnel-submit`-Message → `embed.js` feuert
automatisch (inkl. Basiscode-Injection von `fbevents.js` / `gtag.js` wenn auf der Seite noch nicht
vorhanden). Format-Whitelist serverseitig (PATCH-Route) **und** clientseitig (embed.js):
`meta` = `^[0-9]{5,20}$`, `google` = `^AW-[0-9]+(/[\w-]+)?$`. Mehrere Pixel pro **Funnel** (nicht pro
Tenant) — eine Agentur nutzt je Endkunde ein anderes Pixel.

## Spätere Ausbaustufen (nicht gebaut, on-demand)

- **Mehrere Pixel pro einzelnem Funnel** (z.B. Agentur-Pixel + Kunden-Pixel gleichzeitig): heute 1× Meta
  + 1× Google pro Funnel. Feld ließe sich auf Mehrwert-Listen erweitern.
- **Server-CAPI:** Meta Conversions API / Google Enhanced Conversions server-zu-server (robust gegen
  Adblocker/iOS). Braucht Access-Token pro Tenant + Event-Dedup. Passt als künftiges **Action-Element**
  (wie Webhooks/E-Mails) in `/api/submit`.
