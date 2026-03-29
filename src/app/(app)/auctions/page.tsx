import { createClient } from '@/lib/supabase/server'
import type { AuctionStatus } from '@/types/database'
import { AuctionCard, type AuctionCardData } from './AuctionCard'
import { AuctionSortSelect } from './AuctionSortSelect'
import Link from 'next/link'

const PAGE_SIZE = 24

const AUCTION_STATUSES: readonly AuctionStatus[] = ['pending', 'active', 'ended', 'canceled']

function parseAuctionStatus(raw: string | undefined): AuctionStatus {
  if (raw && (AUCTION_STATUSES as readonly string[]).includes(raw)) return raw as AuctionStatus
  return 'active'
}

interface SearchParams {
  status?: string
  sort?:   string
  page?:   string
}

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params  = await searchParams
  const status  = parseAuctionStatus(params.status)
  const sort    = params.sort   ?? 'ending_soon'
  const page    = Math.max(1, parseInt(params.page ?? '1', 10))
  const from    = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Query auctions with joined data ───────────────────────────────────────
  let query = supabase
    .from('auctions')
    .select(
      'id, status, starting_bid_usd, current_bid_usd, buy_now_price_usd, ' +
      'bid_count, ends_at, description, ' +
      'profiles!seller_id(username, display_name), ' +
      'inventory_items!item_id(name, icon_url, icon_url_large, rarity, wear)',
      { count: 'exact' },
    )
    .eq('status', status)
    .range(from, from + PAGE_SIZE - 1)

  // Sorting
  if (sort === 'ending_soon') query = query.order('ends_at',        { ascending: true })
  if (sort === 'highest_bid') query = query.order('current_bid_usd',{ ascending: false, nullsFirst: false })
  if (sort === 'most_bids')   query = query.order('bid_count',      { ascending: false })
  if (sort === 'newest')      query = query.order('created_at',     { ascending: false })

  const { data: rawAuctions, count } = await query

  // PostgREST embed hints don't satisfy the Supabase TS parser — narrow manually.
  type AuctionListRow = {
    id: string
    status: string
    starting_bid_usd: number
    current_bid_usd: number | null
    buy_now_price_usd: number | null
    bid_count: number
    ends_at: string
    description: string | null
    profiles:
      | { username: string; display_name: string | null }
      | { username: string; display_name: string | null }[]
      | null
    inventory_items:
      | AuctionCardData['item']
      | AuctionCardData['item'][]
      | null
  }
  const rows = (rawAuctions ?? []) as unknown as AuctionListRow[]

  // Reshape the PostgREST joined rows
  const auctions: AuctionCardData[] = rows.map((a) => ({
    id:               a.id,
    status:           a.status,
    starting_bid_usd: a.starting_bid_usd,
    current_bid_usd:  a.current_bid_usd,
    buy_now_price_usd:a.buy_now_price_usd ?? null,
    bid_count:        a.bid_count,
    ends_at:          a.ends_at,
    description:      a.description,
    seller: Array.isArray(a.profiles) ? a.profiles[0] ?? null : (a.profiles as AuctionCardData['seller']),
    item:   Array.isArray(a.inventory_items) ? a.inventory_items[0] ?? null : (a.inventory_items as AuctionCardData['item']),
  }))

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {count ?? 0} active auction{count !== 1 ? 's' : ''}
          </p>
        </div>
        {user && (
          <Link
            href="/auctions/new"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            + List an item
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-center">
        <input type="hidden" name="status" value={status} />
        <StatusTabs current={status} />

        <AuctionSortSelect defaultValue={sort} />
      </form>

      {/* Grid */}
      {auctions.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <p className="text-gray-400 font-medium text-lg">No auctions found</p>
          <p className="text-gray-600 text-sm">
            {status === 'active'
              ? 'Be the first to list an item.'
              : 'No auctions match these filters.'}
          </p>
          {user && (
            <Link href="/auctions/new" className="inline-block mt-2 text-blue-400 hover:underline text-sm">
              List an item →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {auctions.map((a) => <AuctionCard key={a.id} auction={a} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3">
          {page > 1 && (
            <a href={`/auctions?status=${status}&sort=${sort}&page=${page - 1}`}
               className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              ← Previous
            </a>
          )}
          <span className="text-gray-500 text-sm py-2">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/auctions?status=${status}&sort=${sort}&page=${page + 1}`}
               className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function StatusTabs({ current }: { current: string }) {
  const tabs = [
    { value: 'active', label: 'Active'  },
    { value: 'ended',  label: 'Ended'   },
  ]
  return (
    <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
      {tabs.map((t) => (
        <a
          key={t.value}
          href={`/auctions?status=${t.value}`}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            current === t.value
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  )
}
