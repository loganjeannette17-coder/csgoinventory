import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { AuctionDetail } from './AuctionDetail'
import { formatUsd } from '@/lib/utils'

interface Props {
  params: Promise<{ auctionId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { auctionId } = await params
  const supabase = await createClient()
  const { data: metaRow } = await supabase
    .from('auctions')
    .select('inventory_items!item_id(name), current_bid_usd, starting_bid_usd')
    .eq('id', auctionId)
    .single()
  if (!metaRow) return { title: 'Auction not found' }
  const data = metaRow as {
    inventory_items: { name: string } | { name: string }[] | null
    current_bid_usd: number | null
    starting_bid_usd: number
  }
  const item = Array.isArray(data.inventory_items) ? data.inventory_items[0] : data.inventory_items
  const bid  = data.current_bid_usd ?? data.starting_bid_usd
  return { title: `${item?.name ?? 'Item'} — ${formatUsd(bid)} | CS2 Auction` }
}

export default async function AuctionPage({ params }: Props) {
  const { auctionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // ── Load auction + joined data ─────────────────────────────────────────────
  const { data: rawUnknown } = await supabase
    .from('auctions')
    .select(
      'id, seller_id, item_id, status, starting_bid_usd, current_bid_usd, ' +
      'buy_now_price_usd, min_bid_increment, bid_count, ends_at, starts_at, ' +
      'description, current_bidder_id, created_at, platform_fee_usd, ' +
      'profiles!seller_id(id, username, display_name, avatar_url), ' +
      'inventory_items!item_id(' +
        'id, name, market_hash_name, icon_url, icon_url_large, rarity, wear, ' +
        'float_value, type, collection, sticker_data, inspect_link, market_price_usd' +
      ')',
    )
    .eq('id', auctionId)
    .single()

  if (!rawUnknown) notFound()

  type ProfileEmbed = { id: string; username: string; display_name: string | null; avatar_url: string | null }
  type ItemEmbed = {
    id: string
    name: string
    market_hash_name: string
    icon_url: string | null
    icon_url_large: string | null
    rarity: string | null
    wear: string | null
    float_value: number | null
    type: string | null
    collection: string | null
    sticker_data: unknown
    inspect_link: string | null
    market_price_usd: number | null
  }
  const raw = rawUnknown as unknown as {
    id: string
    seller_id: string
    item_id: string
    status: string
    starting_bid_usd: number
    current_bid_usd: number | null
    buy_now_price_usd: number | null
    min_bid_increment: number
    bid_count: number
    ends_at: string
    starts_at: string
    description: string | null
    current_bidder_id: string | null
    created_at: string
    platform_fee_usd: number | null
    profiles: ProfileEmbed | ProfileEmbed[] | null
    inventory_items: ItemEmbed | ItemEmbed[] | null
  }

  const seller = Array.isArray(raw.profiles)       ? raw.profiles[0]       : raw.profiles
  const item   = Array.isArray(raw.inventory_items) ? raw.inventory_items[0] : raw.inventory_items

  // ── Load bid history with bidder usernames ────────────────────────────────
  const { data: rawBids } = await supabase
    .from('bids')
    .select('id, bidder_id, amount_usd, placed_at, profiles!bidder_id(username, display_name)')
    .eq('auction_id', auctionId)
    .order('placed_at', { ascending: false })
    .limit(50)

  type BidRow = {
    id: string
    bidder_id: string
    amount_usd: number
    placed_at: string
    profiles:
      | { username: string; display_name: string | null }
      | { username: string; display_name: string | null }[]
      | null
  }
  const bidRows = (rawBids ?? []) as unknown as BidRow[]

  const bids = bidRows.map((b) => {
    const p = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
    return {
      id:               b.id,
      bidder_id:        b.bidder_id,
      amount_usd:       b.amount_usd,
      placed_at:        b.placed_at,
      bidder_username:  p?.display_name ?? p?.username ?? undefined,
    }
  })

  const sellerName = seller?.display_name ?? seller?.username ?? 'Unknown'

  const WEAR_LABELS: Record<string, string> = {
    factory_new: 'Factory New', minimal_wear: 'Minimal Wear',
    field_tested: 'Field-Tested', well_worn: 'Well-Worn', battle_scarred: 'Battle-Scarred',
  }

  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Item header */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Image */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shrink-0 w-full sm:w-64 h-48 flex items-center justify-center">
          {item && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.icon_url_large ?? item.icon_url ?? ''}
              alt={item.name}
              className="h-full w-full object-contain p-4"
            />
          )}
        </div>

        {/* Details */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{item?.name}</h1>

          <div className="flex flex-wrap gap-2 text-xs">
            {item?.wear && (
              <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                {WEAR_LABELS[item.wear] ?? item.wear}
              </span>
            )}
            {item?.rarity && (
              <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded capitalize">
                {item.rarity.replace('_', '-')}
              </span>
            )}
            {item?.collection && (
              <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">{item.collection}</span>
            )}
          </div>

          {item?.market_price_usd && (
            <p className="text-gray-500 text-sm">
              Market price: <span className="text-gray-300">{formatUsd(item.market_price_usd)}</span>
            </p>
          )}

          {item?.inspect_link && (
            <a
              href={item.inspect_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Inspect in game ↗
            </a>
          )}
        </div>
      </div>

      {/* Auction detail (realtime client component) */}
      <AuctionDetail
        auction={{
          id:                raw.id,
          status:            raw.status,
          starting_bid_usd:  raw.starting_bid_usd,
          current_bid_usd:   raw.current_bid_usd,
          buy_now_price_usd: raw.buy_now_price_usd ?? null,
          min_bid_increment: raw.min_bid_increment,
          bid_count:         raw.bid_count,
          ends_at:           raw.ends_at,
          seller_id:         raw.seller_id,
          current_bidder_id: raw.current_bidder_id,
          description:       raw.description,
          platform_fee_usd:  raw.platform_fee_usd ?? 0,
        }}
        initialBids={bids}
        currentUserId={user?.id ?? ''}
        sellerName={sellerName}
      />
    </div>
  )
}
