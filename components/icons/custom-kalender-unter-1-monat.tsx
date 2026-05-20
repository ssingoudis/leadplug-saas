'use client'

import { Icon, type CustomIconProps } from './_base'

export function KalenderUnter1MonatIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M11 13l-3 2 3 2" />
      <path d="M14 14l1-1v4" />
    </Icon>
  )
}
