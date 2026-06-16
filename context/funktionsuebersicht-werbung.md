# LeadPlug — Funktionsübersicht für Marketing & Akquise

> **Zweck dieses Dokuments:** Eine vollständige, **code-verifizierte** Übersicht aller Produkt-Funktionen — als Grundlage für die Werbe-/Akquise-Strategie (z. B. zum Übergeben an eine Werbe-KI). Jede genannte Funktion ist real im Produkt vorhanden und überprüft. Bewusste Grenzen stehen dabei, damit nichts überversprochen wird.
>
> **Stand:** 2026-06-16 · **Phase:** kostenlose, invite-only **Beta**

---

## 1. Was ist LeadPlug?

LeadPlug ist ein **Funnel-Builder mit integriertem Lead-CRM** für **Marketing-Agenturen und Marketer**. Eine Agentur baut im Editor lineare, Typeform-artige Frage-Funnels für ihre Endkunden (Solar-Betriebe, Anwälte, Handwerk, Coaches, Versicherungen — **branchenoffen, keine Einschränkung**), bettet sie per Code-Snippet auf der Website des Endkunden ein, und die eingehenden Leads landen im integrierten Posteingang und fließen automatisch ins CRM des Kunden (per Webhook), in Bestätigungs-/Nurturing-Mails und in das Werbe-Conversion-Tracking (Meta/Google).

**Kurzformel:** Typeform-Erlebnis + Lead-Posteingang + CRM-Anbindung + Werbe-Tracking — in einem Tool, gebaut für Agenturen, die viele Endkunden parallel betreuen.

---

## 2. Zielgruppe

- **Primär:** Marketing- und Performance-Agenturen im DACH-Raum, die Lead-Funnels für ihre eigenen Endkunden bauen und betreiben.
- **Ebenfalls:** einzelne Marketer/Freelancer mit mehreren Kundenprojekten.
- **Nicht** die Endbetriebe selbst (die haben keinen eigenen Zugang) — das Produkt ist das Werkzeug der Agentur.

Ein Account (= „Konto") betreut beliebig viele Funnels für beliebig viele Endkunden, jeweils mit eigenem Branding, eigenem Pixel und eigener CRM-Anbindung.

---

## 3. Status & Verfügbarkeit

- **Kostenlose, offene Beta** (invite-only per Link). **Keine Kreditkarte, kein Preis** während der Beta — voller Funktionsumfang.
- Konkrete Pläne/Preise werden **erst nach der Beta** festgelegt (für die Werbung daher **keine Preisangaben** verwenden).
- Selbst-Registrierung in unter einer Minute (E-Mail+Passwort oder Google-Login).

---

## 4. Funktionsumfang (vollständig)

### A) Funnel-Builder — die Arbeitsfläche der Agentur
- **3-Pane-Editor**: Schritt-Liste · Live-Vorschau · Eigenschaften, mit Umschalter zwischen Inhalt und Design.
- **Echtes WYSIWYG**: Die Vorschau ist exakt das Widget, das live geht — Texte werden direkt im Element bearbeitet (wie bei Typeform).
- **Drag & Drop** für Schritte, Antwortoptionen und Felder; neue Schritte punktgenau zwischen bestehende einfügen.
- **Karten-Modell**: mehrere Felder pro Schritt bündeln (z. B. Name + E-Mail + Telefon auf einer Seite) → kürzere Funnels, höhere Abschlussrate.
- **Fertige Bausteine per Klick**: Kontaktdaten-Karte, Adress-Karte, Begrüßungs-Screen, eigene Karte.
- **Undo/Redo** und **Verlassen-Schutz** gegen versehentlichen Datenverlust.
- **Test-Modus**: kompletten Funnel inklusive Verzweigungen durchspielen, ohne ihn live zu schalten.
- **Live-Vorschau** des echten Funnels in neuem Tab (ohne die Aufruf-Statistik zu verfälschen).
- **Kontaktierbarkeits-Warnung**: warnt automatisch, wenn ein Funnel keine erreichbaren Kontaktdaten erfasst — schützt vor wertlosen Leads.

### B) Frage- & Feldtypen — das Endkunden-Erlebnis
- **11 Fragetypen**: Einfachauswahl, Mehrfachauswahl, Kurztext, Langtext, Schieberegler (Slider), Datum (Inline-Kalender), Zahl, Dropdown, Checkbox, **Sterne-Bewertung**, **Skala/NPS**, **Infotext (Statement)**.
- **15 Kontaktfeld-Typen** für die Lead-Erfassung (Name/Vorname/Nachname, E-Mail, Telefon, PLZ, Text, …).
- **Auto-Advance** bei Einfachauswahl (Typeform-Muster) → flüssiger Durchlauf, weniger Klicks bis zum Lead.
- **Sanfte, GPU-beschleunigte Folienübergänge** (lagfrei auch auf dem Handy).
- **Browser-Zurück = eine Frage zurück**, volle Tastatur-Bedienung, mobil-optimiert über Container-Queries.
- **Begrüßungs- und Erfolgs-Screen** frei gestaltbar; nach dem Absenden optional Weiterleitung auf eine eigene Danke-/Buchungsseite.

### C) Logik-Verzweigungen (Logic Jumps)
- **Bedingte Sprünge je nach Antwort** — ein Funnel passt sich dynamisch an (Vorqualifizierung, bedarfsabhängige Fragen) statt mehrere Funnels zu pflegen.
- **Operatoren**: ist / ist nicht, enthält, in Auswahl enthalten, sowie numerisch größer/kleiner (z. B. „Budget ≥ 5.000" → Premium-Pfad).
- **Robuste, tolerante Vergleiche** (auch mit deutschem Dezimal-Komma) → keine stillen Fehlsprünge.
- **Logik-Karte**: der gesamte Funnel-Fluss als übersichtliches Diagramm mit Zoom/Verschieben; warnt sichtbar vor wirkungslosen Regeln, bevor der Funnel live geht.
- **Garantiert identisches Verhalten** in Vorschau, Live-Widget und Server.

### D) CRM-Anbindung (Webhooks)
- **Beliebig viele Webhooks pro Funnel** an CRM, Zapier, Make, n8n & Co.
- **Drei Auslöser**: am Funnel-Ende, mitten im Funnel (nach einer bestimmten Frage) und für **Abbrecher** (Interessenten, die mit hinterlassener E-Mail/Telefon nicht zu Ende ausgefüllt haben).
- **Signierte Übertragung (HMAC, Stripe-kompatibel)** + **automatische Wiederholversuche** bei Empfänger-Ausfall (gestaffelt über mehrere Stunden) → kein Lead geht durch temporäre Server-Fehler verloren.
- **Klar strukturierte Daten** mit Klartext-Beschriftungen statt technischer Codes; **Beispiel-Datensatz-Vorschau** schon vor dem ersten echten Lead, damit das Mapping vorbereitet werden kann.
- Test-Versand, Zustell-Protokoll und Secret-Verwaltung direkt im Editor.

### E) E-Mail-Automatisierung (Drip & Benachrichtigungen)
- **Beliebig viele E-Mails pro Funnel**, sofort oder zeitversetzt (Minuten/Stunden/Tage) → komplette Nurturing-Strecken ohne externes Mail-Tool.
- **Empfänger**: an den Lead (Eingangsbestätigung), an feste Adressen (Vertrieb des Endkunden) oder ans eigene Postfach.
- **Visueller Editor** mit dynamischen Variablen aus den echten Funnel-Antworten, Antworten-Übersicht und anpassbaren Aktions-Buttons.
- **Live-Vorschau** mit Beispiel- oder echten Lead-Daten, Test-Versand, Versand-Historie, automatische Wiederholversuche.
- Korrekte Darstellung in Gmail/Outlook (Inline-Styling), Schutz vor schädlichen Eingaben.

### F) Einbindung & Werbe-Conversion-Tracking
- **Einbindung in 2 Zeilen** (Code-Schnipsel kopieren) — bekommt künftige Verbesserungen automatisch, ohne erneutes Einbauen.
- **Automatische Höhenanpassung** des eingebetteten Funnels → wirkt nahtlos eingebaut, nie abgeschnitten oder mit Scrollbalken.
- **Conversion-Tracking ohne Entwickler**: einfach Meta-Pixel-ID und/oder Google-Ads-Conversion pro Funnel eintragen — das System feuert die Conversion beim Lead automatisch und bindet den nötigen Basiscode selbst ein.
- **Plattformunabhängiger GTM-Auslöser** (`leadplug_lead`) → jede beliebige Werbeplattform über den Google Tag Manager anbindbar.
- **Tracking pro Funnel**: je Endkunde ein eigenes Pixel / eine eigene Conversion — genau der Agentur-Anwendungsfall.
- **Datenschutzfreundlich**: es verlassen keine personenbezogenen Daten den eingebetteten Funnel.
- Fertige Einbindungs-Anleitungen für **WordPress, Wix, Squarespace, Webflow** u. a.

### G) Lead-Posteingang & Mini-CRM
- **Listen- und Kanban-Board-Ansicht** — Lead-Status (Neu → Kontaktiert → Erledigt) per Drag & Drop ändern.
- **Interne Notizen** pro Lead (mit Autosave), **Filter** nach Funnel, Status, Zeitraum und Volltext-Suche.
- **Lead-Detailansicht** mit allen Antworten in Klartext.
- **CSV-Export** in zwei Formaten, inklusive **Deutschland-Excel-Format** (öffnet sauber per Doppelklick, keine Umlaut-Probleme).
- **Kein Lead geht verloren**: auch abgebrochene Funnels werden zu verwertbaren Leads, sobald eine E-Mail oder Telefonnummer hinterlassen wurde.

### H) Statistik-Cockpit
- 30-Tage-Kennzahlen (Leads, Aufrufe, Conversion-Rate, aktive Funnels) mit Mini-Trendkurven.
- 12-Monats-Verlauf **Aufrufe vs. ausgefüllt**, **Conversion-Donut**, Monatstabelle mit Aufschlüsselung bis auf den einzelnen Tag.
- Damit kann die Agentur die **Leistung jedes Funnels gegenüber ihrem Endkunden belegen**.

### I) Branchen-Vorlagen
- **37 fertige, kuratierte DACH-Branchen-Funnels** über 12 Kategorien (u. a. Handwerk, Dienstleistung, Finanzen, Gesundheit, Recht, Energie, Recruiting, Immobilien, Coaching).
- **Durchspielbare Live-Vorschau** vor der Übernahme, **Funnel mit einem Klick** aus einer Vorlage erstellen (inklusive Logik und automatischer E-Mails).
- **Eigene Funnels duplizieren** — bewährte Funnels in Sekunden als Basis für weitere Endkunden klonen.

### J) Branding, Sicherheit & Verlässlichkeit
- **Funnel-Branding pro Endkunde** in Minuten: Markenfarbe, Schriftart (10 Schriften zur Wahl), Ecken-Rundung, Breite, Hintergrund — konsistent über den ganzen Funnel, ohne CSS.
- **Whitelabel-Widget**: der eingebettete Funnel zeigt **keine LeadPlug-Marke** (kein „powered by", kein Logo) — er wirkt wie das eigene Tool des Endkunden.
- **Datenschutz „by default"**: 10 selbst gehostete Schriften (keine externen Google-Fonts-Aufrufe), keine personenbezogenen Daten im Werbe-Tracking.
- **Verlässlich gebaut**: Fehler in Tracking/Mail/Webhook werden abgefangen statt den Lead zu gefährden, Schutz gegen Doppel-Absendungen, Bot-Schutz, vollständige Mehrmandanten-Datentrennung auf Datenbank-Ebene.
- **Komfort**: Dark-Mode, responsive Oberfläche, DSGVO-konforme Selbst-Löschung des Kontos, eingebautes Feedback-/Support-Widget (E-Mail + WhatsApp).

---

## 5. Stärkste Werbe-Winkel / Alleinstellungen

(Aus dem Funktionsumfang abgeleitet — ehrlich, nicht übertrieben.)

1. **„Kein Lead geht verloren."** Auch Abbrecher mit hinterlassenem Kontakt zählen als Lead und können automatisch ans CRM gehen.
2. **Conversion-Tracking für Werbung ohne Entwickler.** Pixel-ID eintragen — fertig. Pro Endkunde getrennt (eigenes Meta-/Google-Konto).
3. **Echtes Agentur-Werkzeug.** Ein Account, viele Endkunden-Funnels — jeder mit eigenem Branding, Pixel und CRM.
4. **Alles in einem statt Tool-Stack.** Builder + Verzweigungs-Logik + Lead-CRM + Automatik-Mails + Statistik + CSV-Export.
5. **Das Widget ist white-label.** Beim Endkunden taucht keine LeadPlug-Marke auf.
6. **37 sofort nutzbare DACH-Branchen-Vorlagen** als schneller Einstieg.
7. **Robust & seriös:** datenschutzfreundlich (self-hosted Fonts, PII-frei beim Tracking), verlässliche Zustellung mit automatischen Wiederholversuchen.

---

## 6. Ehrliche Grenzen (damit Werbung nicht überverspricht)

- **Linearer Funnel-Builder** (Typeform-Stil) — bewusst **kein** frei verdrahtbarer Node-/Flow-Canvas. Verzweigungen nur als Vorwärts-Sprünge.
- **Branding ist funnelweit** (Farbe/Schrift/Form) — **kein** Per-Element-Design-Editor wie bei Website-Buildern.
- **Editor nur am Desktop** (ab ~1024 px Breite) nutzbar; die fertigen Funnels selbst laufen voll auf dem Handy.
- **Keine fertigen 1-Klick-CRM-Connectoren** (HubSpot/Pipedrive etc.) — Anbindung läuft über die generische Webhook-Schnittstelle bzw. Zapier/Make/n8n.
- **Conversion-Tracking automatisch out-of-the-box** für Meta und Google Ads; weitere Plattformen über den Google-Tag-Manager-Auslöser.
- **Endkunden haben keinen eigenen Login** (kein Endkunden-Portal in der Beta).
- **Funnel-URL** läuft über `app.leadplug.de/[name]` (eigene Custom-Domain noch nicht verfügbar).
- **DSGVO/Einwilligung** ist Sache der Agentur/des Endkunden (kein erzwungener Consent-Mechanismus eingebaut).

---

## 7. Was LeadPlug ausdrücklich NICHT ist (Positionierung)

- **Kein** AI-Funnel-Generator (kein austauschbarer AI-Hype).
- **Kein** Website-Builder.
- **Kein** Tool für die Endbetriebe selbst — es ist das Werkzeug der **Agentur**.
- **Kein** Node-Canvas-Baukasten — der Fokus liegt auf einem schlanken, verlässlichen, linearen Funnel-Erlebnis.