import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/chat/conversations
// Body: { recipientId: string }
//
// Finds an existing 1-on-1 conversation between the caller and the recipient,
// or creates one. Idempotent — safe to call on every "Start chat" click.
export async function POST(request: Request) {
  const supabase = await createClient()

  // ── 1. Authenticate ───────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse and validate input ───────────────────────────────────────────
  let recipientId: string
  try {
    const body = await request.json()
    recipientId = body.recipientId
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!recipientId || typeof recipientId !== 'string') {
    return NextResponse.json({ error: 'recipientId is required.' }, { status: 400 })
  }

  if (recipientId === user.id) {
    return NextResponse.json({ error: 'Cannot start a conversation with yourself.' }, { status: 400 })
  }

  // ── 3. Verify recipient exists and is premium ─────────────────────────────
  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, is_premium')
    .eq('id', recipientId)
    .single()

  if (!recipient) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  if (!recipient.is_premium) {
    return NextResponse.json(
      { error: 'This user does not have an active subscription.' },
      { status: 403 },
    )
  }

  // ── 4. Find existing conversation (either user could be user_a or user_b) ─
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(user_a_id.eq.${user.id},user_b_id.eq.${recipientId}),` +
      `and(user_a_id.eq.${recipientId},user_b_id.eq.${user.id})`,
    )
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ conversationId: existing.id })
  }

  // ── 5. Create new conversation ────────────────────────────────────────────
  // The DB unique constraint on (least, greatest) prevents duplicates even under race conditions.
  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({ user_a_id: user.id, user_b_id: recipientId })
    .select('id')
    .single()

  if (createError) {
    // Handle the race condition: if another request created it simultaneously,
    // the unique constraint fires — retry the select.
    if (createError.code === '23505') {
      const { data: raceExisting } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(user_a_id.eq.${user.id},user_b_id.eq.${recipientId}),` +
          `and(user_a_id.eq.${recipientId},user_b_id.eq.${user.id})`,
        )
        .maybeSingle()

      if (raceExisting) {
        return NextResponse.json({ conversationId: raceExisting.id })
      }
    }

    console.error('[chat/conversations] Create failed:', createError)
    return NextResponse.json({ error: 'Failed to create conversation.' }, { status: 500 })
  }

  return NextResponse.json({ conversationId: created.id }, { status: 201 })
}
