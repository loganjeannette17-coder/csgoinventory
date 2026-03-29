import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Shared Supabase client type (schema param loosened — see `lib/supabase/server.ts`). */
export type AppSupabaseClient = SupabaseClient<
  Database,
  'public',
  'public',
  /** Real schema shape for embedded `.select('profiles!...')` — `any` breaks the query parser (GenericStringError). */
  Database['public'],
  { PostgrestVersion: '12' }
>
