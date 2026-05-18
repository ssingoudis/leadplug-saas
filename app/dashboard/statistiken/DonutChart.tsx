'use client'

const R = 40
const CX = 50
const CY = 50
const CIRCUMFERENCE = 2 * Math.PI * R  // 251.33

type Props = {
  value: number
  total: number
  centerLabel: string
  subLabel: string
  size?: 'sm' | 'md'
}

export default function DonutChart({ value, total, centerLabel, subLabel, size = 'md' }: Props) {
  const pct     = total > 0 ? Math.min(value / total, 1) : 0
  const filled  = pct * CIRCUMFERENCE
  const dim     = size === 'sm' ? 80 : 120
  const stroke  = size === 'sm' ? 9 : 12
  const labelSz = size === 'sm' ? 'text-xs' : 'text-base'
  const subSz   = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={dim} height={dim} viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={stroke}
        />
        {/* Filled arc */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={total === 0 ? '#f3f4f6' : '#6366f1'}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        {/* Center label */}
        <text
          x={CX} y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size === 'sm' ? 14 : 18}
          fontWeight="700"
          fill="#111827"
        >
          {centerLabel}
        </text>
      </svg>
      <span className={`${subSz} text-gray-400 leading-tight text-center`}>{subLabel}</span>
    </div>
  )
}
