import type { QuestionType, ContactFieldConfig } from "@/types";

/**
 * Anzeige-Metadaten pro Field-Type. Wird in StepPill (Pill-Farbe + Icon)
 * und PropertiesPanel (Field-Type-Label) gemeinsam genutzt.
 */
export interface FieldMeta {
  label: string;
  category: "text" | "choice" | "dropdown" | "numeric" | "submit" | "success";
  /** Tailwind-Klassen für die Step-Pill (light + dark Mode). */
  pillClass: string;
  /** Kurz-Icon-String für die Pill (1-2 Zeichen). */
  icon: string;
}

const TEXT_PILL =
  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
const CHOICE_PILL =
  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800";
const DROPDOWN_PILL =
  "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
const NUMERIC_PILL =
  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
const SUBMIT_PILL =
  "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800";
const SUCCESS_PILL =
  "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";

const QUESTION_META: Record<QuestionType, FieldMeta> = {
  short_text: { label: "Text", category: "text", pillClass: TEXT_PILL, icon: "T" },
  long_text: { label: "Lang-Text", category: "text", pillClass: TEXT_PILL, icon: "¶" },
  single_choice: { label: "Einfachauswahl", category: "choice", pillClass: CHOICE_PILL, icon: "◉" },
  multi_choice: { label: "Mehrfachauswahl", category: "choice", pillClass: CHOICE_PILL, icon: "☑" },
  dropdown: { label: "Dropdown", category: "dropdown", pillClass: DROPDOWN_PILL, icon: "▽" },
  number: { label: "Zahl", category: "numeric", pillClass: NUMERIC_PILL, icon: "#" },
  slider: { label: "Slider", category: "numeric", pillClass: NUMERIC_PILL, icon: "≡" },
  date: { label: "Datum", category: "numeric", pillClass: NUMERIC_PILL, icon: "▦" },
  checkbox: { label: "Checkbox", category: "numeric", pillClass: NUMERIC_PILL, icon: "☑" },
};

export function questionMeta(type: QuestionType): FieldMeta {
  return QUESTION_META[type];
}

/**
 * Liste aller Frage-Typen für den Fragetyp-Selector im Properties-Panel.
 * Reihenfolge ist beabsichtigt: Text → Auswahl → Numerisch.
 */
export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = (
  Object.keys(QUESTION_META) as QuestionType[]
).map((t) => ({ value: t, label: QUESTION_META[t].label }));

export const SUBMIT_META: FieldMeta = {
  label: "Kontaktformular",
  category: "submit",
  pillClass: SUBMIT_PILL,
  icon: "▦",
};

export const SUCCESS_META: FieldMeta = {
  label: "Erfolgsseite",
  category: "success",
  pillClass: SUCCESS_PILL,
  icon: "✓",
};

/** Kurzer Anzeige-Name für einen Kontaktfeld-Typ. */
export function contactFieldTypeLabel(type: ContactFieldConfig["type"]): string {
  switch (type) {
    case "radio":
      return "Auswahl";
    case "text":
      return "Text";
    case "email":
      return "E-Mail";
    case "tel":
      return "Telefon";
    case "plz":
      return "PLZ";
  }
}
