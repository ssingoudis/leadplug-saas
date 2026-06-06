"use client";

import type { EditorState, FunnelFont } from "@/types";
import { PanelShell, Section, Field, FieldHint } from "./ui/Panel";

interface Props {
  state: EditorState;
  onPatch: (patch: Partial<EditorState>) => void;
}

// Border-Radius-Presets als rem-Werte. Slider arbeitet auf der numerischen Stufe,
// das DB-Format ist String mit Einheit (z.B. "0.5rem").
const RADIUS_STEPS = ["0rem", "0.125rem", "0.25rem", "0.5rem", "0.75rem", "1rem", "1.5rem", "2rem"];
const RADIUS_LABELS = ["0", "2", "4", "8", "12", "16", "24", "32"];

const MAX_WIDTH_PRESETS = [
  { value: "480px", label: "Schmal (480)" },
  { value: "600px", label: "Mittel (600)" },
  { value: "720px", label: "Standard (720)" },
  { value: "900px", label: "Breit (900)" },
  { value: "100%", label: "Vollbreite" },
];

const FONT_OPTIONS: Array<{ value: FunnelFont; label: string }> = [
  { value: "system", label: "System (kein Download)" },
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "roboto", label: "Roboto" },
];

export function ThemePanel({ state, onPatch }: Props) {
  const radiusIndex = Math.max(0, RADIUS_STEPS.indexOf(state.borderRadius));

  return (
    <PanelShell>
      <Section title="Markenfarbe">
        <ColorField
          label="Brand-Farbe"
          value={state.primaryColor}
          onChange={(v) => onPatch({ primaryColor: v })}
          hint="Buttons, Highlights, Auswahl-Indikator."
        />
        <ColorField
          label="Text-Farbe"
          value={state.textColor}
          onChange={(v) => onPatch({ textColor: v })}
          hint="Standard #1f2937. Bei Dark-Theme heller wählen."
        />
        <ColorField
          label="Hintergrund Card"
          value={state.backgroundColor}
          onChange={(v) => onPatch({ backgroundColor: v })}
          hint="Hintergrund des Widget-Kastens. Default Weiß."
        />
        <PageBackgroundField
          value={state.pageBackgroundColor}
          onChange={(v) => onPatch({ pageBackgroundColor: v })}
        />
      </Section>

      <Section title="Schrift">
        <Field label="Schriftart">
          <Select
            value={state.font}
            onChange={(v) => onPatch({ font: v as FunnelFont })}
            options={FONT_OPTIONS}
          />
        </Field>
      </Section>

      <Section title="Layout">
        <Field label={`Ecken-Rundung · ${RADIUS_LABELS[radiusIndex]}px`}>
          <input
            type="range"
            min={0}
            max={RADIUS_STEPS.length - 1}
            step={1}
            value={radiusIndex}
            onChange={(e) => {
              const next = RADIUS_STEPS[Number(e.target.value)] ?? "0.5rem";
              onPatch({ borderRadius: next });
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary dark:bg-gray-700"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
            {RADIUS_LABELS.map((l, i) => (
              <span key={l} className={i === radiusIndex ? "font-semibold text-primary" : ""}>
                {l}
              </span>
            ))}
          </div>
        </Field>

        <Field label="Maximale Breite">
          <Select
            value={state.maxWidth}
            onChange={(v) => onPatch({ maxWidth: v })}
            options={MAX_WIDTH_PRESETS}
          />
        </Field>
      </Section>
    </PanelShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Building blocks (Theme-spezifisch; PanelShell/Header/Section/Field aus ui/Panel)
   ───────────────────────────────────────────────────────────────────────────── */

function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="lp-color-chip h-9 w-9 cursor-pointer rounded-lg border border-gray-300 bg-white dark:border-gray-700"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#22c55e"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
    </Field>
  );
}

/* Aufgabe 50: Seiten-Hintergrund — klarer Umschalter „Transparent | Eigene Farbe" statt
   des unschönen „transparent"-Text-im-Input + Toggle-Button. Bei „Eigene Farbe" erscheint der Picker. */
function PageBackgroundField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const isTransparent = value === "transparent";
  return (
    <Field label="Seiten-Hintergrund">
      <div className="inline-flex w-full rounded-lg border border-gray-300 p-0.5 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onChange("transparent")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            isTransparent
              ? "bg-primary/10 text-primary"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Transparent
        </button>
        <button
          type="button"
          onClick={() => { if (isTransparent) onChange("#ffffff"); }}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            !isTransparent
              ? "bg-primary/10 text-primary"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Eigene Farbe
        </button>
      </div>
      {!isTransparent && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="lp-color-chip h-9 w-9 cursor-pointer rounded-lg border border-gray-300 bg-white dark:border-gray-700"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#ffffff"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
      <FieldHint>
        {isTransparent
          ? "Die Einbett-Seite scheint durch — ideal beim Einbetten."
          : "Eigene Hintergrundfarbe hinter der Card."}
      </FieldHint>
    </Field>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full appearance-none rounded-lg border border-gray-300 bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%239ca3af%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[18px_18px] bg-position-[right_0.5rem_center] bg-no-repeat px-3 py-2 pr-9 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
