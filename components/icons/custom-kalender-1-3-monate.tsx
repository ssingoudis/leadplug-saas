'use client'

import { Icon, type CustomIconProps } from './_base'

export function Kalender1Bis3MonateIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M7 14l1-1v4" />
      <path d="M11 15h2" />
      <path d="M15 13h1.5a1 1 0 0 1 0 2H16h0.5a1 1 0 0 1 0 2H15" />
    </Icon>
  )
}
