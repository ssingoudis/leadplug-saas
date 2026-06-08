// Mini-Sparkline — reines SVG, kein Client-JS (RSC-tauglich).
// Zeichnet eine Trend-Linie + dezente Füllfläche aus einer Zahlenreihe.

export default function Sparkline({
  data,
  color = "var(--color-primary)",
  width = 104,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const n = data.length;
  const stepX = n > 1 ? width / (n - 1) : 0;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - pad - (v / max) * (height - 2 * pad);
    return [x, y] as const;
  });

  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width.toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="overflow-visible"
    >
      <path d={area} fill={color} opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
