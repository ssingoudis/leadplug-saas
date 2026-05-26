// Einzige Wahrheit für das Embed-Snippet, das Tenants auf ihre Website kopieren.
// Wird sowohl von EmbedBlock (Embed-Seite) als auch vom Editor-Shortcut benutzt.
export function buildEmbedSnippet(slug: string, url: string, companyName: string): string {
  return `<iframe
  id="funnel-${slug}"
  src="${url}"
  style="width:100%;border:none;display:block;height:500px"
  loading="lazy"
  title="${companyName}"
></iframe>
<script>
window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'funnel-resize') return;
  var f = document.getElementById('funnel-${slug}');
  if (!f || e.source !== f.contentWindow) return;
  var h = parseInt(e.data.height, 10);
  if (h > 0) f.style.height = h + 'px';
});
<\/script>`;
}
