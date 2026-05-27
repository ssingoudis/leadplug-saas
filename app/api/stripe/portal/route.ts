import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .maybeSingle()

    if (error || !tenant?.stripe_customer_id) {
      return NextResponse.json({ error: 'Kein Stripe-Konto verknüpft' }, { status: 404 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/portal]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
