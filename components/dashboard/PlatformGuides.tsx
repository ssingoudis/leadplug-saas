// Plattform-Anleitungen für das Einbetten des Funnel-Codes (Aufgabe 43, #4).
// Server-Komponente — native <details>/<summary>, kein Client-JS nötig.
// Inhalt gespiegelt aus Anleitungen/Widget-Einbetten.md.

type Guide = { platform: string; steps: string[] }

const GUIDES: Guide[] = [
  {
    platform: 'WordPress',
    steps: [
      'Block-Editor öffnen → oben rechts auf die drei Punkte → „Code-Editor" (oder einen „Custom HTML"-Block einfügen).',
      'Den kopierten Code an der gewünschten Stelle einfügen.',
      'Speichern und Vorschau öffnen. (Alternativ: Plugin „Headers and Footers Scripts".)',
    ],
  },
  {
    platform: 'Wix',
    steps: [
      'Links auf „Element hinzufügen" → „Einbetten" → „HTML-Code einbetten".',
      'Das erscheinende Code-Feld öffnen und den Code einfügen.',
      'Auf „Übernehmen" klicken und die Seite veröffentlichen.',
    ],
  },
  {
    platform: 'Squarespace',
    steps: [
      'Abschnitt bearbeiten → „Block hinzufügen" → Block-Typ „Code".',
      'Den Code in das Code-Feld einfügen (HTML-Modus).',
      'Speichern.',
    ],
  },
  {
    platform: 'Webflow',
    steps: [
      'Seite öffnen und die gewünschte Stelle auswählen.',
      'Ein „Embed"-Element einfügen.',
      'Den Code einfügen und die Seite publishen.',
    ],
  },
  {
    platform: 'Jimdo / andere Baukästen',
    steps: [
      'Überall wo ein „HTML"- oder „Custom Code / Widget"-Block angeboten wird: diesen Block einfügen.',
      'Den Code in den Block einfügen.',
      'Speichern.',
    ],
  },
]

export default function PlatformGuides() {
  return (
    <div className="flex flex-col gap-2">
      {GUIDES.map((g) => (
        <details
          key={g.platform}
          className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
        >
          <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer list-none text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <span>{g.platform}</span>
            <span className="text-gray-400 dark:text-gray-500 text-xs transition-transform group-open:rotate-90">▶</span>
          </summary>
          <ol className="px-5 pb-4 pt-1 flex flex-col gap-2">
            {g.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  )
}
