"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, TriangleAlert } from "lucide-react";
import type { EditorState, EditorQuestion, ContactFieldConfig, QuestionType } from "@/types";
import { TopTabs, type TopTabKey } from "./TopTabs";
import { StepList } from "./StepList";
import { CenterCanvas } from "./CenterCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { ThemePanel } from "./ThemePanel";
import type { SelectedStep } from "./types";
import type { Vorlage } from "./vorlagen";

interface Props {
  initialState: EditorState;
  mode: "create" | "edit";
  originalSlug?: string;
  companyName: string;
}

function makeId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultContactField(
  type: ContactFieldConfig["type"],
  existing: ContactFieldConfig[],
): ContactFieldConfig {
  const labelByType: Record<ContactFieldConfig["type"], string> = {
    text: "Text",
    email: "E-Mail",
    tel: "Telefon",
    plz: "Postleitzahl",
    radio: "Auswahl",
  };
  // Eindeutigen Key generieren — robust gegen Kollisionen mit System-Keys wie name/email/phone/plz/anrede.
  const existingKeys = new Set(existing.map((f) => f.key));
  let key: string;
  do {
    key = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  } while (existingKeys.has(key));

  const maxOrder = existing.reduce((m, f) => Math.max(m, f.sort_order), -1);

  return {
    key,
    type,
    label: labelByType[type],
    placeholder: "",
    required: false,
    visible: true,
    sort_order: maxOrder + 1,
    ...(type === "radio" ? { options: ["Option 1", "Option 2"] } : {}),
  };
}

function defaultQuestion(type: QuestionType): EditorQuestion {
  const needsOptions = type === "single_choice" || type === "multi_choice" || type === "dropdown";
  return {
    _id: makeId(),
    questionKey: "",
    questionType: type,
    title: "",
    subtitle: "",
    visible: true,
    required: true,
    placeholder: "",
    maxLength: "",
    sliderMin: "",
    sliderMax: "",
    sliderStep: "",
    sliderUnit: "",
    sliderDefault: "",
    options: needsOptions
      ? [
          { _id: makeId(), label: "Option A", value: "" },
          { _id: makeId(), label: "Option B", value: "" },
        ]
      : [],
    dateMin: "",
    dateMax: "",
    dateDefault: "",
    numberMin: "",
    numberMax: "",
    numberStep: "",
    numberDefault: "",
    numberUnit: "",
    checkboxLabel: "",
  };
}

export function EditorShellV2({ initialState, mode, originalSlug, companyName }: Props) {
  const router = useRouter();

  const [state, setState] = useState<EditorState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TopTabKey>("content");
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Name-Prompt für Create-Modus ohne Funnel-Namen — analog v1.
  const [showNamePrompt, setShowNamePrompt] = useState<boolean>(
    mode === "create" && !initialState.funnelName,
  );
  const [pendingName, setPendingName] = useState<string>("");

  // C.1c WYSIWYG-Edit — welches Element im CenterCanvas ist gerade selektiert (für Highlight + Inline-Edit)
  const [selectedFieldRef, setSelectedFieldRef] = useState<string>("");

  // Default-Selection: erste Frage falls vorhanden, sonst submit.
  const [selected, setSelected] = useState<SelectedStep>(() => {
    if (initialState.questions.length > 0) {
      return { kind: "question", questionIndex: 0 };
    }
    return { kind: "submit" };
  });

  const isDirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(initialState),
    [state, initialState],
  );

  // C.1c — Selection im Center-Canvas resetten wenn die Page wechselt (Step-Klick in der Sidebar).
  useEffect(() => {
    setSelectedFieldRef("");
  }, [selected]);

  // C.1c — Esc-Key deselected den aktuellen Field-Ref.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedFieldRef("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Exit-Guard registrieren (identische Signatur zu v1, konsumiert von TabNav/DashboardHeader/UserMenu).
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

  const handlePatch = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePatchQuestion = useCallback(
    (index: number, patch: Partial<EditorQuestion>) => {
      setState((prev) => {
        const next = [...prev.questions];
        if (!next[index]) return prev;
        next[index] = { ...next[index], ...patch };
        return { ...prev, questions: next };
      });
    },
    [],
  );

  const handleReorder = useCallback((nextQuestions: EditorQuestion[]) => {
    setState((prev) => ({ ...prev, questions: nextQuestions }));
  }, []);

  const handleAddQuestion = useCallback(
    (type: QuestionType, atIndex?: number) => {
      const newQ = defaultQuestion(type);
      setState((prev) => {
        const insertAt = atIndex ?? prev.questions.length;
        const next = [...prev.questions];
        next.splice(insertAt, 0, newQ);
        return { ...prev, questions: next };
      });
      // selektiere die neue Frage an ihrer Insert-Position
      const insertAt = atIndex ?? state.questions.length;
      setSelected({ kind: "question", questionIndex: insertAt });
    },
    [state.questions.length],
  );

  const handleAddVorlage = useCallback(
    (vorlage: Vorlage, atIndex?: number) => {
      const newQuestions = vorlage.build();
      if (newQuestions.length === 0) return;
      setState((prev) => {
        const insertAt = atIndex ?? prev.questions.length;
        const next = [...prev.questions];
        next.splice(insertAt, 0, ...newQuestions);
        return { ...prev, questions: next };
      });
      // selektiere die erste der neu hinzugefügten Fragen
      const insertAt = atIndex ?? state.questions.length;
      setSelected({ kind: "question", questionIndex: insertAt });
    },
    [state.questions.length],
  );

  const handleDeleteQuestion = useCallback(
    (index: number) => {
      setState((prev) => {
        const next = [...prev.questions];
        next.splice(index, 1);
        return { ...prev, questions: next };
      });
      // Nach Delete: Selektion auf vorherige Frage, oder submit wenn keine mehr da
      setSelected((prev) => {
        if (prev.kind !== "question") return prev;
        const remaining = state.questions.length - 1;
        if (remaining <= 0) return { kind: "submit" };
        return { kind: "question", questionIndex: Math.min(index, remaining - 1) };
      });
    },
    [state.questions.length],
  );

  /* ─── Contact-Field-Handler (Submit-Page Multi-Field) ─── */

  const handlePatchContactField = useCallback(
    (key: string, patch: Partial<ContactFieldConfig>) => {
      setState((prev) => ({
        ...prev,
        contactFields: prev.contactFields.map((f) => (f.key === key ? { ...f, ...patch } : f)),
      }));
    },
    [],
  );

  const handleAddContactField = useCallback((type: ContactFieldConfig["type"]) => {
    setState((prev) => {
      const newField = defaultContactField(type, prev.contactFields);
      return { ...prev, contactFields: [...prev.contactFields, newField] };
    });
  }, []);

  const handleDeleteContactField = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      contactFields: prev.contactFields.filter((f) => f.key !== key),
    }));
  }, []);

  const handleReorderContactFields = useCallback((nextFields: ContactFieldConfig[]) => {
    // sort_order synchron zur neuen Array-Reihenfolge
    setState((prev) => ({
      ...prev,
      contactFields: nextFields.map((f, idx) => ({ ...f, sort_order: idx })),
    }));
  }, []);

  /* ─── C.1c Canvas-Option-Aktionen (Add/Reorder/Duplicate/Delete) ─── */

  const handleAddOption = useCallback(() => {
    if (selected.kind !== "question") return;
    const qIdx = selected.questionIndex;
    setState((prev) => {
      const next = [...prev.questions];
      const q = next[qIdx];
      if (!q) return prev;
      const newOption = {
        _id: `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        label: "",
        value: "",
      };
      next[qIdx] = { ...q, options: [...q.options, newOption] };
      return { ...prev, questions: next };
    });
  }, [selected]);

  const handleReorderOptions = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (selected.kind !== "question") return;
      const qIdx = selected.questionIndex;
      setState((prev) => {
        const next = [...prev.questions];
        const q = next[qIdx];
        if (!q) return prev;
        const newOptions = [...q.options];
        const [moved] = newOptions.splice(fromIdx, 1);
        if (!moved) return prev;
        newOptions.splice(toIdx, 0, moved);
        next[qIdx] = { ...q, options: newOptions };
        return { ...prev, questions: next };
      });
    },
    [selected],
  );

  const handleDuplicateOption = useCallback(
    (idx: number) => {
      if (selected.kind !== "question") return;
      const qIdx = selected.questionIndex;
      setState((prev) => {
        const next = [...prev.questions];
        const q = next[qIdx];
        if (!q || !q.options[idx]) return prev;
        const src = q.options[idx];
        const duplicate = {
          ...src,
          _id: `opt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          value: "", // wird beim Save neu aus Label generiert
        };
        const newOptions = [...q.options];
        newOptions.splice(idx + 1, 0, duplicate);
        next[qIdx] = { ...q, options: newOptions };
        return { ...prev, questions: next };
      });
    },
    [selected],
  );

  const handleDeleteOption = useCallback(
    (idx: number) => {
      if (selected.kind !== "question") return;
      const qIdx = selected.questionIndex;
      setState((prev) => {
        const next = [...prev.questions];
        const q = next[qIdx];
        if (!q || q.options.length <= 1) return prev; // mindestens 1 Option erforderlich
        const newOptions = q.options.filter((_, i) => i !== idx);
        next[qIdx] = { ...q, options: newOptions };
        return { ...prev, questions: next };
      });
    },
    [selected],
  );

  /* ─── C.1c WYSIWYG-Edit — Text-Change-Router ─── */

  // Mappt Field-Refs aus funnel.tsx (z.B. "question_title", "option_2", "contact_form_title")
  // auf EditorState-Updates. qIdx kommt vom EditorShell-State (selected.questionIndex), nicht vom
  // Funnel-Callback — das ist die Sidebar-Array-Index-Wahrheit.
  const handleTextChange = useCallback(
    (fieldRef: string, newText: string) => {
      const qIdx = selected.kind === "question" ? selected.questionIndex : -1;

      // Option-Label: option_<idx>
      if (fieldRef.startsWith("option_") && qIdx >= 0) {
        const optIdx = parseInt(fieldRef.slice("option_".length), 10);
        if (!Number.isFinite(optIdx)) return;
        setState((prev) => {
          const next = [...prev.questions];
          const q = next[qIdx];
          if (!q) return prev;
          const nextOptions = q.options.map((o, i) => (i === optIdx ? { ...o, label: newText } : o));
          next[qIdx] = { ...q, options: nextOptions };
          return { ...prev, questions: next };
        });
        return;
      }

      // Question-Page Felder
      if (qIdx >= 0) {
        if (fieldRef === "question_title") {
          handlePatchQuestion(qIdx, { title: newText });
          return;
        }
        if (fieldRef === "question_subtitle") {
          handlePatchQuestion(qIdx, { subtitle: newText });
          return;
        }
      }

      // Submit-Page Felder
      if (fieldRef === "contact_form_title") {
        handlePatch({ funnelTitle: newText });
        return;
      }
      if (fieldRef === "contact_form_subtitle") {
        handlePatch({ contactFormSubtitle: newText });
        return;
      }
      if (fieldRef === "submit_button") {
        handlePatch({ submitButtonLabel: newText });
        return;
      }

      // Success-Page Felder
      if (fieldRef === "success_message") {
        handlePatch({ successMessage: newText });
        return;
      }
      if (fieldRef === "response_message") {
        handlePatch({ responseMessage: newText });
        return;
      }

      // Unbekannter Field-Ref — keine State-Änderung. Selection-Highlight läuft trotzdem.
    },
    [selected, handlePatch, handlePatchQuestion],
  );

  function withV2Flag(href: string): string {
    if (href.includes("v=2")) return href;
    return href.includes("?") ? `${href}&v=2` : `${href}?v=2`;
  }

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
      router.push(withV2Flag(dest));
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

  function confirmNamePrompt() {
    const trimmed = pendingName.trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, funnelName: trimmed }));
    setShowNamePrompt(false);
  }

  function cancelNamePrompt() {
    router.push("/dashboard/funnels");
  }

  const canSave = Boolean(state.funnelName);

  return (
    <>
      {showNamePrompt && <NamePromptModal pendingName={pendingName} setPendingName={setPendingName} onConfirm={confirmNamePrompt} onCancel={cancelNamePrompt} />}
      {showExitModal && (
        <ExitModal onCancel={handleCancelExit} onDiscard={handleDiscardAndLeave} onSave={() => { setShowExitModal(false); handleSave(); }} />
      )}

      <div
        className="fixed inset-x-0 bottom-0 flex flex-col bg-gray-50 dark:bg-[#0d1117]"
        style={{ top: "64px" }}
      >
        {/* Top-Bar: Back + Title + Save + Status */}
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Zurück zur Funnel-Liste"
              title="Zurück"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Funnel-Builder · Beta v2
              </span>
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {state.funnelName || "Neuer Funnel"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveError && (
              <span className="hidden text-xs text-red-600 dark:text-red-400 md:inline">{saveError}</span>
            )}
            <SaveBadge isDirty={isDirty} isSaving={isSaving} />
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </header>

        {/* Tabs */}
        <TopTabs active={activeTab} onChange={setActiveTab} />

        {/* Body — Layout je nach Tab.
            C.2: Design-Tab versteckt StepList (Theme ist funnel-weit, kein Step) und ersetzt
            PropertiesPanel durch ThemePanel. CenterCanvas bleibt für Live-Preview. */}
        {activeTab === "design" ? (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px]">
            <CenterCanvas
              state={state}
              selected={selected}
              companyName={companyName}
              isTestMode={isTestMode}
              onToggleTestMode={() => setIsTestMode((t) => !t)}
              selectedFieldRef={selectedFieldRef}
              onSelectField={setSelectedFieldRef}
              onTextChange={handleTextChange}
              onAddOption={handleAddOption}
              onReorderOptions={handleReorderOptions}
              onDuplicateOption={handleDuplicateOption}
              onDeleteOption={handleDeleteOption}
            />
            <ThemePanel state={state} onPatch={handlePatch} />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)_420px]">
            <StepList
              state={state}
              selected={selected}
              onSelect={setSelected}
              onReorder={handleReorder}
              onAddQuestion={handleAddQuestion}
              onAddVorlage={handleAddVorlage}
            />
            <CenterCanvas
              state={state}
              selected={selected}
              companyName={companyName}
              isTestMode={isTestMode}
              onToggleTestMode={() => setIsTestMode((t) => !t)}
              selectedFieldRef={selectedFieldRef}
              onSelectField={setSelectedFieldRef}
              onTextChange={handleTextChange}
              onAddOption={handleAddOption}
              onReorderOptions={handleReorderOptions}
              onDuplicateOption={handleDuplicateOption}
              onDeleteOption={handleDeleteOption}
            />
            <PropertiesPanel
              state={state}
              selected={selected}
              onPatch={handlePatch}
              onPatchQuestion={handlePatchQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onPatchContactField={handlePatchContactField}
              onAddContactField={handleAddContactField}
              onDeleteContactField={handleDeleteContactField}
              onReorderContactFields={handleReorderContactFields}
              selectedFieldRef={selectedFieldRef}
              onSelectFieldRef={setSelectedFieldRef}
            />
          </div>
        )}
      </div>
    </>
  );
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

function SaveBadge({ isDirty, isSaving }: { isDirty: boolean; isSaving: boolean }) {
  if (isSaving) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" />
        Speichern…
      </span>
    );
  }
  if (isDirty) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Ungespeichert
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:border-green-700/40 dark:bg-green-900/20 dark:text-green-400">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Gespeichert
    </span>
  );
}

function NamePromptModal({
  pendingName,
  setPendingName,
  onConfirm,
  onCancel,
}: {
  pendingName: string;
  setPendingName: (s: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <h3 className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            Wie soll dein neuer Funnel heißen?
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Der Name ist nur für dich zur Wiedererkennung. Endkunden sehen ihn nicht. Du kannst ihn später jederzeit ändern.
          </p>
          <input
            type="text"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm();
              if (e.key === "Escape") onCancel();
            }}
            placeholder="z. B. Solar-Anfrage Frühling 2026"
            autoFocus
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!pendingName.trim()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Funnel anlegen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExitModal({
  onCancel,
  onDiscard,
  onSave,
}: {
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="p-6">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
              <TriangleAlert size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">Ungespeicherte Änderungen</h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Verwerfen
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
