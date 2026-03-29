import { createClient } from '@/lib/supabase/server'
import { cancelListing } from '@/services/auction'
import { NextResponse } from 'next/server'

// POST /api/listings/[listingId]/cancel
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await cancelListing(user.id, listingId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ canceled: true })
}
