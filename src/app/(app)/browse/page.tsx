import { createClient } from '@/lib/supabase/server'
import { UserCard, type PublicUser } from './UserCard'
import { UserCardSkeleton } from '@/components/ui/Skeleton'
import { Suspense } from 'react'

const PAGE_SIZE = 24

interface SearchParams {
  q?: string
  page?: string
  sort?: 'value_desc' | 'value_asc' | 'newest'
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const page  = Math.max(1, parseInt(params.page ?? '1', 10))
  const sort  = params.sort ?? 'value_desc'
  const from  = (page - 1) * PAGE_SIZE

  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Browse Inventories</h1>
        <p className="text-gray-500 text-sm mt-1">
          Public CS2 inventories from the community
        </p>
      </div>

      {/* Search + sort */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by username…"
          className="bg-gray-900 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors w-64"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none cursor-pointer"
        >
          <option value="value_desc">Highest value first</option>
          <option value="value_asc">Lowest value first</option>
          <option value="newest">Newest first</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          Search
        </button>
        {query && (
          <a
            href="/browse"
            className="text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <UserCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <UserList query={query} sort={sort} from={from} page={page} />
      </Suspense>
    </div>
  )
}

// Separate async component so Suspense works correctly
async function UserList({
  query,
  sort,
  from,
  page,
}: {
  query: string
  sort: string
  from: number
  page: number
}) {
  const supabase = await createClient()

  // ── Fetch public profiles ──────────────────────────────────────────────────
  let profileQuery = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at, steam_accounts(persona_name, avatar_url)')
    .eq('inventory_visibility', 'public')
    .range(from, from + PAGE_SIZE - 1)

  if (query) {
    profileQuery = profileQuery.ilike('username', `%${query}%`)
  }

  if (sort === 'newest') {
    profileQuery = profileQuery.order('created_at', { ascending: false })
  } else {
    profileQuery = profileQuery.order('created_at', { ascending: false })
  }

  const { data: profiles, error } = await profileQuery

  if (error) {
    return (
      <p className="text-red-400 text-sm">
        Failed to load users. Please refresh the page.
      </p>
    )
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 space-y-2">
        <p className="text-lg font-medium text-gray-400">
          {query ? 'No users found' : 'No public inventories yet'}
        </p>
        <p className="text-sm">
          {query
            ? 'Try a different search term.'
            : 'Be the first — set your inventory to Public in Settings.'}
        </p>
      </div>
    )
  }

  // ── Fetch latest snapshot for each profile in one query ───────────────────
  const userIds = profiles.map((p) => p.id)
  const { data: allSnapshots } = await supabase
    .from('inventory_snapshots')
    .select('user_id, total_value_usd, item_count, captured_at')
    .in('user_id', userIds)
    .order('captured_at', { ascending: false })

  // Keep only the latest snapshot per user
  const latestSnapshot = new Map<string, { total_value_usd: number; item_count: number }>()
  for (const snap of allSnapshots ?? []) {
    if (!latestSnapshot.has(snap.user_id)) {
      latestSnapshot.set(snap.user_id, {
        total_value_usd: snap.total_value_usd,
        item_count:      snap.item_count,
      })
    }
  }

  // ── Assemble and sort ──────────────────────────────────────────────────────
  const users: PublicUser[] = profiles.map((p) => {
    const steam = Array.isArray(p.steam_accounts) ? p.steam_accounts[0] : p.steam_accounts
    const snap  = latestSnapshot.get(p.id) ?? { total_value_usd: 0, item_count: 0 }
    return {
      id:                 p.id,
      username:           p.username,
      display_name:       p.display_name,
      avatar_url:         p.avatar_url,
      steam_persona_name: steam?.persona_name ?? null,
      steam_avatar_url:   steam?.avatar_url   ?? null,
      total_value_usd:    snap.total_value_usd,
      item_count:         snap.item_count,
    }
  })

  if (sort === 'value_desc') users.sort((a, b) => b.total_value_usd - a.total_value_usd)
  if (sort === 'value_asc')  users.sort((a, b) => a.total_value_usd - b.total_value_usd)

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}

      {/* Pagination */}
      {(users.length === PAGE_SIZE || page > 1) && (
        <div className="flex justify-center gap-3 pt-4">
          {page > 1 && (
            <PaginationLink page={page - 1} label="← Previous" />
          )}
          {users.length === PAGE_SIZE && (
            <PaginationLink page={page + 1} label="Next →" />
          )}
        </div>
      )}
    </div>
  )
}

function PaginationLink({ page, label }: { page: number; label: string }) {
  return (
    <a
      href={`/browse?page=${page}`}
      className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
    >
      {label}
    </a>
  )
}
