"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

  const handleChange = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleFocus = useCallback((field: string, questionVisibleIndex?: number) => {
    setActiveField(field);
    if (field === "question_title" || field === "question_subtitle" || field.startsWith("option_")) {
      setPreviewMode("question");
      if (questionVisibleIndex !== undefined && questionVisibleIndex >= 0) {
        setPreviewIndex(questionVisibleIndex);
      }
    } else if (
      field === "funnel_title" ||
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

      router.push("/dashboard/funnels");
      router.refresh();
    } catch {
      setSaveError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = Boolean(state.funnelName);

  return (
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
  );
}
