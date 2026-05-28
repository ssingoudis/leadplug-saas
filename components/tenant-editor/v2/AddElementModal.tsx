"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { QuestionType } from "@/types";
import { questionMeta, QUESTION_TYPE_OPTIONS } from "./fieldMeta";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (type: QuestionType) => void;
}

/**
 * Kategorien-Gruppierung für das Grid — Reihenfolge orientiert sich am FormFlow-Vorbild
 * (Text → Auswahl → Numerisch). Werte stammen aus QUESTION_TYPE_OPTIONS,
 * Gruppierung per category-Field aus fieldMeta.
 */
const GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: "text", label: "Text-Eingabe", categories: ["text"] },
  { key: "choice", label: "Auswahl", categories: ["choice", "dropdown"] },
  { key: "numeric", label: "Numerisch & Datum", categories: ["numeric"] },
];

export function AddElementModal({ open, onClose, onSelect }: Props) {
  // ESC schließt das Modal.
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Neue Seite
            </span>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Welchen Fragetyp möchtest du hinzufügen?
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

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {GROUPS.map((group) => {
            const items = QUESTION_TYPE_OPTIONS.filter((opt) =>
              group.categories.includes(questionMeta(opt.value).category),
            );
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {group.label}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((opt) => {
                    const meta = questionMeta(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onSelect(opt.value);
                          onClose();
                        }}
                        className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${meta.pillClass}`}
                        >
                          {meta.icon}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
