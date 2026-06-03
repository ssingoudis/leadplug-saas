"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

// =============================================================================
// Aufgabe 50 — Geteilte Modal-Chrome für alle Editor-Dialoge.
//
// Eine Quelle für Overlay (+ blur), Card, Header (Scope + Titel + X), Scroll-Body
// und optionalen Footer. ESC + Klick-aufs-Overlay schließen. Verhindert die
// bisherige Chrome-Drift zwischen AddElementModal & WebhookAddModal.
// =============================================================================

export function EditorModal({
  open,
  onClose,
  title,
  scope,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  scope?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
          <div className="flex min-w-0 flex-col">
            {scope && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {scope}
              </span>
            )}
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
