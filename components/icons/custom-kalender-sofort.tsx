'use client'

import { Icon, type CustomIconProps } from './_base'

export function KalenderSofortIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M13 12l-3 4h4l-2 4" />
    </Icon>
  )
}
