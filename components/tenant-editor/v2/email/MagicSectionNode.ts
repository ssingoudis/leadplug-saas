import { Node, mergeAttributes } from '@tiptap/core'
import type { NodeViewRendererProps } from '@tiptap/core'
import { AVAILABLE_TOKENS } from '@/lib/emailTemplates'

// =============================================================================
// Aufgabe 41 — TipTap Custom Block-Node: MagicSection
//
// Block-Atom für strukturierte Inhalts-Bausteine:
//   • answers_overview — Antworten-Box (mit optional anpassbarem Heading)
//   • contact_summary  — Kontakt-Box   (mit optional anpassbarem Heading)
//   • dashboard_button — Legacy, wird über den anpassbaren CtaButtonNode abgelöst.
//                        Rendert weiter für Backwards-Compat (Backfill-Mails).
//
// X-Button zum Entfernen. draggable=true → Tenant kann den Block via Drag im
// Editor verschieben (TipTap-Native-Drag).
// =============================================================================

interface MagicAttrs {
  section: string
  heading: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    magicSectionNode: {
      insertMagicSection: (section: string) => ReturnType
    }
  }
}

const LABEL_MAP: Record<string, { label: string; description: string }> = (() => {
  const map: Record<string, { label: string; description: string }> = {
    // Legacy-Eintrag für dashboard_button (steht nicht mehr im Picker, kommt
    // aber in Backfill-Mails noch vor — NodeView braucht das Label).
    dashboard_button: { label: 'Dashboard-Button (Legacy)', description: 'Statischer Button "Lead im Dashboard ansehen →"' },
  }
  for (const t of AVAILABLE_TOKENS.magic) {
    map[t.token] = { label: t.label, description: t.description }
  }
  return map
})()

const DEFAULT_HEADING_PLACEHOLDER: Record<string, string> = {
  answers_overview: 'Standard: "Ihre Angaben im Überblick"',
  contact_summary:  'Standard: "Kontaktdaten"',
}

const SUPPORTS_HEADING = new Set(['answers_overview', 'contact_summary'])

export const MagicSectionNode = Node.create({
  name: 'magicSection',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      section: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-magic-section'),
      },
      heading: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-heading'),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-magic-section]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as MagicAttrs
    const dataAttrs: Record<string, string> = { 'data-magic-section': attrs.section }
    if (attrs.heading) dataAttrs['data-heading'] = attrs.heading
    return ['div', mergeAttributes(HTMLAttributes, dataAttrs)]
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const initial = props.node.attrs as MagicAttrs
      const meta = LABEL_MAP[initial.section] ?? { label: initial.section, description: '' }
      const supportsHeading = SUPPORTS_HEADING.has(initial.section)

      // Helper: set single attribute fresh from state (avoids stale-attrs).
      function setAttr(key: keyof MagicAttrs, value: string | null) {
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
      dom.setAttribute('data-magic-section', initial.section)
      if (initial.heading) dom.setAttribute('data-heading', initial.heading)
      dom.contentEditable = 'false'
      dom.style.position = 'relative'
      dom.style.padding = '12px 36px 12px 16px'
      dom.style.margin = '12px 0'
      dom.style.background = 'rgb(99 102 241 / 0.06)'
      dom.style.border = '1px dashed rgb(99 102 241 / 0.4)'
      dom.style.borderRadius = '8px'
      dom.style.cursor = 'grab'

      const title = document.createElement('div')
      title.style.fontWeight = '600'
      title.style.fontSize = '0.875em'
      title.style.color = 'rgb(67 56 202)'
      title.textContent = `📦 ${meta.label}`
      dom.appendChild(title)

      if (meta.description) {
        const desc = document.createElement('div')
        desc.style.fontSize = '0.75em'
        desc.style.color = 'rgb(107 114 128)'
        desc.style.marginTop = '2px'
        desc.textContent = meta.description
        dom.appendChild(desc)
      }

      // Heading-Input (nur für answers_overview + contact_summary)
      let headingInput: HTMLInputElement | null = null
      if (supportsHeading) {
        const headingRow = document.createElement('div')
        headingRow.style.display = 'flex'
        headingRow.style.alignItems = 'center'
        headingRow.style.gap = '8px'
        headingRow.style.marginTop = '8px'
        const headingLbl = document.createElement('span')
        headingLbl.textContent = 'Überschrift:'
        headingLbl.style.fontSize = '0.75em'
        headingLbl.style.color = 'rgb(107 114 128)'
        headingLbl.style.whiteSpace = 'nowrap'
        const input = document.createElement('input')
        input.type = 'text'
        input.value = initial.heading ?? ''
        input.placeholder = DEFAULT_HEADING_PLACEHOLDER[initial.section] ?? 'Eigene Überschrift (optional)'
        input.style.flex = '1'
        input.style.padding = '4px 8px'
        input.style.border = '1px solid rgb(229 231 235)'
        input.style.borderRadius = '4px'
        input.style.fontSize = '0.85em'
        input.style.background = '#fff'
        input.style.cursor = 'text'
        input.addEventListener('input', () => {
          setAttr('heading', input.value.trim() ? input.value : null)
        })
        headingRow.appendChild(headingLbl)
        headingRow.appendChild(input)
        dom.appendChild(headingRow)
        headingInput = input
      }

      // X-Button zum Entfernen
      const del = document.createElement('button')
      del.type = 'button'
      del.setAttribute('aria-label', 'Baustein entfernen')
      del.title = 'Baustein entfernen'
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
        // Drag funktioniert wenn der User außerhalb des Heading-Inputs zieht.
        // Inputs/Buttons sollen die normalen Events bekommen, nicht TipTap.
        stopEvent: (event) => {
          const target = event.target as HTMLElement
          if (headingInput && target === headingInput) return true
          if (target === del) return true
          return false
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'magicSection') return false
          const a = updatedNode.attrs as MagicAttrs
          if (headingInput && headingInput.value !== (a.heading ?? '')) {
            headingInput.value = a.heading ?? ''
          }
          if (a.heading) dom.setAttribute('data-heading', a.heading)
          else dom.removeAttribute('data-heading')
          return true
        },
      }
    }
  },

  addCommands() {
    return {
      insertMagicSection:
        (section: string) =>
        ({ chain }) =>
          chain().insertContent({ type: 'magicSection', attrs: { section, heading: null } }).run(),
    }
  },
})
