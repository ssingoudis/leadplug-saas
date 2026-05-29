"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { EditorQuestion } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: EditorQuestion[];  // für after_page-Dropdown — nur questions mit dbId zeigen
  onCreate: (payload: {
    url: string;
    trigger_type: "on_submit" | "after_page";
    trigger_page_id?: string | null;
    event_types: string[];
  }) => Promise<void>;
}

export function WebhookAddModal({ open, onClose, questions, onCreate }: Props) {
  const [url, setUrl] = useState("");
  const [triggerType, setTriggerType] = useState<"on_submit" | "after_page">("on_submit");
  const [triggerPageId, setTriggerPageId] = useState<string>("");
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeAbandoned, setIncludeAbandoned] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // Nur gespeicherte Pages können als after_page-Trigger gewählt werden
  // (haben dbId aus DB). Welcome-Pages werden ignoriert (nichts dahinter zu triggern).
  const savedPages = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => Boolean(q.dbId) && q.kind !== "welcome");

  function reset() {
    setUrl("");
    setTriggerType("on_submit");
    setTriggerPageId("");
    setIncludeCompleted(true);
    setIncludeAbandoned(true);
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    const trimmed = url.trim();
    if (!/^https?:\/\/[^\s]{6,}$/i.test(trimmed)) {
      setError("Bitte eine gültige URL eingeben (https://… mindestens 10 Zeichen).");
      return;
    }
    if (triggerType === "after_page" && !triggerPageId) {
      setError("Bitte einen Schritt für den Trigger auswählen.");
      return;
    }
    const events: string[] = [];
    if (triggerType === "on_submit") {
      if (includeCompleted) events.push("submission.completed");
      if (includeAbandoned) events.push("submission.abandoned");
      if (events.length === 0) {
        setError("Mindestens ein Event muss ausgewählt sein.");
        return;
      }
    } else {
      events.push("step.advanced");
    }

    setSubmitting(true);
    try {
      await onCreate({
        url: trimmed,
        trigger_type: triggerType,
        trigger_page_id: triggerType === "after_page" ? triggerPageId : null,
        event_types: events,
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anlage fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Neuen Webhook hinzufügen</h2>
          <button onClick={handleClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Schließen">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Endpoint-URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://dein-crm.example.com/webhook"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Die URL deines CRMs (Zapier, Make, Pipedream, n8n, eigener Endpoint).
            </p>
          </div>

          {/* Trigger */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Wann soll der Webhook feuern?
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700">
                <input
                  type="radio"
                  checked={triggerType === "on_submit"}
                  onChange={() => setTriggerType("on_submit")}
                  className="mt-1 accent-primary"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">Am Ende des Funnels</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Feuert wenn der Endkunde alle Fragen beantwortet hat.</p>
                </div>
              </label>

              <label className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer ${savedPages.length === 0 ? "opacity-50 cursor-not-allowed" : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"}`}>
                <input
                  type="radio"
                  checked={triggerType === "after_page"}
                  onChange={() => savedPages.length > 0 && setTriggerType("after_page")}
                  disabled={savedPages.length === 0}
                  className="mt-1 accent-primary"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">Nach einer bestimmten Frage</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {savedPages.length === 0
                      ? "Bitte zuerst speichern um Schritte auswählen zu können."
                      : "Lead-Qualifizierung mitten im Funnel — z.B. Email + Telefon übertragen, bevor die letzte Frage durch ist."}
                  </p>
                </div>
              </label>
            </div>

            {triggerType === "after_page" && savedPages.length > 0 && (
              <select
                value={triggerPageId}
                onChange={(e) => setTriggerPageId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary focus:outline-none"
              >
                <option value="">Schritt auswählen…</option>
                {savedPages.map(({ q, idx }) => (
                  <option key={q.dbId} value={q.dbId}>
                    {idx + 1}. {q.title || "Unbenannte Frage"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Events (nur bei on_submit relevant) */}
          {triggerType === "on_submit" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Welche Events?
              </label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                  <input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)} className="accent-primary" />
                  <span>Lead vollständig abgesendet (<code className="text-xs">submission.completed</code>)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                  <input type="checkbox" checked={includeAbandoned} onChange={(e) => setIncludeAbandoned(e.target.checked)} className="accent-primary" />
                  <span>Lead abgebrochen, aber Email oder Tel. vorhanden (<code className="text-xs">submission.abandoned</code>)</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Abbrecher werden ca. 10 Min nach letzter Aktivität als „verloren" gewertet.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button onClick={handleClose} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? "Anlegen…" : "Webhook anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
