import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import type { AppSupabaseClient } from '@/types/supabase-app-client'

// Routes that do not require authentication
const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/setup/database'])

// Routes that require auth but NOT premium (e.g. the upgrade page itself)
const AUTH_NO_PREMIUM_ROUTES = new Set(['/upgrade'])

// Routes that require the 'pro' plan (basic plan users are redirected to upgrade).
// Checked by prefix — /auctions covers /auctions, /auctions/[id], /auctions/new, etc.
const PRO_ONLY_PREFIXES = ['/auctions']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // ── 1. Refresh the Supabase session (required by @supabase/ssr) ──────────
  const supabase = createServerClient<Database, 'public'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write cookies onto both the request and the outgoing response so
          // the refreshed session propagates correctly.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  ) as unknown as AppSupabaseClient

  // getUser() makes a network call to validate the JWT — do not use
  // getSession() here as it only reads the cookie without server validation.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── 2. Auth-page redirect: logged-in users should not see login/register ─
  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── 3. Public routes are always accessible ────────────────────────────────
  if (PUBLIC_ROUTES.has(pathname)) {
    return response
  }

  // ── 4. All other routes require authentication ────────────────────────────
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 5. Premium + plan gate — skip for /upgrade and API routes ───────────
  // After Stripe Checkout, user returns with ?payment=success before webhooks run.
  // Allow one dashboard load so the client can POST /api/stripe/sync-checkout.
  const isPostCheckoutReturn =
    pathname === '/dashboard' &&
    request.nextUrl.searchParams.get('payment') === 'success'

  if (
    !AUTH_NO_PREMIUM_ROUTES.has(pathname) &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/auth/') &&
    !isPostCheckoutReturn
  ) {
    // Single query: premium status + plan tier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_premium, subscriptions(plan)')
      .eq('id', user.id)
      .single()

    // Database schema not initialized yet in this Supabase project.
    if ((profileError as { code?: string } | null)?.code === 'PGRST205') {
      return NextResponse.redirect(new URL('/setup/database', request.url))
    }

    // 5a. Must have premium to access any protected route
    if (!profile?.is_premium) {
      return NextResponse.redirect(new URL('/upgrade', request.url))
    }

    // 5b. Pro-only routes — basic plan users are redirected to the pro upgrade page
    const subs = Array.isArray(profile.subscriptions)
      ? profile.subscriptions
      : [profile.subscriptions]
    const plan = (subs[0] as { plan?: string } | null)?.plan ?? 'pro'

    if (
      plan !== 'pro' &&
      PRO_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      return NextResponse.redirect(new URL('/upgrade?plan=pro', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public asset files
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
