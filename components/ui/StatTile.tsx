interface StatTileProps {
  value: string | number
  label: string
}

export default function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
