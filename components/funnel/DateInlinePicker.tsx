"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { de } from "date-fns/locale/de";

// Brand-getintet, kompakt — Inline-Kalender für Date-Fields im Widget.
// Wird via dynamic(() => import("./DateInlinePicker")) in funnel.tsx lazy-geladen,
// damit Funnels ohne date-Feld nichts vom react-day-picker-Bundle (~30KB) abkriegen.

interface Props {
  /** ISO YYYY-MM-DD oder Leerstring */
  value: string;
  onChange: (iso: string) => void;
  /** Inclusive min, ISO YYYY-MM-DD */
  min?: string;
  /** Inclusive max, ISO YYYY-MM-DD */
  max?: string;
  /** CSS custom property aus dem Widget-Theme */
  primaryColor: string;
  textColor: string;
  borderRadius: string;
}

function parseIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DateInlinePicker({
  value,
  onChange,
  min,
  max,
  primaryColor,
  textColor,
  borderRadius,
}: Props) {
  const selected = useMemo(() => parseIso(value), [value]);
  const fromDate = useMemo(() => parseIso(min ?? ""), [min]);
  const toDate = useMemo(() => parseIso(max ?? ""), [max]);

  // CSS-Variablen für react-day-picker overriden — dock an unser Theme an
  const cssVars = {
    "--rdp-accent-color": primaryColor,
    "--rdp-accent-background-color": `color-mix(in srgb, ${primaryColor} 12%, transparent)`,
    "--rdp-day_button-border-radius": borderRadius,
    "--rdp-selected-border": `2px solid ${primaryColor}`,
    "--rdp-range_middle-color": textColor,
    color: textColor,
  } as React.CSSProperties;

  return (
    <div className="mb-3 inline-block rounded-lg border p-2" style={{ borderColor: `color-mix(in srgb, ${primaryColor} 25%, transparent)`, borderRadius }}>
      <div style={cssVars}>
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => onChange(d ? toIso(d) : "")}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
          ]}
          locale={de}
          weekStartsOn={1}
          showOutsideDays
        />
      </div>
    </div>
  );
}
