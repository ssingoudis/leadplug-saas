"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { createFunnelFromTemplate, type TemplateItem } from "@/lib/templates";

// =============================================================================
// Aufgabe 62 Runde 3 — Namens-Abfrage vor „Vorlage verwenden" (Stavros: gleiche
// UX wie beim leeren Funnel). Spiegelt das NamePromptModal des Editors im
// Dashboard-Stil; nach „Funnel anlegen" wird atomar erstellt und in den Editor
// gesprungen. z-[60]: liegt über Preview-/Neuer-Funnel-Modals (z-50).
// =============================================================================

export function CreateFromTemplateDialog({
  template,
  onClose,
}: {
  template: TemplateItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(template.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (pending || !name.trim()) return;
    setPending(true);
    setError(null);
    try {
      const newSlug = await createFunnelFromTemplate(template.slug, name.trim());
      // pending bleibt bis zur Navigation gesetzt — kein Doppel-Klick-Fenster.
      router.push(`/dashboard/funnels/${newSlug}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorlage konnte nicht verwendet werden.");
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/40"
      onClick={() => !pending && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wie soll der neue Funnel heißen?"
      >
        <div className="p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Vorlage: {template.name}
          </p>
          <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
            Wie soll der neue Funnel heißen?
          </h3>
          <p className="mt-2 mb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Der Name dient nur zur Wiedererkennung — Endkunden sehen ihn nicht. Er lässt sich jederzeit ändern.
          </p>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
              if (e.key === "Escape" && !pending) onClose();
            }}
            placeholder="z. B. Solar-Anfrage Frühling 2026"
            autoFocus
            disabled={pending}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600"
          />

          {error && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={create}
              disabled={pending || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && <LoaderCircle size={14} className="animate-spin" />}
              {pending ? "Wird erstellt …" : "Funnel anlegen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
