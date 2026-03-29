import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/steam/openid'
import { NextResponse } from 'next/server'

// GET /api/steam/auth
// Redirects the authenticated user to Steam's OpenID login page.
// After Steam authenticates them, it sends them back to /api/steam/callback.
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user is premium before allowing Steam link
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  if (!profile?.is_premium) {
    return NextResponse.redirect(new URL('/upgrade', request.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const callbackUrl = `${appUrl}/api/steam/callback`

  return NextResponse.redirect(buildAuthUrl(callbackUrl))
}
