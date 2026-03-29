-- =============================================================================
-- Migration 005: Subscription plan tiers
-- Run after 004_platform_fees.sql
-- =============================================================================

-- Add plan column. Default 'pro' so every existing subscriber retains full access.
alter table public.subscriptions
  add column if not exists plan text not null default 'pro';

-- Only 'basic' and 'pro' are valid values.
alter table public.subscriptions
  add constraint chk_subscription_plan check (plan in ('basic', 'pro'));

-- Fast lookup used by middleware and API route plan checks.
create index if not exists idx_subscriptions_user_plan
  on public.subscriptions (user_id, plan);
