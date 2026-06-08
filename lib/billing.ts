type BillingTenant = {
  billing_model: string | null
  stripe_subscription_status: string | null
}

/**
 * Gibt true zurück wenn der Tenant vollen Zugriff hat.
 * - billing_model = 'free'  → immer aktiv (manuell gesetzt, kein Stripe-Check)
 * - Sonst: Stripe-Subscription muss 'active' oder 'trialing' sein
 */
export function isBillingActive(tenant: BillingTenant): boolean {
  if (tenant.billing_model === 'free') return true
  const s = tenant.stripe_subscription_status
  return s === 'active' || s === 'trialing'
}

export type SubscriptionStatus =
  | 'free'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'none'

export function getSubscriptionStatus(tenant: BillingTenant): SubscriptionStatus {
  if (tenant.billing_model === 'free') return 'free'
  return (tenant.stripe_subscription_status as SubscriptionStatus) ?? 'none'
}

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  free:       'Kostenlos',
  active:     'Aktiv',
  trialing:   'Testphase',
  past_due:   'Zahlung überfällig',
  canceled:   'Gekündigt',
  unpaid:     'Unbezahlt',
  incomplete: 'Unvollständig',
  none:       'Kein Abo',
}

export const STATUS_COLORS: Record<SubscriptionStatus, 'green' | 'amber' | 'red' | 'gray' | 'purple'> = {
  free:       'purple',
  active:     'green',
  trialing:   'green',
  past_due:   'amber',
  canceled:   'red',
  unpaid:     'red',
  incomplete: 'amber',
  none:       'gray',
}
