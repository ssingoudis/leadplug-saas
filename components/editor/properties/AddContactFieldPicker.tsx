"use client";

import type { ContactFieldConfig } from "@/types";
import { contactFieldMeta } from "../fieldMeta";
import { EditorModal } from "../ui/EditorModal";

type ContactFieldType = ContactFieldConfig["type"];

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
      scope="Feld"
      title="Feld hinzufügen"
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
                const meta = contactFieldMeta(type);
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
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${meta.pillClass}`}>
                      <meta.Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                      {meta.label}
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
