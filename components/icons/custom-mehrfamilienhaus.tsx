'use client'

import { Icon, type CustomIconProps } from './_base'

export function MehrfamilienhausIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M2 22h20" />
      <path d="M5 22V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v17" />
      <path d="M10 22v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
      <rect x="8" y="7" width="2" height="3" rx="0.5" />
      <rect x="14" y="7" width="2" height="3" rx="0.5" />
      <rect x="8" y="13" width="2" height="3" rx="0.5" />
      <rect x="14" y="13" width="2" height="3" rx="0.5" />
    </Icon>
  )
}
