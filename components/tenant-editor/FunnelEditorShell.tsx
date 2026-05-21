"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { EditorSidebar } from "./EditorSidebar";
import { PreviewPanel } from "./PreviewPanel";
import type { PreviewMode } from "./PreviewPanel";
import type { EditorState } from "@/types";

interface Props {
  initialState: EditorState;
  mode: "create" | "edit";
  originalSlug?: string;
  companyName: string;
  publicEmail: string;
  publicPhone: string;
}

export function FunnelEditorShell({
  initialState,
  mode,
  originalSlug,
  companyName,
  publicEmail,
  publicPhone,
}: Props) {
  const router = useRouter();

  const [state, setState] = useState<EditorState>(initialState);
  const [activeField, setActiveField] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("question");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleChange = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const handleFocus = useCallback((field: string, questionVisibleIndex?: number) => {
    setActiveField(field);
    if (field === "question_title" || field === "question_subtitle" || field.startsWith("option_")) {
      setPreviewMode("question");
      if (questionVisibleIndex !== undefined && questionVisibleIndex >= 0) {
        setPreviewIndex(questionVisibleIndex);
      }
    } else if (
      field === "contact_form_title" ||
      field === "contact_form_subtitle" ||
      field === "submit_button" ||
      field === "privacy_text"
    ) {
      setPreviewMode("contact");
    } else if (
      field === "success_message" ||
      field === "response_message" ||
      field === "answers_overview_label"
    ) {
      setPreviewMode("success");
    }
  }, []);

  const handleModeChange = useCallback(
    (newMode: PreviewMode, index = 0) => {
      setPreviewMode(newMode);
      if (newMode === "question") setPreviewIndex(index);
    },
    [],
  );

  async function handleSave() {
    if (!state.funnelName) {
      setSaveError("Bitte gib einen Funnel-Namen ein.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const url =
        mode === "create"
          ? "/api/tenant/funnels"
          : `/api/tenant/funnels/${originalSlug}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });

      const json = await res.json();

      if (!res.ok) {
        setSaveError(json.error ?? "Unbekannter Fehler beim Speichern.");
        return;
      }

      setIsDirty(false);
      router.push("/dashboard/funnels");
      router.refresh();
    } catch {
      setSaveError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      router.push("/dashboard/funnels");
    }
  }

  function handleDiscardAndLeave() {
    setIsDirty(false);
    setShowExitModal(false);
    router.push("/dashboard/funnels");
  }

  const canSave = Boolean(state.funnelName);

  return (
    <>
      {showExitModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <TriangleAlert size={18} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    Ungespeicherte Änderungen
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndLeave}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Verwerfen
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExitModal(false); handleSave(); }}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    <div
      className="fixed inset-x-0 bottom-0 flex bg-gray-100 dark:bg-[#0d1117]"
      style={{ top: "64px" }}
    >
      {/* Linke Seite: Editor */}
      <aside className="w-96 shrink-0 overflow-hidden flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <EditorSidebar
          state={state}
          onChange={handleChange}
          originalSlug={originalSlug}
          isSaving={isSaving}
          saveError={saveError}
          canSave={canSave}
          onSave={handleSave}
          onFocus={handleFocus}
          hasUnsavedChanges={isDirty}
          onBack={handleBack}
        />
      </aside>

      {/* Rechte Seite: Preview */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <PreviewPanel
          state={state}
          activeField={activeField}
          previewMode={previewMode}
          previewIndex={previewIndex}
          onModeChange={handleModeChange}
          companyName={companyName}
          publicEmail={publicEmail}
          publicPhone={publicPhone}
        />
      </main>
    </div>
    </>
  );
}
