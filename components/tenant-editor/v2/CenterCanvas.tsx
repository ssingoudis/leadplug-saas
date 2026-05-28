"use client";

import { useState } from "react";
import { Monitor, Smartphone, Play, Pencil, EyeOff } from "lucide-react";
import { Funnel } from "@/components/funnel";
import { buildTheme, buildFunnelConfig, buildQuestions } from "@/lib/editorUtils";
import type { EditorState } from "@/types";
import type { SelectedStep } from "./types";

interface Props {
  state: EditorState;
  selected: SelectedStep;
  companyName: string;
  isTestMode: boolean;
  onToggleTestMode: () => void;
}

export function CenterCanvas({
  state,
  selected,
  companyName,
  isTestMode,
  onToggleTestMode,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

  const questions = buildQuestions(state.questions);
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
  let placeholder: "hidden_question" | "no_questions" | null = null;

  if (selected.kind === "question") {
    const sourceQ = state.questions[selected.questionIndex];
    if (!sourceQ) {
      placeholder = "no_questions";
    } else if (sourceQ.visible === false) {
      placeholder = "hidden_question";
    } else {
      // visible-Index zum gewählten sidebar-Index finden
      let vIdx = -1;
      for (let i = 0; i <= selected.questionIndex && i < state.questions.length; i++) {
        if (state.questions[i].visible !== false) vIdx++;
      }
      initialStep = Math.max(0, vIdx);
    }
  } else if (selected.kind === "submit") {
    if (visibleCount === 0 && state.questions.length === 0) {
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

        <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
          <button
            type="button"
            onClick={() => setIsMobile(false)}
            title="Desktop-Ansicht"
            aria-label="Desktop-Ansicht"
            className={
              !isMobile
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-colors"
                : "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white"
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
                ? "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-colors"
                : "flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white"
            }
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div
          className="mx-auto w-full transition-[max-width] duration-300"
          style={{ maxWidth: isMobile ? "375px" : state.maxWidth || "720px" }}
        >
          {placeholder === "hidden_question" ? (
            <HiddenPlaceholder />
          ) : placeholder === "no_questions" ? (
            <NoQuestionsPlaceholder />
          ) : (
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
              previewHighlight=""
              onSubmit={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function HiddenPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <EyeOff size={20} className="text-gray-400 dark:text-gray-500" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Diese Frage ist ausgeblendet</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Aktiviere rechts die Sichtbarkeit, damit Endkunden sie sehen.
      </p>
    </div>
  );
}

function NoQuestionsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Noch keine Frage konfiguriert</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">Füge links eine Frage hinzu, um die Vorschau zu sehen.</p>
    </div>
  );
}
