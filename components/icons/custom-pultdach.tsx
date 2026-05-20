'use client'

import { Icon, type CustomIconProps } from './_base'

export function PultdachIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M6 20v-5" />
      <path d="M18 20v-10" />
      <path d="M3 12l18-6v3l-18 6z" />
    </Icon>
  )
}
