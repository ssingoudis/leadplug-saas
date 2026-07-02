"use client";

import type { EditorState, FunnelFont } from "@/types";
import { PanelShell, Section, Field, FieldHint } from "./ui/Panel";
import { Select } from "./ui/Controls";

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
  { value: "system", label: "System (lädt schneller)" },
  { value: "dm-sans", label: "DM Sans" },
  { value: "inter", label: "Inter" },
  { value: "lato", label: "Lato" },
  { value: "merriweather", label: "Merriweather (Serife)" },
  { value: "montserrat", label: "Montserrat" },
  { value: "nunito", label: "Nunito" },
  { value: "open-sans", label: "Open Sans" },
  { value: "poppins", label: "Poppins" },
  { value: "roboto", label: "Roboto" },
];

export function ThemePanel({ state, onPatch }: Props) {
  const radiusIndex = Math.max(0, RADIUS_STEPS.indexOf(state.borderRadius));

  return (
    // side="none": das Design-Panel sitzt im Slide-in (Aufgabe 74), das die linke Kante
    // bereits stellt — kein doppelter Border.
    <PanelShell side="none">
      <Section title="Farben">
        <ColorField
          label="Hauptfarbe"
          value={state.primaryColor}
          onChange={(v) => onPatch({ primaryColor: v })}
          hint="Farbe für Buttons und Auswahl."
        />
        <ColorField
          label="Textfarbe"
          value={state.textColor}
          onChange={(v) => onPatch({ textColor: v })}
          hint="Im dunklen Modus heller wählen."
        />
        <ColorField
          label="Funnel-Hintergrund"
          value={state.backgroundColor}
          onChange={(v) => onPatch({ backgroundColor: v })}
          hint="Standard: Weiß."
        />
        <PageBackgroundField
          value={state.pageBackgroundColor}
          onChange={(v) => onPatch({ pageBackgroundColor: v })}
        />
        {/* Aufgabe 77: Farbmodus der Bibliotheks-Icons (Bild-Optionen) — funnel-weit,
            passend zur Theme-Philosophie (Branding über funnel-weite Variablen). */}
        <Field label="Icon-Farbe">
          <SegmentedControl
            value={state.iconColor}
            onChange={(v) => onPatch({ iconColor: v })}
            options={[
              { value: "neutral", label: "Neutral" },
              { value: "brand", label: "Hauptfarbe" },
            ]}
          />
          <FieldHint>Gilt für Icons aus der Bibliothek bei Bild-Optionen.</FieldHint>
        </Field>
      </Section>

      <Section title="Schrift">
        <Field label="Schriftart">
          <Select
            value={state.font}
            onChange={(e) => onPatch({ font: e.target.value as FunnelFont })}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
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
            onChange={(e) => onPatch({ maxWidth: e.target.value })}
          >
            {MAX_WIDTH_PRESETS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      {/* Aufgabe 56: kuratierte Anzeige-Schalter — bewusst wenige, kein Per-Element-Styling. */}
      <Section title="Anzeige">
        <ToggleField
          label="Fortschrittsbalken"
          enabled={state.showProgressBar}
          onToggle={(v) => onPatch({ showProgressBar: v })}
          hint="Dünner Balken oben am Funnel."
        />
        <ToggleField
          label="Schritt-Nummer"
          enabled={state.showStepBadge}
          onToggle={(v) => onPatch({ showStepBadge: v })}
          hint="Zeigt die Nummer der aktuellen Frage."
        />
        {/* Aufgabe 59: aus „Überschriften-Ausrichtung" wurde ein Layout-Modus der ganzen Karte
            (zentriert zusätzlich Rating/Skala + Button-Zeile; vollbreite Elemente bleiben). */}
        <Field label="Ausrichtung">
          <SegmentedControl
            value={state.titleAlignment}
            onChange={(v) => onPatch({ titleAlignment: v })}
            options={[
              { value: "left", label: "Links" },
              { value: "center", label: "Mittig" },
            ]}
          />
          <FieldHint>Gilt für Überschrift, Inhalt und Buttons aller Schritte.</FieldHint>
        </Field>
      </Section>
    </PanelShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Building blocks (Theme-spezifisch; PanelShell/Section/Field aus ui/Panel)
   ───────────────────────────────────────────────────────────────────────────── */

// Aufgabe 74: geteilter Segment-Umschalter (vorher 2× inline dupliziert). Aktiv =
// weiße Pille auf grauem Track (wie die obere Tab-Leiste) — kein bg-primary/10 mehr
// (das kippt im Dark Mode nach lila, siehe design-system.md).
function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex w-full rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === o.value
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Aufgabe 74: geteilte Farb-Zeile (Color-Chip + Hex-Input) — vorher in ColorField
// und PageBackgroundField dupliziert.
function ColorRow({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
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
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
    </div>
  );
}

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
      <ColorRow value={value} onChange={onChange} placeholder="#22c55e" />
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
      <SegmentedControl
        value={isTransparent ? "transparent" : "custom"}
        onChange={(v) => {
          if (v === "transparent") onChange("transparent");
          else if (isTransparent) onChange("#ffffff");
        }}
        options={[
          { value: "transparent", label: "Transparent" },
          { value: "custom", label: "Eigene Farbe" },
        ]}
      />
      {!isTransparent && (
        <div className="mt-2">
          <ColorRow value={value} onChange={onChange} placeholder="#ffffff" />
        </div>
      )}
      <FieldHint>
        {isTransparent
          ? "Die Seite hinter dem Funnel scheint durch."
          : "Eigene Farbe hinter dem Funnel."}
      </FieldHint>
    </Field>
  );
}

function ToggleField({
  label,
  enabled,
  onToggle,
  hint,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
        <span className="text-sm text-gray-700 dark:text-gray-300">{enabled ? "An" : "Aus"}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={
            enabled
              ? "relative inline-flex h-5 w-9 items-center rounded-full bg-primary transition-colors"
              : "relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300 transition-colors dark:bg-gray-600"
          }
        >
          <span
            className={
              enabled
                ? "inline-block h-4 w-4 translate-x-4.5 transform rounded-full bg-white shadow transition"
                : "inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow transition"
            }
          />
        </button>
      </div>
      {hint && <FieldHint>{hint}</FieldHint>}
    </Field>
  );
}
