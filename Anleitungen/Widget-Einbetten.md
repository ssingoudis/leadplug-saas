# Widget beim Kunden einbetten

Das Widget passt seine Höhe automatisch an – kein festes `height`-Attribut nötig, funktioniert auf Desktop und Mobil.

**Einziger Pflicht-Parameter: der Slug.** Der Slug ist der eindeutige Bezeichner eines Funnels (Tabelle `funnels`, Spalte `slug` in Supabase). Er bestimmt, welche Fragen, Farben, Texte und Ziel-E-Mail geladen werden. Ein ungültiger Slug ergibt eine 404-Seite.

---

## Variante A – Empfohlen: Ein Script-Tag

Das iframe erscheint genau an der Stelle des Script-Tags im HTML-Fluss.

```html
<script src="https://DEINE-DOMAIN.de/embed.js" data-slug="DEIN-SLUG"></script>
```

`DEIN-SLUG` durch den Funnel-Slug aus Supabase ersetzen.

---

## Variante B – Platzhalter-Div

Mehr Kontrolle über die Position. Das `<div>` wird automatisch durch das iframe ersetzt.  
Mehrere Divs (verschiedene Slugs) auf einer Seite werden alle erkannt.

```html
<!-- Platzhalter an gewünschter Position -->
<div data-leadplug="DEIN-SLUG"></div>

<!-- Script-Tag irgendwo auf der Seite, z.B. vor </body> -->
<!-- Kein data-slug am Script nötig – der Slug steht am div -->
<script src="https://DEINE-DOMAIN.de/embed.js"></script>
```

> **Attribut-Hinweis:** `data-leadplug` ist das aktuelle, empfohlene Attribut. Das ältere `data-funnel-slug` wird weiterhin unterstützt (abwärtskompatibel) – bestehende Einbettungen brechen nicht.

---

## Variante C – Direktes iFrame (kein externes Script)

Wenn auf der Zielseite kein externes Script erlaubt ist (z.B. wegen Content Security Policy).

```html
<iframe
  src="https://DEINE-DOMAIN.de/DEIN-SLUG"
  id="funnel-DEIN-SLUG"
  scrolling="no"
  frameborder="0"
  style="border:none;width:100%;display:block;overflow:hidden;height:0;"
></iframe>
<script>
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'funnel-resize') return;
    var h = parseInt(e.data.height, 10);
    if (h > 0) document.getElementById('funnel-DEIN-SLUG').style.height = h + 'px';
  });
</script>
```

---

## Conversion-Tracking (Google Ads & Facebook)

Mit **Variante A oder B** (über `embed.js`) meldet jeder abgeschickte Funnel automatisch einen Lead an die einbettende Seite. So optimieren Google Ads / Facebook auf Lead-Generierung statt nur auf Klicks. Drei Wege, das abzugreifen:

1. **Google Tag Manager (empfohlen):** Bei jedem Lead wird `window.dataLayer.push({ event: "leadplug_lead", funnel: "DEIN-SLUG" })` gefeuert. In GTM einen Trigger „Benutzerdefiniertes Ereignis" auf `leadplug_lead` anlegen, daran die eigenen Conversion-Tags hängen.
2. **Ohne GTM – data-Attribute am `<div>`:**
   ```html
   <!-- Meta-Pixel: feuert fbq('track','Lead') -->
   <div data-leadplug="DEIN-SLUG" data-meta-lead></div>

   <!-- Google Ads: feuert gtag('event','conversion', { send_to }) -->
   <div data-leadplug="DEIN-SLUG" data-google-conversion="AW-123456789/AbCdEfGh"></div>
   ```
3. **Eigener Code:** `window.LeadPlug = { onLead: function (e) { /* e.funnel */ } }`.

Aus Datenschutzgründen werden **keine personenbezogenen Daten** an die einbettende Seite übergeben – nur das Lead-Signal und der Funnel-Slug. Variante C (direktes iFrame) hat **kein** Tracking. Volle technische Referenz: [`context/conversion-tracking.md`](../context/conversion-tracking.md).

---

## WordPress

1. Im WordPress-Editor auf **„Code-Editor"** umschalten (Block-Editor oben rechts → Optionen → Code-Editor)
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

## Hintergrundfarbe / Transparenz

Das Widget hat standardmäßig einen transparenten Seiten-Hintergrund (`pageBackgroundColor: transparent`). Der Host-Hintergrund der Kunden-Website scheint durch. Das Widget-Card selbst hat immer eine definierte Hintergrundfarbe (aus der Supabase-Theme-Konfiguration).

Transparenz funktioniert in allen modernen Browsern ohne zusätzliche Attribute.

---

## Wie es funktioniert

- `embed.js` liest den Slug aus `data-leadplug` (empfohlen) bzw. `data-funnel-slug` (am Div) oder `data-slug` (am Script-Tag)
- Die Widget-URL lautet `{domain}/{slug}` – Next.js lädt dort die Konfiguration aus Supabase
- Das Widget sendet bei jeder Layoutänderung `window.parent.postMessage({ type: 'funnel-resize', height: X }, '*')` und beim Absenden `{ type: 'funnel-submit', funnel: '<slug>' }`
- `embed.js` empfängt die Nachrichten (origin- + source-gehärtet), setzt `iframe.style.height` und feuert bei `funnel-submit` die Conversions (dataLayer + optionale Pixel + Callback)