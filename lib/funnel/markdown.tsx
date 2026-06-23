import type { OptionMarker } from "@/types";

// Marker-String einer Option (Buchstabe/Ziffer); null = kein Chip
// ('none' / 'checkbox' rendern ihre eigene Box).
export function optionMarkerFor(marker: OptionMarker | undefined, idx: number): string | null {
  if (marker === "none" || marker === "checkbox") return null;
  if (marker === "numbers") return String(idx + 1);
  return String.fromCharCode(65 + idx); // 'letters' (Default)
}

// Markdown-Link-Parser für Consent-Texte: [Text](url) → <a> in Brand-Farbe.
// stopPropagation, damit der Link nicht die umgebende Checkbox togglet.
export function renderLabelWithLinks(text: string, linkColor: string): React.ReactNode {
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(
      <a
        key={key++}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: linkColor, textDecoration: "underline" }}
      >
        {m[1]}
      </a>,
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}
