<iframe
  src="https://DEINE-DOMAIN.de/DEIN-SLUG"
  id="funnel-widget"
  style="width:100%;border:none;display:block;height:500px;"
  scrolling="no"
  loading="lazy">
</iframe>
<script>
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'funnel-resize') return;
    var h = parseInt(e.data.height, 10);
    if (h > 0) document.getElementById('funnel-widget').style.height = h + 'px';
  });
</script>