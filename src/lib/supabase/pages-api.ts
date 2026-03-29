import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Database } from '@/types/database'
import type { AppSupabaseClient } from '@/types/supabase-app-client'
import { readEnvVar } from '@/lib/supabase/server'

/** Supabase browser session for legacy `pages/api` routes (no `next/headers` cookies()). */
export function createPagesApiSupabaseClient(
  req: NextApiRequest,
  res: NextApiResponse,
): AppSupabaseClient {
  return createServerClient<Database, 'public'>(
    readEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    readEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie ?? '')
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
          })
        },
      },
    },
  ) as unknown as AppSupabaseClient
}
