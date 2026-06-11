'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { STATUS_LABELS, STATUS_COLORS, type SubscriptionStatus } from '@/lib/billing'
import { CreditCard, ExternalLink, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

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
      {/* Kostenlos-Box — aktuell läuft LeadPlug für alle kostenlos (kein Feature-Gate aktiv). */}
      {status === 'free' && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <Sparkles size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Offene Beta: LeadPlug ist kostenlos.</p>
            <p className="mt-0.5 text-green-700/90 dark:text-green-300/80">
              Voller Zugriff auf alle Funktionen — ohne Kosten, ohne Kreditkarte.
            </p>
          </div>
        </div>
      )}

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
          Bezahlung abgebrochen — ein Abo lässt sich jederzeit starten.
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
            'Eigener Funnel-Editor',
            'Auf jeder Website einbindbar',
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
              Während der offenen Beta ist nichts weiter zu tun.
            </p>
          )}
        </div>
      </div>

      {/* Test-Kachel */}
      {showUpgrade && testPriceId && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Entwickler-Test</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">Test-Abo — 1 € / Monat</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Sofortige Kündigung — nur zum Testen des Checkout- und Webhook-Flows</p>
          </div>
          <div>
            <Button
              variant="secondary"
              onClick={() => startCheckout(testPriceId)}
              disabled={loading !== null}
            >
              <CreditCard size={15} />
              {loading === 'checkout' ? 'Weiterleitung…' : 'Test-Abo starten'}
            </Button>
          </div>
        </div>
      )}    </div>
  )
}
