export interface MonthlyRow {
  month: string   // ISO date string, truncated to month
  leads: number
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export default function MonthlyStats({ rows }: { rows: MonthlyRow[] }) {
  if (rows.length === 0) return null

  const totalLeads = rows.reduce((s, r) => s + r.leads, 0)

  return (
    <div className="mt-14">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Monatsübersicht</h2>
      <p className="text-gray-500 text-sm mb-6">Eingegangene Leads der letzten 12 Monate</p>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 uppercase tracking-wide text-xs">Monat</th>
              <th className="text-right px-6 py-4 font-semibold text-gray-500 uppercase tracking-wide text-xs">Leads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.month} className={i < rows.length - 1 ? 'border-b border-gray-50' : ''}>
                <td className="px-6 py-4 font-medium text-gray-900">{formatMonth(row.month)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-800">{row.leads}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="px-6 py-4 font-bold text-gray-900">Gesamt</td>
              <td className="px-6 py-4 text-right font-bold text-gray-900">{totalLeads}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
