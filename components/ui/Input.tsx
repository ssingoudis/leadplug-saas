'use client'

import { ChevronDown } from 'lucide-react'

const baseClass =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition'

interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  className?: string
}

export function Input({ value, onChange, placeholder, type = 'text', className = '' }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseClass} ${className}`}
    />
  )
}

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
}

export function Select({ value, onChange, options, className = '' }: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none ${baseClass} pr-10`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
    </div>
  )
}
