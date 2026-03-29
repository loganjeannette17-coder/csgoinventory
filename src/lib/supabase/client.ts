import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import type { AppSupabaseClient } from '@/types/supabase-app-client'

// Singleton for use in Client Components and hooks.
// Call once per component tree — React will deduplicate.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local, set real values from Supabase → Settings → API, then restart `npm run dev`.',
    )
  }

  const trimmedUrl = url.trim()
  const trimmedKey = key.trim()

  let supabaseHost: string
  try {
    supabaseHost = new URL(trimmedUrl).hostname
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not a valid URL. It should look like https://abcdefghijklmnop.supabase.co ' +
        '(from Supabase → Settings → API). Fix .env.local and restart `npm run dev`.',
    )
  }

  // Only flag the real .env.example host — avoid `includes('your-project')` (false positives in comments / copy-paste).
  if (supabaseHost === 'your-project.supabase.co') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is still the .env.example placeholder host (your-project.supabase.co). ' +
        'Replace it with your real Project URL from Supabase → Settings → API, then restart `npm run dev`.',
    )
  }

  if (trimmedKey === 'your-anon-key') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is still the .env.example placeholder. ' +
        'In Supabase: Dashboard → Settings → API → copy the anon public key into .env.local, then restart `npm run dev`.',
    )
  }

  return createBrowserClient<Database, 'public'>(trimmedUrl, trimmedKey) as unknown as AppSupabaseClient
}
