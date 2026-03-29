import { createClient } from '@/lib/supabase/server'
import { verifySteamCallback, fetchSteamProfile } from '@/lib/steam/openid'
import { NextResponse } from 'next/server'

// GET /api/steam/callback
// Receives the OpenID redirect from Steam, verifies it server-to-server,
// then upserts the steam_accounts row for the current user.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // ── 1. Verify the OpenID assertion with Steam ─────────────────────────────
  const steamId = await verifySteamCallback(searchParams)

  if (!steamId) {
    const url = new URL('/settings', origin)
    url.searchParams.set('steam_error', 'Steam verification failed. Please try again.')
    return NextResponse.redirect(url)
  }

  // ── 2. Require an authenticated Supabase session ──────────────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  // ── 3. Guard: Steam ID already linked to a DIFFERENT account ─────────────
  const { data: existing } = await supabase
    .from('steam_accounts')
    .select('user_id')
    .eq('steam_id', steamId)
    .maybeSingle()

  if (existing && existing.user_id !== user.id) {
    const url = new URL('/settings', origin)
    url.searchParams.set('steam_error', 'This Steam account is already linked to another user.')
    return NextResponse.redirect(url)
  }

  // ── 4. Fetch the Steam profile (persona name, avatar, profile URL) ────────
  const profile = await fetchSteamProfile(steamId)

  // ── 5. Upsert the steam_accounts row ─────────────────────────────────────
  const { error: upsertErr } = await supabase
    .from('steam_accounts')
    .upsert(
      {
        user_id:      user.id,
        steam_id:     steamId,
        persona_name: profile?.personaName ?? null,
        avatar_url:   profile?.avatarUrl   ?? null,
        profile_url:  profile?.profileUrl  ?? null,
        // We don't know yet if the inventory is public — sync will tell us
      },
      { onConflict: 'user_id' },
    )

  if (upsertErr) {
    console.error('[steam/callback] Failed to save Steam account:', upsertErr)
    const url = new URL('/settings', origin)
    url.searchParams.set('steam_error', 'Failed to link Steam account. Please try again.')
    return NextResponse.redirect(url)
  }

  // ── 6. Redirect back to settings with success indicator ──────────────────
  const url = new URL('/settings', origin)
  url.searchParams.set('steam_linked', '1')
  return NextResponse.redirect(url)
}
