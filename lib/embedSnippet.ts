// Einzige Wahrheit für das Embed-Snippet, das Tenants auf ihre Website kopieren.
// Wird sowohl von EmbedBlock (Embed-Seite) als auch vom Editor-Shortcut benutzt.
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
// kriegen aber die Sicherheits-Hardenings nicht. Saubere Lösung dafür ist das Script-Loader-
// Modell (Typeform-Stil) — geplant für Aufgabe D.2 Conversion-Tracking.
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
