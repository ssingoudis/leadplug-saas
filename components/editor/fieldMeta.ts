import type { LucideIcon } from "lucide-react";
import {
  CircleDot,
  ListChecks,
  ChevronDown,
  SlidersHorizontal,
  Star,
  Gauge,
  Info,
  Type,
  AlignLeft,
  Calculator,
  Calendar,
  SquareCheck,
  User,
  Mail,
  Phone,
  MapPin,
  Contact,
  LayoutGrid,
  Hand,
  CircleCheck,
} from "lucide-react";
import type { QuestionType, ContactFieldConfig } from "@/types";

/**
 * Anzeige-Metadaten pro Field-Type. EINZIGE Quelle für Icons + Chip-Farben im Editor
 * (StepPill, Add-Modals, PropertiesPanel, FieldRow, Logik-Map).
 *
 * Aufgabe 74: Glyphen/Emoji → lucide-Icons; Farbe NICHT mehr pro Typ (Regenbogen),
 * sondern pro KATEGORIE — Icon kommt aus `ICON` (typ-spezifisch), Tönung aus
 * `CATEGORY_TINT` (kategorie-spezifisch). Derselbe Typ kann je Kontext eine andere
 * Kategorie-Farbe tragen (z.B. `date` als Frage = blau, als Karten-Feld = smaragd).
 */

// Kategorien = die Strukturwelten des Builders. Bestimmen die Chip-Farbe.
export type FieldCategory = "frage" | "karte" | "feld" | "start" | "abschluss";

// EINE Stelle für alle Chip-Tönungen (light + dark). Zentral tunebar.
// Bewusst alle ≠ Indigo-Primary (sonst „aktiv"-Look) und ≠ Rot (sonst „löschen"-Look).
export const CATEGORY_TINT: Record<FieldCategory, string> = {
  frage:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  karte:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  feld:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  start:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  abschluss:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
};

export interface FieldMeta {
  label: string;
  category: FieldCategory;
  /** Tailwind-Tönung für den Chip (= CATEGORY_TINT[category]). */
  pillClass: string;
  /** lucide-Icon-Komponente (typ-spezifisch). */
  Icon: LucideIcon;
}

// Icon pro Typ — kontext-unabhängig. Deckt QuestionType ∪ ContactFieldConfig["type"] ab.
type AnyFieldType = QuestionType | ContactFieldConfig["type"];
const ICON: Record<AnyFieldType, LucideIcon> = {
  // Frage- bzw. gemeinsame Typen
  single_choice: CircleDot,
  multi_choice: ListChecks,
  dropdown: ChevronDown,
  short_text: Type,
  long_text: AlignLeft,
  slider: SlidersHorizontal,
  date: Calendar,
  number: Calculator,
  checkbox: SquareCheck,
  rating: Star,
  scale: Gauge,
  statement: Info,
  first_name: User,
  last_name: User,
  full_name: User,
  // Nur Kontakt-/Karten-Felder
  radio: CircleDot,
  text: Type,
  email: Mail,
  tel: Phone,
  plz: MapPin,
};

// Reihenfolge beabsichtigt (Text → Auswahl → Numerisch), steuert den Fragetyp-Selector.
const QUESTION_LABEL: Record<QuestionType, string> = {
  short_text: "Text",
  long_text: "Langer Text",
  single_choice: "Einfachauswahl",
  multi_choice: "Mehrfachauswahl",
  dropdown: "Dropdown",
  number: "Zahl",
  slider: "Slider",
  date: "Datum",
  checkbox: "Checkbox",
  rating: "Sterne-Bewertung",
  scale: "Skala",
  statement: "Infotext",
  // Aufgabe 40 Polish — Name-Field-Types (nicht als eigenständige Frage angeboten)
  first_name: "Vorname",
  last_name: "Nachname",
  full_name: "Name",
};

export function questionMeta(type: QuestionType): FieldMeta {
  return {
    label: QUESTION_LABEL[type],
    category: "frage",
    pillClass: CATEGORY_TINT.frage,
    Icon: ICON[type],
  };
}

/** Frage-Typen für den Fragetyp-Selector im Properties-Panel (Reihenfolge wie QUESTION_LABEL). */
export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = (
  Object.keys(QUESTION_LABEL) as QuestionType[]
).map((t) => ({ value: t, label: QUESTION_LABEL[t] }));

export const SUCCESS_META: FieldMeta = {
  label: "Erfolgsseite",
  category: "abschluss",
  pillClass: CATEGORY_TINT.abschluss,
  Icon: CircleCheck,
};

// Aufgabe 38: Custom-Multi-Field-Page (Karte mit beliebig vielen Feldern, überall platzierbar).
export const CUSTOM_META: FieldMeta = {
  label: "Karte",
  category: "karte",
  pillClass: CATEGORY_TINT.karte,
  Icon: LayoutGrid,
};

// Aufgabe 39: Welcome-Screen (optionaler Intro-Step am Anfang).
export const WELCOME_META: FieldMeta = {
  label: "Begrüßung",
  category: "start",
  pillClass: CATEGORY_TINT.start,
  Icon: Hand,
};

/** Kurzer Anzeige-Name für einen Kontaktfeld-Typ. */
export function contactFieldTypeLabel(type: ContactFieldConfig["type"]): string {
  switch (type) {
    case "radio":        return "Auswahl";
    case "text":         return "Text";
    case "email":        return "E-Mail";
    case "tel":          return "Telefon";
    case "plz":          return "PLZ";
    case "long_text":    return "Langer Text";
    case "number":       return "Zahl";
    case "date":         return "Datum";
    case "checkbox":     return "Checkbox";
    case "dropdown":     return "Dropdown";
    case "slider":       return "Slider";
    case "multi_choice": return "Mehrfachauswahl";
    case "rating":       return "Sterne-Bewertung";
    case "scale":        return "Skala";
    // Aufgabe 40 Polish
    case "first_name":   return "Vorname";
    case "last_name":    return "Nachname";
    case "full_name":    return "Name";
  }
}

/** Meta für ein Karten-/Kontaktfeld (Kategorie „feld" → smaragd). */
export function contactFieldMeta(type: ContactFieldConfig["type"]): FieldMeta {
  return {
    label: contactFieldTypeLabel(type),
    category: "feld",
    pillClass: CATEGORY_TINT.feld,
    Icon: ICON[type],
  };
}
