'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

function buildEmbedSnippet(slug: string, url: string, companyName: string): string {
  return `<iframe
  id="funnel-${slug}"
  src="${url}"
  style="width:100%;border:none;display:block;height:500px"
  loading="lazy"
  title="${companyName}"
></iframe>
<script>
window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'funnel-resize') return;
  var f = document.getElementById('funnel-${slug}');
  if (!f || e.source !== f.contentWindow) return;
  var h = parseInt(e.data.height, 10);
  if (h > 0) f.style.height = h + 'px';
});
<\/script>`
}

type Token = { type: 'tag' | 'attr' | 'string' | 'plain'; text: string }

function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < code.length) {
    // HTML tag names: < or </ followed by word chars, or closing >
    if (code[i] === '<' && code[i + 1] !== '!' ) {
      const tagMatch = code.slice(i).match(/^<\/?[\w-]+/)
      if (tagMatch) {
        tokens.push({ type: 'tag', text: tagMatch[0] })
        i += tagMatch[0].length
        continue
      }
      // closing > or />
      const closeMatch = code.slice(i).match(/^\/?>/)
      if (closeMatch) {
        tokens.push({ type: 'tag', text: closeMatch[0] })
        i += closeMatch[0].length
        continue
      }
    }
    // attribute names (word= pattern)
    const attrMatch = code.slice(i).match(/^[\w-]+=/)
    if (attrMatch && tokens.length > 0 && tokens[tokens.length - 1].type !== 'plain') {
      tokens.push({ type: 'attr', text: attrMatch[0].slice(0, -1) })
      tokens.push({ type: 'tag', text: '=' })
      i += attrMatch[0].length
      continue
    }
    // quoted strings
    if (code[i] === '"') {
      const end = code.indexOf('"', i + 1)
      if (end !== -1) {
        tokens.push({ type: 'string', text: code.slice(i, end + 1) })
        i = end + 1
        continue
      }
    }
    // plain text — accumulate
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
  tag:    '#818cf8', // indigo-400
  attr:   '#34d399', // emerald-400
  string: '#fb923c', // orange-400
  plain:  '#cbd5e1', // slate-300
}

function CodeBlock({ code }: { code: string }) {
  const tokens = tokenize(code)
  return (
    <pre
      className="overflow-x-auto px-5 py-4 text-[13px] leading-6 rounded-b-xl"
      style={{ backgroundColor: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}
    >
      {tokens.map((tok, idx) => (
        <span key={idx} style={{ color: tokenColor[tok.type] }}>{tok.text}</span>
      ))}
    </pre>
  )
}

export default function EmbedBlock({ slug, url, companyName }: { slug: string; url: string; companyName: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const snippet = buildEmbedSnippet(slug, url, companyName)

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      >
        <span className="text-base font-bold text-gray-900 dark:text-white">Embed-Code</span>
        <span className="text-gray-400 dark:text-gray-500">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {open && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">HTML + JavaScript</span>
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
          <CodeBlock code={snippet} />
        </>
      )}
    </div>
  )
}
