// =============================================================================
// Auction & Listing Service
//
// All writes go through PostgreSQL functions for atomicity.
// All reads are ordinary Supabase queries (RLS applies).
// =============================================================================

import { createClient } from '@/lib/supabase/server'

// ── Shared types ──────────────────────────────────────────────────────────────

export type ServiceResult<T = void> =
  | { ok: true;  data: T }
  | { ok: false; error: string; code?: string; minimum?: number }

export interface CreateAuctionInput {
  itemId:          string
  startingBidUsd:  number
  buyNowPriceUsd?: number
  minIncrement:    number
  durationHours:   number
  description?:    string
}

export interface CreateListingInput {
  itemId:       string
  priceUsd:     number
  description?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALLOWED_DURATIONS_H = [1, 6, 12, 24, 72, 168] // up to 7 days

/**
 * Calculate the platform fee for a given amount.
 * Reads PLATFORM_FEE_BPS from env (default 300 = 3%). Clamped to 0–1000 bps.
 * Returns a value rounded to 2 decimal places.
 *
 * For listings: fee is exact (price is fixed).
 * For auctions: fee is estimated from starting_bid_usd; actual revenue depends
 * on the final sale price, but we store the estimate at creation time.
 */
function calcFeeUsd(amountUsd: number): number {
  const feeBps = Math.max(0, Math.min(1000, parseInt(process.env.PLATFORM_FEE_BPS ?? '300', 10)))
  return Math.round(amountUsd * feeBps / 10000 * 100) / 100
}

function validatePositiveAmount(value: number, label: string): string | null {
  if (!Number.isFinite(value) || value <= 0) return `${label} must be a positive number.`
  if (value > 999_999) return `${label} cannot exceed $999,999.`
  return null
}

// ── createAuction ─────────────────────────────────────────────────────────────

export async function createAuction(
  userId: string,
  input: CreateAuctionInput,
): Promise<ServiceResult<{ auctionId: string }>> {
  // ── Validate input ─────────────────────────────────────────────────────────
  const startErr = validatePositiveAmount(input.startingBidUsd, 'Starting bid')
  if (startErr) return { ok: false, error: startErr }

  if (input.buyNowPriceUsd != null) {
    const buyErr = validatePositiveAmount(input.buyNowPriceUsd, 'Buy-now price')
    if (buyErr) return { ok: false, error: buyErr }
    if (input.buyNowPriceUsd <= input.startingBidUsd) {
      return { ok: false, error: 'Buy-now price must be higher than the starting bid.' }
    }
  }

  if (!Number.isFinite(input.minIncrement) || input.minIncrement < 0.01) {
    return { ok: false, error: 'Minimum increment must be at least $0.01.' }
  }

  if (!ALLOWED_DURATIONS_H.includes(input.durationHours)) {
    return { ok: false, error: 'Invalid auction duration.' }
  }

  const supabase = await createClient()

  // ── Verify item ownership and eligibility ──────────────────────────────────
  const { data: item } = await supabase
    .from('inventory_items')
    .select('id, name, is_listed, is_in_auction, is_marketable')
    .eq('id', input.itemId)
    .eq('user_id', userId)
    .single()

  if (!item)             return { ok: false, error: 'Item not found in your inventory.' }
  if (item.is_listed)    return { ok: false, error: 'This item is already listed for sale.' }
  if (item.is_in_auction)return { ok: false, error: 'This item is already in an active auction.' }
  if (!item.is_marketable) return { ok: false, error: 'This item cannot be listed on the marketplace.' }

  // ── Calculate times ────────────────────────────────────────────────────────
  const now     = new Date()
  const endsAt  = new Date(now.getTime() + input.durationHours * 60 * 60 * 1000)

  // ── Insert auction — trg_auction_item_flag sets is_in_auction = true ───────
  const { data: auction, error } = await supabase
    .from('auctions')
    .insert({
      seller_id:         userId,
      item_id:           input.itemId,
      starting_bid_usd:  input.startingBidUsd,
      buy_now_price_usd: input.buyNowPriceUsd ?? null,
      min_bid_increment: input.minIncrement,
      // Fee estimated from starting bid — informational, not deducted by place_bid()
      platform_fee_usd:  calcFeeUsd(input.startingBidUsd),
      status:            'active',
      starts_at:         now.toISOString(),
      ends_at:           endsAt.toISOString(),
      description:       input.description?.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[auction] Create failed:', error)
    return { ok: false, error: 'Failed to create auction. Please try again.' }
  }

  return { ok: true, data: { auctionId: auction.id } }
}

// ── placeBid ──────────────────────────────────────────────────────────────────

export async function placeBid(
  userId: string,
  auctionId: string,
  amountUsd: number,
): Promise<ServiceResult<{ bidId: string; isBuyNow: boolean; amount: number }>> {
  const amountErr = validatePositiveAmount(amountUsd, 'Bid amount')
  if (amountErr) return { ok: false, error: amountErr }

  // Round to 2 decimal places to avoid floating-point DB errors
  const amount = Math.round(amountUsd * 100) / 100

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_bidder_id:  userId,
    p_amount:     amount,
  })

  if (error) {
    console.error('[auction] place_bid RPC error:', error)
    return { ok: false, error: 'Failed to place bid. Please try again.' }
  }

  const result = data as {
    success?:    boolean
    error?:      string
    code?:       string
    minimum?:    number
    bid_id?:     string
    is_buy_now?: boolean
    amount?:     number
  }

  if (!result.success) {
    return {
      ok:      false,
      error:   result.error ?? 'Bid failed.',
      code:    result.code,
      minimum: result.minimum,
    }
  }

  return {
    ok:   true,
    data: {
      bidId:     result.bid_id!,
      isBuyNow:  result.is_buy_now ?? false,
      amount:    result.amount!,
    },
  }
}

// ── cancelAuction ─────────────────────────────────────────────────────────────

export async function cancelAuction(
  userId: string,
  auctionId: string,
): Promise<ServiceResult> {
  const supabase = await createClient()

  const { data: auction } = await supabase
    .from('auctions')
    .select('id, seller_id, bid_count, status')
    .eq('id', auctionId)
    .single()

  if (!auction)                    return { ok: false, error: 'Auction not found.' }
  if (auction.seller_id !== userId) return { ok: false, error: 'You do not own this auction.' }
  if (auction.status !== 'active') return { ok: false, error: 'Only active auctions can be canceled.' }
  if (auction.bid_count > 0)       return { ok: false, error: 'Cannot cancel an auction that already has bids.' }

  // trg_auction_item_flag sets is_in_auction = false when status → 'canceled'
  const { error } = await supabase
    .from('auctions')
    .update({ status: 'canceled' })
    .eq('id', auctionId)

  if (error) return { ok: false, error: 'Failed to cancel auction.' }
  return { ok: true, data: undefined }
}

// ── createListing ─────────────────────────────────────────────────────────────

export async function createListing(
  userId: string,
  input: CreateListingInput,
): Promise<ServiceResult<{ listingId: string }>> {
  const priceErr = validatePositiveAmount(input.priceUsd, 'Price')
  if (priceErr) return { ok: false, error: priceErr }

  const supabase = await createClient()

  const { data: item } = await supabase
    .from('inventory_items')
    .select('id, is_listed, is_in_auction, is_marketable')
    .eq('id', input.itemId)
    .eq('user_id', userId)
    .single()

  if (!item)              return { ok: false, error: 'Item not found in your inventory.' }
  if (item.is_listed)     return { ok: false, error: 'This item is already listed for sale.' }
  if (item.is_in_auction) return { ok: false, error: 'This item is already in an active auction.' }
  if (!item.is_marketable)return { ok: false, error: 'This item cannot be listed on the marketplace.' }

  // trg_listing_item_flag sets is_listed = true
  const priceUsd = Math.round(input.priceUsd * 100) / 100
  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      seller_id:        userId,
      item_id:          input.itemId,
      price_usd:        priceUsd,
      platform_fee_usd: calcFeeUsd(priceUsd),
      description:      input.description?.trim() || null,
      status:           'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[listing] Create failed:', error)
    return { ok: false, error: 'Failed to create listing. Please try again.' }
  }

  return { ok: true, data: { listingId: listing.id } }
}

// ── cancelListing ─────────────────────────────────────────────────────────────

export async function cancelListing(
  userId: string,
  listingId: string,
): Promise<ServiceResult> {
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', listingId)
    .single()

  if (!listing)                    return { ok: false, error: 'Listing not found.' }
  if (listing.seller_id !== userId) return { ok: false, error: 'You do not own this listing.' }
  if (listing.status !== 'active') return { ok: false, error: 'Only active listings can be canceled.' }

  const { error } = await supabase
    .from('listings')
    .update({ status: 'canceled' })
    .eq('id', listingId)

  if (error) return { ok: false, error: 'Failed to cancel listing.' }
  return { ok: true, data: undefined }
}

// ── purchaseListing ───────────────────────────────────────────────────────────

export async function purchaseListing(
  userId: string,
  listingId: string,
): Promise<ServiceResult<{ itemId: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('purchase_listing', {
    p_listing_id: listingId,
    p_buyer_id:   userId,
  })

  if (error) {
    console.error('[listing] purchase_listing RPC error:', error)
    return { ok: false, error: 'Failed to purchase. Please try again.' }
  }

  const result = data as { success?: boolean; error?: string; code?: string; item_id?: string }

  if (!result.success) {
    return { ok: false, error: result.error ?? 'Purchase failed.', code: result.code }
  }

  return { ok: true, data: { itemId: result.item_id! } }
}
