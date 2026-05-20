'use client'

import { Icon, type CustomIconProps } from './_base'

export function DachziegelIcon(props: CustomIconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h8v4a4 3 0 0 1-8 0Z" />
      <path d="M12 12h8v4a4 3 0 0 1-8 0Z" />
      <path d="M8 5h8v4a4 3 0 0 1-8 0Z" />
    </Icon>
  )
}
