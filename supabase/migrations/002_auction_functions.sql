-- =============================================================================
-- Migration 002: Auction & listing database functions
-- Run after schema.sql and 001_stripe_helpers.sql
-- =============================================================================

-- ── Schema changes ────────────────────────────────────────────────────────────

-- Add buy-now price to auctions (null = no buy-now option)
alter table public.auctions
  add column if not exists buy_now_price_usd numeric(10,2)
    constraint buy_now_gte_starting check (
      buy_now_price_usd is null or buy_now_price_usd > starting_bid_usd
    );

-- ── Drop conflicting trigger ──────────────────────────────────────────────────
-- trg_new_bid_auction called handle_new_bid() which updates current_bid and
-- bid_count. The new place_bid() function does this atomically under a row lock.
-- Keeping both would double-increment bid_count.
drop trigger if exists trg_new_bid_auction on public.bids;

-- ── Remove direct-insert RLS on bids ─────────────────────────────────────────
-- All bid inserts must now go through place_bid() (SECURITY DEFINER).
-- Allowing direct client inserts would bypass the row-level lock.
drop policy if exists "Premium users can place bids" on public.bids;

-- ── place_bid() ───────────────────────────────────────────────────────────────
-- Atomically validates and records a bid.
-- Uses SELECT … FOR UPDATE to prevent concurrent bids from racing.
-- Returns JSONB: { success, bid_id, is_buy_now, amount } | { error, code, minimum? }
create or replace function public.place_bid(
  p_auction_id uuid,
  p_bidder_id  uuid,
  p_amount     numeric(10,2)
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction     auctions%rowtype;
  v_bid_id      uuid;
  v_min_bid     numeric(10,2);
  v_is_buy_now  boolean := false;
begin
  -- Acquire an exclusive row lock — blocks concurrent calls for the same auction.
  -- Any concurrent place_bid() call waits here until we commit.
  select * into v_auction
  from auctions
  where id = p_auction_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Auction not found', 'code', 'NOT_FOUND');
  end if;

  -- ── Guards ─────────────────────────────────────────────────────────────────

  if v_auction.status != 'active' then
    return jsonb_build_object('error', 'Auction is not active.', 'code', 'NOT_ACTIVE');
  end if;

  -- Real-time expiry check (cron may not have run yet)
  if v_auction.ends_at <= now() then
    update auctions set status = 'ended', updated_at = now() where id = p_auction_id;
    -- Free item if no winner
    if v_auction.current_bidder_id is null then
      update inventory_items set is_in_auction = false, updated_at = now()
      where id = v_auction.item_id;
    end if;
    return jsonb_build_object('error', 'This auction has ended.', 'code', 'ENDED');
  end if;

  if v_auction.seller_id = p_bidder_id then
    return jsonb_build_object('error', 'You cannot bid on your own auction.', 'code', 'SELF_BID');
  end if;

  -- ── Minimum bid ────────────────────────────────────────────────────────────

  if v_auction.current_bid_usd is null then
    v_min_bid := v_auction.starting_bid_usd;
  else
    v_min_bid := v_auction.current_bid_usd + v_auction.min_bid_increment;
  end if;

  if p_amount < v_min_bid then
    return jsonb_build_object(
      'error',   format('Minimum bid is $%s.', v_min_bid),
      'code',    'BID_TOO_LOW',
      'minimum', v_min_bid
    );
  end if;

  -- ── Buy-now check ──────────────────────────────────────────────────────────
  -- If the bid meets or exceeds the buy-now price, cap it there and end the auction.

  if v_auction.buy_now_price_usd is not null
     and p_amount >= v_auction.buy_now_price_usd then
    p_amount     := v_auction.buy_now_price_usd;
    v_is_buy_now := true;
  end if;

  -- ── Record bid ─────────────────────────────────────────────────────────────

  insert into bids (auction_id, bidder_id, amount_usd)
  values (p_auction_id, p_bidder_id, p_amount)
  returning id into v_bid_id;

  -- ── Update auction state ───────────────────────────────────────────────────

  update auctions
  set
    current_bid_usd   = p_amount,
    current_bidder_id = p_bidder_id,
    bid_count         = bid_count + 1,
    -- Buy-now ends the auction immediately
    status            = case when v_is_buy_now then 'ended'::auction_status else status end,
    updated_at        = now()
  where id = p_auction_id;

  return jsonb_build_object(
    'success',    true,
    'bid_id',     v_bid_id,
    'is_buy_now', v_is_buy_now,
    'amount',     p_amount
  );
end;
$$;

-- ── purchase_listing() ────────────────────────────────────────────────────────
-- Atomically marks a fixed-price listing as sold.
-- Row lock prevents two buyers from purchasing the same item simultaneously.
create or replace function public.purchase_listing(
  p_listing_id uuid,
  p_buyer_id   uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing listings%rowtype;
begin
  select * into v_listing
  from listings
  where id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Listing not found', 'code', 'NOT_FOUND');
  end if;

  if v_listing.status != 'active' then
    return jsonb_build_object('error', 'This item is no longer available.', 'code', 'NOT_ACTIVE');
  end if;

  if v_listing.seller_id = p_buyer_id then
    return jsonb_build_object('error', 'You cannot buy your own listing.', 'code', 'SELF_PURCHASE');
  end if;

  -- Mark as sold — trg_listing_item_flag trigger handles is_listed = false
  update listings
  set status     = 'sold',
      buyer_id   = p_buyer_id,
      sold_at    = now(),
      updated_at = now()
  where id = p_listing_id;

  return jsonb_build_object('success', true, 'item_id', v_listing.item_id);
end;
$$;

-- ── close_expired_auctions() ──────────────────────────────────────────────────
-- Called by pg_cron every minute.
-- Ends all active auctions whose ends_at has passed.
-- Frees items from auctions that ended with no winner.
create or replace function public.close_expired_auctions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed integer;
begin
  -- Step 1: End expired active auctions
  update auctions
  set status = 'ended', updated_at = now()
  where status = 'active' and ends_at <= now();

  get diagnostics v_closed = row_count;

  -- Step 2: Release items that ended with no winner back to "available"
  -- Items with a winner stay locked (pending transfer confirmation)
  update inventory_items ii
  set is_in_auction = false, updated_at = now()
  from auctions a
  where a.item_id = ii.id
    and a.status  = 'ended'
    and a.current_bidder_id is null
    and ii.is_in_auction = true;

  return v_closed;
end;
$$;

-- ── pg_cron schedule ──────────────────────────────────────────────────────────
-- Requires the pg_cron extension. Enable it in Supabase dashboard under
-- Database → Extensions → pg_cron, then run this block once.
--
-- select cron.schedule(
--   'close-expired-auctions',
--   '* * * * *',
--   'select public.close_expired_auctions()'
-- );
--
-- To verify: select * from cron.job;
-- To unschedule: select cron.unschedule('close-expired-auctions');

-- ── Grant execute on functions ────────────────────────────────────────────────
-- Authenticated users call place_bid and purchase_listing via supabase.rpc().
-- close_expired_auctions is called by cron (postgres role) only.
grant execute on function public.place_bid(uuid, uuid, numeric) to authenticated;
grant execute on function public.purchase_listing(uuid, uuid) to authenticated;

-- ── Index: bids.auction_id + amount for quick "minimum next bid" lookup ───────
create index if not exists idx_auctions_buy_now
  on public.auctions (buy_now_price_usd)
  where buy_now_price_usd is not null and status = 'active';
