"use client";

import type { ContactFieldConfig } from "@/types";
import { contactFieldTypeLabel } from "../fieldMeta";
import { EditorModal } from "../ui/EditorModal";

type ContactFieldType = ContactFieldConfig["type"];

const TEXT_PILL = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
const CHOICE_PILL = "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800";
const NUMERIC_PILL = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
const RATING_PILL = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";

const META: Record<ContactFieldType, { icon: string; pillClass: string }> = {
  full_name:    { icon: "👤", pillClass: TEXT_PILL },
  first_name:   { icon: "👤", pillClass: TEXT_PILL },
  last_name:    { icon: "👤", pillClass: TEXT_PILL },
  email:        { icon: "@",  pillClass: TEXT_PILL },
  tel:          { icon: "☎",  pillClass: TEXT_PILL },
  plz:          { icon: "⌗",  pillClass: TEXT_PILL },
  text:         { icon: "T",  pillClass: TEXT_PILL },
  long_text:    { icon: "¶",  pillClass: TEXT_PILL },
  number:       { icon: "#",  pillClass: NUMERIC_PILL },
  date:         { icon: "▦",  pillClass: NUMERIC_PILL },
  radio:        { icon: "◉",  pillClass: CHOICE_PILL },
  multi_choice: { icon: "☑",  pillClass: CHOICE_PILL },
  dropdown:     { icon: "▽",  pillClass: CHOICE_PILL },
  checkbox:     { icon: "☑",  pillClass: NUMERIC_PILL },
  slider:       { icon: "≡",  pillClass: NUMERIC_PILL },
  rating:       { icon: "★",  pillClass: RATING_PILL },
  scale:        { icon: "⊢",  pillClass: RATING_PILL },
};

// Aufgabe 50: Cards halten NUR kompakte Datenfelder. Große, immersive Elemente
// (Slider/Rating/Skala/Mehrfachauswahl) gibt es nur als eigenständige Schritte — sonst würden
// sie in der Card schrumpfen. Hier bewusst rausgelassen.
const GROUPS: { label: string; types: ContactFieldType[] }[] = [
  { label: "Name & Kontakt", types: ["full_name", "first_name", "last_name", "email", "tel", "plz"] },
  { label: "Text & Zahl", types: ["text", "long_text", "number", "date"] },
  { label: "Auswahl", types: ["radio", "dropdown", "checkbox"] },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ContactFieldType) => void;
}

export function AddContactFieldPicker({ open, onClose, onSelect }: Props) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      scope="Kontaktformular"
      title="Welches Feld möchtest du hinzufügen?"
      maxWidth="max-w-2xl"
    >
      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {group.label}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.types.map((type) => {
                const meta = META[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onSelect(type);
                      onClose();
                    }}
                    className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
                  >
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${meta.pillClass}`}>
                      {meta.icon}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                      {contactFieldTypeLabel(type)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </EditorModal>
  );
}
