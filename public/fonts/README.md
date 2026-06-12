# Self-hosted Fonts (DSGVO-konform)

Diese Fonts werden lokal ausgeliefert – **kein** Request an `fonts.googleapis.com`, kein Third-Party-Tracking. Nötig wegen des LG-München-Urteils (2022) zu Google Fonts.

## Welche Fonts sind vorgesehen?

| Wert in `funnels.font` (`theme.font`) | Fonts werden geladen? |
| ------------------------------------- | --------------------- |
| `"system"` (default)                  | Nein – System-Font-Stack, kein Download |
| `"inter"`                             | Ja – aus `/public/fonts/inter/` |
| `"poppins"`                           | Ja – aus `/public/fonts/poppins/` |
| `"roboto"`                            | Ja – aus `/public/fonts/roboto/` |
| `"montserrat"` *(Aufgabe 66)*         | Ja – aus `/public/fonts/montserrat/` |
| `"open-sans"` *(Aufgabe 66)*          | Ja – aus `/public/fonts/open-sans/` |
| `"lato"` *(Aufgabe 66)*               | Ja – aus `/public/fonts/lato/` (nur 400+700 — Lato hat kein 500/600; Browser mappt 500→400, 600→700) |
| `"nunito"` *(Aufgabe 66)*             | Ja – aus `/public/fonts/nunito/` |
| `"dm-sans"` *(Aufgabe 66)*            | Ja – aus `/public/fonts/dm-sans/` |
| `"merriweather"` *(Aufgabe 66)*       | Ja – aus `/public/fonts/merriweather/` (Serife — Fallback Georgia statt System-Sans) |

## Installation der `.woff2`-Dateien

1. Öffne **https://gwfh.mranftl.com/fonts** (google-webfonts-helper – DSGVO-sicherer Download-Wrapper).
2. Suche die gewünschte Font (z. B. "Inter").
3. Wähle:
   - **Charsets:** `latin` (+ optional `latin-ext`)
   - **Styles:** `400` (regular), `500`, `600`, `700`
   - **Browser support:** `Modern` (nur `.woff2`)
4. Dateien herunterladen, entpacken und in den jeweiligen Ordner legen. gwfh nutzt das Benennungsschema `{font}-v{version}-latin-{weight}.woff2` (z. B. `inter-v20-latin-500.woff2`).

**Wichtig:** Die Versionsnummer (`v20`, `v21`, …) ändert sich, wenn Google die Font aktualisiert. Die `@font-face`-Regeln in [app/globals.css](../../app/globals.css) müssen genau zu deinen Dateinamen passen.

Aktuell in `globals.css` eingetragene Pfade (je 4 Weights regular/500/600/700, außer Lato):

```
public/fonts/inter/inter-v20-latin-{regular,500,600,700}.woff2
public/fonts/poppins/poppins-v24-latin-{regular,500,600,700}.woff2
public/fonts/roboto/roboto-v51-latin-{regular,500,600,700}.woff2
public/fonts/montserrat/montserrat-v31-latin-{regular,500,600,700}.woff2
public/fonts/open-sans/open-sans-v44-latin-{regular,500,600,700}.woff2
public/fonts/lato/lato-v25-latin-{regular,700}.woff2
public/fonts/nunito/nunito-v32-latin-{regular,500,600,700}.woff2
public/fonts/dm-sans/dm-sans-v17-latin-{regular,500,600,700}.woff2
public/fonts/merriweather/merriweather-v33-latin-{regular,500,600,700}.woff2
```

Wenn gwfh dir eine neuere Version liefert (z. B. `v21`, `v25`, …), entweder die Dateien auf die oben genannten Versionen umbenennen, **oder** die `src:`-URLs in `globals.css` an die neue Version anpassen.

Fehlt eine Datei, fällt der Browser stumm auf den System-Font-Stack zurück – das Widget bleibt funktional, nur ohne Wunschschrift.

## Neue Font hinzufügen

1. Ordner `public/fonts/<name>/` anlegen und `.woff2`-Dateien platzieren.
2. `@font-face`-Block in [app/globals.css](../../app/globals.css) ergänzen (vorhandene Blöcke kopieren).
3. Typ `FunnelFont` in [types/index.ts](../../types/index.ts) erweitern.
4. Konstante `FONT_STACKS` in [components/funnel.tsx](../../components/funnel.tsx) um den neuen Key ergänzen.
5. Auswahl-Liste `FONT_OPTIONS` in [components/tenant-editor/v2/ThemePanel.tsx](../../components/tenant-editor/v2/ThemePanel.tsx) ergänzen (alphabetisch, System bleibt oben).
