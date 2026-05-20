'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { X, Search, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'
import { CUSTOM_ICONS, CUSTOM_ICON_LABELS } from '@/components/icons/index'

const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: 'Custom',
    icons: Object.keys(CUSTOM_ICONS),
  },
  {
    label: 'Gebäude',
    icons: [
      'Home', 'House', 'Building', 'Building2', 'Factory', 'Store', 'Hotel', 'Garage',
      'DoorOpen', 'DoorClosed',
    ],
  },
  {
    label: 'Energie',
    icons: [
      'Sun', 'CloudSun', 'Zap', 'Battery', 'BatteryCharging', 'BatteryFull',
      'Plug', 'PlugZap', 'Power', 'Lightbulb', 'Gauge', 'Cable', 'CircuitBoard',
    ],
  },
  {
    label: 'Heizung',
    icons: [
      'Flame', 'FlameKindling', 'Thermometer', 'ThermometerSun', 'ThermometerSnowflake',
      'Snowflake', 'Wind', 'AirVent', 'Fan', 'Droplets', 'Droplet', 'Waves',
    ],
  },
  {
    label: 'Werkzeug',
    icons: [
      'Wrench', 'Hammer', 'Ruler', 'Paintbrush', 'PaintBucket', 'HardHat',
      'Screwdriver', 'Nut', 'Drill', 'Cog', 'Settings', 'Construction',
    ],
  },
  {
    label: 'Termin',
    icons: [
      'Calendar', 'CalendarDays', 'CalendarCheck', 'CalendarClock', 'CalendarRange',
      'CalendarPlus', 'Clock', 'Timer', 'AlarmClock', 'Hourglass',
    ],
  },
  {
    label: 'Finanzen',
    icons: [
      'Euro', 'Banknote', 'Coins', 'Percent', 'CreditCard', 'PiggyBank',
      'TrendingUp', 'TrendingDown', 'Receipt', 'ReceiptText', 'Wallet',
      'HandCoins', 'Scale', 'BadgePercent', 'BadgeEuro',
    ],
  },
  {
    label: 'Qualität',
    icons: [
      'Star', 'Shield', 'ShieldCheck', 'ShieldAlert',
      'Award', 'Trophy', 'ThumbsUp', 'ThumbsDown',
      'Heart', 'Gem', 'Crown', 'Sparkles', 'Medal', 'BadgeCheck', 'HeartHandshake',
    ],
  },
  {
    label: 'Wohnen',
    icons: [
      'Bath', 'Shower', 'Toilet', 'Sofa', 'Armchair', 'Bed', 'BedDouble',
      'Tv', 'Lamp', 'LampCeiling', 'Refrigerator', 'WashingMachine',
      'Microwave', 'CookingPot', 'Utensils', 'Blinds',
    ],
  },
  {
    label: 'Kontakt',
    icons: [
      'User', 'Users', 'UserCheck', 'Phone', 'PhoneCall', 'Mail', 'MailOpen',
      'MessageSquare', 'MapPin', 'Globe', 'Handshake', 'Send',
    ],
  },
  {
    label: 'Status',
    icons: [
      'HelpCircle', 'Check', 'CheckCircle', 'XCircle',
      'AlertCircle', 'AlertTriangle', 'Info', 'Plus', 'PlusCircle',
    ],
  },
  {
    label: 'Sonstiges',
    icons: [
      'Car', 'Truck', 'Fuel', 'Route',
      'Leaf', 'TreePine', 'Recycle',
      'FileText', 'Clipboard', 'ClipboardCheck', 'Key', 'Lock', 'Smartphone', 'Tag',
    ],
  },
]

const ALL_ICONS = [...new Set(ICON_CATEGORIES.flatMap(c => c.icons))]

interface IconPickerProps {
  value: string
  onChange: (key: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [pos, setPos] = useState({ bottom: 0, left: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const calcPos = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPos({
      bottom: window.innerHeight - rect.top + 4,
      left: Math.min(rect.left, window.innerWidth - 468),
    })
  }

  const handleOpen = () => {
    if (!open) calcPos()
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const dropdown = document.getElementById('icon-picker-dropdown')
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        dropdown && !dropdown.contains(e.target as Node)
      ) {
        setOpen(false); setSearch(''); setActiveCategory(null)
      }
    }
    const onScroll = (e: Event) => {
      const dropdown = document.getElementById('icon-picker-dropdown')
      if (dropdown && dropdown.contains(e.target as Node)) return
      calcPos()
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const displayedIcons = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return ALL_ICONS.filter(name => {
        const label = CUSTOM_ICON_LABELS[name] ?? name
        return name.toLowerCase().includes(q) || label.toLowerCase().includes(q)
      })
    }
    if (activeCategory) {
      return ICON_CATEGORIES.find(c => c.label === activeCategory)?.icons ?? []
    }
    return ALL_ICONS
  }, [search, activeCategory])

  const CustomTriggerIcon = value ? CUSTOM_ICONS[value] ?? null : null
  const LucideIconComponent = value && !CustomTriggerIcon
    ? (LucideIcons[value as keyof typeof LucideIcons] as ComponentType<LucideProps> | undefined) ?? null
    : null

  return (
    <div className="shrink-0" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        title={CUSTOM_ICON_LABELS[value] || value || 'Icon auswählen'}
        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
          value
            ? 'border-primary/50 bg-primary/10 text-primary'
            : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer'
        }`}
      >
        {CustomTriggerIcon
          ? <CustomTriggerIcon size={16} color="currentColor" />
          : LucideIconComponent
            ? <LucideIconComponent size={16} strokeWidth={1.5} />
            : <span className="text-[10px] font-medium leading-none">icon</span>
        }
      </button>

      {open && (
        <div
          id="icon-picker-dropdown"
          style={{ position: 'fixed', bottom: pos.bottom, left: pos.left, zIndex: 9999 }}
          className="w-115 bg-white rounded-xl shadow-xl border border-gray-200 p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
                placeholder="Suchen… z.B. house, flame, calendar"
                className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 outline-none focus:border-primary transition-colors"
              />
            </div>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setSearch('') }}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                title="Icon entfernen"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {!search && (
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                  !activeCategory ? 'bg-primary/20 border-primary/30 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-400 cursor-pointer'
                }`}
              >
                Alle
              </button>
              {ICON_CATEGORIES.map(c => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setActiveCategory(c.label === activeCategory ? null : c.label)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                    activeCategory === c.label ? 'bg-primary/20 border-primary/30 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-400 cursor-pointer'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-10 gap-1 max-h-56 overflow-y-auto">
            {displayedIcons.map(name => {
              const active = value === name
              const CustomIcon = CUSTOM_ICONS[name]
              if (CustomIcon) {
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); setSearch(''); setActiveCategory(null) }}
                    title={CUSTOM_ICON_LABELS[name] ?? name}
                    className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                      active ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer'
                    }`}
                  >
                    <CustomIcon size={20} color="currentColor" />
                  </button>
                )
              }
              const Icon = LucideIcons[name as keyof typeof LucideIcons] as ComponentType<LucideProps> | undefined
              if (!Icon) return null
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); setSearch(''); setActiveCategory(null) }}
                  title={name}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    active ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </button>
              )
            })}
          </div>

          {displayedIcons.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Kein Icon gefunden</p>
          )}

          {value && (CustomTriggerIcon || LucideIconComponent) && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
              {CustomTriggerIcon
                ? <CustomTriggerIcon size={13} color="currentColor" className="text-primary/70 shrink-0" />
                : LucideIconComponent && <LucideIconComponent size={13} strokeWidth={1.5} className="text-primary/70 shrink-0" />
              }
              <span className="text-xs text-gray-400 font-mono truncate">
                {CUSTOM_ICON_LABELS[value] ?? value}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
