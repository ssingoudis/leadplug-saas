'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Wiederverwendbarer Code-Block mit leichter HTML-Syntaxhervorhebung + Copy-Leiste.
// Extrahiert aus EmbedBlock, genutzt im Funnel-Editor („Einbinden"-Tab / SharePanel).

type Token = { type: 'tag' | 'attr' | 'string' | 'plain'; text: string }

function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < code.length) {
    if (code[i] === '<' && code[i + 1] !== '!') {
      const tagMatch = code.slice(i).match(/^<\/?[\w-]+/)
      if (tagMatch) {
        tokens.push({ type: 'tag', text: tagMatch[0] })
        i += tagMatch[0].length
        continue
      }
      const closeMatch = code.slice(i).match(/^\/?>/)
      if (closeMatch) {
        tokens.push({ type: 'tag', text: closeMatch[0] })
        i += closeMatch[0].length
        continue
      }
    }
    const attrMatch = code.slice(i).match(/^[\w-]+=/)
    if (attrMatch && tokens.length > 0 && tokens[tokens.length - 1].type !== 'plain') {
      tokens.push({ type: 'attr', text: attrMatch[0].slice(0, -1) })
      tokens.push({ type: 'tag', text: '=' })
      i += attrMatch[0].length
      continue
    }
    if (code[i] === '"') {
      const end = code.indexOf('"', i + 1)
      if (end !== -1) {
        tokens.push({ type: 'string', text: code.slice(i, end + 1) })
        i = end + 1
        continue
      }
    }
    const last = tokens[tokens.length - 1]
    if (last?.type === 'plain') {
      last.text += code[i]
    } else {
      tokens.push({ type: 'plain', text: code[i] })
    }
    i++
  }
  return tokens
}

const tokenColor: Record<Token['type'], string> = {
  tag:    '#818cf8',
  attr:   '#34d399',
  string: '#fb923c',
  plain:  '#cbd5e1',
}

export function CodeBlock({ code }: { code: string }) {
  const tokens = tokenize(code)
  return (
    <pre
      className="overflow-x-auto px-5 py-4 text-[13px] leading-6"
      style={{ backgroundColor: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}
    >
      {tokens.map((tok, idx) => (
        <span key={idx} style={{ color: tokenColor[tok.type] }}>{tok.text}</span>
      ))}
    </pre>
  )
}

export function CopyBar({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{label}</span>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg border transition-all cursor-pointer ${
          copied
            ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-500 dark:text-green-400'
            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-700 hover:border-gray-400 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:border-gray-500'
        }`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Kopiert!' : 'Kopieren'}
      </button>
    </div>
  )
}
