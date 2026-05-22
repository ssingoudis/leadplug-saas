'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { STATUS_LABELS, STATUS_COLORS, type SubscriptionStatus } from '@/lib/billing'
import { CreditCard, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'

interface BillingClientProps {
  status: SubscriptionStatus
  planName: string | null
  billingPrice: number | null
  successParam: boolean
  canceledParam: boolean
  hasStripeCustomer: boolean
  testPriceId?: string
}

export default function BillingClient({
  status,
  planName,
  billingPrice,
  successParam,
  canceledParam,
  hasStripeCustomer,
  testPriceId,
}: BillingClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)

  async function startCheckout(priceId?: string) {
    setLoading('checkout')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceId ? { priceId } : {}),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Fehler beim Starten des Checkouts.')
    } catch {
      alert('Fehler beim Starten des Checkouts.')
    } finally {
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Fehler beim Öffnen des Portals.')
    } catch {
      alert('Fehler beim Öffnen des Portals.')
    } finally {
      setLoading(null)
    }
  }

  const isActive = status === 'active' || status === 'trialing' || status === 'free'
  const showUpgrade = !isActive
  const showPortal = hasStripeCustomer && status !== 'free' && status !== 'none'

  return (
    <div className="flex flex-col gap-6">
      {/* Feedback-Banner */}
      {successParam && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm font-medium">
          <CheckCircle2 size={18} className="shrink-0" />
          Abonnement erfolgreich aktiviert. Willkommen bei LeadPlug!
        </div>
      )}
      {canceledParam && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          Checkout abgebrochen. Du kannst jederzeit ein Abo starten.
        </div>
      )}

      {/* Status-Karte */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Aktueller Plan</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {planName ?? 'LeadPlug Standard'}
            </p>
            {billingPrice !== null && status !== 'free' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {billingPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / Monat
              </p>
            )}
          </div>
          <Badge variant={STATUS_COLORS[status]}>
            {STATUS_LABELS[status]}
          </Badge>
        </div>

        {/* Plan-Features */}
        <ul className="text-sm text-gray-600 dark:text-gray-400 flex flex-col gap-2">
          {[
            'Unbegrenzte Funnels',
            'Lead-Verwaltung & Statistiken',
            'Self-Service Editor',
            'iFrame-Embed für jede Website',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* Aktionen */}
        <div className="flex flex-wrap gap-3 pt-1">
          {showUpgrade && (
            <Button
              variant="primary"
              onClick={() => startCheckout()}
              disabled={loading !== null}
            >
              <CreditCard size={15} />
              {loading === 'checkout' ? 'Weiterleitung…' : 'Jetzt abonnieren — 49 € / Monat'}
            </Button>
          )}
          {showUpgrade && testPriceId && (
            <Button
              variant="secondary"
              onClick={() => startCheckout(testPriceId)}
              disabled={loading !== null}
            >
              <CreditCard size={15} />
              Test-Abo (1 € · Sofortkündigung)
            </Button>
          )}
          {showPortal && (
            <Button
              variant="secondary"
              onClick={openPortal}
              disabled={loading !== null}
            >
              <ExternalLink size={15} />
              {loading === 'portal' ? 'Weiterleitung…' : 'Abo verwalten'}
            </Button>
          )}
          {status === 'free' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 self-center">
              Kostenlos-Status wird durch den Administrator verwaltet.
            </p>
          )}
        </div>
      </div>

      {/* Info-Box: Webhook-Hinweis für Lokal-Entwicklung */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
          <strong className="text-gray-500 dark:text-gray-500">Entwicklungsmodus:</strong>{' '}
          Für Webhook-Tests lokal{' '}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
            stripe listen --forward-to localhost:3000/api/stripe/webhook
          </code>{' '}
          ausführen und <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> in{' '}
          <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">.env.local</code> eintragen.
        </div>
      )}
    </div>
  )
}
