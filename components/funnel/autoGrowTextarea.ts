// Wächst eine Textarea mit ihrem Inhalt (einzeilig → mehrzeilig). Als ref (initialer
// Wert) + onInput (Tippen) aufrufen.
export function autoGrowTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
