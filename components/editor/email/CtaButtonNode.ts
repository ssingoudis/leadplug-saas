import { Node, mergeAttributes } from '@tiptap/core'
import type { NodeViewRendererProps } from '@tiptap/core'

// =============================================================================
// Aufgabe 41 — TipTap Custom Block-Node: CTA-Button
//
// Anpassbarer Call-to-Action mit eigenem Label + URL. Anders als die festen
// Magic-Sections (z.B. dashboard_button) kann der Tenant Label und Link frei
// editieren — direkt im NodeView via zwei inline-Inputs.
//
// Speichert sich als:
//   <div data-cta-button data-label="…" data-url="…"></div>
//
// Server-Renderer in lib/emailTemplates.ts ersetzt das durch einen
// gestylten Button mit Brand-Color-Background.
// =============================================================================

interface CtaAttrs {
  label: string
  url:   string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ctaButtonNode: {
      insertCtaButton: () => ReturnType
    }
  }
}

const DEFAULT_LABEL = 'Jetzt mehr erfahren'
const DEFAULT_URL   = 'https://'

export const CtaButtonNode = Node.create({
  name: 'ctaButton',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: DEFAULT_LABEL,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-label') || DEFAULT_LABEL,
      },
      url: {
        default: DEFAULT_URL,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-url') || DEFAULT_URL,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-cta-button]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as CtaAttrs
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-cta-button': '',
        'data-label': attrs.label,
        'data-url':   attrs.url,
      }),
    ]
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const initial = props.node.attrs as CtaAttrs

      // Helper: setze ein einzelnes Attribut, indem wir den aktuellen Node frisch
      // aus dem State holen (vermeidet stale-attrs nach mehreren Edits).
      function setAttr(key: keyof CtaAttrs, value: string) {
        const pos = typeof props.getPos === 'function' ? props.getPos() : undefined
        if (pos === undefined) return
        const { state, view } = props.editor
        const currentNode = state.doc.nodeAt(pos)
        if (!currentNode) return
        view.dispatch(
          state.tr.setNodeMarkup(pos, undefined, { ...currentNode.attrs, [key]: value }),
        )
      }

      const dom = document.createElement('div')
      dom.setAttribute('data-cta-button', '')
      dom.setAttribute('data-label', initial.label)
      dom.setAttribute('data-url', initial.url)
      dom.contentEditable = 'false'
      dom.style.position = 'relative'
      dom.style.padding = '14px 36px 14px 16px'
      dom.style.margin = '12px 0'
      dom.style.background = 'rgb(99 102 241 / 0.06)'
      dom.style.border = '1px dashed rgb(99 102 241 / 0.4)'
      dom.style.borderRadius = '8px'
      dom.style.cursor = 'grab'

      const title = document.createElement('div')
      title.style.fontWeight = '600'
      title.style.fontSize = '0.875em'
      title.style.color = 'rgb(67 56 202)'
      title.style.marginBottom = '8px'
      title.textContent = '🔗 CTA-Button (Link zum Klicken)'
      dom.appendChild(title)

      // Label-Input
      const labelRow = document.createElement('div')
      labelRow.style.display = 'flex'
      labelRow.style.alignItems = 'center'
      labelRow.style.gap = '8px'
      labelRow.style.marginBottom = '6px'
      const labelLbl = document.createElement('span')
      labelLbl.textContent = 'Text:'
      labelLbl.style.fontSize = '0.75em'
      labelLbl.style.color = 'rgb(107 114 128)'
      labelLbl.style.minWidth = '32px'
      const labelInput = document.createElement('input')
      labelInput.type = 'text'
      labelInput.value = initial.label
      labelInput.placeholder = DEFAULT_LABEL
      labelInput.className = 'lp-node-input'
      labelInput.style.flex = '1'
      labelInput.style.padding = '4px 8px'
      labelInput.style.borderRadius = '4px'
      labelInput.style.fontSize = '0.85em'
      labelInput.addEventListener('input', () => {
        setAttr('label', labelInput.value)
      })
      labelRow.appendChild(labelLbl)
      labelRow.appendChild(labelInput)
      dom.appendChild(labelRow)

      // URL-Input
      const urlRow = document.createElement('div')
      urlRow.style.display = 'flex'
      urlRow.style.alignItems = 'center'
      urlRow.style.gap = '8px'
      const urlLbl = document.createElement('span')
      urlLbl.textContent = 'URL:'
      urlLbl.style.fontSize = '0.75em'
      urlLbl.style.color = 'rgb(107 114 128)'
      urlLbl.style.minWidth = '32px'
      const urlInput = document.createElement('input')
      urlInput.type = 'url'
      urlInput.value = initial.url
      urlInput.placeholder = 'https://…'
      urlInput.className = 'lp-node-input'
      urlInput.style.flex = '1'
      urlInput.style.padding = '4px 8px'
      urlInput.style.borderRadius = '4px'
      urlInput.style.fontSize = '0.85em'
      urlInput.addEventListener('input', () => {
        setAttr('url', urlInput.value)
      })
      urlRow.appendChild(urlLbl)
      urlRow.appendChild(urlInput)
      dom.appendChild(urlRow)

      // X-Button zum Entfernen
      const del = document.createElement('button')
      del.type = 'button'
      del.setAttribute('aria-label', 'CTA-Button entfernen')
      del.title = 'CTA-Button entfernen'
      del.textContent = '×'
      del.style.position = 'absolute'
      del.style.top = '6px'
      del.style.right = '6px'
      del.style.width = '22px'
      del.style.height = '22px'
      del.style.display = 'inline-flex'
      del.style.alignItems = 'center'
      del.style.justifyContent = 'center'
      del.style.padding = '0'
      del.style.background = 'transparent'
      del.style.border = 'none'
      del.style.borderRadius = '4px'
      del.style.color = 'rgb(107 114 128)'
      del.style.fontSize = '18px'
      del.style.lineHeight = '1'
      del.style.cursor = 'pointer'
      del.addEventListener('mouseenter', () => {
        del.style.background = 'rgb(239 68 68 / 0.1)'
        del.style.color = 'rgb(220 38 38)'
      })
      del.addEventListener('mouseleave', () => {
        del.style.background = 'transparent'
        del.style.color = 'rgb(107 114 128)'
      })
      del.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
      del.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const pos = typeof props.getPos === 'function' ? props.getPos() : null
        if (pos == null) return
        props.editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + props.node.nodeSize })
          .run()
      })
      dom.appendChild(del)

      return {
        dom,
        // TipTap soll Klicks/Tastatur in den Inputs nicht intercepten
        stopEvent: (event) => {
          const target = event.target as HTMLElement
          return target === labelInput || target === urlInput
        },
        // Bei externem attr-Update (z.B. via History/Undo): Input-Werte syncen
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'ctaButton') return false
          const a = updatedNode.attrs as CtaAttrs
          if (labelInput.value !== a.label) labelInput.value = a.label
          if (urlInput.value !== a.url) urlInput.value = a.url
          dom.setAttribute('data-label', a.label)
          dom.setAttribute('data-url', a.url)
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertCtaButton:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: 'ctaButton', attrs: { label: DEFAULT_LABEL, url: DEFAULT_URL } })
            .run(),
    }
  },
})
