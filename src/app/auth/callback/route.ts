import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Handles the redirect from Supabase after:
//  - Email confirmation links
//  - OAuth provider redirects (Discord, GitHub, Google)
//  - Magic link logins
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  // `next` lets us send the user to a specific page post-login
  const next = searchParams.get('next') ?? '/dashboard'

  if (error) {
    console.error('[auth/callback] OAuth error:', error, errorDescription)
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', errorDescription ?? error)
    return NextResponse.redirect(loginUrl)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('[auth/callback] Code exchange failed:', exchangeError.message)
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', 'Authentication failed. Please try again.')
    return NextResponse.redirect(loginUrl)
  }

  // Successful auth — send to intended destination
  // Use a relative redirect to respect the current origin (avoids open-redirect)
  const redirectUrl = next.startsWith('/') ? new URL(next, origin) : new URL('/dashboard', origin)
  return NextResponse.redirect(redirectUrl)
}
