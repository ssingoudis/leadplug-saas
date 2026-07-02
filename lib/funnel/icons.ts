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
//
// NEUE ICONS ANLEGEN (auch aus SVG-/PNG-Vorlagen): Anleitungen/Icon-Bibliothek.md —
// kompletter Workflow inkl. Stil-Regeln, Rechtsregel (nachzeichnen, nie kopieren/tracen),
// Validierungs-Checkliste und QA-Prozess.
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
// Die Reihenfolge hier bestimmt die Reihenfolge im Picker (Kategorien in Einfüge-Reihenfolge).
export const FUNNEL_ICONS: Record<string, FunnelIconEntry> = {
  // ── Dach ────────────────────────────────────────────────────────────────
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
  "dachform-flachdach": {
    file: "dachform-flachdach.svg",
    label: "Flachdach",
    category: "Dach",
    keywords: "dach flach flachdach form attika",
  },
  "dachform-pultdach": {
    file: "dachform-pultdach.svg",
    label: "Pultdach",
    category: "Dach",
    keywords: "dach pult pultdach form schraege einseitig",
  },
  "dach-neigung-0": {
    file: "dach-neigung-0.svg",
    label: "Dachneigung 0°",
    category: "Dach",
    keywords: "dach neigung 0 grad flach eben",
  },
  "dach-neigung-15": {
    file: "dach-neigung-15.svg",
    label: "Dachneigung 15°",
    category: "Dach",
    keywords: "dach neigung 15 grad leicht",
  },
  "dach-neigung": {
    file: "dach-neigung.svg",
    label: "Dachneigung 30°",
    category: "Dach",
    keywords: "dach neigung winkel 30 grad schraege steigung",
  },
  "dach-neigung-45": {
    file: "dach-neigung-45.svg",
    label: "Dachneigung 45°",
    category: "Dach",
    keywords: "dach neigung 45 grad steil",
  },
  // ── Gebäude ─────────────────────────────────────────────────────────────
  "gebaeude-einfamilienhaus": {
    file: "gebaeude-einfamilienhaus.svg",
    label: "Einfamilienhaus",
    category: "Gebäude",
    keywords: "einfamilienhaus freistehend haus gebaeude",
  },
  "gebaeude-zweifamilienhaus": {
    file: "gebaeude-zweifamilienhaus.svg",
    label: "Zweifamilienhaus",
    category: "Gebäude",
    keywords: "zweifamilienhaus haus anbau generationen gebaeude",
  },
  "gebaeude-doppelhaus": {
    file: "gebaeude-doppelhaus.svg",
    label: "Doppelhaus",
    category: "Gebäude",
    keywords: "doppelhaus haus zwei parteien gebaeude",
  },
  "gebaeude-doppelhaushaelfte": {
    file: "gebaeude-doppelhaushaelfte.svg",
    label: "Doppelhaushälfte",
    category: "Gebäude",
    keywords: "doppelhaushaelfte haus halb gebaeude",
  },
  "gebaeude-reihenmittelhaus": {
    file: "gebaeude-reihenmittelhaus.svg",
    label: "Reihenmittelhaus",
    category: "Gebäude",
    keywords: "reihenhaus mitte reihenmittelhaus gebaeude",
  },
  "gebaeude-reihenendhaus": {
    file: "gebaeude-reihenendhaus.svg",
    label: "Reihenendhaus",
    category: "Gebäude",
    keywords: "reihenhaus ende reihenendhaus gebaeude",
  },
  "gebaeude-mehrfamilienhaus": {
    file: "gebaeude-mehrfamilienhaus.svg",
    label: "Mehrfamilienhaus",
    category: "Gebäude",
    keywords: "gebaeude mehrfamilienhaus wohnung etagen mieter block",
  },
  "gebaeude-wohnblock": {
    file: "gebaeude-wohnblock.svg",
    label: "Wohnblock",
    category: "Gebäude",
    keywords: "wohnblock wohnung apartment balkon etagen gebaeude",
  },
  "gebaeude-firma": {
    file: "gebaeude-firma.svg",
    label: "Firmengebäude",
    category: "Gebäude",
    keywords: "firma gewerbe industrie fabrik gebaeude betrieb",
  },
  // ── Fläche ──────────────────────────────────────────────────────────────
  "flaeche-bis-30": {
    file: "flaeche-bis-30.svg",
    label: "Bis 30 m²",
    category: "Fläche",
    keywords: "flaeche klein bis 30 qm quadratmeter",
  },
  "flaeche-30-50": {
    file: "flaeche-30-50.svg",
    label: "30–50 m²",
    category: "Fläche",
    keywords: "flaeche 30 50 qm quadratmeter",
  },
  "flaeche-50-100": {
    file: "flaeche-50-100.svg",
    label: "50–100 m²",
    category: "Fläche",
    keywords: "flaeche 50 100 qm quadratmeter",
  },
  "flaeche-ueber-100": {
    file: "flaeche-ueber-100.svg",
    label: "Über 100 m²",
    category: "Fläche",
    keywords: "flaeche gross ueber 100 qm quadratmeter",
  },
  "flaeche-freiland": {
    file: "flaeche-freiland.svg",
    label: "Freifläche",
    category: "Fläche",
    keywords: "flaeche freiland grundstueck feld acker sonne",
  },
  // ── Personen ────────────────────────────────────────────────────────────
  "personen-1": {
    file: "personen-1.svg",
    label: "1 Person",
    category: "Personen",
    keywords: "person 1 eine single haushalt",
  },
  "personen-2": {
    file: "personen-2.svg",
    label: "2 Personen",
    category: "Personen",
    keywords: "personen 2 zwei paar haushalt",
  },
  "personen-3": {
    file: "personen-3.svg",
    label: "3 Personen",
    category: "Personen",
    keywords: "personen 3 drei familie haushalt",
  },
  "personen-4": {
    file: "personen-4.svg",
    label: "4 Personen",
    category: "Personen",
    keywords: "personen 4 vier familie haushalt",
  },
  // ── Zeitraum ────────────────────────────────────────────────────────────
  "zeitpunkt-sofort": {
    file: "zeitpunkt-sofort.svg",
    label: "Sofort",
    category: "Zeitraum",
    keywords: "zeitpunkt sofort jetzt blitz dringend",
  },
  "zeitpunkt-1-3-monate": {
    file: "zeitpunkt-1-3-monate.svg",
    label: "1–3 Monate",
    category: "Zeitraum",
    keywords: "zeitpunkt 1 3 monate bald",
  },
  "zeitpunkt-4-6-monate": {
    file: "zeitpunkt-4-6-monate.svg",
    label: "4–6 Monate",
    category: "Zeitraum",
    keywords: "zeitpunkt 4 6 monate spaeter",
  },
  "zeitpunkt-6-plus-monate": {
    file: "zeitpunkt-6-plus-monate.svg",
    label: "Über 6 Monate",
    category: "Zeitraum",
    keywords: "zeitpunkt ueber 6 monate spaeter langfristig",
  },
  // ── Finanzen ────────────────────────────────────────────────────────────
  "finanzierung-kaufen": {
    file: "finanzierung-kaufen.svg",
    label: "Kaufen",
    category: "Finanzen",
    keywords: "kaufen kauf eigentum euro finanzierung",
  },
  "finanzierung-mieten": {
    file: "finanzierung-mieten.svg",
    label: "Mieten",
    category: "Finanzen",
    keywords: "mieten miete vertrag dokument unterschrift",
  },
  "finanzierung-beides": {
    file: "finanzierung-beides.svg",
    label: "Kaufen oder Mieten",
    category: "Finanzen",
    keywords: "beides kaufen mieten flexibel offen",
  },
  // ── Energie ─────────────────────────────────────────────────────────────
  "energie-stromspeicher-ja": {
    file: "energie-stromspeicher-ja.svg",
    label: "Stromspeicher: Ja",
    category: "Energie",
    keywords: "stromspeicher batterie speicher ja vorhanden",
  },
  "energie-stromspeicher-nein": {
    file: "energie-stromspeicher-nein.svg",
    label: "Stromspeicher: Nein",
    category: "Energie",
    keywords: "stromspeicher batterie speicher nein keiner",
  },
  "energie-pv-speicher": {
    file: "energie-pv-speicher.svg",
    label: "PV-Speicher",
    category: "Energie",
    keywords: "pv speicher solar photovoltaik batterie sonne strom",
  },
  "energie-solarpanel": {
    file: "energie-solarpanel.svg",
    label: "Solarmodul",
    category: "Energie",
    keywords: "solar solarmodul panel photovoltaik pv modul anlage",
  },
  "energie-pv-waermepumpe": {
    file: "energie-pv-waermepumpe.svg",
    label: "PV + Wärmepumpe",
    category: "Energie",
    keywords: "pv waermepumpe kombi beides solar photovoltaik",
  },
  // ── Heizung ─────────────────────────────────────────────────────────────
  "heizung-waermepumpe": {
    file: "heizung-waermepumpe.svg",
    label: "Wärmepumpe",
    category: "Heizung",
    keywords: "heizung waermepumpe luft wasser klima geraet",
  },
  "heizung-gastherme": {
    file: "heizung-gastherme.svg",
    label: "Gastherme",
    category: "Heizung",
    keywords: "gastherme gas heizung therme kessel flamme",
  },
  "heizung-oeltank": {
    file: "heizung-oeltank.svg",
    label: "Öltank",
    category: "Heizung",
    keywords: "oel oeltank tank heizung heizoel tropfen",
  },
  "heizung-fluessiggastank": {
    file: "heizung-fluessiggastank.svg",
    label: "Flüssiggas-Tank",
    category: "Heizung",
    keywords: "fluessiggas lpg gas tank propan heizung",
  },
  // ── Wohnen ──────────────────────────────────────────────────────────────
  "wohnen-eigentum-ja": {
    file: "wohnen-eigentum-ja.svg",
    label: "Eigentümer: Ja",
    category: "Wohnen",
    keywords: "eigentum eigentuemer besitz ja schluessel",
  },
  "wohnen-eigentum-nein": {
    file: "wohnen-eigentum-nein.svg",
    label: "Eigentümer: Nein",
    category: "Wohnen",
    keywords: "eigentum eigentuemer besitz nein mieter schluessel",
  },
  "wohnen-selbst-ja": {
    file: "wohnen-selbst-ja.svg",
    label: "Selbst bewohnt: Ja",
    category: "Wohnen",
    keywords: "selbst bewohnt eigennutzung ja person",
  },
  "wohnen-selbst-nein": {
    file: "wohnen-selbst-nein.svg",
    label: "Selbst bewohnt: Nein",
    category: "Wohnen",
    keywords: "selbst bewohnt vermietet nein person",
  },
  // ── Allgemein ───────────────────────────────────────────────────────────
  // Glyphen-Trio Haken/X/Fragezeichen: gleiche Strichstärke 5, gleiche optische
  // Größe — gedacht für Ja/Nein/Weiß-nicht-Fragen in Kombination.
  "allgemein-haken": {
    file: "allgemein-haken.svg",
    label: "Haken (Ja)",
    category: "Allgemein",
    keywords: "haken ja check bestaetigen richtig zustimmen",
  },
  "allgemein-x": {
    file: "allgemein-x.svg",
    label: "X (Nein)",
    category: "Allgemein",
    keywords: "x kreuz nein ablehnen falsch",
  },
  "allgemein-daumen-hoch": {
    file: "allgemein-daumen-hoch.svg",
    label: "Daumen hoch",
    category: "Allgemein",
    keywords: "daumen hoch ja gut positiv like",
  },
  "allgemein-daumen-runter": {
    file: "allgemein-daumen-runter.svg",
    label: "Daumen runter",
    category: "Allgemein",
    keywords: "daumen runter nein schlecht negativ dislike",
  },
  // Key/Datei historisch „gebaeude-…" (Haupt-Charge); seit der Nachzeichen-Runde in
  // „Allgemein", weil ein Fragezeichen als „Sonstiges"-Option jede Frage betrifft.
  "gebaeude-sonstige": {
    file: "gebaeude-sonstige.svg",
    label: "Sonstiges",
    category: "Allgemein",
    keywords: "sonstiges andere frage fragezeichen unbekannt gebaeude",
  },
};

// Öffentlicher Pfad eines Bibliotheks-Icons — null bei unbekanntem Key (Whitelist).
// Object.hasOwn: Prototype-Keys wie "__proto__"/"toString" dürfen den Guard nicht passieren.
export function funnelIconUrl(iconKey: string): string | null {
  const entry = Object.hasOwn(FUNNEL_ICONS, iconKey) ? FUNNEL_ICONS[iconKey] : undefined;
  return entry ? `/icons/${entry.file}` : null;
}
