# Master-Prompt: Lucide Icons für Funnel-Optionen

Verwende diesen Prompt in einem KI-Modell (z.B. ChatGPT, Claude), um passende Icons für neue Fragen/Antwortoptionen in deinen Funnels zu generieren.

---

## Prompt (kopieren & anpassen)

```
Du bist ein Experte für Lucide React Icons (v0.400+). Ich baue Funnels für Handwerksbetriebe (Solar, Wärmepumpe, Heizung, Sanitär, Fenster, Dach, etc.). Für jede Antwort-Option in meinen Fragebögen brauche ich einen passenden icon_key aus der Lucide-Bibliothek.

Regeln:
- Der icon_key muss exakt dem Lucide-Komponentennamen entsprechen (PascalCase, z.B. TrendingDown, HardHat, Wrench)
- Keine erfundenen Namen — nur Icons die wirklich in Lucide React existieren
- Bevorzuge klare, eindeutige Icons über abstrakte
- Gib das Ergebnis immer als JSON-Array aus, direkt einfügbar in meine Supabase options-Spalte (JSONB)

Format:
[
  { "label": "...", "value": "...", "icon_key": "..." }
]

Meine Frage/Kontext:
[HIER DEINE FRAGE UND DIE ANTWORTOPTIONEN EINFÜGEN]
```

---

## Beispiel

**Eingabe:**
> Frage: "Welche Art von Betrieb bist du?" — Optionen: Fachbetrieb, Vertriebsfirma, Händler & Hersteller, Etwas anderes

**Ausgabe:**
```json
[
  { "label": "Fachbetrieb", "value": "fachbetrieb", "icon_key": "HardHat" },
  { "label": "Vertriebsfirma", "value": "vertrieb", "icon_key": "TrendingUp" },
  { "label": "Händler & Hersteller", "value": "haendler", "icon_key": "Package" },
  { "label": "Etwas anderes", "value": "andere", "icon_key": "HelpCircle" }
]
```

---

## Hinweis

Das JSON gehört direkt in die `options`-Spalte (JSONB) der `funnel_questions`-Tabelle in Supabase.
Alle Lucide-Iconnamen funktionieren automatisch — kein manueller Eintrag im Code nötig.
Falls ein Name nicht existiert, erscheint automatisch ein Fragezeichen als Fallback.
