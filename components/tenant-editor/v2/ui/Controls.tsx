import type { ReactNode } from "react";
import { Loader2, ChevronDown } from "lucide-react";

// =============================================================================
// Aufgabe 50 — Kanonische Editor-Controls (ein Vokabular für ALLE Editor-Tabs).
//
// Kanonisiert die bis dahin pro Panel duplizierten Buttons/Inputs/Toggles.
// Verfeinert den bestehenden hellen LeadPlug-Look (rounded-lg/xl, gray-Borders,
// primary-Akzent, primary/20-Focus-Ring) — kein Stilbruch.
// Ergänzt die Layout-Primitive in ./Panel.tsx (PanelShell/Section/Field).
// =============================================================================

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-hover",
  secondary:
    "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  ghost:
    "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
  danger:
    // Aufgabe 59 (Stavros-Entscheid): Inline-Löschen-Trigger hovern dezent getönt
    // (wie „Seite löschen" im PropertiesPanel) — das satte Voll-Rot bleibt exklusiv
    // dem finalen Bestätigungs-Button im ConfirmModal vorbehalten.
    "border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20",
};

export function EditorButton({
  variant = "secondary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANT[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${className}`}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${className}`}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-9 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white ${className}`}
      >
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  icon?: ReactNode;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  if (label === undefined) return control;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
      <span className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        {icon}
        {label}
      </span>
      {control}
    </div>
  );
}
