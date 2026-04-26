# Kunden-Onboarding – Was ich vom Kunden brauche

Checkliste für jeden neuen Funnel. Pflichtfelder sind das Minimum um loszulegen.

---

## Pflicht – ohne das geht gar nichts

| Was | Beispiel |
|---|---|
| **Firmenname** | `Mustermann Solar GmbH` |
| **E-Mail-Adresse** | `info@mustermann-solar.de` |
| **Primärfarbe** | `#f59e0b` (Hex-Code, steht meist im CI/Branding) |
| **Datenschutz-URL** | `https://mustermann.de/datenschutz` |
| **Fragen + Antworten** | Siehe Abschnitt unten |

> **Slug** erstelle ich selbst aus dem Firmennamen – muss der Kunde nicht wissen.
> **Branche** lege ich intern fest – muss der Kunde nicht wissen.

---

## Fragen & Antworten – das Herzstück

Pro Frage brauche ich:

1. **Fragetext** – z.B. `"Auf welchem Gebäude soll die Anlage installiert werden?"`
2. **Antwortoptionen** – pro Option: Anzeigetext

Icons suche ich selbst raus – der Kunde muss keine Icon-Namen kennen.

**Beispiel:**
```
Frage: "Worauf soll die Solaranlage installiert werden?"
  → Einfamilienhaus
  → Mehrfamilienhaus
  → Firmengebäude
  → Sonstiges
```

Alternativ: Branche nennen, ich schlage Standard-Fragen vor und der Kunde gibt nur Feedback.

---

## Optional – nur wenn der Kunde explizit etwas anderes will

| Was | Default |
|---|---|
| Funnel-Titel | `"Jetzt kostenloses Angebot anfordern"` |
| Button-Text | `"Anfrage absenden"` |
| Erfolgsmeldung | `"Vielen Dank! Wir melden uns in Kürze bei Ihnen."` |
| Antwortzeit | `"24 Stunden"` |
| Kontaktformular-Untertitel | `"Wer soll das Angebot erhalten?"` |

Wenn der Kunde nichts sagt → Defaults bleiben, fertig.

---

## Datenschutz-Hinweis an den Kunden

Ich bin Techniker, nicht sein Datenschutzbeauftragter – aber ich weise ihn hin:

> "Du musst auf deiner Datenschutzseite ergänzen, dass du ein Kontaktformular
> betreibst und personenbezogene Daten (Name, E-Mail, Telefon) zur
> Angebotsbearbeitung verarbeitest. Hier ist ein Mustertext den du einfach
> reinkopieren kannst:"

**Mustertext für die Datenschutzseite des Kunden:**
```
Kontaktformular / Angebotsanfrage

Wenn Sie über unser Kontaktformular eine Anfrage stellen, werden die von Ihnen
angegebenen Daten (Name, E-Mail-Adresse, Telefonnummer sowie Ihre Antworten
auf die Formularfragen) zur Bearbeitung Ihrer Anfrage und für den Fall von
Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre
Einwilligung weiter. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
(Vertragsanbahnung).
```

Das Widget selbst zeigt einen generischen Datenschutzhinweis – der wird nie geändert.
Die Datenschutz-URL im Widget verlinkt auf seine eigene Datenschutzseite.

---

## Was ich dem Kunden schicke – Vorlage Erstkommunikation

```
Hallo [Name],

für die Einrichtung deines Anfrage-Widgets brauche ich folgendes von dir:

1. Deine Hauptfarbe als Hex-Code (z.B. #f59e0b) – steht oft im CI/Branding
2. Die URL deiner Datenschutzseite
3. Die Fragen, die du dem Interessenten stellen möchtest (inkl. Antwortmöglichkeiten)
   → Alternativ: Sag mir deine Branche, ich schlage dir Standard-Fragen vor

Das war's – alles andere erledige ich.

Wichtig: Bitte ergänze deine Datenschutzseite um einen Hinweis zum Kontaktformular.
Ich schicke dir gleich einen fertigen Mustertext den du einfach reinkopieren kannst.
```
