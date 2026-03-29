import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import type { AppSupabaseClient } from '@/types/supabase-app-client'

export function readEnvVar(name: string): string {
  const raw = process.env[name]
  if (!raw?.trim()) {
    throw new Error(`${name} is not set`)
  }
  // Support `.env` lines like: KEY=actual_value  # comment
  // by stripping inline comments and taking only the first token.
  return raw
    .trim()
    .replace(/\s*#.*$/, '')
    .trim()
    .split(/\s+/)[0]
    .trim()
}

// For Server Components, Server Actions, and Route Handlers.
// `cookies()` is async in Next.js 15+.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database, 'public'>(
    readEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    readEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — cookie writes are ignored.
            // Middleware handles session refresh so this is safe.
          }
        },
      },
    },
  ) as unknown as AppSupabaseClient
}

// Service-role client for trusted server-side operations (webhooks, admin).
// NEVER import this in Client Components or expose to the browser.
export async function createServiceClient() {
  const serviceRoleKey = readEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRoleKey.startsWith('sbp_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY appears to be an `sbp_...` Project API key, not a JWT service role key. In Supabase Dashboard → Project Settings → API, copy the value labeled "Service role key" (it usually starts with `eyJ...`) and paste it into SUPABASE_SERVICE_ROLE_KEY.',
    )
  }
  // Helpful diagnosis: confirm what kind of key the app is actually using.
  // Never log the full key.
  console.log(
    `[supabase] service_role_key prefix=${serviceRoleKey.slice(0, 6)} len=${serviceRoleKey.length}`,
  )

  return createServerClient<Database, 'public'>(
    readEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          // IMPORTANT: service-role clients must not read user cookies.
          // If they do, @supabase/ssr may attach the user's JWT and RLS will apply,
          // defeating the point of using the service role key.
          return []
        },
        setAll(_cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // No-op: we intentionally do not persist any auth state for service role.
        },
      },
      auth: {
        // Service role bypasses RLS — only use for trusted operations
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  ) as unknown as AppSupabaseClient
}
