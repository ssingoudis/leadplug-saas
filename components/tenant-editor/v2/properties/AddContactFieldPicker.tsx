"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ContactFieldConfig } from "@/types";
import { contactFieldTypeLabel } from "../fieldMeta";

type ContactFieldType = ContactFieldConfig["type"];

const TEXT_PILL = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
const CHOICE_PILL = "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800";
const NUMERIC_PILL = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800";
const RATING_PILL = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";

const CONTACT_TYPES: { type: ContactFieldType; icon: string; pillClass: string; description: string }[] = [
  // Aufgabe 40 Polish — Name-Felder ganz oben, weil häufigster Anwendungsfall
  { type: "full_name",    icon: "👤", pillClass: TEXT_PILL,    description: "Voller Name (mappt auf contact.name)" },
  { type: "first_name",   icon: "👤", pillClass: TEXT_PILL,    description: "Vorname (mappt auf contact.firstName)" },
  { type: "last_name",    icon: "👤", pillClass: TEXT_PILL,    description: "Nachname (mappt auf contact.lastName)" },
  { type: "email",        icon: "@",  pillClass: TEXT_PILL,    description: "E-Mail-Adresse mit Validierung" },
  { type: "tel",          icon: "☎",  pillClass: TEXT_PILL,    description: "Telefonnummer" },
  { type: "plz",          icon: "⌗",  pillClass: TEXT_PILL,    description: "Postleitzahl (5 Ziffern)" },
  { type: "text",         icon: "T",  pillClass: TEXT_PILL,    description: "Allgemeines Textfeld (Firma, Berufsbezeichnung, …)" },
  { type: "long_text",    icon: "¶",  pillClass: TEXT_PILL,    description: "Mehrzeiliger Text" },
  { type: "number",       icon: "#",  pillClass: NUMERIC_PILL, description: "Zahleneingabe" },
  { type: "slider",       icon: "≡",  pillClass: NUMERIC_PILL, description: "Slider mit Min/Max-Bereich" },
  { type: "date",         icon: "▦",  pillClass: NUMERIC_PILL, description: "Datumsauswahl (Inline-Kalender)" },
  { type: "checkbox",     icon: "☑",  pillClass: NUMERIC_PILL, description: "Einzelne Checkbox (Ja/Nein)" },
  { type: "radio",        icon: "◉",  pillClass: CHOICE_PILL,  description: "Einfachauswahl mit Optionsliste" },
  { type: "multi_choice", icon: "☑",  pillClass: CHOICE_PILL,  description: "Mehrfachauswahl mit Optionsliste" },
  { type: "dropdown",     icon: "▽",  pillClass: CHOICE_PILL,  description: "Dropdown mit Optionsliste" },
  { type: "rating",       icon: "★",  pillClass: RATING_PILL,  description: "1-N Sterne mit Hover-Preview" },
  { type: "scale",        icon: "⊢",  pillClass: RATING_PILL,  description: "0-N Skala (NPS-Style)" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ContactFieldType) => void;
}

export function AddContactFieldPicker({ open, onClose, onSelect }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Kontaktformular
            </span>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Welches Feld möchtest du hinzufügen?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-1.5 p-4">
          {CONTACT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => {
                onSelect(t.type);
                onClose();
              }}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
            >
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${t.pillClass}`}>
                {t.icon}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {contactFieldTypeLabel(t.type)}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{t.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
