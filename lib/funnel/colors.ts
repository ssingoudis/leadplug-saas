// Farb-Mathematik: hex↔rgb, Abdunkeln, Mischen. Leitet Hover-/Muted-/Border-/
// Input-BG-Farben aus der Markenfarbe ab (siehe resolveFunnelTheme).

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Hex auf 6-stellig normalisieren (#abc→#aabbcc); ungültig → Fallback. Sonst
// zerschießt ein kaputter DB-Wert alle abgeleiteten Farben zu NaN.
export function normalizeHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return fallback;
}

export function toHex(r: number, g: number, b: number): string {
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c)));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

// Dunkelt hex um amount (0–1) ab.
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// Mischt hex1 → hex2 um pct (0 = hex1, 1 = hex2).
export function mix(hex1: string, hex2: string, pct: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return toHex(
    r1 * (1 - pct) + r2 * pct,
    g1 * (1 - pct) + g2 * pct,
    b1 * (1 - pct) + b2 * pct,
  );
}
