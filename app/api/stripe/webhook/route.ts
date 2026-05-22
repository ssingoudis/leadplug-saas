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

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const priceId = sub.items.data[0]?.price.id ?? null

        await admin
          .from('tenants')
          .update({
            stripe_subscription_id: sub.id,
            stripe_subscription_status: sub.status,
            stripe_price_id: priceId,
            billing_model: 'per_month',
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        await admin
          .from('tenants')
          .update({
            stripe_subscription_status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      default:
        // Unbekannte Events ignorieren — kein Fehler zurückgeben
        break
    }
  } catch (err) {
    // DB-Fehler loggen aber Stripe mit 200 antworten — verhindert unnötige Retries
    console.error('[stripe/webhook] DB-Update fehlgeschlagen:', err)
  }

  return NextResponse.json({ received: true })
}
