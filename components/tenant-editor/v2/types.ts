/**
 * v2 shell shared types.
 * SelectedStep identifies which page in the Funnel is currently focused in the editor.
 */
// Aufgabe 38: Custom-Multi-Field-Pages teilen sich state.questions[] mit Question-Pages.
// Beide nutzen kind="question" als SelectedStep-Tag — der Render-Branch im PropertiesPanel
// unterscheidet anhand state.questions[questionIndex].kind ("question" vs "custom").
// Aufgabe 52D: { kind: "submit" } entfernt — Submit-Page/Kontaktformular abgeschafft.
export type SelectedStep =
  | { kind: "question"; questionIndex: number }
  | { kind: "success" };

export function isSameStep(a: SelectedStep, b: SelectedStep): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "question" && b.kind === "question") {
    return a.questionIndex === b.questionIndex;
  }
  return true;
}
