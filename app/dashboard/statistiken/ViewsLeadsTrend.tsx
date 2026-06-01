'use client'

import { useState } from 'react'

export type TrendPoint = {
  label: string    // X-Achsen-Kurzlabel (z. B. "Jan" oder "5")
  tooltip: string  // Hover-Volllabel (z. B. "Jan 2026" oder "5. Mai")
  views: number
  count: number    // ausgefüllt / Leads
}

const PAD = 6 // vertikale Luft in % oben/unten

export default function ViewsLeadsTrend({
  data,
  title = 'Aufrufe vs. Ausgefüllt',
}: {
  data: TrendPoint[]
  title?: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  const n = data.length
  const maxViews = Math.max(...data.map((d) => d.views), 1)
  const totalViews = data.reduce((s, d) => s + d.views, 0)
  const totalLeads = data.reduce((s, d) => s + d.count, 0)

  const xPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100)
  const yPct = (v: number) => PAD + (1 - v / maxViews) * (100 - 2 * PAD)

  const viewsLine = data.map((d, i) => `${xPct(i)},${yPct(d.views)}`).join(' ')
  const leadsLine = data.map((d, i) => `${xPct(i)},${yPct(d.count)}`).join(' ')
  const ticks = [maxViews, Math.round(maxViews / 2), 0]

  const h = data[hover ?? -1]

  // Bis 31 Punkte (Tage eines Monats) jeden Tag beschriften; erst darüber ausdünnen.
  const labelStep = n <= 31 ? 1 : Math.ceil(n / 12)
  const showLabel = (i: number) => i % labelStep === 0 || i === n - 1

  return (
    <div className="rounded-2xl bg-white px-6 pt-6 pb-5 shadow-sm dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
            Aufrufe <span className="font-semibold text-gray-700 dark:text-gray-200">{totalViews}</span>
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ausgefüllt <span className="font-semibold text-gray-700 dark:text-gray-200">{totalLeads}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Y-Achse */}
        <div className="flex h-40 shrink-0 flex-col justify-between text-right">
          {ticks.map((t, i) => (
            <span key={i} className="text-xs leading-none text-gray-400 dark:text-gray-500">{t}</span>
          ))}
        </div>

        {/* Chart-Spalte */}
        <div className="flex-1">
          <div className="relative h-40">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
              {[0, 0.5, 1].map((f) => {
                const y = PAD + f * (100 - 2 * PAD)
                return (
                  <line
                    key={f}
                    x1="0" x2="100" y1={y} y2={y}
                    className="stroke-gray-100 dark:stroke-gray-800"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
              <polyline
                points={viewsLine}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={leadsLine}
                fill="none"
                stroke="#10b981"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Hover-Guide + Punkte + Tooltip */}
            {hover !== null && h && (
              <>
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                  style={{ left: `${xPct(hover)}%` }}
                />
                <div
                  className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-900"
                  style={{ left: `${xPct(hover)}%`, top: `${yPct(h.views)}%`, backgroundColor: 'var(--color-primary)' }}
                />
                <div
                  className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-900"
                  style={{ left: `${xPct(hover)}%`, top: `${yPct(h.count)}%` }}
                />
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg"
                  style={{ left: `${Math.min(Math.max(xPct(hover), 12), 88)}%`, top: -4 }}
                >
                  <span className="block font-semibold">{h.tooltip}</span>
                  <span className="block text-gray-300">Aufrufe: {h.views} · Ausgefüllt: {h.count}</span>
                  <span className="block text-gray-400">
                    {h.views > 0 ? Math.round((h.count / h.views) * 100) : 0} % Conversion
                  </span>
                </div>
              </>
            )}

            {/* Hover-Zonen */}
            <div className="absolute inset-0 flex">
              {data.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </div>
          </div>

          {/* X-Achse — Labels exakt an den Punkten positioniert, bei vielen Punkten ausgedünnt */}
          <div className="relative mt-1.5 h-3">
            {data.map((d, i) =>
              showLabel(i) ? (
                <span
                  key={i}
                  className="absolute top-0 text-[10px] leading-tight text-gray-400 dark:text-gray-500"
                  style={{
                    left: `${xPct(i)}%`,
                    transform: i === 0 ? 'translateX(0)' : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                >
                  {d.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
