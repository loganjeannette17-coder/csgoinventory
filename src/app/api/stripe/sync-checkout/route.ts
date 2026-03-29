import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { applyCheckoutSessionFulfillment } from '@/lib/stripe-checkout-fulfillment'
import { NextResponse } from 'next/server'

/**
 * Called from the browser right after Stripe redirects to success_url.
 * Ensures premium is activated even if the webhook is delayed or not running locally.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let sessionId: string
  try {
    const body = await request.json()
    sessionId = body.session_id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  })

  const sessionUserId =
    session.client_reference_id ??
    (session.metadata?.supabase_user_id as string | undefined)

  if (!sessionUserId || sessionUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await applyCheckoutSessionFulfillment(session)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    console.error('[stripe/sync-checkout]', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
