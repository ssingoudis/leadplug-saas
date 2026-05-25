"use client";

import type { EditorState, QuestionConfig } from "@/types";
import { resolveAnswer } from "@/lib/resolveAnswer";

interface Props {
  state: EditorState;
  questions: QuestionConfig[];
  mockAnswers: Record<string, string>;
  companyName: string;
  publicEmail: string;
  activeField?: string;
  onFieldClick?: (field: string, questionVisibleIndex?: number) => void;
}

export function EmailPreviewMockup({
  state,
  questions,
  mockAnswers,
  companyName,
  publicEmail,
  activeField,
  onFieldClick,
}: Props) {
  const primary = state.primaryColor || "#22c55e";
  const visibleQuestions = questions.filter((q) => q.visible !== false);

  // Standard-Highlight: outline AUSSERHALB des Elements (offset +3px) — klare Trennung Element/Rahmen.
  const hl = (...keys: string[]): React.CSSProperties =>
    activeField && keys.includes(activeField)
      ? { outline: "2px solid var(--color-primary)", outlineOffset: "3px" }
      : {};

  // Edge-Variante: outline INSIDE für Elemente an der Email-Card-Kante (Header-Banner),
  // wo overflow:hidden eine positive Offset clippen würde.
  const hlEdge = (...keys: string[]): React.CSSProperties =>
    activeField && keys.includes(activeField)
      ? { outline: "2px solid var(--color-primary)", outlineOffset: "-2px" }
      : {};
  const editCursor: React.CSSProperties = onFieldClick ? { cursor: "pointer" } : {};
  const handleClick = (e: React.MouseEvent) => {
    if (!onFieldClick) return;
    const target = (e.target as HTMLElement).closest("[data-edit-field]") as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    onFieldClick(target.dataset.editField!);
  };

  return (
    <div
      className="max-w-[580px] mx-auto font-sans text-sm"
      onClickCapture={onFieldClick ? handleClick : undefined}
    >
      {/* E-Mail-Client-Rahmen */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white">

        {/* Simulated E-Mail Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-1">
          <div
            className="flex gap-2 text-xs text-gray-500 dark:text-gray-400"
            data-edit-field="email_sender"
            style={{ ...editCursor, ...hl("email_sender") }}
          >
            <span className="font-medium w-12 shrink-0">Von:</span>
            <span>{state.emailSenderLocal ? `${state.emailSenderLocal}@anfragebestaetigung.de` : "noreply@anfragebestaetigung.de"}</span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">An:</span>
            <span>kunde@beispiel.de</span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">Betreff:</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Ihre Anfrage bei {companyName || "Ihrer Firma"}
            </span>
          </div>
        </div>

        {/* E-Mail Body */}
        <div style={{ backgroundColor: "#f6f9fc" }} className="p-6">
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              overflow: "hidden",
              maxWidth: "540px",
              margin: "0 auto",
            }}
          >
            {/* Header Banner */}
            <div
              data-edit-field="header_banner"
              style={{ backgroundColor: primary, padding: "24px 28px", ...editCursor, ...hlEdge("header_banner", "footer_company") }}
            >
              <p
                style={{
                  color: "#ffffff",
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                {companyName || "Ihre Firma"}
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: "28px 28px 20px" }}>
              <h1
                style={{
                  color: primary,
                  fontSize: "22px",
                  fontWeight: "bold",
                  margin: "0 0 12px",
                }}
              >
                Vielen Dank, Max!
              </h1>

              <p
                data-edit-field="success_message"
                style={{ color: "#374151", fontSize: "14px", lineHeight: "22px", margin: "0 0 8px", ...editCursor, ...hl("success_message") }}
              >
                {state.successMessage || "Vielen Dank! Wir melden uns in Kürze bei Ihnen."}
              </p>

              <p
                data-edit-field="response_message"
                style={{ color: "#6b7280", fontSize: "14px", lineHeight: "22px", margin: "0 0 16px", ...editCursor, ...hl("response_message") }}
              >
                {state.responseMessage || "Wir melden uns so schnell wie möglich bei Ihnen."}
              </p>

              {/* Antworten-Übersicht */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "14px 18px",
                  borderRadius: "6px",
                  borderLeft: `4px solid ${primary}`,
                  margin: "0 0 16px",
                }}
              >
                <p
                  data-edit-field="answers_overview_label"
                  style={{ fontWeight: "bold", fontSize: "13px", color: "#1f2937", margin: "0 0 10px", ...editCursor, ...hl("answers_overview_label") }}
                >
                  {state.answersOverviewLabel || "Ihre Angaben im Überblick:"}
                </p>
                {visibleQuestions.map((q) => {
                  const display = resolveAnswer(q, mockAnswers);
                  if (!display) return null;
                  return (
                    <p key={q.id} style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px" }}>
                      <span style={{ color: "#6b7280" }}>{q.title.replace("?", "")}:</span>{" "}
                      <strong>{display}</strong>
                    </p>
                  );
                })}
                {visibleQuestions.length === 0 && (
                  <p style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                    Hier erscheinen die Antworten des Leads.
                  </p>
                )}
              </div>

              <hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />

              {/* Kontakt */}
              <p style={{ color: "#374151", fontSize: "13px", lineHeight: "20px", margin: 0 }}>
                <strong>Ihr Ansprechpartner:</strong>
                <br />
                {companyName || "Ihre Firma"}
                <br />
                <a href={`mailto:${publicEmail}`} style={{ color: primary }}>
                  {publicEmail || "kontakt@beispiel.de"}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
        Diese E-Mail geht automatisch an den Anfragenden.
      </p>
    </div>
  );
}
