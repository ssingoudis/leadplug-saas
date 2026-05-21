"use client";

import type { EditorState, QuestionConfig } from "@/types";
import { resolveAnswer } from "@/lib/resolveAnswer";

interface Props {
  state: EditorState;
  questions: QuestionConfig[];
  mockAnswers: Record<string, string>;
  companyName: string;
  notificationEmail?: string;
}

const MOCK_LEAD = {
  name: "Max Mustermann",
  email: "max.mustermann@beispiel.de",
  phone: "+49 123 456 789",
};

export function LeadEmailPreviewMockup({
  state,
  questions,
  mockAnswers,
  companyName,
  notificationEmail,
}: Props) {
  const primary = state.primaryColor || "#22c55e";
  const visibleQuestions = questions.filter((q) => q.visible !== false);

  return (
    <div className="max-w-[580px] mx-auto font-sans text-sm">
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white">

        {/* Simulierter E-Mail-Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-1">
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">Von:</span>
            <span>noreply@leadplug.de</span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">An:</span>
            <span>{notificationEmail || "anfragen@ihrefirma.de"}</span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">Betreff:</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Neue Anfrage: {state.funnelTitle || companyName || "Ihr Funnel"}
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
            <div style={{ backgroundColor: primary, padding: "24px 28px" }}>
              <p style={{ color: "#ffffff", fontSize: "18px", fontWeight: "bold", margin: 0 }}>
                {companyName || "Ihre Firma"}
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: "28px 28px 20px" }}>
              <h1 style={{ color: primary, fontSize: "20px", fontWeight: "bold", margin: "0 0 6px" }}>
                Neue Anfrage eingegangen!
              </h1>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 20px" }}>
                Ein neuer Lead hat dein Formular ausgefüllt.
              </p>

              {/* Kontaktdaten des Leads */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "14px 18px",
                  borderRadius: "6px",
                  borderLeft: `4px solid ${primary}`,
                  margin: "0 0 16px",
                }}
              >
                <p style={{ fontWeight: "bold", fontSize: "13px", color: "#1f2937", margin: "0 0 10px" }}>
                  Kontaktdaten:
                </p>
                <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px" }}>
                  <span style={{ color: "#6b7280" }}>Name:</span>{" "}
                  <strong>{MOCK_LEAD.name}</strong>
                </p>
                <p style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px" }}>
                  <span style={{ color: "#6b7280" }}>E-Mail:</span>{" "}
                  <a href={`mailto:${MOCK_LEAD.email}`} style={{ color: primary }}>
                    {MOCK_LEAD.email}
                  </a>
                </p>
                <p style={{ fontSize: "13px", color: "#374151", margin: 0 }}>
                  <span style={{ color: "#6b7280" }}>Telefon:</span>{" "}
                  <strong>{MOCK_LEAD.phone}</strong>
                </p>
              </div>

              {/* Antworten */}
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "14px 18px",
                  borderRadius: "6px",
                  margin: "0 0 20px",
                }}
              >
                <p style={{ fontWeight: "bold", fontSize: "13px", color: "#1f2937", margin: "0 0 10px" }}>
                  {state.answersOverviewLabel || "Angaben im Überblick:"}
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

              {/* CTA */}
              <div style={{ textAlign: "center", margin: "20px 0 8px" }}>
                <a
                  href="#"
                  style={{
                    backgroundColor: primary,
                    color: "#ffffff",
                    padding: "12px 28px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  Lead im Dashboard ansehen →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
        Diese E-Mail geht automatisch an den Lead-Empfänger.
      </p>
    </div>
  );
}
