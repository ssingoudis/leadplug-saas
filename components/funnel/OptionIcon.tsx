"use client";

import { useEffect, useState } from "react";
import { funnelIconUrl } from "@/lib/funnel/icons";

// =============================================================================
// Aufgabe 77 — Bibliotheks-Icon einer Bild-Option, inline gerendert.
//
// Inline statt <img>, weil nur inline-SVG über currentColor einfärbbar ist
// (Tint via style={{ color }} auf dem Wrapper, Muster wie RatingStars).
// Sicherheit: injiziert wird NUR, was das Manifest kennt (funnelIconUrl-Whitelist)
// und wie ein SVG aussieht — nie frei zusammengebaute Pfade aus DB-Werten.
// =============================================================================

// Modul-Cache: jedes Icon wird pro Seite nur 1× gefetcht (Browser/CDN cachen zusätzlich).
// Fehlschläge werden nicht gecacht, damit ein transienter Netzwerkfehler nicht klebt.
const svgCache = new Map<string, Promise<string | null>>();

function loadIconSvg(iconKey: string): Promise<string | null> {
  const cached = svgCache.get(iconKey);
  if (cached) return cached;

  const url = funnelIconUrl(iconKey);
  if (!url) return Promise.resolve(null); // unbekannter Key → leere Box (wie Bild ohne URL)

  const promise = fetch(url)
    .then((res) => (res.ok ? res.text() : null))
    .then((text) => (text && text.trimStart().startsWith("<svg") ? text : null))
    .catch((err) => {
      console.warn("OptionIcon: Icon-Fetch fehlgeschlagen", iconKey, err);
      return null;
    });

  svgCache.set(iconKey, promise);
  promise.then((svg) => {
    if (svg === null) svgCache.delete(iconKey);
  });
  return promise;
}

interface Props {
  iconKey: string;
  /** Tint-Farbe (Hex) — cascadet als currentColor in die SVG-Strokes/Fills. */
  tintColor?: string;
  /** Wrapper-Klassen; `.funnel-option-icon` (globals.css) lässt das SVG die Box füllen. */
  className?: string;
}

export function OptionIcon({ iconKey, tintColor, className }: Props) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSvg(null);
    loadIconSvg(iconKey).then((markup) => {
      if (alive) setSvg(markup);
    });
    return () => {
      alive = false;
    };
  }, [iconKey]);

  if (!svg) return null;

  return (
    <span
      aria-hidden="true"
      className={`funnel-option-icon ${className ?? ""}`}
      style={tintColor ? { color: tintColor } : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
