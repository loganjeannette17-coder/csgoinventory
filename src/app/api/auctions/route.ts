import { createClient } from '@/lib/supabase/server'
import { createAuction } from '@/services/auction'
import { getUserPlanInfo } from '@/lib/plan'
import { NextResponse } from 'next/server'

// POST /api/auctions — create a new auction
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { isPremium, plan } = await getUserPlanInfo(user.id)
  if (!isPremium)
    return NextResponse.json({ error: 'Premium required.' }, { status: 403 })
  if (plan !== 'pro')
    return NextResponse.json({ error: 'Pro plan required to create auctions.' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    itemId, startingBidUsd, buyNowPriceUsd,
    minIncrement = 0.5, durationHours, description,
  } = body as Record<string, unknown>

  if (!itemId || typeof itemId !== 'string')
    return NextResponse.json({ error: 'itemId is required.' }, { status: 400 })
  if (typeof startingBidUsd !== 'number')
    return NextResponse.json({ error: 'startingBidUsd must be a number.' }, { status: 400 })
  if (typeof durationHours !== 'number')
    return NextResponse.json({ error: 'durationHours is required.' }, { status: 400 })

  const result = await createAuction(user.id, {
    itemId,
    startingBidUsd:  startingBidUsd as number,
    buyNowPriceUsd:  typeof buyNowPriceUsd === 'number' ? buyNowPriceUsd : undefined,
    minIncrement:    minIncrement as number,
    durationHours:   durationHours as number,
    description:     typeof description === 'string' ? description : undefined,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json(result.data, { status: 201 })
}
