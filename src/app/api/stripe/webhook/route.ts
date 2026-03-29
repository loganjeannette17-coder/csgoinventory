import { constructWebhookEvent, getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { applyCheckoutSessionFulfillment } from '@/lib/stripe-checkout-fulfillment'
import { getPlanFromPriceId } from '@/lib/plan'
import type { SubscriptionStatus } from '@/types/database'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// IMPORTANT: This route handler must receive the raw request body.
// Next.js parses JSON by default — we must read the raw stream here.
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // ── 1. Verify webhook signature ──────────────────────────────────────────
  // This prevents replay attacks and spoofed events.
  let event: Stripe.Event
  try {
    event = constructWebhookEvent(rawBody, signature)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── 2. Route to the appropriate handler ──────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      // ── Subscription lifecycle ──────────────────────────────────────────
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      // ── Grace period: don't revoke immediately on failed invoice ────────
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Acknowledge but ignore unhandled events — Stripe retries on non-2xx
        break
    }
  } catch (err) {
    console.error(`[stripe/webhook] Handler failed for ${event.type}:`, err)
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    session.client_reference_id ??
    (session.metadata?.supabase_user_id as string | undefined)

  if (!userId) {
    console.error('[stripe/webhook] checkout.session.completed missing user ID', {
      sessionId: session.id,
    })
    return
  }

  if (session.payment_status !== 'paid') {
    console.log('[stripe/webhook] Session completed but not paid yet:', session.id)
    return
  }

  await applyCheckoutSessionFulfillment(session)

  console.log(`[stripe/webhook] User ${userId} upgraded to premium (session ${session.id})`)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.supabase_user_id
  console.warn('[stripe/webhook] Payment failed', {
    userId: userId ?? 'unknown',
    paymentIntentId: paymentIntent.id,
    lastError: paymentIntent.last_payment_error?.message,
  })
  // Do not revoke premium here — the user may retry.
  // Subscription payment failures are handled in invoice.payment_failed below.
}

// ── Subscription handlers ─────────────────────────────────────────────────────

/**
 * Resolve the Supabase user ID from a Stripe customer.
 * We embed supabase_user_id in customer metadata when creating the customer
 * (see getOrCreateStripeCustomer) and also in subscription_data.metadata
 * (set in the checkout route). The subscription object is checked first to
 * avoid an extra Stripe API call when the data is already present.
 */
async function getUserIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  // Fast path: metadata set on the subscription object itself
  const fromSub = subscription.metadata?.supabase_user_id
  if (fromSub) return fromSub

  // Fallback: retrieve the Stripe customer and read its metadata
  const customer = await getStripe().customers.retrieve(subscription.customer as string)
  if (customer.deleted) return null
  return (customer as Stripe.Customer).metadata?.supabase_user_id ?? null
}

/** Stripe exposes more statuses than our DB enum — map into `SubscriptionStatus`. */
function stripeSubscriptionStatusToDb(status: Stripe.Subscription['status']): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
      return status
    case 'unpaid':
    case 'paused':
      return 'past_due'
    case 'incomplete_expired':
      return 'canceled'
    default:
      return 'past_due'
  }
}

/** Maps a Stripe subscription to the columns we store in the subscriptions table. */
function buildSubscriptionRow(userId: string, sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price.id ?? null
  return {
    user_id:                userId,
    stripe_customer_id:     sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id:        priceId,
    // Prefer plan stored in subscription metadata (set at checkout); derive from
    // price ID as a reliable fallback so the column is always correctly populated.
    plan: (sub.metadata?.plan as 'basic' | 'pro' | undefined)
      ?? getPlanFromPriceId(priceId),
    status:                 stripeSubscriptionStatusToDb(sub.status),
    current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at:              sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    canceled_at:            sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = await getUserIdFromSubscription(subscription)
  if (!userId) {
    console.error('[stripe/webhook] customer.subscription.created: could not resolve user', {
      subscriptionId: subscription.id,
    })
    return
  }

  const supabase = await createServiceClient()

  // Grant premium access
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: true })
    .eq('id', userId)

  if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`)

  // Upsert the subscription record (may already exist from checkout.session.completed)
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert(
      { ...buildSubscriptionRow(userId, subscription), grace_period_ends_at: null },
      { onConflict: 'stripe_customer_id' },
    )

  if (subError) throw new Error(`Failed to upsert subscription: ${subError.message}`)

  console.log(`[stripe/webhook] Subscription created for user ${userId} (${subscription.id})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await getUserIdFromSubscription(subscription)
  if (!userId) {
    console.error('[stripe/webhook] customer.subscription.updated: could not resolve user', {
      subscriptionId: subscription.id,
    })
    return
  }

  const supabase = await createServiceClient()
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'

  if (isActive) {
    // Payment recovered — restore premium and clear any grace period
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId)
    if (error) throw new Error(`Failed to restore premium: ${error.message}`)
  }

  const row = buildSubscriptionRow(userId, subscription)
  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        ...row,
        // Clear grace period when subscription is healthy again
        ...(isActive ? { grace_period_ends_at: null } : {}),
      },
      { onConflict: 'stripe_customer_id' },
    )

  if (subError) throw new Error(`Failed to update subscription: ${subError.message}`)

  console.log(`[stripe/webhook] Subscription updated for user ${userId}: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await getUserIdFromSubscription(subscription)
  if (!userId) {
    console.error('[stripe/webhook] customer.subscription.deleted: could not resolve user', {
      subscriptionId: subscription.id,
    })
    return
  }

  const supabase = await createServiceClient()

  // Revoke premium — subscription is fully canceled, grace period is over
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_premium: false })
    .eq('id', userId)

  if (profileError) throw new Error(`Failed to revoke premium: ${profileError.message}`)

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        ...buildSubscriptionRow(userId, subscription),
        status: 'canceled',
        grace_period_ends_at: null,
      },
      { onConflict: 'stripe_customer_id' },
    )

  if (subError) throw new Error(`Failed to update subscription: ${subError.message}`)

  console.log(`[stripe/webhook] Subscription canceled for user ${userId} — premium revoked`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Only act on subscription invoices (not one-time payment invoices)
  if (!invoice.subscription) return

  const customerId = invoice.customer as string
  const customer = await getStripe().customers.retrieve(customerId)
  if (customer.deleted) return

  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
  if (!userId) {
    console.error('[stripe/webhook] invoice.payment_failed: could not resolve user', {
      invoiceId: invoice.id,
    })
    return
  }

  // Grace period: user retains premium access for GRACE_PERIOD_DAYS.
  // The hourly pg_cron job (migration 003) will revoke premium once this timestamp passes.
  // If Stripe retries and the payment succeeds, customer.subscription.updated will fire
  // with status=active and clear the grace period before the cron runs.
  const graceDays = Math.max(1, Math.min(30, parseInt(process.env.GRACE_PERIOD_DAYS ?? '5', 10)))
  const gracePeriodEndsAt = new Date()
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + graceDays)

  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      grace_period_ends_at: gracePeriodEndsAt.toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) throw new Error(`Failed to record grace period: ${error.message}`)

  console.warn(
    `[stripe/webhook] Payment failed for user ${userId}. ` +
    `Grace period: ${graceDays} days (expires ${gracePeriodEndsAt.toISOString()})`,
  )
}
