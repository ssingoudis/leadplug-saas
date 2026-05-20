'use client'

import { Icon, type CustomIconProps } from './_base'

export function Kalender4Bis6MonateIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M6 13v3h3M8 13v4" />
      <path d="M11 15h2" />
      <circle cx="16.5" cy="15.5" r="1.5" />
      <path d="M15 15.5v-0.5c0-1.5 1-2 2-2" />
    </Icon>
  )
}
