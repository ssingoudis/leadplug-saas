'use client'

import { Icon, type CustomIconProps } from './_base'

export function LagergebaeudeIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M3 22V11c0-4.5 18-4.5 18 0v11Z" />
      <path d="M8 22v-8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8" />
      <path d="M8 17h8" />
      <path d="M8 13h8" />
    </Icon>
  )
}
