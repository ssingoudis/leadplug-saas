# Current Feature

Solar Funnel Widget – Multi-Tenant iFrame Sales Funnel für Photovoltaik-Monteure.

## Status

Completed

## Goals

- Einbettbares iFrame-Widget als Click-Funnel (6 Fragen + Kontaktformular)
- Multi-Tenant: eigene URL `/[slug]` pro Kunde mit eigener JSON-Konfiguration
- 3 automatische E-Mails pro Submission (Endkunde, Monteur, Platform-Owner)
- PDF-Generierung mit vorläufiger Preisschätzung als Anhang
- Supabase-Tracking für Abrechnung – **Lead-Preis ist pro Tenant individuell verhandelbar** (`billing.pricePerLead` in der Tenant-JSON, z. B. 0,10 € / 0,20 € / 2,00 €), wird pro Submission persistiert

Architektur-Details: [`project-overview.md`](project-overview.md).

## Notes

### Font-System (seit Aufgabe 22)

Das Widget nutzt einen **kuratierten Font-Enum** statt dynamischem Loading. `FunnelFont = "system" | "inter" | "poppins" | "roboto"` in [types/index.ts](../types/index.ts). Alle Nicht-System-Fonts liegen DSGVO-konform self-hosted unter [public/fonts/](../public/fonts/) – **kein Google-Fonts-Request** (LG München 2022).

**Nur Fonts herunterladen, die tatsächlich von einem Tenant genutzt werden.** Fehlt eine `.woff2`-Datei, fällt der Browser stumm auf den System-Stack zurück (Widget bleibt funktional, nur 404s in der Konsole). Für Download-Prozess und Dateinamen-Schema siehe [public/fonts/README.md](../public/fonts/README.md) – gwfh.mranftl.com als Quelle, Pattern `{font}-v{version}-latin-{weight}.woff2`.

**Neue Custom-Font pro Kundenwunsch hinzufügen (~2 Min):**
1. `public/fonts/<name>/` anlegen + `.woff2`-Dateien (Weights 400/500/600/700) reinlegen
2. `@font-face`-Block in [app/globals.css](../app/globals.css) kopieren und Pfade anpassen
3. Neuen Key in `FunnelFont`-Typ ([types/index.ts](../types/index.ts)) ergänzen
4. Entsprechenden Eintrag in `FONT_STACKS` in [components/solar-funnel.tsx](../components/solar-funnel.tsx) hinzufügen

**Wann auf dynamisches Loading umstellen:** Wenn Kunden regelmäßig exotische Fonts verlangen und der Enum unhandlich wird. Bis dahin: einfach Liste erweitern – 95 % der Kundenwünsche sollten mit 6–8 kuratierten Fonts (Inter, Poppins, Roboto, Montserrat, Open Sans, Lato, DM Sans, Nunito) abge deckt sein.

## Next Task

### Neues Design

**Problem:**: Der Funnel soll ist nicht ansprechend genug designed. Je nach Frage, varriert die Höhe des Container, das soll nicht so sein. 

**Lösung:**
- Die Texte bei den Antworten in den Cards stets mittig platziert sein, d.h. horizontal und vertikal!
- Alles muss so gestaltet sein, dass der User direkt darauf anspringt, es muss flüßig durch laufen
- Wenn die Kacheln responsive werden, also zum 2x2 oder 1x4 grid, dann soll das konstant bei allen Fragen passieren, nicht nur bei ausgewählten.
- du kannst in "context\Screenshot1.png" sehen, wie es eingebettet aussieht, wenn es klein/responsive ist.
- Der Hintergrund muss neutral sein, d.h. weiß, transparent o.Ä. und steuerbar über die .json Datei des jeweiligen tenants sein.

**Akzeptanzkriterien:**
- Bedenke, dass es sich hier um ein iFrame handelt, dass später in anderen webseiten eingebunden wird, es soll so gestyled werden, dass dies reibungslos funktioniert! Also keine unnötigen margins o.Ä.
- Stelle Rückfragen falls du unsicher bist statt einfach etwas umzusetzen.
- Das iFrame muss universell anwendbar sein auf alle möglichen Fragen und Branchen, auch außerhalb Photovolatik.


**Template für neue Specs:**

```
### [Aufgabenname]

**Problem:** Was ist das aktuelle Verhalten / welches Ziel verfehlt es?

**Lösung:** Was soll konkret passieren? Welche Logik, welches UI-Verhalten?

**Akzeptanzkriterien (optional):**
- ...
- ...

**Betroffene Dateien:** z. B. components/solar-funnel.tsx, tenants/*.json
```

## History

Ältere Einträge: [`history-archive.md`](history-archive.md).


<!-- Claude: Nach jeder abgeschlossenen Aufgabe hier einen Eintrag hinzufügen. -->
<!-- Format: - [Aufgabe] – [kurze Beschreibung was gemacht wurde] (welche Dateien geändert) -->
<!-- Bei > 5 Einträgen: ältesten 3 Einträge nach history-archive.md verschieben. -->

- **Neues Design** – Option-Cards mit fixer Höhe (`h-32 @md:h-36`) und vertikal zentriertem Inhalt; **Container-Queries** statt Viewport-Breakpoints, damit das Widget auf seine eigene iFrame-Breite reagiert: < 320px → 1-per-row, 320–447px → 2x2 (4-Opt) bzw. 1x3 (3-Opt), ≥ 448px → 1x4. Reservierte Grid-Höhen (`min-h-137 @xs:min-h-67 @md:min-h-36`) halten Container frageübergreifend stabil. Word-Break über `hyphens-auto` + `lang="de"` (deutsche Silbentrennung statt mid-word break). Vertikale Centering im iFrame via `min-h-dvh flex items-center justify-center`. Neues optionales Theme-Feld `pageBackgroundColor` (Default `"transparent"`) trennt iFrame-Hintergrund von Card-Hintergrund; html/body global transparent. (components/solar-funnel.tsx, app/[tenant]/page.tsx, app/layout.tsx, app/globals.css, types/index.ts, tenants/_template.json)
