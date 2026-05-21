"use client";

import { useRef } from "react";
import type { EditorState, FunnelFont } from "@/types";

interface Props {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  onFocus: (field: string) => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
      {children}
    </p>
  );
}

function ColorField({
  label,
  value,
  onChange,
  onFocus,
  fieldKey,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: (f: string) => void;
  fieldKey: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2.5">
        {/* Swatch-Button — öffnet den nativen Color Picker */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onFocus={() => onFocus(fieldKey)}
          title="Farbe auswählen"
          className="w-10 h-10 rounded-xl border-2 border-gray-200 dark:border-gray-600 shrink-0 cursor-pointer hover:border-primary transition-colors shadow-sm overflow-hidden relative"
          style={{ backgroundColor: value }}
        >
          <span className="sr-only">Farbe auswählen</span>
          {/* Verstecktes natives Input — wird per Button-Click getriggert */}
          <input
            ref={inputRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            tabIndex={-1}
          />
        </button>
        {/* Hex-Eingabe */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => onFocus(fieldKey)}
          maxLength={7}
          placeholder="#000000"
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition min-w-0"
        />
      </div>
    </div>
  );
}

const FONTS: { value: FunnelFont; label: string }[] = [
  { value: "system", label: "System (Standard)" },
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "roboto", label: "Roboto" },
];

const RADII = [
  { value: "0rem", label: "Eckig" },
  { value: "0.375rem", label: "Leicht abgerundet" },
  { value: "0.5rem", label: "Abgerundet (Standard)" },
  { value: "0.75rem", label: "Rund" },
  { value: "1rem", label: "Sehr rund" },
];

const MAX_WIDTHS = [
  { value: "560px", label: "Schmal (560px)" },
  { value: "640px", label: "Kompakt (640px)" },
  { value: "720px", label: "Standard (720px)" },
  { value: "800px", label: "Breit (800px)" },
  { value: "none", label: "Volle Breite" },
];

const selectClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition";

export function SectionDesign({ state, onChange, onFocus }: Props) {
  const isTransparent = state.pageBackgroundColor === "transparent";

  return (
    <div className="space-y-4">
      {/* Farben — einzeln übereinander für klares Layout */}
      <ColorField
        label="Primärfarbe"
        value={state.primaryColor}
        onChange={(v) => onChange({ primaryColor: v })}
        onFocus={onFocus}
        fieldKey="primary_color"
      />
      <ColorField
        label="Textfarbe"
        value={state.textColor}
        onChange={(v) => onChange({ textColor: v })}
        onFocus={onFocus}
        fieldKey="text_color"
      />
      <ColorField
        label="Widget-Hintergrund"
        value={state.backgroundColor}
        onChange={(v) => onChange({ backgroundColor: v })}
        onFocus={onFocus}
        fieldKey="background_color"
      />

      {/* Seiten-Hintergrund mit Transparent-Option */}
      <div>
        <Label>Seiten-Hintergrund</Label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isTransparent}
            onChange={(e) =>
              onChange({
                pageBackgroundColor: e.target.checked ? "transparent" : "#f3f4f6",
              })
            }
            className="rounded"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Transparent (Website scheint durch)
          </span>
        </label>
        {!isTransparent && (
          <div className="flex items-center gap-2.5">
            <PageBgSwatch
              value={state.pageBackgroundColor}
              onChange={(v) => onChange({ pageBackgroundColor: v })}
            />
            <input
              type="text"
              value={state.pageBackgroundColor}
              onChange={(e) => onChange({ pageBackgroundColor: e.target.value })}
              maxLength={7}
              placeholder="#f3f4f6"
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition min-w-0"
            />
          </div>
        )}
      </div>

      {/* Schriftart */}
      <div>
        <Label>Schriftart</Label>
        <select
          value={state.font}
          onChange={(e) => onChange({ font: e.target.value as FunnelFont })}
          className={selectClass}
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Radius + MaxWidth nebeneinander */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Ecken-Radius</Label>
          <select
            value={state.borderRadius}
            onChange={(e) => onChange({ borderRadius: e.target.value })}
            className={selectClass}
          >
            {RADII.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Max. Breite</Label>
          <select
            value={state.maxWidth}
            onChange={(e) => onChange({ maxWidth: e.target.value })}
            className={selectClass}
          >
            {MAX_WIDTHS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Separater Swatch für PageBg (kein fieldKey nötig)
function PageBgSwatch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      title="Farbe auswählen"
      className="w-10 h-10 rounded-xl border-2 border-gray-200 dark:border-gray-600 shrink-0 cursor-pointer hover:border-primary transition-colors shadow-sm overflow-hidden relative"
      style={{ backgroundColor: value }}
    >
      <span className="sr-only">Farbe auswählen</span>
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        tabIndex={-1}
      />
    </button>
  );
}
