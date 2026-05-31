(function () {
  "use strict";

  // ===========================================================================
  // LeadPlug Embed-Loader  (Aufgabe 42 / D.2 — Upgrade des Alt-Loaders)
  // ---------------------------------------------------------------------------
  // Zentral ausgeliefertes Script, das Tenants auf ihrer Website einbinden. Es:
  //   1. erzeugt pro Funnel-Platzhalter ein responsives iFrame,
  //   2. passt die Höhe automatisch an (postMessage "funnel-resize", origin- + source-gehärtet),
  //   3. meldet abgeschickte Leads an die Conversion-Plattformen ("funnel-submit"):
  //        - GTM-dataLayer-Push  { event:'leadplug_lead', funnel }
  //        - optional Meta-Pixel  fbq('track','Lead')                   bei Attribut data-meta-lead
  //        - optional Google-Ads  gtag('event','conversion',{send_to})  bei data-google-conversion="AW-XXX/label"
  //        - window.LeadPlug.onLead({ funnel })                         Callback-Hook
  //
  // Slug-Erkennung (abwärtskompatibel):
  //   - <div data-leadplug="slug">        ← neues kanonisches Attribut
  //   - <div data-funnel-slug="slug">     ← Legacy
  //   - <script ... data-slug="slug">     ← Legacy (iFrame wird an Script-Position eingefügt)
  // ===========================================================================

  if (window.__leadplugEmbed) return; // Mehrfach-Einbindung darf nicht doppelt initialisieren
  window.__leadplugEmbed = true;
  window.LeadPlug = window.LeadPlug || {};

  // --- Eigenen <script>-Tag + Origin ableiten (robust auch bei defer) --------
  var currentScript = document.currentScript;
  if (!currentScript) {
    var scripts = document.getElementsByTagName("script");
    for (var s = scripts.length - 1; s >= 0; s--) {
      if (scripts[s].src && scripts[s].src.indexOf("/embed.js") > -1) { currentScript = scripts[s]; break; }
    }
  }
  var ORIGIN;
  try { ORIGIN = currentScript ? new URL(currentScript.src, location.href).origin : location.origin; }
  catch (e) { ORIGIN = location.origin; }

  var mounts = []; // { el: <Quell-Element mit Slug + Tracking-Attributen>, iframe, slug }

  function createIframe(slug, sourceEl, mode) {
    var iframe = document.createElement("iframe");
    iframe.src = ORIGIN + "/" + encodeURIComponent(slug);
    iframe.title = "LeadPlug Funnel";
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("frameborder", "0");
    iframe.style.cssText = "border:none;width:100%;display:block;overflow:hidden;height:500px;";

    if (mode === "after-script" && currentScript && currentScript.parentNode) {
      currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
    } else if (sourceEl) {
      sourceEl.appendChild(iframe);
    }

    mounts.push({ el: sourceEl, iframe: iframe, slug: slug });
    return iframe;
  }

  // Format-Whitelists — die IDs werden in injizierte Scripts interpoliert, daher hart prüfen.
  var META_PIXEL_RE = /^[0-9]{5,20}$/;
  var GOOGLE_SENDTO_RE = /^AW-[0-9]+(\/[\w-]+)?$/;

  // Lädt den Meta-Pixel-Basiscode (fbevents.js) nur, wenn noch kein fbq existiert.
  function ensureFbqBase() {
    if (typeof window.fbq === "function") return;
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
  }

  // Lädt gtag.js für die gegebene AW-ID nur, wenn noch kein gtag existiert.
  function ensureGtagBase(awId) {
    if (typeof window.gtag === "function") return;
    var t = document.createElement("script");
    t.async = true;
    t.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(awId);
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(t, first);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", awId);
  }

  function fireMeta(pixelId, legacyFlag) {
    try {
      if (pixelId && META_PIXEL_RE.test(pixelId)) {
        ensureFbqBase();
        window.fbq("init", pixelId);
        window.fbq("track", "Lead");
      } else if (legacyFlag && typeof window.fbq === "function") {
        // Legacy data-meta-lead ohne ID: feuert über den bereits auf der Seite vorhandenen Pixel.
        window.fbq("track", "Lead");
      }
    } catch (e) {}
  }

  function fireGoogle(sendTo) {
    try {
      if (!sendTo || !GOOGLE_SENDTO_RE.test(sendTo)) return;
      var awId = sendTo.split("/")[0]; // "AW-XXXXXXXXX"
      ensureGtagBase(awId);
      window.gtag("event", "conversion", { send_to: sendTo });
    } catch (e) {}
  }

  function fireConversion(sourceEl, slug, data) {
    // 1. GTM / dataLayer — der idiomatische Weg für Performance-Agenturen.
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "leadplug_lead", funnel: slug });
    } catch (e) {}

    // Konfig-Quelle: in LeadPlug hinterlegte IDs (aus der Submit-Message) haben Vorrang;
    // sonst Fallback auf die data-Attribute am Container (Aufgabe-42-Abwärtskompatibilität).
    var metaId = data && data.meta ? data.meta : null;
    var legacyMeta = !metaId && sourceEl && sourceEl.hasAttribute("data-meta-lead");
    var googleSendTo = (data && data.google) ? data.google
      : (sourceEl ? sourceEl.getAttribute("data-google-conversion") : null);

    // 2. Meta-Pixel  3. Google Ads
    fireMeta(metaId, legacyMeta);
    fireGoogle(googleSendTo);

    // 4. Custom-Callback für Entwickler.
    try {
      if (window.LeadPlug && typeof window.LeadPlug.onLead === "function") {
        window.LeadPlug.onLead({ funnel: slug });
      }
    } catch (e) {}
  }

  function init() {
    // Slug-tragende Container: neues data-leadplug + Legacy data-funnel-slug.
    var nodes = document.querySelectorAll("[data-leadplug],[data-funnel-slug]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute("data-leadplug-ready") === "1") continue;
      var slug = el.getAttribute("data-leadplug") || el.getAttribute("data-funnel-slug");
      if (!slug) continue;
      el.setAttribute("data-leadplug-ready", "1");
      createIframe(slug, el, "append");
    }

    // Legacy: Slug direkt am <script data-slug="..."> → iFrame an Script-Position.
    if (currentScript && currentScript.getAttribute("data-slug") &&
        currentScript.getAttribute("data-leadplug-ready") !== "1") {
      currentScript.setAttribute("data-leadplug-ready", "1");
      createIframe(currentScript.getAttribute("data-slug"), currentScript, "after-script");
    }
  }

  // --- Eine globale Message-Bridge für alle iFrames dieser Seite --------------
  window.addEventListener("message", function (event) {
    if (event.origin !== ORIGIN) return;          // nur Messages von unserem Funnel-Origin
    if (!event.data || typeof event.data !== "object") return;

    // passenden Mount über die Quelle (contentWindow) finden — schützt gegen Fremd-iFrames
    var m = null;
    for (var i = 0; i < mounts.length; i++) {
      if (mounts[i].iframe.contentWindow === event.source) { m = mounts[i]; break; }
    }
    if (!m) return;

    if (event.data.type === "funnel-resize") {
      var h = parseInt(event.data.height, 10);
      if (!h || h < 100 || h > 10000) return;     // Clamp gegen scrollHeight-Ausreißer
      m.iframe.style.height = h + "px";
      return;
    }

    if (event.data.type === "funnel-submit") {
      fireConversion(m.el, m.slug, event.data);
      return;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
