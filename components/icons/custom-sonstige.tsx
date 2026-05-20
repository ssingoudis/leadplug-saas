'use client'

import { Icon, type CustomIconProps } from './_base'

export function SonstigeIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12L12 4l9 8v10H3z" />
      <circle cx="9.5" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="17" r="1" fill="currentColor" stroke="none" />
    </Icon>
  )
}
