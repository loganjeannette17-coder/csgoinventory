'use client'

import { useCountdown } from '@/hooks/useCountdown'
import { cn, formatUsd } from '@/lib/utils'
import Link from 'next/link'

export interface AuctionCardData {
  id: string
  status: string
  starting_bid_usd: number
  current_bid_usd: number | null
  buy_now_price_usd: number | null
  bid_count: number
  ends_at: string
  description: string | null
  seller: { username: string; display_name: string | null } | null
  item: {
    name: string
    icon_url: string
    icon_url_large: string | null
    rarity: string | null
    wear: string | null
  } | null
}

const RARITY_BORDER: Record<string, string> = {
  consumer:   'border-[#b0c3d9]',
  industrial: 'border-[#5e98d9]',
  mil_spec:   'border-[#4b69ff]',
  restricted: 'border-[#8847ff]',
  classified: 'border-[#d32ce6]',
  covert:     'border-[#eb4b4b]',
  contraband: 'border-[#e4ae39]',
}

const WEAR_ABBR: Record<string, string> = {
  factory_new:    'FN',
  minimal_wear:   'MW',
  field_tested:   'FT',
  well_worn:      'WW',
  battle_scarred: 'BS',
}

export function AuctionCard({ auction }: { auction: AuctionCardData }) {
  const countdown = useCountdown(auction.ends_at)
  const rarity    = auction.item?.rarity ?? ''
  const border    = RARITY_BORDER[rarity] ?? 'border-gray-700'
  const currentBid = auction.current_bid_usd ?? auction.starting_bid_usd

  return (
    <Link
      href={`/auctions/${auction.id}`}
      className={cn(
        'group flex flex-col bg-gray-900 border rounded-xl overflow-hidden',
        'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg',
        border,
        countdown.isExpired && 'opacity-60',
      )}
    >
      {/* Item image */}
      <div className="relative h-36 bg-gray-950/60 flex items-center justify-center">
        {auction.item && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={auction.item.icon_url_large ?? auction.item.icon_url}
            alt={auction.item.name}
            loading="lazy"
            className="h-full w-full object-contain p-2 transition-transform duration-150 group-hover:scale-105"
          />
        )}

        {/* Countdown badge */}
        <div
          className={cn(
            'absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded',
            countdown.urgency === 'critical' ? 'bg-red-600 text-white animate-pulse'
            : countdown.urgency === 'soon'   ? 'bg-yellow-600 text-white'
            :                                  'bg-gray-800/80 text-gray-300',
          )}
        >
          {countdown.label}
        </div>

        {/* Buy-now badge */}
        {auction.buy_now_price_usd && (
          <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-700 text-white">
            BUY NOW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-white text-xs font-medium leading-tight line-clamp-2">
          {auction.item?.name ?? 'Unknown item'}
        </p>

        {/* Wear */}
        {auction.item?.wear && (
          <p className="text-gray-500 text-[10px]">{WEAR_ABBR[auction.item.wear] ?? auction.item.wear}</p>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-0.5">
          <div>
            <p className="text-[10px] text-gray-500">
              {auction.bid_count > 0 ? 'Current bid' : 'Starting bid'}
            </p>
            <p className="text-green-400 font-semibold text-sm">{formatUsd(currentBid)}</p>
          </div>

          {auction.buy_now_price_usd && (
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Buy now</p>
              <p className="text-blue-400 font-semibold text-sm">
                {formatUsd(auction.buy_now_price_usd)}
              </p>
            </div>
          )}
        </div>

        {/* Bid count + seller */}
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>{auction.bid_count} bid{auction.bid_count !== 1 ? 's' : ''}</span>
          {auction.seller && (
            <span className="truncate ml-2">
              by {auction.seller.display_name ?? auction.seller.username}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
