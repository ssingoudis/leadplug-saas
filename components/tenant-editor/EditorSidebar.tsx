"use client";

import { useState } from "react";
import { Loader2, Save, AlertCircle, Power, TriangleAlert, X } from "lucide-react";
import { SectionAccordion } from "./SectionAccordion";
import { SectionDesign } from "./SectionDesign";
import { SectionTexte } from "./SectionTexte";
import { SectionFragen } from "./SectionFragen";
import { SectionKontakt } from "./SectionKontakt";
import type { EditorState, EditorQuestion, ContactFieldConfig } from "@/types";

interface Props {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  originalSlug?: string;
  isSaving: boolean;
  saveError: string | null;
  canSave: boolean;
  onSave: () => void;
  onFocus: (field: string, questionVisibleIndex?: number) => void;
}

function DeactivateModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              <TriangleAlert size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                Funnel deaktivieren?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Der Funnel wird sofort für alle Besucher unsichtbar. Bestehende Einbettungen auf deiner Website zeigen einen leeren Bereich.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 px-4 py-3 text-xs text-amber-800 dark:text-amber-400 mb-5">
            Neue Leads können erst wieder eingehen, wenn du den Funnel erneut aktivierst.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
            >
              Deaktivieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorSidebar({
  state,
  onChange,
  originalSlug,
  isSaving,
  saveError,
  canSave,
  onSave,
  onFocus,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    fragen: true,
    texte: false,
    design: false,
    kontakt: false,
  });
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  function toggle(key: string) {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleStatusToggle() {
    if (state.isActive) {
      setShowDeactivateModal(true);
    } else {
      onChange({ isActive: true });
    }
  }

  function confirmDeactivate() {
    onChange({ isActive: false });
    setShowDeactivateModal(false);
  }

  return (
    <>
      {showDeactivateModal && (
        <DeactivateModal
          onConfirm={confirmDeactivate}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">
                {originalSlug ? "Funnel bearbeiten" : "Neuer Funnel"}
              </p>
              <input
                type="text"
                value={state.funnelName}
                onChange={(e) => onChange({ funnelName: e.target.value })}
                placeholder="Funnel-Name eingeben…"
                className="text-sm font-bold text-gray-900 dark:text-white bg-transparent outline-none w-full placeholder-gray-400 dark:placeholder-gray-500 truncate border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary transition-colors pb-0.5"
              />
              {originalSlug && (
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                  /{originalSlug}
                </p>
              )}
              {!originalSlug && !state.funnelName && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  URL wird automatisch vergeben
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || !canSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isSaving ? "Speichert…" : "Speichern"}
            </button>
          </div>

          {saveError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {saveError}
            </div>
          )}
        </div>

        {/* Sektionen */}
        <div className="flex-1 overflow-y-auto">
          <SectionAccordion
            title="Fragen"
            isOpen={open.fragen}
            onToggle={() => toggle("fragen")}
          >
            <SectionFragen
              questions={state.questions}
              onChange={(questions: EditorQuestion[]) => onChange({ questions })}
              onFocus={onFocus}
            />
          </SectionAccordion>

          <SectionAccordion
            title="Kontaktformular"
            isOpen={open.kontakt}
            onToggle={() => toggle("kontakt")}
          >
            <SectionKontakt
              state={state}
              onChange={onChange}
              onFocus={onFocus}
              fields={state.contactFields}
              onFieldsChange={(contactFields: ContactFieldConfig[]) =>
                onChange({ contactFields })
              }
            />
          </SectionAccordion>

          <SectionAccordion
            title="Nachrichten"
            isOpen={open.texte}
            onToggle={() => toggle("texte")}
          >
            <SectionTexte state={state} onChange={onChange} onFocus={onFocus} />
          </SectionAccordion>

          <SectionAccordion
            title="Design"
            isOpen={open.design}
            onToggle={() => toggle("design")}
          >
            <SectionDesign state={state} onChange={onChange} onFocus={onFocus} />
          </SectionAccordion>
        </div>

        {/* Footer — Funnel-Status */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Funnel-Status
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {state.isActive
                  ? "Funnel ist öffentlich erreichbar."
                  : "Funnel ist deaktiviert und nicht erreichbar."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStatusToggle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
                state.isActive
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/40 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <Power size={12} />
              {state.isActive ? "Aktiv" : "Inaktiv"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
