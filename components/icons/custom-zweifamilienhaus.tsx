'use client'

import { Icon, type CustomIconProps } from './_base'

export function ZweifamilienhausIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M2 12l10-9 10 9v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" />
      <path d="M12 22V11" />
      <path d="M5 22v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <path d="M15 22v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
    </Icon>
  )
}
