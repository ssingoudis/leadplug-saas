'use client'

import { useState } from 'react'
import { BarChart3, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const META_PIXEL_RE = /^[0-9]{5,20}$/
const GOOGLE_SENDTO_RE = /^AW-[0-9]+(\/[\w-]+)?$/

export default function TrackingSettings({
  slug,
  initialMetaPixelId,
  initialGoogleAdsConversion,
}: {
  slug: string
  initialMetaPixelId: string
  initialGoogleAdsConversion: string
}) {
  const [meta, setMeta] = useState(initialMetaPixelId)
  const [google, setGoogle] = useState(initialGoogleAdsConversion)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = meta !== initialMetaPixelId || google !== initialGoogleAdsConversion
  const metaInvalid = meta.trim().length > 0 && !META_PIXEL_RE.test(meta.trim())
  const googleInvalid = google.trim().length > 0 && !GOOGLE_SENDTO_RE.test(google.trim())
  const canSave = dirty && !metaInvalid && !googleInvalid && !saving

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/tenant/funnels/${slug}/tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaPixelId: meta.trim(), googleAdsConversion: google.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Speichern fehlgeschlagen.')
        return
      }
      // Server normalisiert leere Strings zu null — lokalen State angleichen.
      const data = await res.json()
      setMeta(data.metaPixelId ?? '')
      setGoogle(data.googleAdsConversion ?? '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Netzwerkfehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={15} className="text-primary" />
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Conversion-Tracking</h4>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
        Trag hier deine Werbe-IDs ein – dann meldet jeder abgeschickte Lead automatisch eine Conversion an Facebook bzw. Google. Du musst nichts am Embed-Code ändern. Felder leer lassen = aus.
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meta-Pixel-ID <span className="text-gray-400 font-normal">(Facebook / Instagram)</span>
          </label>
          <Input value={meta} onChange={setMeta} placeholder="z. B. 123456789012345" />
          {metaInvalid && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Nur Ziffern (5–20 Stellen).</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Google-Ads-Conversion <span className="text-gray-400 font-normal">(ID / Label)</span>
          </label>
          <Input value={google} onChange={setGoogle} placeholder="z. B. AW-123456789/AbCdEfGhIj" />
          {googleInvalid && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Format: AW-XXXXXXXXX oder AW-XXXXXXXXX/Label.</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} disabled={!canSave}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saving ? 'Speichere…' : saved ? 'Gespeichert' : 'Speichern'}
        </Button>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
        Hinweis: Du bist für die datenschutzkonforme Einbindung deiner Pixel (Cookie-Banner / Einwilligung) auf deiner Website selbst verantwortlich.
      </p>
    </div>
  )
}
