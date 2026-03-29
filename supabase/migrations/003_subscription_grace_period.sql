-- =============================================================================
-- Migration 003: Subscription grace period
-- Run after 002_auction_functions.sql
-- =============================================================================

-- Track when grace access expires after a failed payment.
-- NULL means no active grace period (subscription is healthy or was one-time).
alter table public.subscriptions
  add column if not exists grace_period_ends_at timestamptz;

-- Hourly cron: revoke premium once the grace window has closed.
-- Only touches users whose subscription is past_due AND grace has expired.
DO $do$
BEGIN
  -- Supabase may not have pg_cron enabled yet. Enable it so `cron.schedule` works.
  -- If this extension can't be created on your plan/settings, we skip scheduling
  -- and rely on manual/alternative cleanup until pg_cron is available.
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'pg_cron not available; skipping cron schedule setup: %', SQLERRM;
    RETURN;
  END;

  PERFORM cron.schedule(
    'revoke-expired-grace-periods',
    '0 * * * *',   -- every hour on the hour
    $job$
      update public.profiles p
      set    is_premium = false
      from   public.subscriptions s
      where  s.user_id             = p.id
        and  s.status              = 'past_due'
        and  s.grace_period_ends_at is not null
        and  s.grace_period_ends_at < now()
        and  p.is_premium          = true;
    $job$
  );
END $do$;
