import type { ReactNode } from "react";

// =============================================================================
// Aufgabe 45 — Geteilte Editor-Design-System-Primitive.
//
// Kanonisiert aus den (bis dahin in jedem Panel lokal duplizierten) Bausteinen
// von ThemePanel + PropertiesPanel. Ein Section-/Header-/Field-Look für ALLE Tabs.
// Tokens + Dark-Mode-Regeln: siehe context/design-system.md.
// =============================================================================

const DEFAULT_BADGE_CLASS =
  "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300";

// Spalten-Container für ein Properties-/Master-Detail-Panel. `side` bestimmt die Trennlinie.
export function PanelShell({
  children,
  side = "right",
  className = "",
}: {
  children: ReactNode;
  side?: "left" | "right" | "none";
  className?: string;
}) {
  const border = side === "right" ? "border-l" : side === "left" ? "border-r" : "";
  return (
    <aside
      className={`flex h-full w-full flex-col overflow-y-auto ${border} border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </aside>
  );
}

// Panel-Kopf: optionales Badge (Buchstabe/Icon) + Scope-Label (UPPERCASE) + Titel.
export function PanelHeader({
  badge,
  badgeClass,
  scope,
  title,
  right,
}: {
  badge?: ReactNode;
  badgeClass?: string;
  scope?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
      {badge != null && (
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold ${badgeClass ?? DEFAULT_BADGE_CLASS}`}
        >
          {badge}
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        {scope && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {scope}
          </span>
        )}
        <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
      </div>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

// Inhalts-Sektion mit optionalem UPPERCASE-Label.
export function Section({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-b border-gray-100 px-5 py-4 last:border-b-0 dark:border-gray-800/60 ${className}`}>
      {title && (
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h3>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

// Label + Control.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

// Kleiner Hinweistext unter einem Feld.
export function FieldHint({ children }: { children: ReactNode }) {
  return <span className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">{children}</span>;
}
