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

// Aufgabe 50: einheitliche Breite der linken Listen-Spalte über ALLE Editor-Tabs
// (Bearbeiten · E-Mails · Webhooks) — verhindert das Springen der linken Kante beim Tab-Wechsel.
// Als CSS-Wert für gridTemplateColumns gedacht.
export const EDITOR_LEFT_COL = "clamp(280px, 20vw, 340px)";

// Aufgabe 50: einheitliche Höhe für ALLE Pane-Kopfzeilen (Liste/Vorschau/Detail) über alle Tabs.
// h-14 fasst auch einen rechten Button/Select und matcht die Haupt-Top-Bar. Gegen Header-Drift.
export const PANEL_HEADER_H = "flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 px-5 dark:border-gray-800";

// Geteilte Listen-/Pane-Kopfzeile: einzeiliger Titel (text-sm font-bold) + optionales rechtes Element.
export function PanelListHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className={`${PANEL_HEADER_H} justify-between`}>
      <h2 className="truncate text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
      {right ?? null}
    </div>
  );
}

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

// Aufgabe 50: kanonische Inhalts-Card (rounded-2xl) mit optionalem Header (Titel + Beschreibung
// + Right-Action). Ersetzt die lokal duplizierten rounded-xl-Sections (SharePanel/Webhooks/Emails).
// `padded=false` für full-bleed-Inhalte (Code-Blöcke, Listen mit eigenem Padding).
export function SectionCard({
  title,
  description,
  right,
  children,
  padded = true,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  const hasHeader = title != null || right != null;
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children != null && <div className={padded ? (hasHeader ? "px-5 pb-5" : "p-5") : ""}>{children}</div>}
    </section>
  );
}

// Aufgabe 50: kanonischer Leer-Zustand — Icon + Headline + Beschreibung + optionaler CTA.
// Für leere Ressourcen-Tabs (Webhooks/E-Mails) + „Funnel zuerst speichern"-Platzhalter.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}>
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
      )}
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-white">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
