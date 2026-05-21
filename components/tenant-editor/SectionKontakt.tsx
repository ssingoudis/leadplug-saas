"use client";

import { ChevronUp, ChevronDown, HelpCircle } from "lucide-react";
import type { ContactFieldConfig, EditorState } from "@/types";

interface Props {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  onFocus: (field: string) => void;
  fields: ContactFieldConfig[];
  onFieldsChange: (fields: ContactFieldConfig[]) => void;
}

const TYPE_LABELS: Record<string, string> = {
  radio: "Auswahl",
  text: "Text",
  email: "E-Mail",
  tel: "Telefon",
  plz: "PLZ",
};

function Label({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{children}</p>
      {tooltip && (
        <span title={tooltip} className="cursor-help text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
          <HelpCircle size={11} />
        </span>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition";

const textareaClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition resize-none";

export function SectionKontakt({ state, onChange, onFocus, fields, onFieldsChange }: Props) {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  function update(key: string, patch: Partial<ContactFieldConfig>) {
    onFieldsChange(fields.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...sorted];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onFieldsChange(next.map((f, i) => ({ ...f, sort_order: i })));
  }

  function moveDown(idx: number) {
    if (idx === sorted.length - 1) return;
    const next = [...sorted];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onFieldsChange(next.map((f, i) => ({ ...f, sort_order: i })));
  }

  return (
    <div className="space-y-4">
      {/* Formular-Überschrift */}
      <div>
        <Label tooltip="Wird als H1-Überschrift ganz oben im Kontaktformular angezeigt.">
          Formular-Überschrift
        </Label>
        <input
          type="text"
          value={state.funnelTitle}
          onChange={(e) => onChange({ funnelTitle: e.target.value })}
          onFocus={() => onFocus("funnel_title")}
          placeholder="Jetzt kostenloses Angebot anfordern"
          className={inputClass}
        />
      </div>

      {/* Untertitel */}
      <div>
        <Label tooltip="Kleinere Textzeile unter der Hauptüberschrift im Kontaktformular.">
          Untertitel
        </Label>
        <input
          type="text"
          value={state.contactFormSubtitle}
          onChange={(e) => onChange({ contactFormSubtitle: e.target.value })}
          onFocus={() => onFocus("contact_form_subtitle")}
          placeholder="Wer soll das Angebot erhalten?"
          className={inputClass}
        />
      </div>

      {/* Absenden-Button */}
      <div>
        <Label tooltip="Beschriftung des Absenden-Buttons im Kontaktformular.">
          Absenden-Button
        </Label>
        <input
          type="text"
          value={state.submitButtonLabel}
          onChange={(e) => onChange({ submitButtonLabel: e.target.value })}
          onFocus={() => onFocus("submit_button")}
          placeholder="Anfrage absenden"
          className={inputClass}
        />
      </div>

      {/* Trennlinie: Felder */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
          Formular-Felder
        </p>
        <div className="space-y-2">
          {sorted.map((field, idx) => (
            <div
              key={field.key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === sorted.length - 1}
                  className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {field.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {TYPE_LABELS[field.type] ?? field.type}
                </p>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={!field.visible}
                  onChange={(e) => update(field.key, { required: e.target.checked })}
                  className="rounded disabled:opacity-40"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Pflicht</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={field.visible}
                  onChange={(e) => {
                    const visible = e.target.checked;
                    update(field.key, { visible, required: visible ? field.required : false });
                  }}
                  className="rounded"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Anzeigen</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Trennlinie: Datenschutz & Footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Datenschutz & Footer
        </p>

        <div>
          <Label tooltip="Text unterhalb des Absenden-Buttons, der auf die Datenschutzerklärung hinweist.">
            Datenschutz-Text
          </Label>
          <textarea
            value={state.privacyText}
            onChange={(e) => onChange({ privacyText: e.target.value })}
            onFocus={() => onFocus("privacy_text")}
            rows={3}
            placeholder="Mit dem Absenden stimme ich zu..."
            className={textareaClass}
          />
        </div>

        <div>
          <Label tooltip="Wenn eingetragen, wird 'Datenschutzhinweise' als klickbarer Link angezeigt. Ohne URL erscheint der Text trotzdem.">
            Datenschutz-URL
          </Label>
          <input
            type="text"
            value={state.privacyPolicyUrl}
            onChange={(e) => onChange({ privacyPolicyUrl: e.target.value })}
            onFocus={() => onFocus("")}
            placeholder="https://beispiel.de/datenschutz"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
