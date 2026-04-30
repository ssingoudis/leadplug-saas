import {
  Home,
  Building2,
  Factory,
  Building,
  Sun,
  Thermometer,
  Flame,
  Wind,
  Droplets,
  Snowflake,
  Wrench,
  Zap,
  Star,
  Check,
  X,
  HelpCircle,
  Euro,
  FileText,
  Calendar,
  type LucideProps,
} from "lucide-react"
import type { ComponentType } from "react"

export const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Home,
  Building2,
  Factory,
  Building,
  Sun,
  Thermometer,
  Flame,
  Wind,
  Droplets,
  Snowflake,
  Wrench,
  Zap,
  Star,
  Check,
  X,
  HelpCircle,
  Euro,
  FileText,
  Calendar,
}

export function renderIcon(
  iconKey: string,
  iconUrl?: string,
  color?: string,
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
  const IconComponent = ICON_MAP[iconKey] ?? HelpCircle
  return <IconComponent size={24} color={color ?? "#6b7280"} strokeWidth={1.5} />
}
