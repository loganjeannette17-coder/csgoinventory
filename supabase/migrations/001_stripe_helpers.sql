-- =============================================================================
-- Migration 001: Stripe / auth helpers
-- Run after schema.sql
-- =============================================================================

-- Update the handle_new_user trigger to respect a preferred_username
-- passed via auth metadata (set by the registration form).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  preferred text;
  final_username text;
begin
  preferred := new.raw_user_meta_data ->> 'preferred_username';

  -- Sanitise: strip non-alphanumeric chars, truncate
  preferred := regexp_replace(coalesce(preferred, ''), '[^a-zA-Z0-9_-]', '', 'g');
  preferred := substr(preferred, 1, 26);

  -- Fall back to email prefix if nothing usable
  if char_length(preferred) < 3 then
    preferred := split_part(new.email, '@', 1);
    preferred := regexp_replace(preferred, '[^a-zA-Z0-9_-]', '', 'g');
    preferred := substr(preferred, 1, 26);
  end if;

  -- Guarantee uniqueness by appending 6 chars of the UUID
  final_username := preferred || '_' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    lower(final_username),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Add a unique index on stripe_customer_id for fast webhook lookups
create unique index if not exists idx_subscriptions_customer_id
  on public.subscriptions (stripe_customer_id);

-- Convenience view: users with their premium status and customer ID
-- Useful for admin queries; not exposed via RLS
create or replace view public.user_premium_status as
  select
    p.id        as user_id,
    p.username,
    p.is_premium,
    s.stripe_customer_id,
    s.status    as subscription_status,
    s.current_period_start,
    s.updated_at as payment_updated_at
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id;
