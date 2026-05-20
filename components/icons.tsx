'use client'

import * as LucideIcons from 'lucide-react'
import { HelpCircle, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { CUSTOM_ICONS } from './icons/index'

export function renderIcon(
  iconKey: string,
  iconUrl?: string,
  color?: string,
  size?: number,
) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="w-full h-full object-contain"
        loading="lazy"
      />
    )
  }
  const CustomIcon = CUSTOM_ICONS[iconKey]
  if (CustomIcon) return <CustomIcon size={size ?? 24} color={color ?? '#6b7280'} />
  const IconComponent = (LucideIcons[iconKey as keyof typeof LucideIcons] as ComponentType<LucideProps>) ?? HelpCircle
  return <IconComponent size={size ?? 24} color={color ?? '#6b7280'} strokeWidth={1.5} />
}
