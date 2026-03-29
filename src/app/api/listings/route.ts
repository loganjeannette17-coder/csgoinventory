import { createClient } from '@/lib/supabase/server'
import { createListing } from '@/services/auction'
import { NextResponse } from 'next/server'

// POST /api/listings — create a fixed-price listing
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_premium').eq('id', user.id).single()
  if (!profile?.is_premium)
    return NextResponse.json({ error: 'Premium required.' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { itemId, priceUsd, description } = body as Record<string, unknown>

  if (!itemId || typeof itemId !== 'string')
    return NextResponse.json({ error: 'itemId is required.' }, { status: 400 })
  if (typeof priceUsd !== 'number')
    return NextResponse.json({ error: 'priceUsd must be a number.' }, { status: 400 })

  const result = await createListing(user.id, {
    itemId,
    priceUsd,
    description: typeof description === 'string' ? description : undefined,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json(result.data, { status: 201 })
}
