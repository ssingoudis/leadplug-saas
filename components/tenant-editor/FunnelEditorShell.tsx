"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // Test-Modus: schaltet onFieldClick + activeField ab → Funnel verhält sich wie das echte Live-Widget.
  // Beim Toggle wird der Funnel via key-Change remountet (frischer State, keine alten Antworten).
  const [isTestMode, setIsTestMode] = useState(false);

  // Beim Neu-Anlegen ohne Namen: 1-Schritt-Modal verlangt den Funnel-Namen, bevor der Editor freigegeben wird.
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(
    mode === "create" && !initialState.funnelName,
  );
  const [pendingName, setPendingName] = useState<string>("");

  function confirmNamePrompt() {
    const trimmed = pendingName.trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, funnelName: trimmed }));
    setShowNamePrompt(false);
  }

  function cancelNamePrompt() {
    router.push("/dashboard/funnels");
  }

  // Editor-Sidebar-Breite: vom User per Drag-Handle anpassbar, in localStorage persistiert.
  // Default bewusst großzügig (480px) — User soll Inhalte komfortabel sehen können
  // und bei Bedarf manuell schmaler ziehen. Min 320px (kompakt), Max 560px (komfortabel).
  const SIDEBAR_MIN = 320;
  const SIDEBAR_MAX = 560;
  const SIDEBAR_DEFAULT = 480;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT;
    const saved = window.localStorage.getItem("editorSidebarWidth");
    const parsed = saved ? parseInt(saved, 10) : NaN;
    if (Number.isFinite(parsed)) return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, parsed));
    return SIDEBAR_DEFAULT;
  });
  const isResizingRef = useRef(false);

  // Globale Pointer-Listener für Drag — funktionieren auch wenn der Cursor das Handle verlässt.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!isResizingRef.current) return;
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX));
      setSidebarWidth(next);
    }
    function onUp() {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem("editorSidebarWidth", String(sidebarWidth));
      } catch {
        // ignore quota / privacy mode errors
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [sidebarWidth]);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }
  // Befehl von der Preview an die Sidebar: öffne richtige Section + Frage-Karte, fokussiere Input.
  // ts wird für jeden Klick neu gesetzt, damit der Effekt auch bei gleichem field erneut feuert.
  const [commandFocus, setCommandFocus] = useState<{
    field: string;
    questionVisibleIndex?: number;
    ts: number;
  } | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(initialState),
    [state, initialState],
  );

  // Register global guard so DashboardHeader / TabNav can intercept nav-link clicks
  useEffect(() => {
    if (isDirty) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorGuard = (href: string) => {
        setPendingHref(href);
        setShowExitModal(true);
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorGuard = null;
    }
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__editorGuard = null;
    };
  }, [isDirty]);

  const handleChange = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleFocus = useCallback((field: string, questionVisibleIndex?: number) => {
    setActiveField(field);

    // Frage-Schritt: alle Frage-spezifischen Keys
    if (
      field === "question_title" ||
      field === "question_subtitle" ||
      field.startsWith("option_") ||
      field.startsWith("slider_") ||
      field.startsWith("text_")
    ) {
      setPreviewMode("question");
      if (questionVisibleIndex !== undefined && questionVisibleIndex >= 0) {
        setPreviewIndex(questionVisibleIndex);
      }
      return;
    }

    // Kontakt-Schritt
    if (
      field === "contact_form_title" ||
      field === "contact_form_subtitle" ||
      field === "submit_button" ||
      field === "privacy_text" ||
      field.startsWith("contact_field_")
    ) {
      setPreviewMode("contact");
      return;
    }

    // Erfolgs-Schritt
    if (
      field === "success_message" ||
      field === "response_message" ||
      field === "answers_overview_label" ||
      field === "header_banner" ||
      field === "footer" ||
      field === "footer_company" ||
      field === "footer_email" ||
      field === "footer_phone"
    ) {
      setPreviewMode("success");
      return;
    }

    // E-Mail-Previews
    if (field === "email_notification") {
      setPreviewMode("email_lead");
      return;
    }
    if (field === "email_sender") {
      setPreviewMode("email_customer");
      return;
    }

    // Theme-Felder (primary_color, text_color, background_color, page_background_color,
    // font, border_radius, max_width) — kein Mode-Wechsel, User sieht den Effekt im aktuellen Mode.
  }, []);

  const handleModeChange = useCallback(
    (newMode: PreviewMode, index = 0) => {
      setPreviewMode(newMode);
      if (newMode === "question") setPreviewIndex(index);
    },
    [],
  );

  // Klick im Preview → Sidebar springt zur passenden Stelle UND der blaue Rahmen erscheint sofort im Preview.
  // handleFocus() setzt activeField + previewMode synchron, damit auch bei Targets ohne Sidebar-Input
  // (z.B. Kontaktfeld-Zeilen sind Divs ohne tabIndex) sichtbares Feedback im Preview entsteht.
  const handlePreviewClick = useCallback(
    (field: string, questionVisibleIndex?: number) => {
      setCommandFocus({ field, questionVisibleIndex, ts: Date.now() });
      handleFocus(field, questionVisibleIndex);
    },
    [handleFocus],
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

      const dest = pendingHref ?? "/dashboard/funnels";
      setPendingHref(null);
      router.push(dest);
      router.refresh();
    } catch {
      setSaveError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (isDirty) {
      setPendingHref("/dashboard/funnels");
      setShowExitModal(true);
    } else {
      router.push("/dashboard/funnels");
    }
  }

  function handleDiscardAndLeave() {
    setShowExitModal(false);
    router.push(pendingHref ?? "/dashboard/funnels");
    setPendingHref(null);
  }

  function handleCancelExit() {
    setShowExitModal(false);
    setPendingHref(null);
  }

  const canSave = Boolean(state.funnelName);

  return (
    <>
      {showNamePrompt && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Wie soll dein neuer Funnel heißen?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                Der Name ist nur für dich zur Wiedererkennung. Endkunden sehen ihn nicht. Du kannst ihn später jederzeit ändern.
              </p>
              <input
                type="text"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmNamePrompt();
                  if (e.key === "Escape") cancelNamePrompt();
                }}
                placeholder="z. B. Solar-Anfrage Frühling 2026"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
              />
              <div className="flex gap-2 mt-5 justify-end">
                <button
                  type="button"
                  onClick={cancelNamePrompt}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={confirmNamePrompt}
                  disabled={!pendingName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Funnel anlegen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  onClick={handleCancelExit}
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
      className="fixed inset-x-0 bottom-0 flex flex-col md:flex-row bg-gray-100 dark:bg-[#0d1117]"
      style={{ top: "64px" }}
    >
      {/* Linke Seite: Editor — auf Desktop in der Breite per Drag-Handle anpassbar. */}
      <aside
        className="w-full md:shrink-0 md:w-(--sidebar-w) overflow-hidden flex flex-col border-b md:border-b-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1 md:flex-none"
        style={{ ["--sidebar-w" as string]: `${sidebarWidth}px` }}
      >
        <EditorSidebar
          state={state}
          onChange={handleChange}
          originalSlug={originalSlug}
          isSaving={isSaving}
          saveError={saveError}
          canSave={canSave}
          onSave={handleSave}
          onFocus={handleFocus}
          onJumpToField={handlePreviewClick}
          commandFocus={commandFocus}
          hasUnsavedChanges={isDirty}
          onBack={handleBack}
          isTestMode={isTestMode}
          onExitTestMode={() => setIsTestMode(false)}
        />
      </aside>

      {/* Resize-Handle (nur Desktop) — Drag-bar zwischen Sidebar und Preview. */}
      <div
        onPointerDown={startResize}
        role="separator"
        aria-label="Sidebar-Breite anpassen"
        className="hidden md:block w-1 shrink-0 bg-gray-200 dark:bg-gray-800 hover:bg-primary/60 cursor-col-resize transition-colors"
      />

      {/* Rechte Seite: Preview (nur auf Desktop) */}
      <main className="hidden md:block md:flex-1 overflow-y-auto p-6 lg:p-8">
        <PreviewPanel
          state={state}
          activeField={isTestMode ? "" : activeField}
          previewMode={previewMode}
          previewIndex={previewIndex}
          onModeChange={handleModeChange}
          onFieldClick={isTestMode ? undefined : handlePreviewClick}
          isTestMode={isTestMode}
          onToggleTestMode={() => setIsTestMode((t) => !t)}
          companyName={companyName}
          publicEmail={publicEmail}
          publicPhone={publicPhone}
          hasUnsavedChanges={isDirty}
        />
      </main>
    </div>
    </>
  );
}
