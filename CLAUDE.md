# CLAUDE.md – Solar Funnel Widget

Einbettbares iFrame-Widget (Next.js + TypeScript + TailwindCSS + shadcn/ui-Basis aus v0), Multi-Tenant Sales-Funnel für Photovoltaik-Monteure.

- Architektur & Business-Logik: [`context/project-overview.md`](context/project-overview.md)
- Status & offene Aufgaben: [`context/current-feature.md`](context/current-feature.md)
- History älterer Aufgaben: [`context/history-archive.md`](context/history-archive.md)

## Wichtige Regeln

- **Kein Hardcode** – alle tenant-spezifischen Werte kommen aus `tenants/[slug].json` (Typ `TenantConfig` in [`types/index.ts`](types/index.ts)).
- **Supabase Service Key** nur server-side verwenden; niemals mit `NEXT_PUBLIC_`-Prefix.
- **Billing-Reihenfolge in `/api/submit`:** erst `logSubmission()` (Supabase), dann PDF/E-Mails – Billing darf nie durch E-Mail-Fehler verloren gehen.
- Fehler in Tracking/E-Mail: loggen, **nicht werfen** (Endkunde bekommt immer `{success:true}`).
- Die 3 E-Mails parallel via `Promise.all`, nicht sequenziell.
- `pricePerLead` server-side aus `tenantConfig.billing?.pricePerLead ?? 0.10` lesen – nicht vom Client vertrauen.
- Umgebungsvariablen: `.env.local` (Vorlage `.env.example`).

## Dokumentationspflicht

Nach jeder abgeschlossenen Aufgabe Eintrag in `context/current-feature.md` anfügen:

```
- [Aufgabenname] – [Was wurde gemacht] ([betroffene Dateien])
```

Bei > ~10 Einträgen die ältesten nach `context/history-archive.md` verschieben.
