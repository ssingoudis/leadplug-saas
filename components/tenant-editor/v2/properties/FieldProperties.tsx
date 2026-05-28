"use client";

import { Trash2, Plus, Eye, EyeOff } from "lucide-react";
import type { EditorQuestion, EditorOption, ContactFieldConfig } from "@/types";
import { OptionsEditor } from "./OptionsEditor";

type FieldPropertiesProps =
  | {
      kind: "question";
      question: EditorQuestion;
      onPatch: (patch: Partial<EditorQuestion>) => void;
    }
  | {
      kind: "contact";
      contactField: ContactFieldConfig;
      onPatch: (patch: Partial<ContactFieldConfig>) => void;
    };

export function FieldProperties(props: FieldPropertiesProps) {
  if (props.kind === "question") {
    return <QuestionFieldProps question={props.question} onPatch={props.onPatch} />;
  }
  return <ContactFieldProps contactField={props.contactField} onPatch={props.onPatch} />;
}

/* ─────────────────────────────────────────────────────────────────────────
   Question-Field-Properties (basieren auf EditorQuestion)
   ───────────────────────────────────────────────────────────────────────── */

function QuestionFieldProps({
  question,
  onPatch,
}: {
  question: EditorQuestion;
  onPatch: (patch: Partial<EditorQuestion>) => void;
}) {
  const type = question.questionType;
  const isText = type === "short_text" || type === "long_text";
  const isOptionBased = type === "single_choice" || type === "multi_choice" || type === "dropdown";
  const isSlider = type === "slider";
  const isNumber = type === "number";
  const isDate = type === "date";
  const isCheckbox = type === "checkbox";
  // Aufgabe 39: neue Element-Types
  const isRating = type === "rating";
  const isScale = type === "scale";
  const isStatement = type === "statement";

  return (
    <div className="flex flex-col gap-3">
      {/* Aufgabe 39: Statement hat keinen Input → kein required-Toggle */}
      {!isStatement && (
        <Toggle
          label="Pflichtfeld"
          enabled={question.required !== false}
          onToggle={(v) => onPatch({ required: v })}
        />
      )}

      {isText && (
        <>
          <Field label="Platzhalter">
            <TextInput
              value={question.placeholder}
              onChange={(v) => onPatch({ placeholder: v })}
              placeholder="z. B. Gib hier deinen Text ein…"
            />
          </Field>
          <Field label="Maximale Zeichenanzahl (optional)">
            <TextInput
              value={question.maxLength}
              onChange={(v) => onPatch({ maxLength: v })}
              placeholder="z. B. 200"
            />
          </Field>
        </>
      )}

      {isOptionBased && (
        <Field label="Antwortoptionen">
          <OptionsEditor
            value={question.options}
            onChange={(next: EditorOption[]) => onPatch({ options: next })}
          />
        </Field>
      )}

      {isSlider && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Minimum">
            <TextInput value={question.sliderMin} onChange={(v) => onPatch({ sliderMin: v })} placeholder="0" />
          </Field>
          <Field label="Maximum">
            <TextInput value={question.sliderMax} onChange={(v) => onPatch({ sliderMax: v })} placeholder="100" />
          </Field>
          <Field label="Schrittweite">
            <TextInput value={question.sliderStep} onChange={(v) => onPatch({ sliderStep: v })} placeholder="1" />
          </Field>
          <Field label="Standardwert">
            <TextInput value={question.sliderDefault} onChange={(v) => onPatch({ sliderDefault: v })} placeholder="0" />
          </Field>
          <div className="col-span-2">
            <Field label="Einheit (optional)">
              <TextInput value={question.sliderUnit} onChange={(v) => onPatch({ sliderUnit: v })} placeholder="€, kWh, …" />
            </Field>
          </div>
        </div>
      )}

      {isNumber && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Minimum">
            <TextInput value={question.numberMin} onChange={(v) => onPatch({ numberMin: v })} placeholder="0" />
          </Field>
          <Field label="Maximum">
            <TextInput value={question.numberMax} onChange={(v) => onPatch({ numberMax: v })} placeholder="(leer = unbegrenzt)" />
          </Field>
          <Field label="Schrittweite">
            <TextInput value={question.numberStep} onChange={(v) => onPatch({ numberStep: v })} placeholder="1" />
          </Field>
          <Field label="Standardwert">
            <TextInput value={question.numberDefault} onChange={(v) => onPatch({ numberDefault: v })} placeholder="(leer)" />
          </Field>
          <div className="col-span-2">
            <Field label="Einheit (optional)">
              <TextInput value={question.numberUnit} onChange={(v) => onPatch({ numberUnit: v })} placeholder="kWh, Stück, …" />
            </Field>
          </div>
        </div>
      )}

      {isDate && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Frühestes Datum (optional)">
            <TextInput value={question.dateMin} onChange={(v) => onPatch({ dateMin: v })} placeholder="YYYY-MM-DD" />
          </Field>
          <Field label="Spätestes Datum (optional)">
            <TextInput value={question.dateMax} onChange={(v) => onPatch({ dateMax: v })} placeholder="YYYY-MM-DD" />
          </Field>
          <div className="col-span-2">
            <Field label="Standardwert (optional)">
              <TextInput value={question.dateDefault} onChange={(v) => onPatch({ dateDefault: v })} placeholder="YYYY-MM-DD" />
            </Field>
          </div>
        </div>
      )}

      {isCheckbox && (
        <Field label="Beschriftung neben Checkbox">
          <TextInput
            value={question.checkboxLabel}
            onChange={(v) => onPatch({ checkboxLabel: v })}
            placeholder="z. B. Ja, ich stimme der Datenschutzerklärung zu"
          />
        </Field>
      )}

      {/* Aufgabe 39: Rating-Properties */}
      {isRating && (
        <Field label="Anzahl Sterne (1-10)">
          <TextInput
            value={question.ratingMaxStars ?? "5"}
            onChange={(v) => onPatch({ ratingMaxStars: v })}
            placeholder="5"
          />
        </Field>
      )}

      {/* Aufgabe 39: Scale-Properties */}
      {isScale && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Minimum">
              <TextInput
                value={question.scaleMin ?? "0"}
                onChange={(v) => onPatch({ scaleMin: v })}
                placeholder="0"
              />
            </Field>
            <Field label="Maximum">
              <TextInput
                value={question.scaleMax ?? "10"}
                onChange={(v) => onPatch({ scaleMax: v })}
                placeholder="10"
              />
            </Field>
          </div>
          <Field label="Label links (optional)">
            <TextInput
              value={question.scaleLabelLeft ?? ""}
              onChange={(v) => onPatch({ scaleLabelLeft: v })}
              placeholder="z. B. Sehr unwahrscheinlich"
            />
          </Field>
          <Field label="Label rechts (optional)">
            <TextInput
              value={question.scaleLabelRight ?? ""}
              onChange={(v) => onPatch({ scaleLabelRight: v })}
              placeholder="z. B. Sehr wahrscheinlich"
            />
          </Field>
        </>
      )}

      {/* Aufgabe 39: Statement hat keine Field-spezifischen Properties — Title/Subtitle reichen */}
      {isStatement && (
        <p className="px-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Info-Block ohne Eingabe. Wird mit Titel + Untertitel angezeigt und per OK-Klick weitergeführt — keine Antwort wird gespeichert.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Contact-Field-Properties (basieren auf ContactFieldConfig)
   ───────────────────────────────────────────────────────────────────────── */

function ContactFieldProps({
  contactField: f,
  onPatch,
}: {
  contactField: ContactFieldConfig;
  onPatch: (patch: Partial<ContactFieldConfig>) => void;
}) {
  const isRadio = f.type === "radio";
  const isTextish = f.type === "text" || f.type === "email" || f.type === "tel" || f.type === "plz";

  return (
    <div className="flex flex-col gap-3">
      <Field label="Beschriftung (Label)">
        <TextInput value={f.label} onChange={(v) => onPatch({ label: v })} placeholder="z. B. Telefonnummer" />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Toggle
          label="Pflichtfeld"
          enabled={f.required}
          onToggle={(v) => onPatch({ required: v })}
        />
        <Toggle
          label="Sichtbar"
          enabled={f.visible}
          onToggle={(v) => onPatch({ visible: v })}
        />
      </div>

      {isTextish && (
        <Field label="Platzhalter">
          <TextInput
            value={f.placeholder ?? ""}
            onChange={(v) => onPatch({ placeholder: v })}
            placeholder="z. B. Mustermann"
          />
        </Field>
      )}

      {isRadio && (
        <Field label="Antwortoptionen">
          <SimpleStringList
            value={f.options ?? []}
            onChange={(next) => onPatch({ options: next })}
          />
        </Field>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Simple String-List Editor (für ContactField.options: string[])
   ───────────────────────────────────────────────────────────────────────── */

function SimpleStringList({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function patch(idx: number, v: string) {
    onChange(value.map((s, i) => (i === idx ? v : s)));
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...value, ""]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {value.map((s, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              type="text"
              value={s}
              onChange={(e) => patch(idx, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={value.length <= 1}
              title={value.length > 1 ? "Option entfernen" : "Mindestens eine Option erforderlich"}
              className="shrink-0 p-1.5 text-gray-400 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-500 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary"
      >
        <Plus size={13} />
        Option hinzufügen
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared building blocks (lokal — bewusst nicht globalisiert, um Props-Panel-spezifisch zu bleiben)
   ───────────────────────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
    />
  );
}

function Toggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <span className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
        {label}
      </span>
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
              ? "inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white shadow transition"
              : "inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow transition"
          }
        />
      </button>
    </div>
  );
}
