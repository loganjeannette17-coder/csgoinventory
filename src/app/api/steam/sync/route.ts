import { createClient } from '@/lib/supabase/server'
import { runInventorySync } from '@/services/inventory-sync'
import { NextResponse } from 'next/server'

// POST /api/steam/sync
// Triggers a full inventory sync for the authenticated user.
// Returns the sync result or a structured error.
export async function POST() {
  // ── 1. Authenticate ───────────────────────────────────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Verify premium ─────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  if (!profile?.is_premium) {
    return NextResponse.json(
      { error: 'Premium subscription required to sync inventory.' },
      { status: 403 },
    )
  }

  // ── 3. Run sync ───────────────────────────────────────────────────────────
  const outcome = await runInventorySync(user.id)

  if (!outcome.success) {
    const { error } = outcome

    switch (error.code) {
      case 'COOLDOWN':
        return NextResponse.json(
          {
            error: 'Sync cooldown active.',
            retryAfterMs: error.retryAfterMs,
            retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(error.retryAfterMs / 1000)),
            },
          },
        )

      case 'NO_STEAM_ACCOUNT':
        return NextResponse.json(
          { error: 'No Steam account linked. Please link your Steam account first.' },
          { status: 422 },
        )

      case 'PRIVATE_INVENTORY':
        return NextResponse.json(
          {
            error:
              'Your Steam inventory is private. ' +
              'Set it to Public in Steam → Privacy Settings, then sync again.',
          },
          { status: 422 },
        )

      case 'STEAM_API_ERROR':
        return NextResponse.json(
          { error: `Steam API error: ${error.message}` },
          { status: 502 },
        )

      case 'DB_ERROR':
        console.error('[steam/sync] DB error:', error.message)
        return NextResponse.json(
          { error: 'Failed to save inventory. Please try again.' },
          { status: 500 },
        )
    }
  }

  return NextResponse.json(outcome.result)
}
