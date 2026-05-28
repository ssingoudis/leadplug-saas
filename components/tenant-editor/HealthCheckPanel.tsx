"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, ChevronDown, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorState } from "@/types";

// Bewusst NUR echte, blockierende Hinweise — alles mit sinnvollem Default zählt nicht als "Hinweis".
// Sonst entstehen für den User unklare graue Empfehlungen ("ist das ein Fehler? eine Tipp?").
interface Issue {
  message: string;
  field: string; // data-field oder Section-Key — wird an onJumpTo gegeben
  questionIndex?: number; // bei Frage-bezogenen Issues
}

function computeIssues(state: EditorState): Issue[] {
  const issues: Issue[] = [];

  // Funnel-Name (für interne Verwaltung)
  if (!state.funnelName.trim()) {
    issues.push({ message: "Funnel-Name fehlt", field: "funnel_name" });
  }

  // Fragen
  const visibleQuestions = state.questions.filter((q) => q.visible !== false);
  if (state.questions.length === 0) {
    issues.push({ message: "Noch keine Fragen angelegt", field: "question_title" });
  } else if (visibleQuestions.length === 0) {
    issues.push({ message: "Alle Fragen ausgeblendet", field: "question_title" });
  }

  // Fragen ohne Titel oder kaputte Choice-Konfiguration (visible-Index pro Frage)
  let vIdx = 0;
  state.questions.forEach((q) => {
    if (q.visible === false) return;
    if (!q.title.trim()) {
      issues.push({
        message: `Frage ${vIdx + 1} hat keinen Titel`,
        field: "question_title",
        questionIndex: vIdx,
      });
    }
    if (
      q.questionType === "single_choice" ||
      q.questionType === "multi_choice" ||
      q.questionType === "dropdown"
    ) {
      const emptyOpts = q.options.filter((o) => !o.label.trim()).length;
      if (emptyOpts > 0) {
        issues.push({
          message: `Frage ${vIdx + 1}: ${emptyOpts} Antwortoption(en) ohne Text`,
          field: "option_0",
          questionIndex: vIdx,
        });
      }
      if (q.options.length < 2) {
        issues.push({
          message: `Frage ${vIdx + 1}: braucht mindestens 2 Antwortoptionen`,
          field: "option_0",
          questionIndex: vIdx,
        });
      }
    }
    vIdx++;
  });

  // Kontaktformular: muss mindestens ein Pflichtfeld haben
  const visibleContactFields = state.contactFields.filter((f) => f.visible);
  if (visibleContactFields.length === 0) {
    issues.push({ message: "Keine sichtbaren Kontaktfelder", field: "contact_form_title" });
  } else if (!visibleContactFields.some((f) => f.required)) {
    issues.push({ message: "Kontaktformular hat kein Pflichtfeld", field: "contact_form_title" });
  }

  return issues;
}

interface Props {
  state: EditorState;
  onJumpTo: (field: string, questionVisibleIndex?: number) => void;
}

export function HealthCheckPanel({ state, onJumpTo }: Props) {
  const issues = computeIssues(state);
  const isComplete = issues.length === 0;
  const isActive = state.isActive;

  // Drei Zustände in absteigender Priorität:
  // 1. Issues → amber "X Hinweise"
  // 2. Komplett aber inaktiv → grau "Inaktiv" (Konfiguration ok, aber Funnel nicht öffentlich)
  // 3. Komplett und aktiv → grün "Vollständig"
  const status: "issues" | "inactive" | "ready" = !isComplete
    ? "issues"
    : !isActive
      ? "inactive"
      : "ready";

  const [open, setOpen] = useState(status !== "ready");

  const statusMeta = {
    ready: {
      icon: <CheckCircle2 size={15} className="text-green-500 shrink-0" />,
      badgeText: "Vollständig",
      badgeClass:
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
    },
    inactive: {
      icon: <Power size={15} className="text-gray-400 shrink-0" />,
      badgeText: "Inaktiv",
      badgeClass:
        "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    },
    issues: {
      icon: <AlertCircle size={15} className="text-amber-500 shrink-0" />,
      badgeText: `${issues.length} ${issues.length === 1 ? "Hinweis" : "Hinweise"}`,
      badgeClass:
        "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
    },
  }[status];

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {statusMeta.icon}
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
            Konfiguration
          </p>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
              statusMeta.badgeClass,
            )}
          >
            {statusMeta.badgeText}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-gray-400 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="px-6 pb-3 space-y-1.5">
          {status === "ready" && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Alles konfiguriert — Funnel ist live und erreichbar.
            </p>
          )}

          {status === "inactive" && (
            <button
              type="button"
              onClick={() => onJumpTo("funnel_status_toggle")}
              className="w-full flex items-start gap-2 text-left text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
            >
              <Power size={11} className="shrink-0 mt-0.5" />
              <span className="underline-offset-2 group-hover:underline">
                Konfiguration vollständig, aber Funnel ist deaktiviert — jetzt aktivieren
              </span>
            </button>
          )}

          {status === "issues" &&
            issues.map((issue, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onJumpTo(issue.field, issue.questionIndex)}
                className="w-full flex items-start gap-2 text-left text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors group"
              >
                <AlertCircle size={11} className="shrink-0 mt-0.5" />
                <span className="underline-offset-2 group-hover:underline">
                  {issue.message}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
