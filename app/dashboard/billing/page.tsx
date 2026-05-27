import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSubscriptionStatus } from '@/lib/billing'
import BillingClient from './BillingClient'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('billing_model, billing_price, stripe_customer_id, stripe_subscription_status, stripe_price_id')
    .maybeSingle()

  if (!tenant) redirect('/dashboard')

  const status = getSubscriptionStatus({
    billing_model: tenant.billing_model,
    stripe_subscription_status: tenant.stripe_subscription_status,
  })

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Abonnement & Billing</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verwalte deinen Plan und deine Zahlungsmethoden.</p>
      </div>

      <BillingClient
        status={status}
        planName="LeadPlug Standard"
        billingPrice={tenant.billing_price ?? 49}
        successParam={params.success === '1'}
        canceledParam={params.canceled === '1'}
        hasStripeCustomer={!!tenant.stripe_customer_id}
        testPriceId={process.env.STRIPE_PRICE_ID_TEST}
      />
    </div>
  )
}
