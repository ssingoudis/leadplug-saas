import type { EditorQuestion, LogicOp, LogicRule } from "@/types";
import { toKey } from "@/lib/editorUtils";

// =============================================================================
// Aufgabe 59 — geteilte Lesefassung für Logik-Regeln.
//
// Aus PropertiesPanel.LogicSection herausgehoben (Aufgabe 58), damit die
// Panel-Kurzfassung und die Logic-Map (LogicMapPanel) dieselbe Sprache
// sprechen: „Wenn ≥ „4" → Schritt 6" · „Alle anderen Fälle → Ende".
// Reine Anzeige-Helfer — die Auswertung lebt in lib/funnelLogic.ts.
// =============================================================================

/** Anzeige-Nummerierung wie in der StepList: Welcome zählt nicht mit. */
export function stepNumbersByDbId(questions: EditorQuestion[]): Map<string, number> {
  const numberByDbId = new Map<string, number>();
  let n = 0;
  for (const q of questions) {
    if (q.kind !== "welcome") n++;
    if (q.dbId) numberByDbId.set(q.dbId, n);
  }
  return numberByDbId;
}

/** Kompakter Operator-Präfix für die Kurzfassung („Wenn ≥ „4" → Schritt 5"). */
export function logicOpPrefix(op: LogicOp): string {
  switch (op) {
    case "neq":      return "nicht ";
    case "contains": return "enthält ";
    case "gte":      return "≥ ";
    case "lte":      return "≤ ";
    case "gt":       return "> ";
    case "lt":       return "< ";
    default:         return "";
  }
}

/** Anzeige-Label eines Bedingungs-Werts: Choice-Slugs werden auf das Options-Label
 *  des Quell-Steps zurückübersetzt; Karten-Options sind plain strings (= Wert). */
export function conditionValueLabel(sourceQ: EditorQuestion, value: string): string {
  if (sourceQ.kind === "custom") return value;
  const opt = sourceQ.options.find((o) => (o.value || toKey(o.label)) === value);
  return opt?.label ?? value;
}

/** Bedingungs-Teil der Lesefassung: „Alle anderen Fälle" oder „Wenn „A" und ≥ „4"". */
export function ruleConditionText(sourceQ: EditorQuestion, rule: LogicRule): string {
  if (rule.isFallback) return "Alle anderen Fälle";
  return `Wenn ${rule.conditions
    .map((c) => `${logicOpPrefix(c.op)}„${conditionValueLabel(sourceQ, c.value)}"`)
    .join(" und ")}`;
}

/** Ziel-Teil der Lesefassung. broken = Ziel-Page gelöscht (SET NULL), nicht (mehr)
 *  im Funnel ODER ausgeblendet (Aufgabe 59: hidden Steps fliegen aus visibleQuestions,
 *  computePath findet das Ziel nicht) — die Runtime degradiert all das zu „weiter". */
export function ruleTargetLabel(
  rule: LogicRule,
  numberByDbId: Map<string, number>,
  hiddenPageIds?: ReadonlySet<string>,
): { text: string; broken: boolean } {
  if (rule.targetType === "end") return { text: "Ende", broken: false };
  const num = rule.targetPageId ? numberByDbId.get(rule.targetPageId) : undefined;
  if (num === undefined) return { text: "Ziel gelöscht → weiter", broken: true };
  if (rule.targetPageId && hiddenPageIds?.has(rule.targetPageId)) {
    return { text: `Schritt ${num} ist ausgeblendet → weiter`, broken: true };
  }
  return { text: `Schritt ${num}`, broken: false };
}

/** Ausgeblendete (gespeicherte) Steps — deren Regeln laufen nie, Sprünge auf sie
 *  werden von der Runtime ignoriert. */
export function hiddenPageIdSet(questions: EditorQuestion[]): Set<string> {
  const set = new Set<string>();
  for (const q of questions) {
    if (q.dbId && q.visible === false) set.add(q.dbId);
  }
  return set;
}
