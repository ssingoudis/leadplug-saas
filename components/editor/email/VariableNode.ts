import { Node, mergeAttributes } from '@tiptap/core'
import { AVAILABLE_TOKENS } from '@/lib/email/emailTemplates'

// =============================================================================
// Aufgabe 41 — TipTap Custom Inline-Node: Variable
//
// Wird vom EmailEditor genutzt um {{contact.name}} & Co als nicht-editierbare
// Chips darzustellen. Speichert sich als <span data-variable="contact.name">{{contact.name}}</span>
// — server-side ersetzt der Renderer in lib/emailTemplates.ts die Spans durch
// die HTML-escaped Werte.
// =============================================================================

interface VariableAttrs {
  name: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variableNode: {
      insertVariable: (name: string) => ReturnType
    }
  }
}

// Lookup-Map für Editor-Label ("Lead-Name" statt "contact.name")
const LABEL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const group of Object.values(AVAILABLE_TOKENS)) {
    for (const t of group) {
      if ('label' in t) map[t.token] = t.label
    }
  }
  return map
})()

function humanLabel(name: string): string {
  return LABEL_MAP[name] ?? name
}

export const VariableNode = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  // Aufgabe 53: token → Label-Map für dynamische Feld-Variablen (answer.<key>).
  // Der EmailEditor reicht die Funnel-Feld-Labels pro Instanz via .configure({ extraLabels }) rein,
  // damit Chips wie "answer.vorname" als "Vorname" statt roh angezeigt werden.
  addOptions() {
    return {
      extraLabels: {} as Record<string, string>,
    }
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-variable'),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as VariableAttrs
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-variable': attrs.name }),
      `{{${attrs.name}}}`,
    ]
  },

  addNodeView() {
    const extraLabels = (this.options.extraLabels ?? {}) as Record<string, string>
    return ({ node }) => {
      const attrs = node.attrs as VariableAttrs
      const dom = document.createElement('span')
      dom.setAttribute('data-variable', attrs.name)
      dom.contentEditable = 'false'
      dom.style.display = 'inline-block'
      dom.style.padding = '1px 8px'
      dom.style.margin = '0 1px'
      dom.style.background = 'rgb(99 102 241 / 0.12)'
      dom.style.color = 'rgb(67 56 202)'
      dom.style.borderRadius = '4px'
      dom.style.fontSize = '0.875em'
      dom.style.fontWeight = '500'
      dom.style.userSelect = 'none'
      dom.style.cursor = 'grab'
      dom.title = 'Ziehen zum Verschieben, klicken + Backspace zum Löschen'
      dom.textContent = extraLabels[attrs.name] ?? humanLabel(attrs.name)
      return { dom }
    }
  },

  addCommands() {
    return {
      insertVariable:
        (name: string) =>
        ({ chain }) =>
          chain().insertContent({ type: 'variable', attrs: { name } }).run(),
    }
  },
})
