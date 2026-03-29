'use client'

import { createClient } from '@/lib/supabase/client'
import { useCountdown } from '@/hooks/useCountdown'
import { cn, formatUsd, formatAbsoluteDate } from '@/lib/utils'
import { Timestamp } from '@/components/ui/Timestamp'
import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Auction {
  id: string
  status: string
  starting_bid_usd: number
  current_bid_usd: number | null
  buy_now_price_usd: number | null
  min_bid_increment: number
  bid_count: number
  ends_at: string
  seller_id: string
  current_bidder_id: string | null
  description: string | null
  platform_fee_usd: number
}

interface Bid {
  id: string
  bidder_id: string
  amount_usd: number
  placed_at: string
  bidder_username?: string
}

interface Props {
  auction: Auction
  initialBids: Bid[]
  currentUserId: string
  sellerName: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuctionDetail({ auction: initial, initialBids, currentUserId, sellerName }: Props) {
  const [auction, setAuction]   = useState(initial)
  const [bids,    setBids]       = useState(initialBids)
  const [amount,  setAmount]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const bidMapRef               = useRef(new Map(initialBids.map((b) => [b.id, b])))

  const countdown   = useCountdown(auction.ends_at)
  const isActive    = auction.status === 'active' && !countdown.isExpired
  const isSeller    = auction.seller_id === currentUserId
  const isWinner    = auction.current_bidder_id === currentUserId
  const minNextBid  = auction.current_bid_usd
    ? auction.current_bid_usd + auction.min_bid_increment
    : auction.starting_bid_usd

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`auction_detail:${auction.id}`)
      // Auction row updates (bid count, current bid, status changes)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'auctions',
        filter: `id=eq.${auction.id}`,
      }, (payload) => {
        setAuction((prev) => ({ ...prev, ...(payload.new as Auction) }))
      })
      // New bids
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'bids',
        filter: `auction_id=eq.${auction.id}`,
      }, (payload) => {
        const bid = payload.new as Bid
        if (!bidMapRef.current.has(bid.id)) {
          bidMapRef.current.set(bid.id, bid)
          setBids(
            [...bidMapRef.current.values()].sort(
              (a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime(),
            ),
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [auction.id])

  // ── Place bid ──────────────────────────────────────────────────────────────
  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const amountUsd = parseFloat(amount)
    if (isNaN(amountUsd)) { setError('Enter a valid amount.'); setLoading(false); return }

    const res = await fetch(`/api/auctions/${auction.id}/bid`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amountUsd }),
    })
    const data = await res.json()

    if (!res.ok) {
      if (data.minimum) {
        setError(`${data.error} Minimum: ${formatUsd(data.minimum)}`)
        setAmount(String(data.minimum))
      } else {
        setError(data.error ?? 'Bid failed.')
      }
    } else {
      setAmount('')
      setSuccess(
        data.isBuyNow
          ? `🎉 You bought this item for ${formatUsd(data.amount)}!`
          : `Bid of ${formatUsd(data.amount)} placed successfully.`,
      )
    }

    setLoading(false)
  }

  // ── Buy now ────────────────────────────────────────────────────────────────
  async function handleBuyNow() {
    if (!auction.buy_now_price_usd) return
    setError(null)
    setSuccess(null)
    setLoading(true)

    const res = await fetch(`/api/auctions/${auction.id}/bid`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ amountUsd: auction.buy_now_price_usd }),
    })
    const data = await res.json()

    if (!res.ok) setError(data.error ?? 'Purchase failed.')
    else setSuccess(`🎉 You bought this item for ${formatUsd(auction.buy_now_price_usd)}!`)

    setLoading(false)
  }

  // ── Cancel auction ────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!confirm('Cancel this auction? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/auctions/${auction.id}/cancel`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Cancel failed.')
    } else {
      setAuction((prev) => ({ ...prev, status: 'canceled' }))
      setSuccess('Auction canceled.')
    }
    setLoading(false)
  }

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* ── Left: bid history ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Bid History ({auction.bid_count})
          </h2>

          {bids.length === 0 ? (
            <p className="text-gray-500 text-sm">No bids yet. Be the first!</p>
          ) : (
            <ul className="space-y-2">
              {bids.map((bid, i) => (
                <li
                  key={bid.id}
                  className={cn(
                    'flex items-center justify-between py-2',
                    i < bids.length - 1 && 'border-b border-gray-800',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <span className="text-yellow-400 text-xs font-bold">👑</span>
                    )}
                    <span className="text-gray-300 text-sm">
                      {bid.bidder_username ?? bid.bidder_id.slice(0, 8) + '…'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold text-sm">{formatUsd(bid.amount_usd)}</p>
                    <Timestamp date={bid.placed_at} className="text-gray-600 text-[10px]" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {auction.description && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {auction.description}
            </p>
          </div>
        )}
      </section>

      {/* ── Right: bid panel ─────────────────────────────────────────────── */}
      <aside className="space-y-4">
        {/* Current bid */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">
              {auction.bid_count > 0 ? 'Current Bid' : 'Starting Bid'}
            </p>
            <p className="text-3xl font-extrabold text-white mt-0.5">
              {formatUsd(auction.current_bid_usd ?? auction.starting_bid_usd)}
            </p>
          </div>

          {/* Countdown */}
          <div className={cn(
            'flex items-center gap-2 text-sm font-semibold',
            countdown.urgency === 'critical' ? 'text-red-400'
            : countdown.urgency === 'soon'   ? 'text-yellow-400'
            :                                  'text-gray-300',
          )}>
            <ClockIcon />
            {auction.status === 'ended' || auction.status === 'canceled'
              ? <span className="text-gray-500">Auction {auction.status}</span>
              : countdown.isExpired
                ? <span className="text-red-400 animate-pulse">Just ended</span>
                : countdown.label
            }
          </div>

          <p className="text-gray-600 text-xs">
            Ends: {formatAbsoluteDate(auction.ends_at)}
          </p>

          {auction.buy_now_price_usd && (
            <div className="pt-1 border-t border-gray-800">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Buy Now</p>
              <p className="text-blue-400 font-bold text-xl">
                {formatUsd(auction.buy_now_price_usd)}
              </p>
            </div>
          )}
        </div>

        {/* Auction outcome banner */}
        {auction.status === 'ended' && (
          <div className={cn(
            'rounded-xl px-4 py-3 text-sm font-medium',
            isWinner
              ? 'bg-green-950/40 border border-green-800 text-green-300'
              : auction.bid_count === 0
                ? 'bg-gray-800/60 border border-gray-700 text-gray-400'
                : 'bg-gray-800/60 border border-gray-700 text-gray-400',
          )}>
            {isWinner
              ? '🎉 You won this auction!'
              : auction.bid_count === 0
                ? 'Ended with no bids.'
                : isSeller
                  ? 'Your auction ended.'
                  : 'Auction ended.'}
          </div>
        )}

        {/* Messages */}
        {error   && <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-xl px-3 py-2">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-950/40 border border-green-800 rounded-xl px-3 py-2">{success}</p>}

        {/* Bid form */}
        {isActive && !isSeller && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <form onSubmit={handleBid} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Your bid (min {formatUsd(minNextBid)})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={minNextBid}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={minNextBid.toFixed(2)}
                    className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg pl-7 pr-3 py-2 text-white text-sm outline-none transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Spinner />}
                Place bid
              </button>
            </form>

            {auction.buy_now_price_usd && (
              <button
                onClick={handleBuyNow}
                disabled={loading}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
              >
                Buy Now · {formatUsd(auction.buy_now_price_usd)}
              </button>
            )}
          </div>
        )}

        {/* Seller controls */}
        {isSeller && isActive && auction.bid_count === 0 && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-red-900 hover:border-red-700 border border-gray-700 text-gray-400 hover:text-red-300 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel auction
          </button>
        )}

        {/* Auction meta */}
        <div className="text-xs text-gray-600 space-y-1 px-1">
          <p>Listed by <span className="text-gray-400">{sellerName}</span></p>
          <p>Min. increment: {formatUsd(auction.min_bid_increment)}</p>
          {auction.platform_fee_usd > 0 && (
            <p title="Estimated platform fee based on starting bid. Seller receives the sale price minus this fee.">
              Platform fee:{' '}
              <span className="text-gray-400">{formatUsd(auction.platform_fee_usd)} est.</span>
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
