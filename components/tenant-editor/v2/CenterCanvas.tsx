"use client";

import { useState } from "react";
import { Monitor, Smartphone, Play, Pencil, EyeOff, ListPlus } from "lucide-react";
import { Funnel } from "@/components/funnel";
import { buildTheme, buildFunnelConfig, buildQuestions } from "@/lib/editorUtils";
import type { EditorState } from "@/types";
import type { SelectedStep } from "./types";
import { EmptyState } from "./ui/Panel";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  companyName: string;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  // C.1c WYSIWYG-Edit
  selectedFieldRef: string;
  onSelectField: (fieldRef: string) => void;
  onTextChange: (fieldRef: string, newText: string) => void;
  // C.1c Canvas-Aktionen für Choice-Options
  onAddOption: () => void;
  onReorderOptions: (fromIdx: number, toIdx: number) => void;
  onDuplicateOption: (idx: number) => void;
  onDeleteOption: (idx: number) => void;
  // Polish: leere Custom-Karte zeigt Inline-"+"-Button → bubble nach EditorShell
  onAddCustomFieldRequest?: () => void;
}

export function CenterCanvas({
  state,
  selected,
  companyName,
  isTestMode,
  onToggleTestMode,
  selectedFieldRef,
  onSelectField,
  onTextChange,
  onAddOption,
  onReorderOptions,
  onDuplicateOption,
  onDeleteOption,
  onAddCustomFieldRequest,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

  // Builder zeigt auch leere/unfertige Optionen (im Live-Widget werden sie weiter gefiltert).
  // Damit der User direkt nach "Option hinzufügen" die neue Zeile im Canvas sieht und einklicken kann.
  // Builder zeigt auch hidden + leere Optionen. Test/Live filtert normal.
  const questions = buildQuestions(state.questions, { keepEmpty: !isTestMode, keepHidden: !isTestMode });
  const theme = buildTheme(state);
  const funnel = buildFunnelConfig(state);

  const resolvedCompanyName = state.footerCompanyName || companyName || "Muster GmbH";
  const resolvedEmail = state.footerEmail || "info@muster.de";
  const resolvedPhone = state.footerPhone || "+49 123 456789";

  // initialStep berechnen — mapped die Selection auf den Widget-Step.
  // Widget-Steps: 0..visibleCount-1 = Fragen, visibleCount = Kontakt, danach intern Success.
  const visibleCount = questions.length;
  let initialStep = 0;
  let initialSubmitted = false;
  let placeholder: "no_questions" | "submit_skipped" | null = null;
  // Polish: hidden-Page wird nicht mehr als Placeholder gerendert. Stattdessen rendert das
  // Widget die Karte normal und CenterCanvas wraps mit Opacity + Eye-Off-Badge-Overlay.
  let isCurrentStepHidden = false;

  if (selected.kind === "question") {
    const sourceQ = state.questions[selected.questionIndex];
    if (!sourceQ) {
      placeholder = "no_questions";
    } else {
      isCurrentStepHidden = sourceQ.visible === false;
      // Im Builder enthält questions auch die hidden Pages (keepHidden), also bleibt der
      // sidebar-Index 1:1 der visible-Index im Funnel.
      initialStep = isTestMode
        ? (() => {
            let vIdx = -1;
            for (let i = 0; i <= selected.questionIndex && i < state.questions.length; i++) {
              if (state.questions[i].visible !== false) vIdx++;
            }
            return Math.max(0, vIdx);
          })()
        : selected.questionIndex;
    }
  } else if (selected.kind === "submit") {
    if (state.skipSubmitStep && !isTestMode) {
      placeholder = "submit_skipped";
    } else if (visibleCount === 0 && state.questions.length === 0) {
      // ohne Fragen springt das Widget intern direkt zu Kontakt — Step 0 ist OK
      initialStep = 0;
    } else {
      initialStep = visibleCount;
    }
  } else if (selected.kind === "success") {
    initialSubmitted = true;
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-[#0d1117]">
      {/* Oben: Test-Toggle + Desktop/Mobile-Toggle */}
      <div className="flex items-center justify-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
        <button
          type="button"
          onClick={onToggleTestMode}
          title={isTestMode ? "Zurück zum Editor" : "Funnel wie ein End-Kunde testen"}
          className={
            isTestMode
              ? "inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
              : "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          }
        >
          {isTestMode ? <Pencil size={14} /> : <Play size={14} fill="currentColor" />}
          {isTestMode ? "Zurück zum Editor" : "Funnel testen"}
        </button>

        <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setIsMobile(false)}
            title="Desktop-Ansicht"
            aria-label="Desktop-Ansicht"
            className={
              !isMobile
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-900 shadow-sm transition-colors dark:bg-gray-900 dark:text-white"
                : "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsMobile(true)}
            title="Mobile-Ansicht"
            aria-label="Mobile-Ansicht"
            className={
              isMobile
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-900 shadow-sm transition-colors dark:bg-gray-900 dark:text-white"
                : "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      {/* Canvas — Click-into-empty (Background außerhalb des Widget-Containers) deselected */}
      <div
        className="flex-1 overflow-y-auto p-6 lg:p-10"
        onClick={(e) => {
          // Nur deselect wenn auf den Outer-Container geklickt wurde (kein bubble-Target im Widget)
          if (e.target === e.currentTarget) {
            onSelectField("");
          }
        }}
      >
        <div
          className="mx-auto w-full transition-[max-width] duration-300"
          style={{ maxWidth: isMobile ? "375px" : state.maxWidth || "720px" }}
        >
          {placeholder === "no_questions" ? (
            <NoQuestionsPlaceholder />
          ) : placeholder === "submit_skipped" ? (
            <SubmitSkippedPlaceholder />
          ) : (
            <div className="relative">
              {/* Polish: Hidden-Page wird normal gerendert, aber ausgegraut + Eye-Off-Badge oben rechts.
                  Tenant sieht weiter den Inhalt der Frage, weiß aber dass sie im Live invisible ist. */}
              {isCurrentStepHidden && (
                <>
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gray-200/40 dark:bg-black/40" />
                  <div className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300">
                    <EyeOff size={12} />
                    Ausgeblendet
                  </div>
                </>
              )}
              <div className={isCurrentStepHidden ? "opacity-50" : ""}>
                <Funnel
                  // Remount bei Step-/Selection-Wechsel im Edit-Modus, einmal pro Test-Session im Test-Modus.
                  key={
                    isTestMode
                      ? "test-session"
                      : `${selected.kind}-${selected.kind === "question" ? selected.questionIndex : 0}`
                  }
                  theme={theme}
                  funnel={funnel}
                  questions={questions}
                  contactFields={state.contactFields}
                  companyName={resolvedCompanyName}
                  publicEmail={resolvedEmail}
                  publicPhone={resolvedPhone}
                  initialStep={initialStep}
                  initialSubmitted={initialSubmitted}
                  previewHighlight={isTestMode ? "" : selectedFieldRef}
                  onFieldClick={isTestMode ? undefined : (field) => onSelectField(field)}
                  editMode={!isTestMode}
                  onTextChange={onTextChange}
                  onAddOption={isTestMode ? undefined : onAddOption}
                  onReorderOptions={isTestMode ? undefined : onReorderOptions}
                  onDuplicateOption={isTestMode ? undefined : onDuplicateOption}
                  onDeleteOption={isTestMode ? undefined : onDeleteOption}
                  onAddCustomFieldRequest={isTestMode ? undefined : onAddCustomFieldRequest}
                  onSubmit={() => {}}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoQuestionsPlaceholder() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <EmptyState
        icon={<ListPlus size={22} />}
        title="Noch keine Frage konfiguriert"
        description="Füge links eine Frage hinzu, um die Vorschau zu sehen."
      />
    </div>
  );
}

function SubmitSkippedPlaceholder() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <EmptyState
        icon={<EyeOff size={22} />}
        title="Submit-Schritt ist deaktiviert"
        description="Der Funnel endet nach der letzten Frage und springt direkt zur Erfolgsseite. Aktiviere rechts den Toggle, um das Kontaktformular wiederherzustellen."
      />
    </div>
  );
}
