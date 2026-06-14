"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CornerDownRight, Plus, Split, Trash2 } from "lucide-react";
import type { EditorQuestion, LogicOp, LogicRule } from "@/types";
import { toKey } from "@/lib/editorUtils";
import { EditorModal } from "./ui/EditorModal";
import { EditorButton, Select, TextInput } from "./ui/Controls";

// =============================================================================
// Aufgabe 58 — Regel-Editor für die Logik-Sprünge EINES Steps (Typeform-Layout):
//
//   Wenn [Feld] [ist/ist nicht/enthält] [Wert]  →  gehe zu [Schritt | Ende]
//   + Regel · ↑/↓-Reihenfolge (erste matchende gewinnt) · Löschen
//   „Alle anderen Fälle" → (nächster Schritt | Schritt | Ende)
//
// Speichern ersetzt die Regeln des Steps atomar (PUT /logic/[pageId] → RPC).
// Nur Vorwärts-Ziele wählbar (Server prüft zusätzlich). v1-Bedingung = Antwort
// des eigenen Steps; das Schema kann mehr (fieldKey ist frei).
// =============================================================================

interface AnswerField {
  key: string;            // answers-Key im Widget (= field_key in der DB)
  label: string;
  kind: "options" | "string-options" | "boolean" | "numeric" | "text";
  multi: boolean;         // multi_choice → Operator „enthält" (includes)
  options: Array<{ label: string; value: string }>;
}

interface DraftCondition {
  fieldKey: string;
  op: LogicOp;
  value: string;
}

interface DraftRule {
  _id: string;
  conditions: DraftCondition[];
  target: string; // "end" | pageId (dbId eines späteren Steps)
}

function makeId(): string {
  return `lr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Antwortbare Felder eines Steps (Frage: das eine Feld; Karte: alle sichtbaren Felder). */
function answerFieldsOf(q: EditorQuestion): AnswerField[] {
  if (q.kind === "welcome") return [];
  if (q.kind === "custom") {
    return (q.customFields ?? [])
      .filter((f) => f.visible)
      .map((f) => {
        const isChoice = f.type === "radio" || f.type === "dropdown" || f.type === "multi_choice";
        const isNumeric = f.type === "number" || f.type === "slider" || f.type === "rating" || f.type === "scale";
        return {
          key: f.key,
          label: f.label || f.key,
          kind: f.type === "checkbox" ? "boolean" : isChoice ? "string-options" : isNumeric ? "numeric" : "text",
          multi: f.type === "multi_choice",
          // Karten-Options sind plain strings — der gespeicherte answers-Wert IST der String.
          options: (f.options ?? []).map((o) => ({ label: o, value: o })),
        } as AnswerField;
      });
  }
  // Frage-Seite: genau ein antwortbares Feld. Statement hat keins (nur „Alle anderen Fälle" nutzbar).
  if (q.questionType === "statement") return [];
  const isChoice = q.questionType === "single_choice" || q.questionType === "multi_choice" || q.questionType === "dropdown";
  const isNumeric = q.questionType === "number" || q.questionType === "slider" || q.questionType === "rating" || q.questionType === "scale";
  return [
    {
      // answers-Key im Live-Widget = field_key = questionKey (Save-Pfad hält sie synchron).
      key: q.questionKey,
      label: q.title || "Antwort",
      kind: q.questionType === "checkbox" ? "boolean" : isChoice ? "options" : isNumeric ? "numeric" : "text",
      multi: q.questionType === "multi_choice",
      // Dieselbe Value-Ableitung wie der Save-Pfad (editorUtils Z. ~621): o.value || toKey(o.label).
      options: q.options
        .filter((o) => o.label.trim())
        .map((o) => ({ label: o.label, value: o.value || toKey(o.label) })),
    },
  ];
}

const OP_LABELS: Record<LogicOp, string> = {
  eq:       "ist",
  neq:      "ist nicht",
  includes: "enthält",
  contains: "enthält",
  gte:      "mindestens (≥)",
  lte:      "höchstens (≤)",
  gt:       "größer als (>)",
  lt:       "kleiner als (<)",
};

function opLabel(op: LogicOp): string {
  return OP_LABELS[op] ?? "ist";
}

// Operatoren je Feld-Art (Stavros-Befund 2026-06-11: pro Typ muss die Abfrage passen):
//   • Choice/Boolean: ist / ist nicht (kanonische Werte)
//   • Freitext: zusätzlich „enthält" (Substring); Vergleich ist ohnehin case-insensitiv
//   • Numerisch (Slider/Zahl/Bewertung/Skala): ist / mindestens / höchstens / größer / kleiner / ist nicht
function opsFor(field: AnswerField | undefined): readonly LogicOp[] {
  if (!field) return ["eq", "neq"];
  if (field.multi) return ["includes", "neq"];
  if (field.kind === "text") return ["eq", "contains", "neq"];
  if (field.kind === "numeric") return ["eq", "gte", "lte", "gt", "lt", "neq"];
  return ["eq", "neq"];
}

export function LogicRuleModal({
  open,
  onClose,
  funnelSlug,
  sourceIndex,
  questions,
  rules,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  funnelSlug: string;
  sourceIndex: number;
  questions: EditorQuestion[];
  /** Alle Regeln des Funnels — der Modal filtert auf die Quell-Page. */
  rules: LogicRule[];
  onSaved: () => void;
}) {
  const sourceQ = questions[sourceIndex];
  const sourcePageId = sourceQ?.dbId;

  const fields = useMemo(() => (sourceQ ? answerFieldsOf(sourceQ) : []), [sourceQ]);
  // Felder ohne key sind (noch) nicht logik-fähig: der field_key wird beim Funnel-Save
  // generiert und seit Aufgabe 58 zurückgemerged — Alt-Steps brauchen einmal Speichern.
  const usableFields = useMemo(() => fields.filter((f) => f.key), [fields]);

  // Ziele: nur SPÄTERE gespeicherte Steps (vorwärts-only), Welcome ausgeschlossen.
  // Nummerierung wie in der StepList (Welcome zählt nicht mit).
  const targets = useMemo(() => {
    const out: Array<{ pageId: string; label: string }> = [];
    let number = 0;
    questions.forEach((q, idx) => {
      if (q.kind !== "welcome") number++;
      if (idx <= sourceIndex || q.kind === "welcome" || !q.dbId) return;
      out.push({ pageId: q.dbId, label: `${number} · ${q.title || "Unbenannt"}` });
    });
    return out;
  }, [questions, sourceIndex]);

  const [draftRules, setDraftRules] = useState<DraftRule[]>([]);
  const [fallbackTarget, setFallbackTarget] = useState<string>("next"); // "next" | "end" | pageId
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beim Öffnen aus den geladenen Regeln initialisieren.
  useEffect(() => {
    if (!open || !sourcePageId) return;
    const ofPage = rules
      .filter((r) => r.sourcePageId === sourcePageId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    setDraftRules(
      ofPage
        .filter((r) => !r.isFallback)
        .map((r) => ({
          _id: makeId(),
          conditions: r.conditions.map((c) => ({ fieldKey: c.fieldKey, op: c.op, value: c.value })),
          target: r.targetType === "end" ? "end" : (r.targetPageId ?? ""),
        })),
    );
    const fb = ofPage.find((r) => r.isFallback);
    setFallbackTarget(fb ? (fb.targetType === "end" ? "end" : (fb.targetPageId ?? "next")) : "next");
    setError(null);
    // rules/sourcePageId reichen — bei jedem Öffnen frisch initialisieren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourcePageId, rules]);

  if (!sourceQ || !sourcePageId) return null;

  const defaultField = usableFields[0];

  function addRule() {
    if (!defaultField || targets.length === 0) return;
    setDraftRules((prev) => [
      ...prev,
      {
        _id: makeId(),
        conditions: [
          {
            fieldKey: defaultField.key,
            op: defaultField.multi ? "includes" : "eq",
            value: defaultField.options[0]?.value ?? (defaultField.kind === "boolean" ? "true" : ""),
          },
        ],
        target: targets[0]?.pageId ?? "end",
      },
    ]);
  }

  function patchRule(id: string, patch: Partial<DraftRule>) {
    setDraftRules((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  function moveRule(id: string, dir: -1 | 1) {
    setDraftRules((prev) => {
      const idx = prev.findIndex((r) => r._id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        rules: [
          ...draftRules.map((r) => ({
            isFallback: false,
            conditions: r.conditions.map((c) => ({ fieldKey: c.fieldKey, op: c.op, value: c.value })),
            targetType: r.target === "end" ? "end" : "page",
            targetPageId: r.target === "end" ? null : r.target,
          })),
          // Fallback nur persistieren, wenn er vom Default („nächster Schritt") abweicht.
          ...(fallbackTarget !== "next"
            ? [{
                isFallback: true,
                conditions: [],
                targetType: fallbackTarget === "end" ? "end" : "page",
                targetPageId: fallbackTarget === "end" ? null : fallbackTarget,
              }]
            : []),
        ],
      };
      const res = await fetch(`/api/tenant/funnels/${funnelSlug}/logic/${sourcePageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const invalid = draftRules.some(
    (r) => r.conditions.some((c) => !c.fieldKey || !c.value.trim()) || !r.target,
  );

  return (
    <EditorModal
      open={open}
      onClose={onClose}
      title="Logik bearbeiten"
      scope={`Schritt: ${sourceQ.title || "Unbenannt"}`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-xs text-red-600 dark:text-red-400">{error ?? ""}</p>
          <div className="flex shrink-0 gap-2">
            <EditorButton variant="secondary" onClick={onClose}>Abbrechen</EditorButton>
            <EditorButton variant="primary" onClick={save} loading={saving} disabled={invalid}>
              Speichern
            </EditorButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {targets.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
            Keine möglichen Ziele: nach diesem Schritt gibt es keine gespeicherten Schritte.
            Sprünge gehen nur vorwärts.
          </p>
        )}

        {fields.length === 0 && targets.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dieser Schritt hat keine Antwort — nutze „Alle anderen Fälle" für einen festen Sprung.
          </p>
        )}

        {fields.length > 0 && usableFields.length === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
            Dieser Schritt hat noch keinen Feld-Schlüssel — bitte den Funnel einmal speichern,
            danach lassen sich hier Regeln anlegen.
          </p>
        )}

        {/* Regeln — erste matchende gewinnt */}
        {draftRules.map((rule, ruleIdx) => (
          <div
            key={rule._id}
            className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-800/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <Split size={11} />
                Regel {ruleIdx + 1}
              </span>
              <span className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveRule(rule._id, -1)}
                  disabled={ruleIdx === 0}
                  title="Früher prüfen"
                  className="rounded p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => moveRule(rule._id, 1)}
                  disabled={ruleIdx === draftRules.length - 1}
                  title="Später prüfen"
                  className="rounded p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-30 dark:hover:text-gray-200"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setDraftRules((prev) => prev.filter((r) => r._id !== rule._id))}
                  title="Regel löschen"
                  className="rounded p-1 text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </div>

            {rule.conditions.map((cond, condIdx) => {
              const field = usableFields.find((f) => f.key === cond.fieldKey) ?? usableFields[0];
              return (
                <div key={condIdx} className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {condIdx === 0 ? "Wenn" : "und"}
                  </span>
                  {usableFields.length > 1 && (
                    <div className="min-w-36 flex-1">
                      <Select
                        value={cond.fieldKey}
                        onChange={(e) => {
                          const nf = usableFields.find((f) => f.key === e.target.value);
                          patchRule(rule._id, {
                            conditions: rule.conditions.map((c, i) =>
                              i === condIdx
                                ? {
                                    fieldKey: e.target.value,
                                    op: nf?.multi ? "includes" : "eq",
                                    value: nf?.options[0]?.value ?? (nf?.kind === "boolean" ? "true" : ""),
                                  }
                                : c,
                            ),
                          });
                        }}
                      >
                        {usableFields.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="w-44 shrink-0">
                    <Select
                      value={cond.op}
                      onChange={(e) =>
                        patchRule(rule._id, {
                          conditions: rule.conditions.map((c, i) =>
                            i === condIdx ? { ...c, op: e.target.value as LogicOp } : c,
                          ),
                        })
                      }
                    >
                      {opsFor(field).map((op) => (
                        <option key={op} value={op}>{opLabel(op)}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="min-w-36 flex-1">
                    {field && (field.kind === "options" || field.kind === "string-options") && field.options.length > 0 ? (
                      <Select
                        value={cond.value}
                        onChange={(e) =>
                          patchRule(rule._id, {
                            conditions: rule.conditions.map((c, i) =>
                              i === condIdx ? { ...c, value: e.target.value } : c,
                            ),
                          })
                        }
                      >
                        {field.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    ) : field?.kind === "boolean" ? (
                      <Select
                        value={cond.value}
                        onChange={(e) =>
                          patchRule(rule._id, {
                            conditions: rule.conditions.map((c, i) =>
                              i === condIdx ? { ...c, value: e.target.value } : c,
                            ),
                          })
                        }
                      >
                        <option value="true">angehakt</option>
                        <option value="false">nicht angehakt</option>
                      </Select>
                    ) : (
                      <TextInput
                        value={cond.value}
                        inputMode={field?.kind === "numeric" ? "decimal" : undefined}
                        placeholder={field?.kind === "numeric" ? "z. B. 42" : "Wert"}
                        onChange={(e) =>
                          patchRule(rule._id, {
                            conditions: rule.conditions.map((c, i) =>
                              i === condIdx ? { ...c, value: e.target.value } : c,
                            ),
                          })
                        }
                      />
                    )}
                  </div>
                  {rule.conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        patchRule(rule._id, { conditions: rule.conditions.filter((_, i) => i !== condIdx) })
                      }
                      title="Bedingung entfernen"
                      className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {rule.conditions.length < 5 && usableFields.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  patchRule(rule._id, {
                    conditions: [
                      ...rule.conditions,
                      {
                        fieldKey: defaultField.key,
                        op: defaultField.multi ? "includes" : "eq",
                        value: defaultField.options[0]?.value ?? (defaultField.kind === "boolean" ? "true" : ""),
                      },
                    ],
                  })
                }
                className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus size={12} />
                Bedingung (und)
              </button>
            )}

            <div className="flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
              <CornerDownRight size={14} className="shrink-0 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">gehe zu</span>
              <div className="min-w-40 flex-1">
                <Select
                  value={rule.target}
                  onChange={(e) => patchRule(rule._id, { target: e.target.value })}
                >
                  {targets.map((t) => (
                    <option key={t.pageId} value={t.pageId}>{t.label}</option>
                  ))}
                  <option value="end">Ende (absenden)</option>
                </Select>
              </div>
            </div>
          </div>
        ))}

        {usableFields.length > 0 && targets.length > 0 && (
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary"
          >
            <Plus size={13} />
            Regel hinzufügen
          </button>
        )}

        {/* Else-Zweig */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Alle anderen Fälle gehen zu</span>
          <div className="min-w-40 flex-1">
            <Select value={fallbackTarget} onChange={(e) => setFallbackTarget(e.target.value)}>
              <option value="next">nächster Schritt (Standard)</option>
              {targets.map((t) => (
                <option key={t.pageId} value={t.pageId}>{t.label}</option>
              ))}
              <option value="end">Ende (absenden)</option>
            </Select>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
          Regeln werden von oben nach unten geprüft — die erste zutreffende gewinnt.
          Sprünge gehen nur vorwärts.
        </p>
      </div>
    </EditorModal>
  );
}
