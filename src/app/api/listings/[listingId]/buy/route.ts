import { createClient } from '@/lib/supabase/server'
import { purchaseListing } from '@/services/auction'
import { NextResponse } from 'next/server'

// POST /api/listings/[listingId]/buy
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_premium').eq('id', user.id).single()
  if (!profile?.is_premium)
    return NextResponse.json({ error: 'Premium required to purchase.' }, { status: 403 })

  const result = await purchaseListing(user.id, listingId)
  if (!result.ok) {
    const status = result.code === 'NOT_ACTIVE' ? 410 : 422
    return NextResponse.json({ error: result.error, code: result.code }, { status })
  }
  return NextResponse.json(result.data)
}
