import { Icons } from '@/components/icons'

export default function IconsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Icon-Bibliothek</h1>
      <p className="text-sm text-gray-500 mb-8">
        Alle verfügbaren Icons – <code>icon_key</code> in der DB entspricht dem Namen unten.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {Object.entries(Icons).map(([key, IconComponent]) => (
          <div
            key={key}
            className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="w-10 h-10">
              <IconComponent />
            </div>
            <span className="text-xs text-center text-gray-600 font-mono break-all">{key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
