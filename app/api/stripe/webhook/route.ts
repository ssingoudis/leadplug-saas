import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

// Next.js App Router: bodyParser ist standardmäßig aus für diese Route nicht nötig,
// aber wir brauchen den raw text für die Stripe-Signaturprüfung
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET nicht gesetzt')
    return NextResponse.json({ error: 'Webhook nicht konfiguriert' }, { status: 500 })
  }

  if (!signature) {
    return NextResponse.json({ error: 'Keine Stripe-Signatur' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Signatur-Verifikation fehlgeschlagen:', err)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Aufgabe 54b: DB-Fehler → 500. Stripe retried dann mit Backoff (bis zu 3 Tage) —
  // genau der Mechanismus, der transiente DB-Ausfälle heilt. Die Updates sind
  // idempotent (Status-Set per customer_id), Mehrfach-Zustellung ist harmlos.
  // Wichtig: der Supabase-Client WIRFT nicht — Fehler kommen im Result-Objekt;
  // das frühere try/catch hat sie deshalb still verschluckt.
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      const priceId = sub.items.data[0]?.price.id ?? null

      const { error } = await admin
        .from('tenants')
        .update({
          stripe_subscription_id: sub.id,
          stripe_subscription_status: sub.status,
          stripe_price_id: priceId,
          billing_model: 'per_month',
        })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('[stripe/webhook] DB-Update fehlgeschlagen:', error)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      const { error } = await admin
        .from('tenants')
        .update({
          stripe_subscription_status: 'canceled',
          stripe_subscription_id: null,
          stripe_price_id: null,
        })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('[stripe/webhook] DB-Update fehlgeschlagen:', error)
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      }
      break
    }

    default:
      // Unbekannte Events ignorieren — kein Fehler zurückgeben
      break
  }

  return NextResponse.json({ received: true })
}
