type BadgeVariant = 'green' | 'red' | 'amber' | 'purple' | 'gray'

const styles: Record<BadgeVariant, string> = {
  green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  red:    'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400',
  amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  gray:   'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

export default function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  )
}
