import type { ReactNode } from "react";

// Aufgabe 74: geteilte Seiten-Kopfzeile für ALLE Dashboard-Seiten. Vorher hardcodete jede
// Seite ihren Header — Überschrift-Größe + Button-Höhe driftete auseinander. Eine Quelle:
// Überschrift (text-xl), optionaler Untertitel, optionales führendes Icon, optionale Aktion rechts.
export default function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle != null && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
