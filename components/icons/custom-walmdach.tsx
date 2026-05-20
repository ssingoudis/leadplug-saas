'use client'

import { Icon, type CustomIconProps } from './_base'

export function WalmdachIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M6 20v-8" />
      <path d="M18 20v-8" />
      <path d="M3 12l5-7h8l5 7Z" />
    </Icon>
  )
}
