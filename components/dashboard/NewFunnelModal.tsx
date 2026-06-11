"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";
import { CreateFromTemplateDialog } from "./CreateFromTemplateDialog";
import type { TemplateItem } from "./templates";

// =============================================================================
// Aufgabe 62 Runde 2 — „Neuer Funnel" als Modal mit dark-blurred Backdrop (Stavros:
// Erstellen ist eine „externe Aktion", kein Seiteninhalt). Bewusst schlank:
// „Leer starten" prominent + kompakte Vorlagen-Schnellwahl + Link auf die
// Vorlagen-Seite (dort lebt die große Inszenierung).
// Runde 3: Vorlagen-Klick öffnet die Namens-Abfrage (CreateFromTemplateDialog,
// gleiche UX wie beim leeren Funnel) statt sofort zu erstellen.
// =============================================================================

export function NewFunnelButton({
  templates,
  className,
  children,
}: {
  templates: TemplateItem[];
  className: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <NewFunnelModal templates={templates} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewFunnelModal({
  templates,
  onClose,
}: {
  templates: TemplateItem[];
  onClose: () => void;
}) {
  const [naming, setNaming] = useState<TemplateItem | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Während die Namens-Abfrage offen ist, gehört Escape ihr (sonst würde
      // ein Esc beide Ebenen gleichzeitig schließen).
      if (e.key === "Escape" && !naming) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, naming]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Neuer Funnel"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Neuer Funnel</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Leer starten */}
          <Link
            href="/dashboard/funnels/new/blank"
            className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3.5 transition-colors hover:border-primary/50 hover:bg-primary/5 dark:border-gray-700"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors group-hover:bg-primary/10 group-hover:text-primary dark:bg-gray-800">
              <Plus size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900 transition-colors group-hover:text-primary dark:text-white">
                Leer starten
              </span>
              <span className="block text-xs text-gray-400 dark:text-gray-500">
                Funnel von Grund auf selbst aufbauen.
              </span>
            </span>
          </Link>

          {templates.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Oder mit Vorlage starten
              </p>
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                {templates.map((t, idx) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => setNaming(t)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      idx > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 rounded border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: t.color || "#e5e7eb" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                        {t.name}
                      </span>
                    </span>
                    {t.category && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {t.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <Link
            href="/dashboard/vorlagen"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
          >
            Alle Vorlagen ansehen
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Namens-Abfrage über dem Modal (z-60); Klick darin schließt das
          Eltern-Modal nicht (stopPropagation im Dialog-Panel). */}
      {naming && (
        <div onClick={(e) => e.stopPropagation()}>
          <CreateFromTemplateDialog template={naming} onClose={() => setNaming(null)} />
        </div>
      )}
    </div>
  );
}
