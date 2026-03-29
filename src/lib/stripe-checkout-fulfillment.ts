import { createServiceClient } from '@/lib/supabase/server'
import { getPlanFromPriceId } from '@/lib/plan'
import type Stripe from 'stripe'

/**
 * Applies the same DB updates as `checkout.session.completed` webhook:
 * set profile premium + upsert subscriptions row.
 * Call only after verifying the Checkout Session is paid and belongs to the user.
 */
export async function applyCheckoutSessionFulfillment(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId =
    session.client_reference_id ??
    (session.metadata?.supabase_user_id as string | undefined)

  if (!userId) {
    throw new Error('Checkout session missing user id (client_reference_id / metadata)')
  }

  if (session.payment_status !== 'paid') {
    throw new Error(
      `Checkout session not paid yet (payment_status=${session.payment_status})`,
    )
  }

  const supabase = await createServiceClient()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', userId)

  if (profileError) {
    throw new Error(`Failed to update profile: ${profileError.message}`)
  }

  const priceId =
    session.metadata?.stripe_price_id ?? process.env.STRIPE_PRICE_ID ?? null

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription && typeof session.subscription === 'object' && 'id' in session.subscription
        ? (session.subscription as { id: string }).id
        : null

  const { error: subError } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId ?? session.id,
      stripe_price_id: priceId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      plan:
        (session.metadata?.plan as 'basic' | 'pro' | undefined) ??
        getPlanFromPriceId(priceId),
    },
    { onConflict: 'stripe_customer_id' },
  )

  if (subError) {
    throw new Error(`Failed to upsert subscription: ${subError.message}`)
  }
}
