"use client";

import { TriangleAlert } from "lucide-react";
import { EditorModal } from "./EditorModal";

// =============================================================================
// Aufgabe 50 — Gestyltes Bestätigungs-Dialog auf Basis der geteilten EditorModal-Chrome.
// Ersetzt die nativen window.confirm()-Dialoge im Editor (inkonsistent + billig).
// =============================================================================

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Löschen",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <EditorModal
      open={open}
      onClose={onClose}
      scope="Bestätigen"
      title={title}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              danger
                ? "rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                : "rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            }
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        {danger && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <TriangleAlert size={18} className="text-red-500" />
          </div>
        )}
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </EditorModal>
  );
}
