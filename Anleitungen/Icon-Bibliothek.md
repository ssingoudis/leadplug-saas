# Icon-Bibliothek — neue Icons anlegen (SVG- und PNG-Vorlagen)

> **Zweck:** Schritt-für-Schritt-Anleitung, wie neue Icons in die kuratierte
> Bibliothek der Bild-Optionen kommen. Geschrieben für Mensch **und** KI — eine
> frische Claude-Code-Instanz soll damit ohne Vorwissen produzieren können.
> Technischer Unterbau: `context/current-feature.md` (Aufgabe 77).

---

## 1. Wie die Bibliothek funktioniert (30 Sekunden)

- **Dateien:** `public/icons/*.svg` — same-origin im Widget-iFrame, versioniert in Git, Deploy = Push.
- **Manifest = Whitelist:** [`lib/funnel/icons.ts`](../lib/funnel/icons.ts) (`FUNNEL_ICONS`). Nur Keys, die dort stehen, werden gerendert — Widget ([`OptionIcon.tsx`](../components/funnel/OptionIcon.tsx)) fetcht die Datei und injiziert sie **inline** ins DOM (nur so ist `currentColor`-Färbung möglich). Deshalb: nie fremden/ungeprüften SVG-Inhalt in `public/icons/` legen.
- **Färbung:** funnel-weiter Design-Schalter „Icon-Farbe" (`funnels.icon_color`): Neutral = `theme.textColor`, Brand = `theme.primaryColor`. Die Icons selbst kennen keine Farben — alles läuft über `currentColor`.
- **Auswahl im Editor:** `IconLibraryPicker` (Suche + Kategorie-Chips). Reihenfolge im Picker = Reihenfolge im Manifest.

## 2. Der Icon-Kontrakt (jede Datei MUSS das erfüllen)

```
- Root exakt:
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 129" fill="none"
       stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
- Kein XML-Prolog, keine width/height am Root.
- Keine <style>-Blöcke, keine class-/id-Attribute (Inline-Injection mehrerer Icons
  auf einer Seite → Kollisionen), kein <text>, kein <image>, kein <use>, kein Skript,
  keine externen Referenzen.
- EINE Farbe:
  · Konturen erben stroke="currentColor" vom Root.
  · Schattierung: fill="currentColor" fill-opacity="0.1"–"0.15" stroke="none".
  · Deckfläche ÜBER anderem Inhalt (Verdeckung) oder Strich AUF gefüllter Fläche:
    var(--funnel-bg, #ffffff)  ← folgt dem Karten-Hintergrund des Funnels.
  · Sonst nirgends Hex-Farben.
```

## 3. Stil-Regeln (damit alles wie EINE Bibliothek aussieht)

- **Stil-Anker:** `dachform-satteldach.svg` und `heizung-waermepumpe.svg` ansehen — Linienstärke, Schattierungs-Einsatz und Komposition exakt so treffen. Bei KI-Produktion: beide Dateien **verbatim in jeden Prompt** legen.
- Strichstärke 4 (eine einzelne Betonungs-Linie darf 5), runde Kappen/Ecken, Koordinaten auf Ganzzahlen oder .5 runden.
- Ränder ~20–24 px im 170×129-Canvas; architektonische Motive stehen auf einer Bodenlinie bei `y=110` (ca. `x24..x146`).
- **Lesbar bei 56 px.** Wenige, selbstbewusste Formen statt Detail.
- **Keine Zahlen/Wörter im Icon** — das Options-Label unter der Karte trägt die Semantik (Kalender-Serie: Tages-Kästchen/Blitz statt „1–3 Monate"-Schriftzug).
- **Serien in einem Rutsch zeichnen** (Personen 1–4, Flächen-Größen, Neigungs-Winkel): identische Grundkonstruktion, nur der Parameter variiert.
- **Ja/Nein-Paare** nutzen exakt dieses Badge (unten rechts, Motiv lässt dort Platz):
  ```svg
  <circle cx="126" cy="90" r="14" fill="currentColor" stroke="none"/>
  <!-- JA:   --> <path d="M119 90 L124 95 L133 85" stroke="var(--funnel-bg, #ffffff)"/>
  <!-- NEIN: --> <path d="M121 85 L131 95 M131 85 L121 95" stroke="var(--funnel-bg, #ffffff)"/>
  ```

## 4. ⚖️ Rechtsregel (nicht verhandelbar)

Vorlagen aus fremden Funnels (SVG **oder** PNG) sind **nur Motiv-Referenz**:

- **SVG-Vorlagen:** Pfad-Daten niemals übernehmen — Motiv verstehen, dann jede Linie neu komponieren. Auch „bereinigen/normalisieren" fremder Pfade ist eine Kopie.
- **PNG-Vorlagen:** niemals vektorisieren/auto-tracen (Trace = 1:1-Kopie in anderem Format). Bild ansehen → Motiv-Bestandteile benennen → als neues Kontrakt-SVG zeichnen.
- Der *Stil* (Linien-Zeichnung) ist nicht schützbar, die konkrete Grafik schon. LeadPlug redistribuiert die Bibliothek an alle Tenants — hier gilt die strenge Linie (Entscheidung Stavros, Aufgabe 77).

## 5. Workflow: neue Icons anlegen

1. **Motive sichten:** Vorlagen (SVG/PNG) nur ansehen; pro Motiv notieren, was es zeigt (z. B. „Haus-Frontansicht, Pultdach, 2 Fenster, Tür").
2. **Benennen:** Key = Dateiname ohne `.svg`, kebab-case, Muster `gruppe-motiv[-variante]` (`dachform-pultdach`, `zeitpunkt-1-3-monate`). Deutsches `label` (kurz), `category` (bestehende bevorzugen: Dach · Gebäude · Fläche · Personen · Zeitraum · Finanzen · Energie · Heizung · Wohnen), `keywords` lowercase ohne Umlaute.
3. **Zeichnen:** von Hand nach Kontrakt (§2) + Stil (§3). Bei größeren Chargen: Workflow mit parallelen Agents, **gruppiert nach Motiv-Familien** (Serien-Konsistenz!), Kontrakt + Stil-Anker + präzise Motiv-Specs mit Koordinaten-Vorgaben in jedem Prompt (Vorbild: Aufgabe-77-Charge, 9 Gruppen → 32 Icons).
4. **Validieren** (pro Datei, automatisierbar — Vorbild `process-icons.ps1` aus Aufgabe 77):
   - beginnt exakt mit dem Kontrakt-Root (inkl. `viewBox="0 0 170 129"`)
   - enthält keins von: `<style`, `class=`, `id=`, `<script`, `<text`, `<image`, `<use`, `url(`, `xlink`, `onload`, `onclick`
   - nach Entfernen von `var(--funnel-bg, #ffffff)` kommt kein `#` mehr vor
   - `http` nur im xmlns
5. **Manifest:** Eintrag in `FUNNEL_ICONS` ([`lib/funnel/icons.ts`](../lib/funnel/icons.ts)) im passenden Kategorie-Block (Reihenfolge = Picker-Reihenfolge). Danach `npx tsc --noEmit`.
6. **QA ansehen:** Vorschau-HTML mit allen Icons inline in drei Kontexten rendern (neutral hell · Brand-Farbe · dunkler Hintergrund) und screenshotten; zusätzlich im Editor-Picker prüfen (Dev-Server, Frage → Markierung „Bild" → „Icon wählen"). Ausreißer nachzeichnen.
7. **Abnahme durch Stavros**, dann Commit. Kein Upload, kein Bucket — Deploy bringt die Icons zu allen Tenants.

## 6. PNG-Sonderfall: „Ich habe ein Pixelbild"

Zwei Wege, je nach Ziel:

| Ziel | Weg |
|---|---|
| Motiv soll **in die Bibliothek** (einfärbbar, für alle Tenants) | Motiv als neues Kontrakt-SVG **nachzeichnen** (§4/§5) — das PNG ist nur die Referenz. |
| Es soll **genau dieses Bild** sein (Foto, Logo, Screenshot) | **Nicht** in die Bibliothek — pro Option das „oder Bild-URL"-Feld nutzen (Aufgabe 76, `imageFit` Foto/Icon). Bilder hostet der Betreiber selbst. |

## 7. Was NICHT geht (bewusste Grenzen)

- Multicolor-Icons (Kontrakt = eine Farbe + Opacity-Töne).
- Icons per Upload/Storage (Bibliothek ist kuratiert + versioniert; Self-Service-Upload wäre ein eigenes Feature mit Sicherheits-Review — Inline-Injection!).
- Lucide/Fremd-Bibliotheken einbinden (Entscheidung Aufgabe 77: zu generisch, eigener Stil).
