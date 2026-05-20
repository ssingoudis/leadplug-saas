interface StatTileProps {
  value: string | number
  label: string
}

export default function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl px-3 py-3 text-center shadow-sm">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
