import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const admin = createAdminClient()
    const { data: tenant, error } = await admin
      .from('tenants')
      .select('id, slug, company_name, notification_email, stripe_customer_id, billing_model, stripe_subscription_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant nicht gefunden' }, { status: 404 })
    }

    // Optionaler priceId-Override aus dem Request-Body (z.B. für Test-Abo)
    const body = await req.json().catch(() => ({}))
    const priceId: string = body.priceId || STRIPE_PRICE_ID

    if (!priceId) {
      return NextResponse.json({ error: 'Kein Stripe-Plan konfiguriert' }, { status: 500 })
    }

    // Stripe Customer anlegen falls noch nicht vorhanden
    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.notification_email ?? user.email,
        name: tenant.company_name ?? undefined,
        metadata: { tenant_slug: tenant.slug, supabase_tenant_id: tenant.id },
      })
      customerId = customer.id

      await admin
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenant.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Kein payment_method_types — Stripe wählt dynamisch (Best Practice)
      subscription_data: {
        metadata: { tenant_slug: tenant.slug, supabase_tenant_id: tenant.id },
      },
      success_url: `${baseUrl}/dashboard/billing?success=1`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
