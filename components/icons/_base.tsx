'use client'

import type { ReactNode } from 'react'

export interface CustomIconProps {
  size?: number
  color?: string
  className?: string
}

// Lucide-style: stroke-based, 24×24
export function Icon({ size = 24, color = 'currentColor', className, children }: CustomIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color }}
      className={className}
    >
      {children}
    </svg>
  )
}

