'use client'

import { useState } from 'react'

const R = 40
const CX = 50
const CY = 50
const CIRCUMFERENCE = 2 * Math.PI * R  // 251.33

type Props = {
  value: number
  total: number
  centerLabel: string
  subLabel?: string
  tooltipLabel?: string
  size?: 'sm' | 'md'
}

export default function DonutChart({ value, total, centerLabel, subLabel, tooltipLabel, size = 'md' }: Props) {
  const [hovered, setHovered] = useState(false)

  const rawPct  = total > 0 ? Math.min(value / total, 1) : 0
  // Minimum visible arc of 8% so small values don't look broken — center label shows the truth
  const pct     = rawPct > 0 ? Math.max(rawPct, 0.08) : 0
  const filled  = pct * CIRCUMFERENCE
  const dim     = size === 'sm' ? 80 : 120
  const stroke  = size === 'sm' ? 11 : 16
  const subSz   = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered && tooltipLabel && (
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 shadow-lg">
            <span className="text-[11px] text-white">{tooltipLabel}</span>
          </div>
        )}
        <svg width={dim} height={dim} viewBox="0 0 100 100" className="cursor-default">
          {/* Background track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-gray-100 dark:text-gray-700"
          />
          {/* Filled arc */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={total === 0 ? 'currentColor' : 'var(--color-primary)'}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className={total === 0 ? 'text-gray-100 dark:text-gray-700' : ''}
          />
          {/* Center label */}
          <text
            x={CX} y={CY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size === 'sm' ? 14 : 18}
            fontWeight="700"
            fill="currentColor"
            className="text-gray-900 dark:text-white"
          >
            {centerLabel}
          </text>
        </svg>
      </div>
      {subLabel && <span className={`${subSz} text-gray-400 dark:text-gray-500 leading-tight text-center`}>{subLabel}</span>}
    </div>
  )
}
