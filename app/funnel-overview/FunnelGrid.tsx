'use client'

import { useState } from 'react'
import type { FunnelCard } from './page'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `vor ${days} Tag${days === 1 ? '' : 'en'}`
  if (hours > 0) return `vor ${hours} Stunde${hours === 1 ? '' : 'n'}`
  if (minutes > 0) return `vor ${minutes} Minute${minutes === 1 ? '' : 'n'}`
  return 'gerade eben'
}

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

function CopyButton({ slug, url, companyName }: { slug: string; url: string; companyName: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const snippet = buildEmbedSnippet(slug, url, companyName)
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
      style={
        copied
          ? { borderColor: '#22c55e', color: '#16a34a', backgroundColor: '#f0fdf4' }
          : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }
      }
    >
      {copied ? '✓ Kopiert' : 'Embed kopieren'}
    </button>
  )
}

export default function FunnelGrid({ funnels }: { funnels: FunnelCard[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? funnels.filter((f) => f.companyName.toLowerCase().includes(query.toLowerCase()))
    : funnels

  const totalLeads = funnels.reduce((sum, f) => sum + f.submissionCount, 0)

  return (
    <>
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <p className="text-gray-600 text-base">
            <span className="font-semibold text-gray-900">{filtered.length}</span> aktive Funnels
            {totalLeads > 0 && (
              <span className="ml-3 text-gray-400">
                · <span className="font-semibold text-gray-700">{totalLeads}</span> Leads gesamt
              </span>
            )}
          </p>
        </div>
        <input
          type="search"
          placeholder="Firma suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-base">Kein Funnel gefunden.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <a
              key={f.slug}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col"
            >
              <div
                className="h-14 w-full flex-shrink-0"
                style={{ backgroundColor: f.primaryColor }}
              />
              <div className="px-5 pt-4 pb-3 flex flex-col gap-1 flex-1">
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {f.companyName}
                </h2>
                <p className="text-sm font-medium text-gray-500">{f.slug}</p>
                <p className="text-sm text-gray-400 truncate mb-2">{f.url}</p>

                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-100">
                  <div className="flex-1 min-w-0">
                    {f.submissionCount > 0 ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-900">{f.submissionCount} Lead{f.submissionCount !== 1 ? 's' : ''}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 truncate">
                          {f.lastSubmissionAt ? relativeTime(f.lastSubmissionAt) : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Noch keine Leads</span>
                    )}
                  </div>
                  <CopyButton slug={f.slug} url={f.url} companyName={f.companyName} />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
