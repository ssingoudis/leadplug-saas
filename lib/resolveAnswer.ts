import type { QuestionConfig } from '@/types'

/**
 * Löst eine rohe Antwort in einen anzeigbaren String auf – generisch für alle QuestionTypes.
 *
 * Logik (datengetrieben, kein Switch pro Typ nötig):
 *   1. Frage hat options → Wert(e) in Labels auflösen (single + multiple_choice)
 *   2. config hat unit   → Als formatierte Zahl + Einheit anzeigen (slider, future numeric)
 *   3. Fallback          → Rohtext (short_text, long_text, future text types)
 *
 * Neue Typen werden automatisch abgefangen, ohne diesen Helper anzupassen.
 */
export function resolveAnswer(
  q: QuestionConfig,
  answers: Record<string, string>,
): string | null {
  const raw = answers[q.id]
  if (!raw?.trim()) return null

  if (q.options.length > 0) {
    const labels = raw
      .split(',')
      .filter(Boolean)
      .map((v) => q.options.find((o) => o.value === v)?.label ?? v)
    return labels.length > 0 ? labels.join(', ') : null
  }

  const config = q.config as Record<string, unknown>
  if (typeof config.unit === 'string' && config.unit) {
    const num = Number(raw)
    if (!isNaN(num)) {
      return `${num.toLocaleString('de-DE')} ${config.unit}`
    }
  }

  return raw.trim() || null
}
