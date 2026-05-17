import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  title?: string
  className?: string
}

export default function Card({ children, title, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 ${className}`}>
      {title && <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>}
      {children}
    </div>
  )
}
