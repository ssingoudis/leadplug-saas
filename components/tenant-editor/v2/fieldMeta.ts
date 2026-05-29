import type { QuestionType, ContactFieldConfig } from "@/types";

/**
 * Anzeige-Metadaten pro Field-Type. Wird in StepPill (Pill-Farbe + Icon)
 * und PropertiesPanel (Field-Type-Label) gemeinsam genutzt.
 */
export interface FieldMeta {
  label: string;
  category: "text" | "choice" | "dropdown" | "numeric" | "submit" | "success" | "custom";
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
const CUSTOM_PILL =
  "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";

const RATING_PILL =
  "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
const STATEMENT_PILL =
  "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

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
  // Aufgabe 39
  rating: { label: "Sterne-Rating", category: "numeric", pillClass: RATING_PILL, icon: "★" },
  scale: { label: "Skala (0-N)", category: "numeric", pillClass: RATING_PILL, icon: "⊢" },
  statement: { label: "Info-Block", category: "text", pillClass: STATEMENT_PILL, icon: "ⓘ" },
  // Aufgabe 40 Polish — Name-Field-Types
  first_name: { label: "Vorname", category: "text", pillClass: TEXT_PILL, icon: "👤" },
  last_name: { label: "Nachname", category: "text", pillClass: TEXT_PILL, icon: "👤" },
  full_name: { label: "Name", category: "text", pillClass: TEXT_PILL, icon: "👤" },
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

// Aufgabe 38: Custom-Multi-Field-Page (Karte mit beliebig vielen Feldern, überall platzierbar).
export const CUSTOM_META: FieldMeta = {
  label: "Karte",
  category: "custom",
  pillClass: CUSTOM_PILL,
  icon: "▥",
};

// Aufgabe 39: Welcome-Screen (optionaler Intro-Step am Anfang).
const WELCOME_PILL =
  "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800";
export const WELCOME_META: FieldMeta = {
  label: "Welcome",
  category: "custom",
  pillClass: WELCOME_PILL,
  icon: "▷",
};

/** Kurzer Anzeige-Name für einen Kontaktfeld-Typ. */
export function contactFieldTypeLabel(type: ContactFieldConfig["type"]): string {
  switch (type) {
    case "radio":        return "Auswahl";
    case "text":         return "Text";
    case "email":        return "E-Mail";
    case "tel":          return "Telefon";
    case "plz":          return "PLZ";
    case "long_text":    return "Lang-Text";
    case "number":       return "Zahl";
    case "date":         return "Datum";
    case "checkbox":     return "Checkbox";
    case "dropdown":     return "Dropdown";
    case "slider":       return "Slider";
    case "multi_choice": return "Mehrfachauswahl";
    case "rating":       return "Sterne-Rating";
    case "scale":        return "Skala";
    // Aufgabe 40 Polish
    case "first_name":   return "Vorname";
    case "last_name":    return "Nachname";
    case "full_name":    return "Name";
  }
}
