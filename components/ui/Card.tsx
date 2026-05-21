import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  className?: string
}

export default function Card({ children, title, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 ${className}`}>
      {title && <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">{title}</h2>}
      {children}
    </div>
  )
}
