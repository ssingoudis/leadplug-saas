"use client";

import type { EditorState, FunnelFont } from "@/types";
import { PanelShell, PanelHeader, Section, Field, FieldHint } from "./ui/Panel";

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
      <PanelHeader badge="D" scope="Funnel-weit" title="Design" />

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
        <ColorField
          label="Seiten-Hintergrund"
          value={state.pageBackgroundColor}
          onChange={(v) => onPatch({ pageBackgroundColor: v })}
          hint='Hinter der Card. „transparent" = Parent-Website scheint durch.'
          allowTransparent
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

      <Section>
        <p className="px-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          Änderungen werden live in der Mitte angezeigt. Speichern via Speichern-Button oben.
        </p>
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
  allowTransparent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  allowTransparent?: boolean;
}) {
  const isTransparent = allowTransparent && value === "transparent";
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isTransparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isTransparent}
          className="h-9 w-9 cursor-pointer rounded-lg border border-gray-300 bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#22c55e"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        {allowTransparent && (
          <button
            type="button"
            onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
            className={
              isTransparent
                ? "rounded-lg border border-primary bg-primary/10 px-2 py-2 text-xs font-medium text-primary"
                : "rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-400"
            }
            title={isTransparent ? "Wieder Farbe verwenden" : "Auf transparent setzen"}
          >
            {isTransparent ? "transparent" : "Klar"}
          </button>
        )}
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
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
