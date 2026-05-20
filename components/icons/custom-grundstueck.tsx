'use client'

import { Icon, type CustomIconProps } from './_base'

export function GrundstueckIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M2 21h20" />
      <path d="M6 21v-7l2-2 2 2v7Z" />
      <path d="M6 16h4" />
      <path d="M16 21v-8" />
      <circle cx="16" cy="9" r="4" />
    </Icon>
  )
}
