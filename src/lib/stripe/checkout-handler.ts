import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer, getStripe } from '@/lib/stripe'
import { getPlanFromPriceId, getUserPlanInfoWithClient } from '@/lib/plan'
import type { Plan } from '@/lib/plan'
import type { AppSupabaseClient } from '@/types/supabase-app-client'
import { NextResponse } from 'next/server'

/**
 * Shared checkout logic. `supabase` must be the caller's session (App Router or Pages API).
 */
export async function handleStripeCheckoutPost(
  request: Request,
  supabase: AppSupabaseClient,
): Promise<Response> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'Your account has no email address; add one before subscribing.' },
        { status: 400 },
      )
    }

    let requestedPlan: Plan = 'pro'
    try {
      const body = await request.json()
      if (body.plan === 'basic') requestedPlan = 'basic'
    } catch {
      // No body or non-JSON body — default to 'pro' (existing behavior)
    }

    const { isPremium, plan: currentPlan } = await getUserPlanInfoWithClient(supabase, user.id)

    if (isPremium) {
      const alreadyCovered =
        currentPlan === 'pro' ||
        (currentPlan === 'basic' && requestedPlan === 'basic')
      if (alreadyCovered) {
        return NextResponse.json(
          { error: 'You already have an active subscription.' },
          { status: 409 },
        )
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (!appUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL is not set in the server environment.' },
        { status: 500 },
      )
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID?.trim()
    const proPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim()
    const legacyPriceId = process.env.STRIPE_PRICE_ID?.trim()

    if (basicPriceId?.startsWith('prod_')) {
      return NextResponse.json(
        {
          error:
            `STRIPE_BASIC_PRICE_ID looks like a Product ID (starts with prod_...). You must paste the recurring Price ID (starts with price_...). Got: ${basicPriceId.slice(0, 12)}...`,
        },
        { status: 500 },
      )
    }
    if (proPriceId?.startsWith('prod_')) {
      return NextResponse.json(
        {
          error:
            `STRIPE_SUBSCRIPTION_PRICE_ID looks like a Product ID (starts with prod_...). You must paste the recurring Price ID (starts with price_...). Got: ${proPriceId.slice(0, 12)}...`,
        },
        { status: 500 },
      )
    }
    if (legacyPriceId?.startsWith('prod_')) {
      return NextResponse.json(
        {
          error:
            `STRIPE_PRICE_ID looks like a Product/Product ID (starts with prod_...). You must paste the one-time Price ID (starts with price_...). Got: ${legacyPriceId.slice(0, 12)}...`,
        },
        { status: 500 },
      )
    }

    if (requestedPlan === 'basic' && !basicPriceId) {
      return NextResponse.json(
        {
          error:
            'Basic plan is not configured. Create a $3.99/month recurring Price in Stripe and set STRIPE_BASIC_PRICE_ID in .env.local.',
        },
        { status: 500 },
      )
    }

    const isSubscription = !!(basicPriceId || proPriceId)

    const resolvedPriceId: string | undefined =
      requestedPlan === 'basic' && basicPriceId
        ? basicPriceId
        : proPriceId ?? legacyPriceId

    if (!resolvedPriceId) {
      return NextResponse.json(
        {
          error:
            'Pro plan is not configured. Set STRIPE_SUBSCRIPTION_PRICE_ID (recommended) or STRIPE_PRICE_ID for a one-time purchase.',
        },
        { status: 500 },
      )
    }

    const resolvedPlan: Plan = isSubscription
      ? getPlanFromPriceId(resolvedPriceId)
      : 'pro'

    const serviceSupabase = await createServiceClient()
    const { error: upsertError } = await serviceSupabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'incomplete',
        plan: resolvedPlan,
      },
      { onConflict: 'stripe_customer_id' },
    )

    if (upsertError) {
      console.error('[stripe/checkout] subscriptions upsert', upsertError)
      return NextResponse.json(
        { error: `Could not save subscription: ${upsertError.message}` },
        { status: 500 },
      )
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],

      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        plan: resolvedPlan,
        stripe_price_id: resolvedPriceId,
      },
      ...(isSubscription && {
        subscription_data: {
          metadata: { supabase_user_id: user.id, plan: resolvedPlan },
        },
      }),

      success_url: `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade?payment=canceled`,

      customer_email: undefined,
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    const message = err instanceof Error ? err.message : 'Checkout failed unexpectedly.'
    if (message.toLowerCase().includes('invalid api key')) {
      return NextResponse.json(
        {
          error:
            'Stripe rejected the API key. In Stripe Dashboard → Developers → API keys, copy the full *Secret key* (not the publishable key) and paste it into STRIPE_SECRET_KEY in .env.local. Make sure it starts with `sk_test_` (test) or `sk_live_` (live) and is not a placeholder like `sk_live_..._key`.',
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
