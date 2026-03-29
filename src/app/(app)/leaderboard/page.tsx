import { createClient } from '@/lib/supabase/server'
import { formatUsd } from '@/lib/utils'
import Link from 'next/link'

const LEADERBOARD_LIMIT = 150

type PublicProfile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  steam_accounts:
    | { persona_name: string | null; avatar_url: string | null }
    | { persona_name: string | null; avatar_url: string | null }[]
    | null
}

type LatestSnapshot = {
  user_id: string
  total_value_usd: number
  item_count: number
}

type LeaderboardEntry = {
  rank: number
  username: string
  displayName: string
  avatarUrl: string | null
  totalValueUsd: number
  itemCount: number
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: rawProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, steam_accounts(persona_name, avatar_url)')
    .eq('inventory_visibility', 'public')

  if (profileError) {
    return (
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8">
        <p className="text-red-400 text-sm">
          Failed to load leaderboard. Please refresh.
        </p>
      </div>
    )
  }

  const profiles = (rawProfiles ?? []) as unknown as PublicProfile[]
  if (profiles.length === 0) {
    return (
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-3">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 text-sm">No public inventories yet.</p>
      </div>
    )
  }

  const userIds = profiles.map((p) => p.id)
  const { data: snapshotRows } = await supabase
    .from('inventory_snapshots')
    .select('user_id, total_value_usd, item_count, captured_at')
    .in('user_id', userIds)
    .order('captured_at', { ascending: false })

  // Keep latest snapshot per user.
  const latestByUser = new Map<string, LatestSnapshot>()
  for (const row of snapshotRows ?? []) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, {
        user_id: row.user_id,
        total_value_usd: row.total_value_usd,
        item_count: row.item_count,
      })
    }
  }

  const entries: LeaderboardEntry[] = profiles.map((p) => {
    const steam = Array.isArray(p.steam_accounts) ? p.steam_accounts[0] : p.steam_accounts
    const latest = latestByUser.get(p.id)
    const displayName = p.display_name ?? steam?.persona_name ?? p.username
    return {
      rank: 0,
      username: p.username,
      displayName,
      avatarUrl: steam?.avatar_url ?? p.avatar_url,
      totalValueUsd: latest?.total_value_usd ?? 0,
      itemCount: latest?.item_count ?? 0,
    }
  })

  const top = entries
    .sort((a, b) => b.totalValueUsd - a.totalValueUsd)
    .slice(0, LEADERBOARD_LIMIT)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Top {Math.min(LEADERBOARD_LIMIT, top.length)} public inventories by total value
        </p>
      </div>

      <div className="space-y-3">
        {top.map((entry) => (
          <Link
            key={entry.username}
            href={`/profile/${entry.username}`}
            className="group flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors"
          >
            <div className="w-10 shrink-0 text-center">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-gray-800 text-sm font-semibold text-gray-200 px-2">
                #{entry.rank}
              </span>
            </div>

            <div className="shrink-0">
              {entry.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.avatarUrl} alt={entry.displayName} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-lg font-bold">
                  {entry.displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                {entry.displayName}
              </p>
              <p className="text-gray-500 text-xs truncate">@{entry.username}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-green-400 font-semibold">{formatUsd(entry.totalValueUsd)}</p>
              <p className="text-xs text-gray-500">{entry.itemCount.toLocaleString()} items</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
