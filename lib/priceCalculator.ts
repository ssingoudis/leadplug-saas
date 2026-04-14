import type { PriceEstimate, PricingConfig } from '@/types'

const FALLBACK_BASE_PRICE = 15000

export function calculateEstimate(
  answers: Record<string, string>,
  pricing: PricingConfig,
): PriceEstimate {
  const base = pricing.basePrice[answers.flaeche] ?? FALLBACK_BASE_PRICE
  const storageAddon =
    answers.stromspeicher === 'ja' ? pricing.storageAddon : 0
  const total = base + storageAddon

  return {
    min: Math.round(total * 0.9),
    max: Math.round(total * 1.15),
    currency: pricing.currency,
  }
}