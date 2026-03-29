import { stripe } from '@/lib/stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from '@/types/database'
import { NextResponse } from 'next/server'

function stripeStatusToDb(status: string): SubscriptionStatus {
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

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = await createServiceClient()
    const { data: sub, error: subError } = await serviceSupabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id, status, cancel_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }
    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active Stripe subscription found.' }, { status: 400 })
    }
    if (sub.cancel_at) {
      return NextResponse.json(
        { message: 'Membership is already scheduled to cancel at period end.' },
        { status: 200 },
      )
    }

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    const cancelAtIso = updated.cancel_at ? new Date(updated.cancel_at * 1000).toISOString() : null
    const canceledAtIso = updated.canceled_at ? new Date(updated.canceled_at * 1000).toISOString() : null

    const { error: updateError } = await serviceSupabase
      .from('subscriptions')
      .update({
        status: stripeStatusToDb(updated.status),
        cancel_at: cancelAtIso,
        canceled_at: canceledAtIso,
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: cancelAtIso
        ? `Membership will end on ${new Date(cancelAtIso).toLocaleString()}.`
        : 'Membership cancellation scheduled.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel membership.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
