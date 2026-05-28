import type { QuestionConfig } from '@/types'

/**
 * Löst eine rohe Antwort in einen anzeigbaren String auf – generisch für alle QuestionTypes.
 *
 * Logik:
 *   1. checkbox → "Ja"/"Nein" (Single-Boolean)
 *   2. date → lokalisiert "28.05.2026" statt ISO
 *   3. Frage hat options → Wert(e) in Labels auflösen (single + multi_choice + dropdown)
 *   4. config hat unit → Zahl + Einheit (slider, number)
 *   5. Fallback → Rohtext (short_text, long_text, email, tel)
 */
export function resolveAnswer(
  q: QuestionConfig,
  answers: Record<string, string>,
): string | null {
  const raw = answers[q.id]
  if (raw == null) return null

  // Checkbox: "true"/"false" → "Ja"/"Nein"
  if (q.questionType === 'checkbox') {
    if (raw === 'true') return 'Ja'
    if (raw === 'false') return 'Nein'
    return null
  }

  if (!raw.trim()) return null

  // Date: ISO YYYY-MM-DD → lokalisiert (de-DE)
  if (q.questionType === 'date') {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    return raw.trim()
  }

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
