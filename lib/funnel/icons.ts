// =============================================================================
// Aufgabe 77 — Kuratierte Icon-Bibliothek für Bild-Optionen (single/multi_choice).
//
// Jede Datei unter public/icons/ erfüllt den Icon-Kontrakt:
//   - viewBox "0 0 170 129", keine width/height-Attribute, kein XML-Prolog
//   - nur Präsentations-Attribute (keine <style>-Blöcke/Klassen — Inline-Injection
//     mehrerer Icons auf einer Seite würde sonst Klassen-Kollisionen erzeugen)
//   - eine Farbe: Akzent = currentColor, Schattierungen = currentColor + fill-opacity;
//     falls ein Motiv Verdeckungs-Weiß braucht: var(--funnel-bg, #ffffff)
//   - kein Skript, keine externen Referenzen
//
// Dieses Manifest ist zugleich die WHITELIST: Widget (OptionIcon) und Editor-Picker
// akzeptieren nur Keys, die hier stehen — nie Pfade aus DB-Werten frei zusammenbauen,
// weil die Dateien inline ins DOM injiziert werden (nur eigener, kuratierter Inhalt).
// =============================================================================

export interface FunnelIconEntry {
  file: string;      // Dateiname unter public/icons/
  label: string;     // Anzeige-Name im Picker
  category: string;  // Kategorie-Chip im Picker
  keywords: string;  // Suchbegriffe, lowercase + space-getrennt
}

// Neutraler Tint der Icon-Vorschauen im Editor (Picker-Kacheln + Options-Thumbnail) —
// identisch zum Widget-Neutral-Default (THEME_DEFAULTS.textColor in lib/funnel/theme.ts).
export const EDITOR_ICON_TINT = "#1f2937";

// Key = Dateiname ohne .svg (kebab-case, Präfix = Motiv-Gruppe).
// Neues Icon: SVG nach public/icons/ (Kontrakt oben) + 1 Zeile hier.
export const FUNNEL_ICONS: Record<string, FunnelIconEntry> = {
  "dachform-satteldach": {
    file: "dachform-satteldach.svg",
    label: "Satteldach",
    category: "Dach",
    keywords: "dach giebel haus satteldach form spitz",
  },
  "dachform-walmdach": {
    file: "dachform-walmdach.svg",
    label: "Walmdach",
    category: "Dach",
    keywords: "dach walm haus walmdach form abgeschraegt",
  },
  "dach-neigung": {
    file: "dach-neigung.svg",
    label: "Dachneigung",
    category: "Dach",
    keywords: "dach neigung winkel grad schraege steigung",
  },
  "gebaeude-mehrfamilienhaus": {
    file: "gebaeude-mehrfamilienhaus.svg",
    label: "Mehrfamilienhaus",
    category: "Gebäude",
    keywords: "gebaeude mehrfamilienhaus wohnung etagen mieter block",
  },
  "heizung-waermepumpe": {
    file: "heizung-waermepumpe.svg",
    label: "Wärmepumpe",
    category: "Heizung",
    keywords: "heizung waermepumpe luft wasser klima geraet",
  },
};

// Öffentlicher Pfad eines Bibliotheks-Icons — null bei unbekanntem Key (Whitelist).
// Object.hasOwn: Prototype-Keys wie "__proto__"/"toString" dürfen den Guard nicht passieren.
export function funnelIconUrl(iconKey: string): string | null {
  const entry = Object.hasOwn(FUNNEL_ICONS, iconKey) ? FUNNEL_ICONS[iconKey] : undefined;
  return entry ? `/icons/${entry.file}` : null;
}
