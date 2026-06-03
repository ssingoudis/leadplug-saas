import { Check, Loader2, TriangleAlert } from "lucide-react";
import type { SaveStatusState } from "@/lib/useSaveStatus";

// =============================================================================
// Aufgabe 50 — Sichtbarer Autosave-Indikator (projektweit).
//
// Rendert den Status aus useSaveStatus. „idle" rendert nichts (kein Dauer-Badge),
// „saved" blendet sich nach kurzer Zeit selbst aus (Hook-Reset). „error" bleibt
// stehen, bis der nächste Save-Versuch läuft.
// =============================================================================

const VARIANTS: Record<
  Exclude<SaveStatusState, "idle">,
  { icon: React.ReactNode; text: string; cls: string }
> = {
  saving: {
    icon: <Loader2 size={13} className="animate-spin" />,
    text: "Speichern…",
    cls: "text-gray-400 dark:text-gray-500",
  },
  saved: {
    icon: <Check size={13} />,
    text: "Gespeichert",
    cls: "text-green-600 dark:text-green-400",
  },
  error: {
    icon: <TriangleAlert size={13} />,
    text: "Nicht gespeichert",
    cls: "text-red-600 dark:text-red-400",
  },
};

export function SaveStatus({
  status,
  className = "",
}: {
  status: SaveStatusState;
  className?: string;
}) {
  if (status === "idle") return null;
  const v = VARIANTS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium transition-opacity ${v.cls} ${className}`}
    >
      {v.icon}
      {v.text}
    </span>
  );
}
