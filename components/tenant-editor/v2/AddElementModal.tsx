"use client";

import type { QuestionType } from "@/types";
import { questionMeta, QUESTION_TYPE_OPTIONS, CUSTOM_META } from "./fieldMeta";
import { EditorModal } from "./ui/EditorModal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Einzel-Feld: legt eine question-Page mit genau diesem Type an. */
  onSelectType: (type: QuestionType) => void;
  /** Aufgabe 38: Karte mit mehreren Feldern (Multi-Field Custom-Page) — Default-Karte mit Name+Email. */
  onSelectCustomPage: () => void;
  /** Aufgabe 39: Adresse-Quick-Card (Multi-Field Custom-Page vorausgefüllt mit Straße/Hausnr/PLZ/Ort). */
  onSelectAddressCard: () => void;
  /** Aufgabe 39: Welcome-Screen (Intro-Step am Anfang). */
  onSelectWelcome: () => void;
}

/**
 * Kategorien-Gruppierung für das Einzelfeld-Grid. Aufgabe 39 fügt eine "Bewertung"-Sektion hinzu.
 */
const GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: "text", label: "Text & Info", categories: ["text"] },
  { key: "choice", label: "Auswahl", categories: ["choice", "dropdown"] },
  { key: "numeric", label: "Numerisch & Datum", categories: ["numeric"] },
];

/**
 * Aufgabe 40 Polish: Question-Types die KEINE einzelne Page bekommen sollen.
 * Name-Field-Types sind sinnvoll im Kontext einer Multi-Field-Karte (AddContactFieldPicker),
 * aber eine eigene Question-Page nur mit „Vorname" ist UX-Quatsch.
 */
const EXCLUDED_AS_SINGLE_PAGE: ReadonlySet<QuestionType> = new Set([
  "first_name",
  "last_name",
  "full_name",
]);

export function AddElementModal({
  open,
  onClose,
  onSelectType,
  onSelectCustomPage,
  onSelectAddressCard,
  onSelectWelcome,
}: Props) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      scope="Neue Seite"
      title="Was möchtest du hinzufügen?"
      maxWidth="max-w-2xl"
    >
      {/* Aufgabe 39: Karten + Quick-Shortcuts (Adresse, Welcome) — prominent oben */}
      <div className="mb-6">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Karten & Quick-Adds
        </h3>
        <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
          {/* Custom-Karte */}
          <button
            type="button"
            onClick={() => { onSelectCustomPage(); onClose(); }}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
          >
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-base ${CUSTOM_META.pillClass}`}>
              {CUSTOM_META.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Eigene Karte</span>
              <span className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                Mehrere Felder auf einer Seite. Start mit Name + E-Mail.
              </span>
            </div>
          </button>

          {/* Adresse-Quick-Card */}
          <button
            type="button"
            onClick={() => { onSelectAddressCard(); onClose(); }}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
          >
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-base ${CUSTOM_META.pillClass}`}>
              ⌖
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Adresse</span>
              <span className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                Karte mit Straße + Hausnr + PLZ + Ort.
              </span>
            </div>
          </button>

          {/* Welcome-Screen */}
          <button
            type="button"
            onClick={() => { onSelectWelcome(); onClose(); }}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-indigo-100 text-indigo-700 border-indigo-200 text-base dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
              ▷
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Welcome-Screen</span>
              <span className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                Intro-Step am Anfang mit Titel + Button.
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Einzelne Felder */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Einzelne Felder
        </h3>

        {GROUPS.map((group) => {
          const items = QUESTION_TYPE_OPTIONS.filter((opt) =>
            group.categories.includes(questionMeta(opt.value).category) &&
            !EXCLUDED_AS_SINGLE_PAGE.has(opt.value),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-4 last:mb-0">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {group.label}
              </h4>
              <div className="grid grid-cols-2 gap-2 @md:grid-cols-3">
                {items.map((opt) => {
                  const meta = questionMeta(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onSelectType(opt.value); onClose(); }}
                      className="group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
                    >
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${meta.pillClass}`}>
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
    </EditorModal>
  );
}
