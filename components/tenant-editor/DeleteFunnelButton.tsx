"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert, Loader2 } from "lucide-react";

interface Props {
  slug: string;
  funnelName: string;
  redirectTo?: string;
  variant?: "icon" | "full" | "badge";
}

export function DeleteFunnelButton({
  slug,
  funnelName,
  redirectTo = "/dashboard/funnels",
  variant = "full",
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/funnels/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unbekannter Fehler");
        setIsDeleting(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          title="Funnel löschen"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 dark:border-gray-700 text-red-400 dark:text-red-400 cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      ) : variant === "badge" ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border shrink-0 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 cursor-pointer"
        >
          <Trash2 size={12} />
          Löschen
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={12} />
          Funnel löschen
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <TriangleAlert size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    Funnel unwiderruflich löschen?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {funnelName}
                    </span>{" "}
                    wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/40 px-4 py-3 text-xs text-red-800 dark:text-red-400 mb-5 space-y-1">
                <p>— Alle Fragen und Einstellungen werden gelöscht</p>
                <p>— Alle eingegangenen Leads werden gelöscht</p>
                <p>— Bestehende Einbettungen auf Websites zeigen einen Fehler</p>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-4 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null); }}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <><Loader2 size={14} className="animate-spin" /> Löscht…</>
                  ) : (
                    "Dauerhaft löschen"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
