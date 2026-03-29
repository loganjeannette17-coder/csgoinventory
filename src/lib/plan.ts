import { createClient } from '@/lib/supabase/server'

export type Plan = 'basic' | 'pro'

export interface PlanInfo {
  isPremium: boolean
  /** null when the user has no subscription row (e.g. was never charged). */
  plan: Plan | null
}

/**
 * Returns the user's premium status and plan tier in a single DB round-trip.
 *
 * isPremium is sourced from profiles.is_premium (set by the webhook).
 * plan      is sourced from subscriptions.plan  (defaults to 'pro' for legacy rows).
 *
 * Callers that already need a supabase client should call createClient() themselves
 * and inline the query — this helper is for routes that only need the plan check.
 */
export async function getUserPlanInfo(userId: string): Promise<PlanInfo> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('is_premium, subscriptions(plan)')
    .eq('id', userId)
    .single()

  if (!data) return { isPremium: false, plan: null }

  // subscriptions is a one-to-many join result — take the first row
  const subs = Array.isArray(data.subscriptions) ? data.subscriptions : [data.subscriptions]
  const sub  = subs[0] as { plan?: string } | null | undefined

  return {
    isPremium: data.is_premium ?? false,
    plan:      (sub?.plan as Plan | null) ?? null,
  }
}

/**
 * Derives the plan tier from a Stripe price ID.
 * STRIPE_BASIC_PRICE_ID  → 'basic'
 * anything else (including STRIPE_SUBSCRIPTION_PRICE_ID) → 'pro'
 */
export function getPlanFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return 'pro'
  const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID
  if (basicPriceId && priceId === basicPriceId) return 'basic'
  return 'pro'
}
