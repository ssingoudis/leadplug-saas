import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const styles: Record<ButtonVariant, string> = {
  primary:   'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'border border-gray-200 text-gray-700 bg-white hover:border-primary hover:text-primary',
  ghost:     'text-gray-500 hover:text-primary',
}

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
}

export default function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
