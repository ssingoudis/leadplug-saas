"use client";

import type { EditorState, QuestionConfig } from "@/types";
import { resolveAnswer } from "@/lib/resolveAnswer";

interface Props {
  state: EditorState;
  questions: QuestionConfig[];
  mockAnswers: Record<string, string>;
  companyName: string;
}

const MOCK_CONTACT: Record<string, string> = {
  anrede: "Herr",
  name: "Max Mustermann",
  vorname: "Max",
  nachname: "Mustermann",
  email: "max.mustermann@beispiel.de",
  telefon: "+49 123 456 789",
  phone: "+49 123 456 789",
  plz: "80331",
  ort: "München",
  adresse: "Musterstraße 1",
};

const MOCK_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
}).format(new Date());

export function LeadEmailPreviewMockup({
  state,
  questions,
  mockAnswers,
  companyName,
}: Props) {
  const primary = state.primaryColor || "#22c55e";
  const visibleQuestions = questions.filter((q) => q.visible !== false);
  const visibleContactFields = [...state.contactFields]
    .filter((f) => f.visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-145 mx-auto font-sans text-sm">
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-white">

        {/* Simulierter E-Mail-Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-1">
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">Von:</span>
            <span>anfrage@leadplug.de</span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">An:</span>
            <span>{state.notificationEmail || "anfragen@ihrefirma.de"}</span>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium w-12 shrink-0">Betreff:</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              Neue Anfrage von Max Mustermann
            </span>
          </div>
        </div>

        {/* E-Mail Body */}
        <div style={{ backgroundColor: "#f6f9fc" }} className="p-4">
          <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", maxWidth: "540px", margin: "0 auto" }}>

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
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 20px" }}>
                Eingegangen: {MOCK_DATE} Uhr
              </p>

              {/* Kontaktdaten */}
              <div style={{ backgroundColor: "#f9fafb", padding: "14px 18px", borderRadius: "6px", borderLeft: `4px solid ${primary}`, marginBottom: "16px" }}>
                <p style={{ fontSize: "13px", fontWeight: "bold", margin: "0 0 10px", color: "#1f2937" }}>
                  Kontaktdaten:
                </p>
                {visibleContactFields.length > 0 ? visibleContactFields.map((field) => {
                  const mockVal = MOCK_CONTACT[field.key]
                    ?? (field.type === "radio" && field.options?.[0])
                    ?? "Beispielwert";
                  const isEmail = field.type === "email";
                  const isTel = field.type === "tel";
                  return (
                    <p key={field.key} style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px", lineHeight: "20px" }}>
                      <span style={{ color: "#6b7280" }}>{field.label}:</span>{" "}
                      {isEmail || isTel ? (
                        <span style={{ color: primary }}><strong>{mockVal}</strong></span>
                      ) : (
                        <strong>{mockVal}</strong>
                      )}
                    </p>
                  );
                }) : (
                  <p style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                    Keine Kontaktfelder konfiguriert.
                  </p>
                )}
              </div>

              {/* Antworten */}
              <div style={{ backgroundColor: "#f9fafb", padding: "14px 18px", borderRadius: "6px", marginBottom: "20px" }}>
                <p style={{ fontSize: "13px", fontWeight: "bold", margin: "0 0 10px", color: "#1f2937" }}>
                  {state.answersOverviewLabel || "Angaben im Überblick:"}
                </p>
                {visibleQuestions.map((q) => {
                  const display = resolveAnswer(q, mockAnswers);
                  return (
                    <p key={q.id} style={{ fontSize: "13px", color: "#374151", margin: "0 0 4px" }}>
                      <span style={{ color: "#6b7280" }}>{q.title.replace("?", "")}:</span>{" "}
                      <strong>{display ?? "—"}</strong>
                    </p>
                  );
                })}
                {visibleQuestions.length === 0 && (
                  <p style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                    Noch keine Fragen konfiguriert.
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

            <hr style={{ borderColor: "#e5e7eb", margin: "0 24px" }} />
            <p style={{ fontSize: "11px", color: "#9ca3af", margin: "12px 0", textAlign: "center" }}>
              Übermittelt von <span style={{ color: "#9ca3af" }}>leadplug.de</span>
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">
        Diese E-Mail geht automatisch an den Lead-Empfänger.
      </p>
    </div>
  );
}
