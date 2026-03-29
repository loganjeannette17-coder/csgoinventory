-- =============================================================================
-- Migration 004: Platform transaction fees
-- Run after 003_subscription_grace_period.sql
-- =============================================================================

-- Fixed-price listings: fee is exact (price is known at creation time).
alter table public.listings
  add column if not exists platform_fee_usd numeric(10, 2) not null default 0;

-- Auctions: fee is estimated from the starting bid at creation time.
-- The stored value is informational — it is NOT deducted by the existing
-- purchase_listing() or place_bid() functions (those are intentionally untouched).
alter table public.auctions
  add column if not exists platform_fee_usd numeric(10, 2) not null default 0;

-- Indices let you query total fee revenue without a full scan.
create index if not exists idx_listings_fee on public.listings (platform_fee_usd)
  where status = 'sold';

create index if not exists idx_auctions_fee on public.auctions (platform_fee_usd)
  where status = 'ended';
