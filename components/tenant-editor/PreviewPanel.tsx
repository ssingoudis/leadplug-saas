"use client";

import { useRef, useEffect, useState } from "react";
import { Pencil, Play, Monitor, Smartphone } from "lucide-react";
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
  onFieldClick?: (field: string, questionVisibleIndex?: number) => void;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  companyName: string;
  publicEmail: string;
  publicPhone: string;
  hasUnsavedChanges: boolean;
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
  onFieldClick,
  isTestMode,
  onToggleTestMode,
  companyName,
  publicEmail,
  publicPhone,
  hasUnsavedChanges,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  // Test-Modus: aktuelle Position des Funnels (wird über onStepChange vom Funnel selbst gemeldet).
  // Im Edit-Modus irrelevant — Edit-Modus nutzt previewMode/previewIndex.
  const [testActiveMode, setTestActiveMode] = useState<PreviewMode>("question");
  const [testActiveIndex, setTestActiveIndex] = useState(0);

  // Mobile-Preview-Toggle: schaltet die Vorschau-Breite auf 375px (Standard iPhone-Breite).
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [previewMode, previewIndex]);

  // Beim Wechsel in/aus dem Test-Modus die Test-Position resetten.
  useEffect(() => {
    if (isTestMode) {
      setTestActiveMode("question");
      setTestActiveIndex(0);
    }
  }, [isTestMode]);

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

  // Im Test-Modus reflektiert die Step-Nav den internen Funnel-Step; im Edit-Modus steuert sie ihn.
  const activeMode = isTestMode ? testActiveMode : previewMode;
  const activeIndex = isTestMode ? testActiveIndex : previewIndex;

  const isActive = (step: Step) =>
    step.mode === activeMode &&
    (step.mode !== "question" || step.index === activeIndex);

  const initialStep =
    previewMode === "question"
      ? previewIndex
      : previewMode === "contact"
        ? visibleCount
        : 0;


  const initialSubmitted = previewMode === "success";

  const isPlaceholder = previewMode === "success" && noQuestions;

  const badgeText = isPlaceholder
    ? "Platzhalter-Antworten"
    : hasUnsavedChanges
      ? "Ungespeichert"
      : "Gespeichert";

  const badgeDotClass = isPlaceholder || hasUnsavedChanges
    ? "bg-amber-500"
    : "bg-green-500";

  const badgeClass = isPlaceholder || hasUnsavedChanges
    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400"
    : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 text-green-700 dark:text-green-400";

  return (
    <div className="flex flex-col h-full">
      <div ref={topRef} />

      {/* Test-Modus + Mobile/Desktop Toggle */}
      <div className="mb-4 mx-auto w-full flex items-center justify-center gap-3" style={{ maxWidth: state.maxWidth || "720px" }}>
        <button
          type="button"
          onClick={onToggleTestMode}
          title={isTestMode ? "Zurück zum Editor" : "Funnel wie ein End-Kunde testen"}
          className={
            isTestMode
              ? "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg"
              : "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg"
          }
        >
          {isTestMode ? <Pencil size={15} /> : <Play size={15} fill="currentColor" />}
          {isTestMode ? "Zurück zum Editor" : "Funnel testen"}
        </button>

        <div
          className="inline-flex items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5"
          title="Vorschau-Breite"
        >
          <button
            type="button"
            onClick={() => setIsMobilePreview(false)}
            className={
              !isMobilePreview
                ? "flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-white transition-colors"
                : "flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            }
            title="Desktop-Ansicht"
            aria-label="Desktop-Ansicht"
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsMobilePreview(true)}
            className={
              isMobilePreview
                ? "flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-white transition-colors"
                : "flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            }
            title="Mobile-Ansicht"
            aria-label="Mobile-Ansicht"
          >
            <Smartphone size={15} />
          </button>
        </div>
      </div>

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
              title={isTestMode ? step.title : (step.title ?? "Zum Schritt springen")}
              onClick={() => !isTestMode && onModeChange(step.mode, step.index)}
              disabled={isTestMode}
              className={
                isActive(step)
                  ? "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-primary text-white shadow-sm"
                  : isTestMode
                    ? "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-default opacity-70"
                    : "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700"
              }
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status-Badge — im Test-Modus ausgeblendet */}
      {!isTestMode && (
        <div className={`${badgeClass} rounded-full px-3 py-1 mb-4 text-xs w-fit mx-auto flex items-center gap-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeDotClass}`} />
          {badgeText}
        </div>
      )}

      {/* Inhalt — Mobile-Preview-Modus engt die Breite auf 375px ein (iPhone-Standard). */}
      <div
        className="flex-1 mx-auto w-full transition-[max-width] duration-300"
        style={{ maxWidth: isMobilePreview ? "375px" : undefined }}
      >
        {previewMode === "email_customer" ? (
          <EmailPreviewMockup
            state={state}
            questions={successQuestions}
            mockAnswers={successAnswers}
            companyName={resolvedCompanyName}
            publicEmail={resolvedEmail}
            activeField={activeField}
            onFieldClick={onFieldClick}
          />
        ) : previewMode === "email_lead" ? (
          <LeadEmailPreviewMockup
            state={state}
            questions={successQuestions}
            mockAnswers={successAnswers}
            companyName={resolvedCompanyName}
            activeField={activeField}
            onFieldClick={onFieldClick}
          />
        ) : previewMode === "question" && noQuestions ? (
          <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800">
            <p className="text-sm font-medium">Noch keine Fragen konfiguriert</p>
            <p className="text-xs mt-1">Füge links eine Frage hinzu, um die Vorschau zu sehen.</p>
          </div>
        ) : (
          <Funnel
            // Im Edit-Modus hängt der key am previewIndex (Funnel remountet beim Step-Wechsel von außen).
            // Im Test-Modus NUR vom previewMode → Funnel behält seinen internen State während User durchklickt.
            key={isTestMode ? `${previewMode}-test` : `${previewMode}-${previewIndex}-edit`}
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
            onFieldClick={onFieldClick}
            onStepChange={
              isTestMode
                ? (mode, idx) => {
                    setTestActiveMode(mode as PreviewMode);
                    setTestActiveIndex(idx);
                  }
                : undefined
            }
            onSubmit={() => {}}
          />
        )}
      </div>
    </div>
  );
}
