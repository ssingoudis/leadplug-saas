"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, Loader2, Power } from "lucide-react";

// =============================================================================
// Aufgabe 62 Runde 4 — Lösch-Dialog entschärft (Stavros-Screenshot-Review):
// Vorher war das Modal bei aktiven Funnels eine Sackgasse — der Server blockt
// DELETE für aktive Funnels (bewusster Schutz), der große rote Button konnte
// also nie funktionieren und die Fehlermeldung ging im Rot unter.
// Jetzt: bei aktiven Funnels erklärt ein AMBER-Block den Zwischenschritt und
// der Primär-Button „Deaktivieren und löschen" führt beide Schritte aus
// (erst PATCH active=false, dann DELETE — der Server-Guard bleibt Backstop).
// Konsequenzen-Liste mit hängendem Einzug, Fehler als richtiger Banner.
// =============================================================================

const CONSEQUENCES = [
  "Alle Fragen und Einstellungen werden gelöscht",
  "Alle eingegangenen Leads werden gelöscht",
  "Bestehende Einbettungen auf Websites zeigen einen Fehler",
];

export function DeleteFunnelModal({
  slug,
  funnelName,
  isActive = false,
  redirectTo,
  onClose,
}: {
  slug: string;
  funnelName: string;
  isActive?: boolean;
  /** Ziel nach erfolgreichem Löschen; ohne Angabe bleibt die Seite (refresh). */
  redirectTo?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Runde 5 (Stavros): Sicherheitsabfrage — der Funnel-Name muss eingetippt werden
  // (bestätigt Absicht UND Ziel; Groß-/Kleinschreibung bewusst egal).
  const [confirmText, setConfirmText] = useState("");
  const confirmed =
    confirmText.trim().toLowerCase() === funnelName.trim().toLowerCase();

  async function handleDelete() {
    if (!confirmed) return;
    setIsDeleting(true);
    setError(null);
    try {
      // Aktive Funnels zuerst deaktivieren — der DELETE-Endpoint verweigert
      // sie sonst (Server-Backstop gegen versehentliches Löschen im Einsatz).
      if (isActive) {
        const off = await fetch(`/api/tenant/funnels/${slug}/active`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false }),
        });
        if (!off.ok) {
          const data = await off.json().catch(() => ({}));
          setError(data.error ?? "Deaktivieren fehlgeschlagen — bitte erneut versuchen.");
          setIsDeleting(false);
          return;
        }
      }

      const res = await fetch(`/api/tenant/funnels/${slug}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Unbekannter Fehler");
        setIsDeleting(false);
        // Falls die Deaktivierung schon durch ist: Karte soll den echten Stand zeigen.
        if (isActive) router.refresh();
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
      onClose();
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 dark:bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <TriangleAlert size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
                Funnel unwiderruflich löschen?
              </h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {funnelName}
                </span>{" "}
                wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>

          {/* Aktiv-Zwischenschritt: bewusst AMBER (Zustand), nicht Rot (Konsequenz) —
              sonst geht die Information im Rot der Liste unter. */}
          {isActive && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/10 dark:text-amber-300">
              <Power size={14} className="mt-0.5 shrink-0" />
              <p>
                Der Funnel ist <span className="font-semibold">aktiv</span> und wird zum Löschen
                zuerst deaktiviert — der öffentliche Link funktioniert ab diesem Moment nicht mehr.
              </p>
            </div>
          )}

          <ul className="mb-5 space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700 dark:border-red-700/40 dark:bg-red-900/10 dark:text-red-400">
            {CONSEQUENCES.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  –
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>

          {/* Sicherheitsabfrage: Name eintippen schaltet den Lösch-Button frei. */}
          <div className="mb-5">
            <label
              htmlFor="delete-confirm-input"
              className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400"
            >
              Zur Bestätigung den Funnel-Namen eingeben:{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{funnelName}</span>
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmed && !isDeleting) handleDelete();
              }}
              placeholder={funnelName}
              autoFocus
              disabled={isDeleting}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-200 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-600 dark:focus:border-red-500/60 dark:focus:ring-red-900/40"
            />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || !confirmed}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Löscht…
                </>
              ) : isActive ? (
                "Deaktivieren und löschen"
              ) : (
                "Dauerhaft löschen"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
