"use client";

import { useState } from "react";
import type { EditorQuestion } from "@/types";
import { EditorModal } from "./ui/EditorModal";
import { TextInput, Select, EditorButton } from "./ui/Controls";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: EditorQuestion[];  // für after_page-Dropdown — nur questions mit dbId zeigen
  onCreate: (payload: {
    url: string;
    name?: string;
    trigger_type: "on_submit" | "after_page";
    trigger_page_id?: string | null;
    event_types: string[];
  }) => Promise<void>;
}

export function WebhookAddModal({ open, onClose, questions, onCreate }: Props) {
  const [name, setName] = useState("");
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
    setName("");
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
    // Aufgabe 54b: konsistent zum Server (validateWebhookUrl) — nur noch https.
    // Die feinere Prüfung (private IPs etc.) macht der Server; sein Fehlertext
    // wird unten via setError angezeigt.
    if (!/^https:\/\/[^\s]{4,}$/i.test(trimmed)) {
      setError("Bitte eine gültige https://-URL eingeben.");
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
        name: name.trim() || undefined,
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
    <EditorModal
      open={open}
      onClose={handleClose}
      scope="Webhook"
      title="Neuen Webhook hinzufügen"
      footer={
        <>
          <EditorButton variant="ghost" onClick={handleClose}>
            Abbrechen
          </EditorButton>
          <EditorButton variant="primary" onClick={handleSubmit} loading={submitting}>
            Webhook anlegen
          </EditorButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Name (optional) */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Name <span className="font-normal normal-case text-gray-400">(optional)</span>
          </label>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Pipedrive CRM — sonst automatisch aus der URL"
          />
        </div>

        {/* URL */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Endpoint-URL
          </label>
          <TextInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://crm.example.com/webhook"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Die URL des CRMs (Zapier, Make, Pipedream, n8n, eigener Endpoint).
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
                    : "Lead-Qualifizierung mitten im Funnel — z. B. E-Mail + Telefon übertragen, bevor die letzte Frage durch ist."}
                </p>
              </div>
            </label>
          </div>

          {triggerType === "after_page" && savedPages.length > 0 && (
            <div className="mt-2">
              <Select value={triggerPageId} onChange={(e) => setTriggerPageId(e.target.value)}>
                <option value="">Schritt auswählen…</option>
                {savedPages.map(({ q, idx }) => (
                  <option key={q.dbId} value={q.dbId}>
                    {idx + 1}. {q.title || "Unbenannte Frage"}
                  </option>
                ))}
              </Select>
            </div>
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
    </EditorModal>
  );
}
