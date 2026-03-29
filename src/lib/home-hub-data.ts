import { createClient } from '@/lib/supabase/server'
import { CS2_MARKET_ALLTIME_ESTIMATE_USD_BILLIONS } from '@/lib/cs2-market-estimate'

export type LeaderboardSnippetRow = {
  rank: number
  username: string
  displayName: string
  avatarUrl: string | null
  totalValueUsd: number
}

export type BrowseSnippetRow = {
  username: string
  displayName: string
  avatarUrl: string | null
  totalValueUsd: number
}

export type AuctionSnippetRow = {
  id: string
  itemName: string
  currentBidUsd: number | null
  endsAt: string
}

type PublicProfileRow = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  steam_accounts:
    | { persona_name: string | null; avatar_url: string | null }
    | { persona_name: string | null; avatar_url: string | null }[]
    | null
}

async function computeLeaderboardTop(
  limit: number,
): Promise<LeaderboardSnippetRow[]> {
  const supabase = await createClient()
  const { data: rawProfiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, steam_accounts(persona_name, avatar_url)')
    .eq('inventory_visibility', 'public')

  if (error || !rawProfiles?.length) return []

  const profiles = rawProfiles as unknown as PublicProfileRow[]
  const userIds = profiles.map((p) => p.id)
  const { data: snapshotRows } = await supabase
    .from('inventory_snapshots')
    .select('user_id, total_value_usd, item_count, captured_at')
    .in('user_id', userIds)
    .order('captured_at', { ascending: false })

  const latestByUser = new Map<string, number>()
  for (const row of snapshotRows ?? []) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, Number(row.total_value_usd))
    }
  }

  const entries = profiles.map((p) => {
    const steam = Array.isArray(p.steam_accounts) ? p.steam_accounts[0] : p.steam_accounts
    return {
      username: p.username,
      displayName: p.display_name ?? steam?.persona_name ?? p.username,
      avatarUrl: steam?.avatar_url ?? p.avatar_url,
      totalValueUsd: latestByUser.get(p.id) ?? 0,
    }
  })

  return entries
    .sort((a, b) => b.totalValueUsd - a.totalValueUsd)
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

async function computeBrowseNewest(limit: number): Promise<BrowseSnippetRow[]> {
  const supabase = await createClient()
  const { data: rawProfiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at, steam_accounts(persona_name, avatar_url)')
    .eq('inventory_visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(24)

  if (error || !rawProfiles?.length) return []

  const profiles = rawProfiles as unknown as PublicProfileRow[]
  const userIds = profiles.map((p) => p.id)
  const { data: allSnapshots } = await supabase
    .from('inventory_snapshots')
    .select('user_id, total_value_usd, captured_at')
    .in('user_id', userIds)
    .order('captured_at', { ascending: false })

  const latest = new Map<string, number>()
  for (const s of allSnapshots ?? []) {
    if (!latest.has(s.user_id)) latest.set(s.user_id, Number(s.total_value_usd))
  }

  return profiles.slice(0, limit).map((p) => {
    const steam = Array.isArray(p.steam_accounts) ? p.steam_accounts[0] : p.steam_accounts
    return {
      username: p.username,
      displayName: p.display_name ?? steam?.persona_name ?? p.username,
      avatarUrl: steam?.avatar_url ?? p.avatar_url,
      totalValueUsd: latest.get(p.id) ?? 0,
    }
  })
}

export type HomeHubData = {
  displayName: string
  leaderboardTop3: LeaderboardSnippetRow[]
  browseNewest: BrowseSnippetRow[]
  mySnapshot: { totalValueUsd: number; itemCount: number; capturedAt: string } | null
  steam: { linked: boolean; personaName: string | null }
  activeAuctions: AuctionSnippetRow[]
  activeAuctionCount: number
  unreadMessages: number
  marketIndexStartB: number
  marketIndexEndB: number
  marketIndexChangePct: number
}

export async function loadHomeHubData(userId: string): Promise<HomeHubData> {
  const supabase = await createClient()

  const [
    profileRes,
    leaderboardTop3,
    browseNewest,
    snapshotRes,
    steamRes,
    auctionsRes,
    auctionCountRes,
    convRes,
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, username').eq('id', userId).maybeSingle(),
    computeLeaderboardTop(3),
    computeBrowseNewest(3),
    supabase
      .from('inventory_snapshots')
      .select('total_value_usd, item_count, captured_at')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('steam_accounts')
      .select('persona_name')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('auctions')
      .select(
        'id, current_bid_usd, ends_at, inventory_items!item_id(name)',
      )
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
      .limit(2),
    supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('conversations').select('id').or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`),
  ])

  const displayName =
    profileRes.data?.display_name ?? profileRes.data?.username ?? 'there'

  const snap = snapshotRes.data
  const mySnapshot = snap
    ? {
        totalValueUsd: Number(snap.total_value_usd),
        itemCount: snap.item_count,
        capturedAt: snap.captured_at,
      }
    : null

  const convIds = (convRes.data ?? []).map((c) => c.id)
  const { count: unreadMessages } =
    convIds.length > 0
      ? await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .neq('sender_id', userId)
          .neq('status', 'read')
      : { count: 0 }

  const alltime = [...CS2_MARKET_ALLTIME_ESTIMATE_USD_BILLIONS]
  const marketIndexStartB = alltime[0] ?? 0
  const marketIndexEndB = alltime[alltime.length - 1] ?? 0
  const marketIndexChangePct =
    marketIndexStartB > 0
      ? ((marketIndexEndB - marketIndexStartB) / marketIndexStartB) * 100
      : 0

  type AuctionJoin = {
    id: string
    current_bid_usd: number | null
    ends_at: string
    inventory_items: { name: string } | { name: string }[] | null
  }
  const rawA = (auctionsRes.data ?? []) as unknown as AuctionJoin[]
  const activeAuctions: AuctionSnippetRow[] = rawA.map((a) => {
    const item = Array.isArray(a.inventory_items) ? a.inventory_items[0] : a.inventory_items
    return {
      id: a.id,
      itemName: item?.name ?? 'Listing',
      currentBidUsd: a.current_bid_usd,
      endsAt: a.ends_at,
    }
  })

  return {
    displayName,
    leaderboardTop3,
    browseNewest,
    mySnapshot,
    steam: {
      linked: !!steamRes.data,
      personaName: steamRes.data?.persona_name ?? null,
    },
    activeAuctions,
    activeAuctionCount: auctionCountRes.count ?? 0,
    unreadMessages: unreadMessages ?? 0,
    marketIndexStartB,
    marketIndexEndB,
    marketIndexChangePct,
  }
}
