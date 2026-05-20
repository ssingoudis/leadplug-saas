'use client'

import { Icon, type CustomIconProps } from './_base'

export function KalenderUeber12MonateIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M6 13l3 2-3 2" />
      <path d="M12 14l1-1v4" />
      <path d="M15 14a1 1 0 0 1 2 0c0 1.5-2 2-2 3h2.5" />
    </Icon>
  )
}
