import { createClient } from '@/lib/supabase/server'
import { placeBid } from '@/services/auction'
import { getUserPlanInfo } from '@/lib/plan'
import { NextResponse } from 'next/server'

// POST /api/auctions/[auctionId]/bid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ auctionId: string }> },
) {
  const { auctionId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { isPremium, plan } = await getUserPlanInfo(user.id)
  if (!isPremium)
    return NextResponse.json({ error: 'Premium required to bid.' }, { status: 403 })
  if (plan !== 'pro')
    return NextResponse.json({ error: 'Pro plan required to bid on auctions.' }, { status: 403 })

  let amountUsd: number
  try {
    const body = await request.json()
    amountUsd = body.amountUsd
    if (typeof amountUsd !== 'number') throw new Error()
  } catch {
    return NextResponse.json({ error: 'amountUsd must be a number.' }, { status: 400 })
  }

  const result = await placeBid(user.id, auctionId, amountUsd)

  if (!result.ok) {
    // BID_TOO_LOW gets a 409 so the client can display the minimum
    const status = result.code === 'BID_TOO_LOW' ? 409
      : result.code === 'ENDED'    ? 410
      : 422
    return NextResponse.json(
      { error: result.error, code: result.code, minimum: result.minimum },
      { status },
    )
  }

  return NextResponse.json(result.data)
}
