import { createClient } from '@/lib/supabase/server'
import { cancelAuction } from '@/services/auction'
import { NextResponse } from 'next/server'

// POST /api/auctions/[auctionId]/cancel
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ auctionId: string }> },
) {
  const { auctionId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await cancelAuction(user.id, auctionId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ canceled: true })
}
