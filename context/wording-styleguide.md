# Wording-Styleguide — LeadPlug

> **Single Source of Truth für alle nutzer-sichtbaren Texte.** Jede neue UI und jede
> Text-Änderung richtet sich hiernach. Ziel: ein **roter Faden** — überall dasselbe
> Wording, alles für den Kunden sofort verständlich.
>
> Status: **Aktiv** (freigegeben 2026-06-11). Aus der CLAUDE.md §11 verlinkt; der
> App-weite Wording-Sweep ist umgesetzt.

---

## 1. Anrede & Tonalität

**Default-Regel: NICHT ansprechen — neutral formulieren.**
Wo niemand angesprochen wird, gibt es keine „du/Sie"-Frage. Das ist der sauberste rote Faden.

- **Aktionen → Befehlsform:** „Funnel erstellen", „Lead exportieren", „Speichern".
- **Zustände → Nomen:** „Keine Leads vorhanden", „3 aktive Funnels".
- **Kein „du", kein „Sie"** im App-UI (Dashboard, Editor, Account, Statistiken …).

**Wann ausnahmsweise doch Ansprache?**
Nur, wo eine neutrale Form gestelzt klänge (seltene Empty-States, Bestätigungen). Dann
**bewusst sparsam und neutral-freundlich** — aber der Default bleibt unpersönlich.

**Einzige feste Ausnahme — das Funnel-Widget:**
Das spricht einen echten Menschen an (den Lead/Endkunden) → **„Sie"** (seriös, professionell).
Diese Default-Texte überschreibt die Agentur ohnehin selbst.

**Tonalität:** klar, knapp, sachlich. Kein Marketing-Blabla, kein Tech-Jargon wo vermeidbar,
keine Ausrufezeichen-Inflation.

---

## 2. Begriffs-Glossar — ein Wort pro Sache

| Konzept | **Kanonisch** | Vermeiden | Notiz |
|---|---|---|---|
| Der zahlende Account (DB/Code: „Tenant") | **Konto** | ~~Account, Agentur, Firma, Workspace~~ | Ein Tenant kann **alles** sein: Agentur, Firma **oder Einzelperson**. Darum nie „Firma/Agentur" annehmen. |
| Name des Kontos | **Kontoname** | ~~Firmenname, Anzeigename, Workspace-Name~~ | Feld auf der Konto-Seite. |
| Der whitelabel Endkunden-Bereich (Zukunft) | **Workspace** | — | **Heute NICHT verwenden** — reserviert für das spätere Multi-Workspace-/Whitelabel-Feature (Konto → mehrere Workspaces). |
| Das Builder-Objekt | **Funnel** | ~~Formular, Trichter~~ | Plural: „Funnels". |
| Erfasster Datensatz im CRM (Dashboard-Sicht) | **Lead** | ~~Anfrage, Kontakt~~ (für dasselbe Ding) | Plural: „Leads". Posteingang = „Leads". |
| Die Aktion des Endkunden im Widget | **Anfrage** | — | Bewusst anders als „Lead" — andere Zielgruppe. Z. B. Button „Anfrage absenden". |
| Kontaktdaten-Felder (Name/E-Mail/Telefon …) | **Kontaktdaten** | — | |
| Funnel-Aufrufe | **Aufrufe** | ~~Views, Besuche~~ | |
| Conversion-Quote | **Conversion** | ~~Abschlussquote, Umwandlung~~ | Branchen-Standard, Marketer kennen es englisch. |
| Anmelde-Vorgang | **Anmelden** | ~~Einloggen~~ | Login-Seite mischt aktuell beides. |
| Abmelde-Vorgang | **Abmelden** | ~~Ausloggen, Logout~~ | |
| Lead-Status (UI-Label) | **Neu / Kontaktiert / Erledigt** | — | DB bleibt `offen/kontaktiert/abgeschlossen` — nur UI-Label. |
| Funnel ins Web einbauen | **Einbinden** | ~~Embed, Teilen~~ | Editor-Reiter. |
| Bibliotheks-Grafik einer Bild-Option | **Icon** | ~~Symbol~~ | Entscheidung 2026-07-02 (Aufgabe 77): ein Wort für den ganzen Cluster — Icon-Bibliothek, „Icon wählen", „Icon-Farbe", Bilddarstellung „Icon / Foto". |

**Bewusst englische Fachbegriffe** (Zielgruppe = Agenturen/Marketer, die sie ohnehin
englisch nutzen): **Funnel, Lead, Dashboard, Webhook, Conversion, Icon**.
**Alles Allgemeine auf Deutsch:** Übersicht, Statistiken, Abrechnung, Einstellungen,
Anmelden, Speichern, Aufrufe.
Faustregel im Zweifel: *das Wort, das der Marketer im Alltag sagt.*

---

## 3. Schreibweisen & Mechanik

- **Buttons:** Befehlsform, knapp, **kein Punkt** am Ende: „Speichern", „Funnel erstellen", „Lead exportieren".
- **Substantive groß** (deutsche Rechtschreibung). Fachbegriffe wie Funnel/Lead werden als
  deutsche Substantive behandelt: „der **Funnel**", „die **Leads**", „**Conversion**".
- **Plurale:** „Funnels", „Leads" (etablierter englischer Plural).
- **Empty-States:** sachlich + neutral: „Noch keine Leads." (nicht „Du hast noch keine Leads.")
- **Fehlermeldungen:** sachlich + lösungsorientiert, keine Schuldzuweisung: „E-Mail oder Passwort falsch." statt „Sie haben sich vertippt."
- **Datum:** `TT.MM.JJJJ`. **Uhrzeit:** `HH:MM Uhr`. **Zahlen:** Tausenderpunkt (`1.240`).
- **Konsistente Casing:** Reiter/Labels in „Satz-Schreibweise" (nur erstes Wort + Eigennamen groß), nicht Title-Case.

---

## 4. Beispiele (Vorher → Nachher)

| Vorher | Nachher | Regel |
|---|---|---|
| „Sie können hier Ihren Funnel bearbeiten" | „Funnel bearbeiten" | neutral, Befehlsform |
| „Du hast noch keine Anfragen" | „Noch keine Leads" | neutral + „Lead" |
| „Anzeigename (in der Navigation sichtbar)" | „Kontoname" | Glossar |
| „Mein Account" | „Mein Konto" | Glossar |
| „Einloggen" / „Anmelden" gemischt | durchgehend „Anmelden" | Glossar |
| „Aufrufe / Views / Besuche" gemischt | durchgehend „Aufrufe" | Glossar |
| Header „MARKENFARBE" + Label „Brand-Farbe" | „Hauptfarbe" | kein Hybrid, keine Doppelung |
| „Welcome-Screen" | „Begrüßung" | deutsch statt Jargon |
| „Kleines Nummern-Badge über der Frage" | „Zeigt die Nummer der aktuellen Frage" | sagt schlicht, was es tut |
| „Widget zeigt die Erfolgsseite…" | „Der Funnel zeigt…" | Glossar (Funnel statt Widget) |

---

## 5. Geltung & Pflege

- Dieser Guide gilt für **alle** nutzer-sichtbaren Texte: Dashboard, Editor, Account,
  Auth-Seiten, Fehler-/Empty-States, Funnel-Widget-Defaults, E-Mail-Vorlagen.
- **Ausnahme Funnel-Widget-Inhalte:** vom Tenant frei editierbar — wir liefern nur saubere
  Defaults (Anrede „Sie").
- Bei jeder neuen UI / jedem neuen Text: **erst hier nachsehen.**
- Verlinkt aus [`../CLAUDE.md`](../CLAUDE.md) §11.
