"use client";

import { useState } from "react";
import { Trash2, Plus, Eye, EyeOff, Pencil, AlertTriangle, Lock } from "lucide-react";
import type { EditorQuestion, EditorOption, ContactFieldConfig, OptionMarker } from "@/types";
import { OptionsEditor } from "./OptionsEditor";
import { validateFieldKey, toKey } from "@/lib/editorUtils";

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
        <>
          <Field label="Antwortoptionen">
            <OptionsEditor
              value={question.options}
              onChange={(next: EditorOption[]) => onPatch({ options: next })}
            />
          </Field>
          <Field label="Nummerierung der Optionen">
            <MarkerStyleControl
              value={question.optionMarker ?? "letters"}
              onChange={(m) => onPatch({ optionMarker: m })}
            />
          </Field>
        </>
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
            placeholder="z. B. Ich stimme der [Datenschutzerklärung](https://…) zu"
          />
          <span className="mt-1 block text-[10px] leading-snug text-gray-400 dark:text-gray-500">
            Link einfügen mit <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">[Text](https://…)</code> — z. B. für die Datenschutzerklärung.
          </span>
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

      {/* Aufgabe 40 Polish: Feldname im Export — collapsed unter "Erweitert" am Ende.
          Bei Statement-Pages weglassen (keine Antwort wird gespeichert → kein key im Payload). */}
      {!isStatement && (
        <AdvancedFieldSection>
          <FieldKeyEditor
            value={question.questionKey}
            onChange={(newKey) => onPatch({ questionKey: newKey })}
          />
        </AdvancedFieldSection>
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
  // Aufgabe 39 Polish + Runde 2: alle ContactFieldConfig-Types
  const hasOptions = f.type === "radio" || f.type === "dropdown" || f.type === "multi_choice";
  const isTextish = f.type === "text" || f.type === "email" || f.type === "tel" || f.type === "plz" || f.type === "long_text" || f.type === "number";
  const isCheckbox = f.type === "checkbox";
  const isSlider = f.type === "slider";
  const isRating = f.type === "rating";
  const isScale = f.type === "scale";

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

      {hasOptions && (
        <Field label="Antwortoptionen">
          <SimpleStringList
            value={f.options ?? []}
            onChange={(next) => onPatch({ options: next })}
          />
        </Field>
      )}

      {isCheckbox && (
        <Field label="Beschriftung neben Checkbox">
          <TextInput
            value={f.checkboxLabel ?? ""}
            onChange={(v) => onPatch({ checkboxLabel: v })}
            placeholder="z. B. Ich stimme der [Datenschutzerklärung](https://…) zu"
          />
          <span className="mt-1 block text-[10px] leading-snug text-gray-400 dark:text-gray-500">
            Link einfügen mit <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">[Text](https://…)</code> — z. B. für die Datenschutzerklärung.
          </span>
        </Field>
      )}

      {isSlider && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Min">
              <TextInput
                value={f.sliderMin != null ? String(f.sliderMin) : ""}
                onChange={(v) => onPatch({ sliderMin: v === "" ? undefined : Number(v) })}
                placeholder="0"
              />
            </Field>
            <Field label="Max">
              <TextInput
                value={f.sliderMax != null ? String(f.sliderMax) : ""}
                onChange={(v) => onPatch({ sliderMax: v === "" ? undefined : Number(v) })}
                placeholder="100"
              />
            </Field>
            <Field label="Schritt">
              <TextInput
                value={f.sliderStep != null ? String(f.sliderStep) : ""}
                onChange={(v) => onPatch({ sliderStep: v === "" ? undefined : Number(v) })}
                placeholder="1"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Standardwert">
              <TextInput
                value={f.sliderDefault != null ? String(f.sliderDefault) : ""}
                onChange={(v) => onPatch({ sliderDefault: v === "" ? undefined : Number(v) })}
                placeholder="50"
              />
            </Field>
            <Field label="Einheit (optional)">
              <TextInput
                value={f.sliderUnit ?? ""}
                onChange={(v) => onPatch({ sliderUnit: v })}
                placeholder="z. B. kWh"
              />
            </Field>
          </div>
        </>
      )}

      {isRating && (
        <Field label="Anzahl Sterne (1-10)">
          <TextInput
            value={f.ratingMaxStars != null ? String(f.ratingMaxStars) : ""}
            onChange={(v) => onPatch({ ratingMaxStars: v === "" ? undefined : Number(v) })}
            placeholder="5"
          />
        </Field>
      )}

      {isScale && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Minimum">
              <TextInput
                value={f.scaleMin != null ? String(f.scaleMin) : ""}
                onChange={(v) => onPatch({ scaleMin: v === "" ? undefined : Number(v) })}
                placeholder="0"
              />
            </Field>
            <Field label="Maximum">
              <TextInput
                value={f.scaleMax != null ? String(f.scaleMax) : ""}
                onChange={(v) => onPatch({ scaleMax: v === "" ? undefined : Number(v) })}
                placeholder="10"
              />
            </Field>
          </div>
          <Field label="Label links (optional)">
            <TextInput
              value={f.scaleLabelLeft ?? ""}
              onChange={(v) => onPatch({ scaleLabelLeft: v })}
              placeholder="z. B. Sehr unwahrscheinlich"
            />
          </Field>
          <Field label="Label rechts (optional)">
            <TextInput
              value={f.scaleLabelRight ?? ""}
              onChange={(v) => onPatch({ scaleLabelRight: v })}
              placeholder="z. B. Sehr wahrscheinlich"
            />
          </Field>
        </>
      )}

      {/* Aufgabe 40 Polish: Feldname im Export — collapsed unter "Erweitert" am Ende. */}
      <AdvancedFieldSection>
        <FieldKeyEditor
          value={f.key}
          onChange={(newKey) => onPatch({ key: newKey })}
        />
      </AdvancedFieldSection>
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

/* Aufgabe 50: Segmented-Control für den Marker-Stil der Optionen (A/B/C · 1/2/3 · keiner). */
function MarkerStyleControl({
  value,
  onChange,
}: {
  value: OptionMarker;
  onChange: (m: OptionMarker) => void;
}) {
  const opts: { key: OptionMarker; label: string; title: string }[] = [
    { key: "letters", label: "A B C", title: "Buchstaben" },
    { key: "numbers", label: "1 2 3", title: "Zahlen" },
    { key: "none", label: "ohne", title: "Kein Marker" },
  ];
  return (
    <div className="flex gap-1.5">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          title={o.title}
          className={
            value === o.key
              ? "flex-1 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-semibold text-primary"
              : "flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary dark:border-gray-700 dark:text-gray-400"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
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
              ? "inline-block h-4 w-4 translate-x-4.5 transform rounded-full bg-white shadow transition"
              : "inline-block h-4 w-4 translate-x-0.5 transform rounded-full bg-white shadow transition"
          }
        />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Aufgabe 40 Polish — FieldKeyEditor
   "Feldname im Export" (= field_key in DB, = JSON-Key im Webhook-Payload).
   Wird vom Aufrufer in einen <details>-Block am Ende der Properties gewrappt.
   Read-only: nur Mono-Display + ✏️-Button, keine Warning.
   Edit-Mode: Input mit Live-Validation + kompakte Warning, Enter speichert, Esc cancelt.
   ───────────────────────────────────────────────────────────────────────── */

export function FieldKeyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (newKey: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }
  function cancelEdit() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }
  function commitEdit() {
    // Wenn user nichts geändert hat → einfach schließen, auch bei legacy-keys
    // mit Umlauten/Sonderzeichen, die das neue Pattern nicht erfüllen.
    if (draft === value) {
      setEditing(false);
      setError(null);
      return;
    }
    const err = validateFieldKey(draft);
    if (err) {
      setError(err);
      return;
    }
    onChange(draft);
    setEditing(false);
  }
  function onDraftChange(v: string) {
    // Aufgabe 40 Polish: Live-Transform — user kann frei tippen ("Beschreibung",
    // "Tätigkeit", "Mein Feld"), wir slug-ifizieren in Echtzeit auf "beschreibung",
    // "taetigkeit", "mein_feld". Erspart die unfreundliche Lowercase-Mecker-Validation.
    // Ausnahme: leere Eingabe + nur Sonderzeichen → wir lassen den Roh-Input damit
    // der user den Cursor noch positionieren kann, Validation greift dann.
    const transformed = v ? toKey(v) : "";
    setDraft(transformed);
    setError(transformed === value ? null : validateFieldKey(transformed));
  }

  if (!editing) {
    // Gesperrter Zustand: bewusst KEIN Input-Look. Die ganze Zeile ist ein Button,
    // der erst nach Klick in den Bearbeiten-Modus schaltet → der Feldname kann nie
    // versehentlich geändert werden (Schloss-Icon signalisiert „gesperrt").
    return (
      <div>
        <button
          type="button"
          onClick={startEdit}
          aria-label="Feldname bearbeiten"
          title="Feldname bearbeiten"
          className="group flex w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-100/70 px-3 py-1.5 text-left transition-colors hover:border-primary/40 dark:border-gray-800 dark:bg-gray-900/50"
        >
          <Lock size={11} className="shrink-0 text-gray-400 dark:text-gray-500" />
          <code className="flex-1 truncate font-mono text-xs text-gray-600 dark:text-gray-300">
            {value || <span className="italic text-gray-400">(wird beim Speichern generiert)</span>}
          </code>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-gray-400 transition-colors group-hover:text-primary dark:text-gray-500">
            <Pencil size={10} />
            Ändern
          </span>
        </button>
        <p className="mt-1 text-[10px] leading-snug text-gray-400 dark:text-gray-500">
          So heißt das Feld in Zapier, Make oder deinem CRM. Klick auf „Ändern" zum Bearbeiten.
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitEdit();
          if (e.key === "Escape") cancelEdit();
        }}
        autoFocus
        placeholder="z.B. email"
        className={`w-full rounded-md border bg-white px-3 py-1.5 font-mono text-sm outline-none transition focus:ring-1 dark:bg-gray-800 dark:text-white ${
          error
            ? "border-red-400 text-red-700 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600 dark:text-red-400"
            : "border-gray-300 text-gray-900 focus:border-primary focus:ring-primary/20 dark:border-gray-700"
        }`}
      />
      {error && (
        <p className="mt-1 text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
      {!error && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
          <AlertTriangle size={10} />
          Ändern bricht ggf. bestehende CRM-Mappings. Großbuchstaben + Sonderzeichen werden automatisch angepasst.
        </p>
      )}
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={cancelEdit}
          className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={commitEdit}
          disabled={Boolean(error)}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}

/** Wrapper-Komponente: Collapsible „Erweitert"-Section am Ende beider Props-Blöcke.
 *  Default kollabiert; klick öffnet den FieldKeyEditor und mögliche weitere Zukunfts-Features. */
export function AdvancedFieldSection({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-2 rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/30">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        Erweitert
      </summary>
      <div className="space-y-3 border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <div>
          <p className="mb-1 text-[11px] font-medium text-gray-600 dark:text-gray-400">
            Feldname im Export
          </p>
          {children}
        </div>
      </div>
    </details>
  );
}
