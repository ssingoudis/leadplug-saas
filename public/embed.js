(function () {
  "use strict";

  // Base-URL aus dem src-Attribut des Script-Tags ableiten (z.B. "https://domain.de")
  var currentScript = document.currentScript;
  var scriptSrc = currentScript ? currentScript.src : "";
  var baseUrl = scriptSrc.replace(/\/embed\.js(\?.*)?$/, "").replace(/\/$/, "");

  // Alle bekannten iFrames: contentWindow → iframe-Element
  var iframeMap = new WeakMap();
  var iframeList = [];

  function createIframe(slug, placeholder) {
    var iframe = document.createElement("iframe");
    iframe.src = baseUrl + "/" + slug;
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("frameborder", "0");
    iframe.style.cssText =
      "border:none;width:100%;display:block;overflow:hidden;height:0;";

    if (placeholder) {
      placeholder.parentNode.replaceChild(iframe, placeholder);
    } else if (currentScript) {
      currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
    }

    iframeList.push(iframe);
    // WeakMap kann erst befüllt werden wenn das iframe geladen ist
    iframe.addEventListener("load", function () {
      try {
        iframeMap.set(iframe.contentWindow, iframe);
      } catch (e) {
        // cross-origin: ignorieren, Fallback läuft über iframeList
      }
    });

    return iframe;
  }

  function init() {
    // 1. Divs mit data-funnel-slug auf der Seite suchen und ersetzen
    var divs = document.querySelectorAll("[data-funnel-slug]");
    for (var i = 0; i < divs.length; i++) {
      var slug = divs[i].getAttribute("data-funnel-slug");
      if (slug) createIframe(slug, divs[i]);
    }

    // 2. Script-Tag selbst hat data-slug → iframe an Script-Position einfügen
    if (currentScript) {
      var scriptSlug = currentScript.getAttribute("data-slug");
      if (scriptSlug) createIframe(scriptSlug, null);
    }

    // 3. Einmaliger Message-Listener für alle iFrames dieser Seite
    window.addEventListener("message", function (event) {
      if (!event.data || event.data.type !== "funnel-resize") return;
      var height = parseInt(event.data.height, 10);
      if (!height || height <= 0) return;

      // Passendes iframe per contentWindow finden
      var target = null;
      try {
        target = iframeMap.get(event.source);
      } catch (e) {}

      // Fallback: erstes iframe der Liste (wenn nur eines vorhanden)
      if (!target && iframeList.length === 1) {
        target = iframeList[0];
      }

      if (target) {
        target.style.height = height + "px";
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
