# Widget beim Kunden einbetten

Das Widget bindet sich selbst ein und passt seine Höhe automatisch an – kein festes `height`-Attribut nötig, funktioniert auf Desktop und Mobil.

---

## Variante A – Empfohlen: Ein Script-Tag

Das iframe erscheint genau an der Stelle des Script-Tags.

```html
<script src="https://deine-domain.de/embed.js" data-slug="musterfirma"></script>
```

`musterfirma` durch den Tenant-Slug ersetzen.

---

## Variante B – Platzhalter-Div

Mehr Kontrolle über die Position. Der Div wird automatisch durch das iframe ersetzt.

```html
<!-- Platzhalter an gewünschter Position -->
<div data-funnel-slug="musterfirma"></div>

<!-- Script-Tag irgendwo auf der Seite, z.B. vor </body> -->
<script src="https://deine-domain.de/embed.js"></script>
```

---

## WordPress

1. Im WordPress-Editor auf **„Code-Editor"** umschalten (oben rechts → Optionen → Code-Editor)
2. Den Code aus Variante A oder B einfügen
3. Speichern und Vorschau öffnen

Alternativ: Plugin **„Headers and Footers Scripts"** → Script-Tag im Footer eintragen, Div im gewünschten Block.

---

## Webflow

1. Seite öffnen → gewünschte Stelle wählen
2. Element **„Embed"** einfügen
3. Code aus Variante A einfügen
4. Publish

---

## Jimdo / Squarespace / andere Baukästen

Überall wo ein „HTML-Widget" oder „Custom Code"-Block angeboten wird:

1. Block einfügen
2. Code aus Variante A einfügen
3. Speichern

---

## Wie es funktioniert

- Das `embed.js` Script erstellt das iframe und setzt automatisch einen Listener.
- Das Widget sendet bei jeder Layoutänderung (Schritte, Fensterbreite) seine aktuelle Höhe per `postMessage`.
- Das Script empfängt die Nachricht und setzt `iframe.style.height` – kein Scrollen im iframe, immer korrekte Höhe.

---

## Lokales Testen (Entwicklung)

Während `npm run dev` läuft, im Browser öffnen:

```
http://localhost:3000/test-embed.html
```

Die Seite simuliert eine Kunden-Website mit Text oben und unten, um die dynamische Höhenanpassung zu testen.
