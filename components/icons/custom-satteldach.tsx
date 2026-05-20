'use client'

import { Icon, type CustomIconProps } from './_base'

export function SatteldachIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M6 20v-8" />
      <path d="M18 20v-8" />
      <path d="M3 12l9-8 9 8Z" />
    </Icon>
  )
}
