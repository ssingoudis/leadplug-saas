/**
 * v2 shell shared types.
 * SelectedStep identifies which page in the Funnel is currently focused in the editor.
 */
export type SelectedStep =
  | { kind: "question"; questionIndex: number }
  | { kind: "submit" }
  | { kind: "success" };

export function isSameStep(a: SelectedStep, b: SelectedStep): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "question" && b.kind === "question") {
    return a.questionIndex === b.questionIndex;
  }
  return true;
}
