import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Keep this file free of Stripe/Supabase imports so Next.js build-time route analysis
// does not load those modules (fixes "Failed to collect page data for /api/stripe/checkout" on Vercel).
export async function POST(request: Request) {
  try {
    const { handleCheckoutPost } = await import('./checkout-post')
    return handleCheckoutPost(request)
  } catch (err) {
    console.error('[stripe/checkout] failed to load handler', err)
    return NextResponse.json({ error: 'Checkout temporarily unavailable.' }, { status: 500 })
  }
}
