"use client";

import { useRef, useEffect } from "react";
import { Funnel } from "@/components/funnel";
import { EmailPreviewMockup } from "./EmailPreviewMockup";
import { LeadEmailPreviewMockup } from "./LeadEmailPreviewMockup";
import { buildTheme, buildFunnelConfig, buildQuestions } from "@/lib/editorUtils";
import type { EditorState, QuestionConfig } from "@/types";

export type PreviewMode = "question" | "contact" | "success" | "email_customer" | "email_lead";

interface Props {
  state: EditorState;
  activeField: string;
  previewMode: PreviewMode;
  previewIndex: number;
  onModeChange: (mode: PreviewMode, index?: number) => void;
  companyName: string;
  publicEmail: string;
  publicPhone: string;
}

interface Step {
  key: string;
  label: string;
  title?: string;
  mode: PreviewMode;
  index: number;
}

function buildMockAnswers(questions: QuestionConfig[]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of questions) {
    if (q.questionType === "single_choice" || q.questionType === "multiple_choice") {
      const first = q.options[0];
      if (first) answers[q.id] = first.value;
    } else if (q.questionType === "short_text") {
      answers[q.id] = "Beispieltext";
    } else if (q.questionType === "long_text") {
      answers[q.id] = "Hier steht ein längerer Beispieltext für diese Frage.";
    } else if (q.questionType === "slider") {
      const cfg = q.config as { default?: number; min?: number; max?: number };
      const val = cfg.default ?? Math.round(((cfg.min ?? 0) + (cfg.max ?? 100)) / 2);
      answers[q.id] = String(val);
    }
  }
  return answers;
}

const PLACEHOLDER_QUESTIONS: QuestionConfig[] = [
  { id: "ph_1", title: "Frage 1", questionType: "short_text", options: [], config: {}, visible: true },
  { id: "ph_2", title: "Frage 2", questionType: "short_text", options: [], config: {}, visible: true },
];
const PLACEHOLDER_ANSWERS: Record<string, string> = { ph_1: "Antwort 1", ph_2: "Antwort 2" };

export function PreviewPanel({
  state,
  activeField,
  previewMode,
  previewIndex,
  onModeChange,
  companyName,
  publicEmail,
  publicPhone,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [previewMode, previewIndex]);

  const questions = buildQuestions(state.questions);
  const visibleCount = questions.length;
  const noQuestions = visibleCount === 0;

  const theme = buildTheme(state);
  const funnel = buildFunnelConfig(state);
  const mockAnswers = buildMockAnswers(questions);

  const resolvedCompanyName = state.footerCompanyName || companyName || "Muster GmbH";
  const resolvedEmail = state.footerEmail || publicEmail || "info@muster.de";
  const resolvedPhone = state.footerPhone || publicPhone || "+49 123 456789";
  const successQuestions = noQuestions ? PLACEHOLDER_QUESTIONS : questions;
  const successAnswers = noQuestions ? PLACEHOLDER_ANSWERS : mockAnswers;

  // Steps direkt aus state.questions ableiten — sidebarIdx gibt die korrekte Nummerierung.
  const steps: Step[] = [
    ...state.questions
      .map((eq, sidebarIdx) => ({ eq, sidebarIdx }))
      .filter(({ eq }) => eq.visible !== false)
      .map(({ eq, sidebarIdx }, visibleIdx) => ({
        key: `q-${visibleIdx}`,
        label: `Frage ${sidebarIdx + 1}`,
        title: eq.title || undefined,
        mode: "question" as const,
        index: visibleIdx,
      })),
    { key: "contact", label: "Kontaktformular", mode: "contact", index: 0 },
    { key: "success", label: "Erfolgsseite", mode: "success", index: 0 },
    { key: "email_customer", label: "Kundenbestätigung", mode: "email_customer", index: 0 },
    { key: "email_lead", label: "Lead-Benachrichtigung", mode: "email_lead", index: 0 },
  ];

  const isActive = (step: Step) =>
    step.mode === previewMode &&
    (step.mode !== "question" || step.index === previewIndex);

  const initialStep =
    previewMode === "question"
      ? previewIndex
      : previewMode === "contact"
        ? visibleCount
        : 0;


  const initialSubmitted = previewMode === "success";

  const badgeText =
    previewMode === "success" && noQuestions
      ? "Vorschau — Platzhalter-Antworten (noch keine Fragen konfiguriert)"
      : previewMode === "email_lead"
        ? "Vorschau — Benachrichtigung an den Lead-Empfänger"
        : previewMode === "email_customer"
          ? "Vorschau — Bestätigungs-E-Mail an den Anfragenden"
          : "Vorschau — Eingaben werden nicht gespeichert";

  return (
    <div className="flex flex-col h-full">
      <div ref={topRef} />

      {/* Step-Navigation — bricht bei vielen Fragen in die nächste Zeile */}
      <div
        className="mb-4 mx-auto w-full"
        style={{ maxWidth: state.maxWidth || "720px" }}
      >
        <div className="flex flex-wrap items-center justify-center gap-1 mx-auto px-2">
          {steps.map((step) => (
            <button
              key={step.key}
              type="button"
              title={step.title}
              onClick={() => onModeChange(step.mode, step.index)}
              className={
                isActive(step)
                  ? "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-primary text-white shadow-sm"
                  : "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700"
              }
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info-Badge */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-1.5 mb-4 text-xs text-amber-700 dark:text-amber-400 w-fit mx-auto">
        {badgeText}
      </div>

      {/* Inhalt */}
      <div className="flex-1">
        {previewMode === "email_customer" ? (
          <EmailPreviewMockup
            state={state}
            questions={successQuestions}
            mockAnswers={successAnswers}
            companyName={resolvedCompanyName}
            publicEmail={resolvedEmail}
          />
        ) : previewMode === "email_lead" ? (
          <LeadEmailPreviewMockup
            state={state}
            questions={successQuestions}
            mockAnswers={successAnswers}
            companyName={resolvedCompanyName}
          />
        ) : previewMode === "question" && noQuestions ? (
          <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800">
            <p className="text-sm font-medium">Noch keine Fragen konfiguriert</p>
            <p className="text-xs mt-1">Füge links eine Frage hinzu, um die Vorschau zu sehen.</p>
          </div>
        ) : (
          <Funnel
            key={`${previewMode}-${previewIndex}`}
            theme={theme}
            funnel={funnel}
            questions={previewMode === "success" ? successQuestions : questions}
            contactFields={state.contactFields}
            companyName={resolvedCompanyName}
            publicEmail={resolvedEmail}
            publicPhone={resolvedPhone}
            initialStep={initialStep}
            initialSubmitted={initialSubmitted}
            initialAnswers={previewMode === "success" ? successAnswers : undefined}
            previewHighlight={activeField}
            onSubmit={() => {}}
          />
        )}
      </div>
    </div>
  );
}
