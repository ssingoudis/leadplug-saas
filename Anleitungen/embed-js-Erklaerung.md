# embed.js – Wie das Einbettungs-Script funktioniert

> **Stand seit Aufgabe 42 / D.2 (2026-05-31):** `public/embed.js` wurde erweitert um **Conversion-Tracking** (GTM-`dataLayer`-Push `leadplug_lead` + optionale Meta/Google-`data`-Attribute + `window.LeadPlug.onLead`-Callback) und **Sicherheits-Härtung** (Origin- + Source-Check, Höhen-Clamp). Neues kanonisches Slug-Attribut: **`data-leadplug`**; die hier beschriebenen `data-funnel-slug` (Div) und `data-slug` (Script) bleiben **abwärtskompatibel** unterstützt. Das Widget sendet beim Absenden zusätzlich `{ type:'funnel-submit', funnel:'<slug>' }`. Vollständige Tracking-Referenz: [`context/conversion-tracking.md`](../context/conversion-tracking.md). Die untenstehende Code-Erklärung beschreibt die Resize-Grundlogik — das Prinzip ist unverändert, nur ergänzt.

`public/embed.js` ist das Script das Kunden auf ihrer Website einbinden. Es erstellt den iFrame automatisch, erkennt den Funnel-Slug, und hört auf Höhen-Updates vom Widget. Der Kunde muss nichts manuell konfigurieren außer dem Slug.

---

## Warum überhaupt ein externes Script?

Der naive Ansatz wäre: Kunde kopiert einen fertigen `<iframe>`-Tag mit fester URL. Das hat mehrere Nachteile:

- Der Kunde muss die Domain hardcoden – bei einem Umzug auf eine andere Domain brechen alle Einbettungen
- Der Kunde muss den postMessage-Listener selbst schreiben (fehleranfällig)
- Mehrere Widgets auf einer Seite sind schwer zu verwalten

`embed.js` löst all das: **ein Script-Tag**, alles weitere läuft automatisch.

---

## Aufbau des Scripts

Das gesamte Script ist in eine **IIFE** (Immediately Invoked Function Expression) eingewickelt:

```js
(function () {
  "use strict";
  // ...
})();
```

Das verhindert dass Variablen wie `iframeList` oder `baseUrl` in den globalen Scope der Kundenseite lecken und dort mit anderen Scripts kollidieren.

---

## Schritt 1: Base-URL automatisch ermitteln

```js
var currentScript = document.currentScript;
var scriptSrc = currentScript ? currentScript.src : "";
var baseUrl = scriptSrc.replace(/\/embed\.js(\?.*)?$/, "").replace(/\/$/, "");
```

`document.currentScript` zeigt auf das gerade ausgeführte `<script>`-Element – also genau den Tag den der Kunde eingefügt hat. Daraus wird die Domain extrahiert:

| Script-Tag src | Ergebnis `baseUrl` |
|---|---|
| `https://meine-domain.de/embed.js` | `https://meine-domain.de` |
| `https://meine-domain.de/embed.js?v=2` | `https://meine-domain.de` |

Der Kunde muss die Domain **nirgends manuell eintragen** – sie wird automatisch aus dem Script-Tag abgeleitet.

---

## Schritt 2: iFrame erstellen

```js
function createIframe(slug, placeholder) {
  var iframe = document.createElement("iframe");
  iframe.src = baseUrl + "/" + slug;
  iframe.style.cssText = "border:none;width:100%;display:block;overflow:hidden;height:0;";
  // ...
}
```

Das iFrame startet mit `height: 0` – es ist zunächst unsichtbar. Die korrekte Höhe wird erst nach dem ersten `funnel-resize`-Event vom Widget gesetzt. So gibt es kein Aufflackern einer falschen Höhe.

`width: 100%` bedeutet: das iFrame füllt immer die volle Breite seines Containers – responsiv ohne weitere Konfiguration.

---

## Schritt 3: Slug-Erkennung – zwei Varianten

```js
function init() {
  // Variante B: <div data-funnel-slug="mein-slug">
  var divs = document.querySelectorAll("[data-funnel-slug]");
  for (var i = 0; i < divs.length; i++) {
    var slug = divs[i].getAttribute("data-funnel-slug");
    if (slug) createIframe(slug, divs[i]); // ersetzt das div durch das iframe
  }

  // Variante A: <script data-slug="mein-slug" src="embed.js">
  if (currentScript) {
    var scriptSlug = currentScript.getAttribute("data-slug");
    if (scriptSlug) createIframe(scriptSlug, null); // iframe direkt nach Script-Tag eingefügt
  }
}
```

**Variante A** (`data-slug` am Script-Tag): Das iFrame erscheint an exakt der Stelle des Script-Tags im HTML. Einfachste Einbettung – ein Tag.

**Variante B** (`data-funnel-slug` am Div): Das Div wird durch das iFrame ersetzt. Gibt mehr Kontrolle über die Position, z.B. wenn Script-Tags aus technischen Gründen nur im Footer platziert werden können. Mehrere Divs auf derselben Seite werden alle erkannt.

Beide Varianten können gleichzeitig aktiv sein.

---

## Schritt 4: iFrames tracken – WeakMap + Liste

```js
var iframeMap = new WeakMap(); // contentWindow → iframe-Element
var iframeList = [];

iframe.addEventListener("load", function () {
  iframeMap.set(iframe.contentWindow, iframe);
});
```

Wenn mehrere Widgets auf einer Seite laufen, schicken alle `funnel-resize`-Events. Um zu wissen welches Event zu welchem iFrame gehört, wird `event.source` (das `contentWindow` des sendenden iFrames) als Schlüssel genutzt.

`WeakMap` statt `Map` weil: wenn ein iFrame aus dem DOM entfernt wird, gibt die WeakMap das `contentWindow`-Objekt automatisch frei (kein Memory Leak).

**Warum erst beim `load`-Event?** `contentWindow` ist erst nach dem Laden zugänglich. Bei Cross-Origin-iFrames kann der Zugriff sogar dann noch scheitern – der `try/catch` fängt das ab.

---

## Schritt 5: Höhe setzen

```js
window.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "funnel-resize") return;
  var height = parseInt(event.data.height, 10);
  if (!height || height <= 0) return;

  var target = null;
  try {
    target = iframeMap.get(event.source); // passendes iframe per contentWindow
  } catch (e) {}

  if (!target && iframeList.length === 1) {
    target = iframeList[0]; // Fallback: nur ein Widget auf der Seite
  }

  if (target) {
    target.style.height = height + "px";
  }
});
```

Der Listener filtert zuerst nach `type: 'funnel-resize'` – alle anderen postMessage-Events auf der Seite (z.B. von Chat-Widgets, Cookie-Bannern, Analytics) werden ignoriert.

**Fallback für ein einzelnes Widget:** Wenn die WeakMap keinen Treffer liefert (z.B. weil das iFrame noch nicht vollständig geladen war als das erste Event kam), wird das einzige iFrame in der Liste verwendet. Damit funktioniert die einfachste Einbettung auch in Edge Cases zuverlässig.

---

## Timing: Wann wird `init()` ausgeführt?

```js
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
```

Wird das Script im `<head>` oder mitten im `<body>` geladen, wartet es auf `DOMContentLoaded` – sonst wären die Divs mit `data-funnel-slug` noch nicht im DOM. Wird das Script am Ende des `<body>` geladen, ist das DOM bereits fertig und `init()` läuft sofort.

---

## Zusammenfassung: Was der Kunde nie selbst machen muss

| Aufgabe | Erledigt durch |
|---|---|
| Domain der Widget-URL | `embed.js` (aus eigenem `src` abgeleitet) |
| iFrame erstellen | `embed.js` |
| iFrame responsiv machen | `embed.js` (`width: 100%`) |
| Höhe automatisch anpassen | `postMessage` + `embed.js` |
| Mehrere Widgets verwalten | `embed.js` (WeakMap) |
| Slug zuordnen | `data-slug` oder `data-funnel-slug` Attribut |
