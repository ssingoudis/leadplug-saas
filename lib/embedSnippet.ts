// Einzige Wahrheit für das Embed-Snippet, das Tenants auf ihre Website kopieren.
// Wird vom „Einbinden"-Tab im Funnel-Editor (SharePanel) benutzt.
//
// Hardening-Geschichte:
// - Origin-Check (e.origin === ALLOWED) — schützt gegen fremde iframes auf der Tenant-Seite
//   (z.B. Google-Ads, Cookie-Banner) die zufällig/böswillig "funnel-resize"-shaped Messages senden
// - Height-Clamp (100 ≤ h ≤ 10000) — Safety gegen versehentliche scrollHeight-Spikes
// - loading="lazy" entfernt — Lead-Funnels sitzen typisch above-the-fold, lazy verschärft
//   nur Boot-Race-Edge-Cases und bringt keinen Speed-Gewinn wenn iframe sowieso im Viewport ist
//
// Limitation: Diese Hardenings landen nur in NEUEN Snippets die Tenants frisch kopieren.
// Bestehende Embeds auf Tenant-Seiten laufen mit der alten Logik weiter — funktionieren,
// kriegen aber die Sicherheits-Hardenings nicht.
//
// Seit Aufgabe 42 (D.2) ist das Script-Loader-Modell (`buildScriptEmbed`, siehe unten) der
// empfohlene Weg — dort liegt die iFrame- + Tracking-Logik zentral in `/embed.js` und ist
// jederzeit ohne Tenant-Aktion updatebar. Dieses iFrame-Snippet bleibt als Fallback bestehen.
export function buildEmbedSnippet(slug: string, url: string, companyName: string): string {
  const allowedOrigin = new URL(url).origin;
  return `<iframe
  id="funnel-${slug}"
  src="${url}"
  style="width:100%;border:none;display:block;height:500px"
  title="${companyName}"
></iframe>
<script>
(function(){
  var ALLOWED='${allowedOrigin}';
  window.addEventListener('message',function(e){
    if(e.origin!==ALLOWED)return;
    if(!e.data||e.data.type!=='funnel-resize')return;
    var f=document.getElementById('funnel-${slug}');
    if(!f||e.source!==f.contentWindow)return;
    var h=parseInt(e.data.height,10);
    if(!h||h<100||h>10000)return;
    f.style.height=h+'px';
  });
})();
<\/script>`;
}

// Empfohlenes Embed seit Aufgabe 42 (D.2): Script-Loader statt statischem iFrame.
// Der Tenant kopiert nur diese zwei Zeilen — `/embed.js` erzeugt das iFrame, verdrahtet
// die Höhen-Anpassung UND das Conversion-Tracking (GTM-dataLayer + optionale Meta/Google-
// Pixel + Callback). Da die Logik zentral in /embed.js lebt, profitieren bestehende Embeds
// automatisch von künftigen Updates — kein erneutes Kopieren nötig.
//
// Optionales Conversion-Tracking über data-Attribute am <div> (keine LeadPlug-Konfig nötig):
//   data-meta-lead                         → fbq('track','Lead') wenn der Meta-Pixel geladen ist
//   data-google-conversion="AW-123/AbCdEf" → gtag('event','conversion',{ send_to })
// `origin` ist der App-Origin (z.B. https://app.leadplug.de), von dem /embed.js geladen wird.
export function buildScriptEmbed(slug: string, origin: string): string {
  return `<div data-leadplug="${slug}"></div>
<script src="${origin}/embed.js" defer><\/script>`;
}
