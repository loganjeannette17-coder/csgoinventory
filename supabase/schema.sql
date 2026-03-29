-- =============================================================================
-- CS2 Inventory Platform — Full PostgreSQL Schema
-- Supabase / PostgreSQL
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

create type visibility_type      as enum ('public', 'private');
create type subscription_status  as enum ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
create type auction_status       as enum ('pending', 'active', 'ended', 'canceled');
create type listing_status       as enum ('active', 'sold', 'canceled');
create type item_rarity          as enum ('consumer', 'industrial', 'mil_spec', 'restricted', 'classified', 'covert', 'contraband');
create type item_wear            as enum ('factory_new', 'minimal_wear', 'field_tested', 'well_worn', 'battle_scarred');
create type message_status       as enum ('sent', 'delivered', 'read');

-- =============================================================================
-- PROFILES
-- Extends Supabase auth.users. One row per user, created via trigger.
-- =============================================================================

create table public.profiles (
  id                  uuid        primary key references auth.users (id) on delete cascade,
  username            text        unique not null,
  display_name        text,
  avatar_url          text,
  bio                 text,
  is_premium          boolean     not null default false,
  inventory_visibility visibility_type not null default 'private',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint username_length check (char_length(username) between 3 and 32),
  constraint username_format check (username ~ '^[a-zA-Z0-9_-]+$')
);

comment on table public.profiles is 'Public-facing user profile. Extends auth.users.';

-- =============================================================================
-- SUBSCRIPTIONS
-- Tracks Stripe subscription state per user.
-- =============================================================================

create table public.subscriptions (
  id                      uuid        primary key default uuid_generate_v4(),
  user_id                 uuid        not null references public.profiles (id) on delete cascade,
  stripe_customer_id      text        not null,
  stripe_subscription_id  text        unique,
  stripe_price_id         text,
  status                  subscription_status not null default 'incomplete',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at               timestamptz,
  canceled_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.subscriptions is 'Stripe subscription state. Updated via webhook.';

-- =============================================================================
-- STEAM ACCOUNTS
-- A user can link one Steam account. Separate from profile for clean separation.
-- =============================================================================

create table public.steam_accounts (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null unique references public.profiles (id) on delete cascade,
  steam_id        text        not null unique,           -- 64-bit SteamID
  persona_name    text,                                  -- Steam display name
  profile_url     text,                                  -- steamcommunity.com/id/...
  avatar_url      text,
  is_public       boolean     not null default false,    -- whether inventory is publicly accessible
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.steam_accounts is 'Linked Steam account. Required for inventory sync.';

-- =============================================================================
-- INVENTORY SNAPSHOTS
-- Point-in-time summary of a user's inventory value. Used for history/charts.
-- =============================================================================

create table public.inventory_snapshots (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  total_value_usd numeric(12,2) not null default 0,
  item_count      integer     not null default 0,
  captured_at     timestamptz not null default now()
);

comment on table public.inventory_snapshots is 'Historical snapshots of inventory total value.';

-- =============================================================================
-- INVENTORY ITEMS
-- Individual CS2 items belonging to a user's synced inventory.
-- =============================================================================

create table public.inventory_items (
  id                  uuid        primary key default uuid_generate_v4(),
  user_id             uuid        not null references public.profiles (id) on delete cascade,
  steam_asset_id      text        not null,              -- Steam asset ID (unique per inventory)
  steam_class_id      text        not null,              -- Steam class ID (item template)
  steam_instance_id   text,

  -- Item identity
  market_hash_name    text        not null,              -- Canonical Steam market name
  name                text        not null,
  name_color          text,                              -- Hex color from Steam
  type                text,                              -- e.g. "Rifle", "Knife"
  collection          text,

  -- CS2-specific attributes
  rarity              item_rarity,
  wear                item_wear,
  float_value         numeric(10,8),                     -- 0.00000000 – 1.00000000
  pattern_index       integer,                           -- Paint seed
  sticker_data        jsonb,                             -- Array of applied stickers
  inspect_link        text,

  -- Media
  icon_url            text,
  icon_url_large      text,

  -- Market data (refreshed periodically)
  market_price_usd    numeric(10,2),
  price_updated_at    timestamptz,

  -- State flags
  is_tradable         boolean     not null default true,
  is_marketable       boolean     not null default true,
  is_listed           boolean     not null default false, -- currently in a listing
  is_in_auction       boolean     not null default false, -- currently in an auction

  last_synced_at      timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, steam_asset_id)
);

comment on table public.inventory_items is 'CS2 items synced from Steam inventory.';

-- =============================================================================
-- LISTINGS
-- Fixed-price items offered for sale by premium users.
-- =============================================================================

create table public.listings (
  id              uuid        primary key default uuid_generate_v4(),
  seller_id       uuid        not null references public.profiles (id) on delete cascade,
  item_id         uuid        not null unique references public.inventory_items (id) on delete cascade,
  price_usd       numeric(10,2) not null,
  description     text,
  status          listing_status not null default 'active',
  buyer_id        uuid        references public.profiles (id) on delete set null,
  sold_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint price_positive check (price_usd > 0)
);

comment on table public.listings is 'Fixed-price item listings.';

-- =============================================================================
-- AUCTIONS
-- Time-bounded ascending-bid auctions for CS2 items.
-- =============================================================================

create table public.auctions (
  id                  uuid        primary key default uuid_generate_v4(),
  seller_id           uuid        not null references public.profiles (id) on delete cascade,
  item_id             uuid        not null unique references public.inventory_items (id) on delete cascade,

  -- Pricing
  starting_bid_usd    numeric(10,2) not null,
  reserve_price_usd   numeric(10,2),                     -- null = no reserve
  min_bid_increment   numeric(10,2) not null default 0.50,
  current_bid_usd     numeric(10,2),
  current_bidder_id   uuid        references public.profiles (id) on delete set null,
  bid_count           integer     not null default 0,

  -- Scheduling
  status              auction_status not null default 'pending',
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz not null,

  description         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint starting_bid_positive    check (starting_bid_usd > 0),
  constraint reserve_gte_starting     check (reserve_price_usd is null or reserve_price_usd >= starting_bid_usd),
  constraint ends_after_starts        check (ends_at > starts_at),
  constraint increment_positive       check (min_bid_increment > 0)
);

comment on table public.auctions is 'Timed auctions for CS2 items.';

-- =============================================================================
-- BIDS
-- Individual bid records per auction. Append-only; never updated.
-- =============================================================================

create table public.bids (
  id              uuid        primary key default uuid_generate_v4(),
  auction_id      uuid        not null references public.auctions (id) on delete cascade,
  bidder_id       uuid        not null references public.profiles (id) on delete cascade,
  amount_usd      numeric(10,2) not null,
  placed_at       timestamptz not null default now(),

  constraint amount_positive check (amount_usd > 0)
);

comment on table public.bids is 'Immutable bid history. One row per bid placed.';

-- =============================================================================
-- CONVERSATIONS
-- A thread between exactly two users. Deduped by ordered user pair.
-- =============================================================================

create table public.conversations (
  id              uuid        primary key default uuid_generate_v4(),
  user_a_id       uuid        not null references public.profiles (id) on delete cascade,
  user_b_id       uuid        not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),

  constraint no_self_conversation check (user_a_id <> user_b_id)
);

comment on table public.conversations is 'Chat thread between two users. One row per pair.';

-- One row per unordered pair: PostgreSQL does not allow expression lists inside
-- `UNIQUE (...)` in CREATE TABLE — use a unique index on expressions instead.
create unique index idx_conversations_unique_user_pair
  on public.conversations (least(user_a_id, user_b_id), greatest(user_a_id, user_b_id));

-- =============================================================================
-- MESSAGES
-- Individual messages within a conversation.
-- =============================================================================

create table public.messages (
  id                uuid        primary key default uuid_generate_v4(),
  conversation_id   uuid        not null references public.conversations (id) on delete cascade,
  sender_id         uuid        not null references public.profiles (id) on delete cascade,
  content           text        not null,
  status            message_status not null default 'sent',
  read_at           timestamptz,
  created_at        timestamptz not null default now(),

  constraint content_not_empty check (char_length(trim(content)) > 0),
  constraint content_max_length check (char_length(content) <= 2000)
);

comment on table public.messages is 'Chat messages. Sender must be a participant in the conversation.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- profiles
create index idx_profiles_username            on public.profiles (username);
create index idx_profiles_is_premium          on public.profiles (is_premium);
create index idx_profiles_inventory_visibility on public.profiles (inventory_visibility);

-- subscriptions
create index idx_subscriptions_user_id             on public.subscriptions (user_id);
create index idx_subscriptions_stripe_customer_id  on public.subscriptions (stripe_customer_id);
create index idx_subscriptions_status              on public.subscriptions (status);

-- steam_accounts
create index idx_steam_accounts_user_id   on public.steam_accounts (user_id);
create index idx_steam_accounts_steam_id  on public.steam_accounts (steam_id);

-- inventory_snapshots
create index idx_inventory_snapshots_user_id     on public.inventory_snapshots (user_id);
create index idx_inventory_snapshots_captured_at on public.inventory_snapshots (captured_at desc);

-- inventory_items
create index idx_inventory_items_user_id            on public.inventory_items (user_id);
create index idx_inventory_items_market_hash_name   on public.inventory_items (market_hash_name);
create index idx_inventory_items_rarity             on public.inventory_items (rarity);
create index idx_inventory_items_wear               on public.inventory_items (wear);
create index idx_inventory_items_market_price       on public.inventory_items (market_price_usd desc nulls last);
create index idx_inventory_items_is_listed          on public.inventory_items (is_listed) where is_listed = true;
create index idx_inventory_items_is_in_auction      on public.inventory_items (is_in_auction) where is_in_auction = true;
create index idx_inventory_items_float              on public.inventory_items (float_value) where float_value is not null;
-- Full-text search on item name
create index idx_inventory_items_name_fts           on public.inventory_items using gin (to_tsvector('english', name));

-- listings
create index idx_listings_seller_id  on public.listings (seller_id);
create index idx_listings_status     on public.listings (status);
create index idx_listings_price      on public.listings (price_usd) where status = 'active';
create index idx_listings_created_at on public.listings (created_at desc);

-- auctions
create index idx_auctions_seller_id  on public.auctions (seller_id);
create index idx_auctions_status     on public.auctions (status);
create index idx_auctions_ends_at    on public.auctions (ends_at) where status = 'active';
create index idx_auctions_bidder_id  on public.auctions (current_bidder_id) where current_bidder_id is not null;

-- bids
create index idx_bids_auction_id   on public.bids (auction_id);
create index idx_bids_bidder_id    on public.bids (bidder_id);
create index idx_bids_placed_at    on public.bids (placed_at desc);
-- Composite: all bids for an auction ordered by amount (used for leaderboard)
create index idx_bids_auction_amount on public.bids (auction_id, amount_usd desc);

-- conversations
create index idx_conversations_user_a        on public.conversations (user_a_id);
create index idx_conversations_user_b        on public.conversations (user_b_id);
create index idx_conversations_last_message  on public.conversations (last_message_at desc nulls last);

-- messages
create index idx_messages_conversation_id  on public.messages (conversation_id);
create index idx_messages_sender_id        on public.messages (sender_id);
create index idx_messages_created_at       on public.messages (created_at asc);
-- Unread messages lookup
create index idx_messages_unread           on public.messages (conversation_id, status) where status <> 'read';

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at on row changes
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    -- Use email prefix as default username; user must update it
    split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Update conversations.last_message_at on new message
create or replace function public.handle_new_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

-- Update auction state when a new bid is placed
create or replace function public.handle_new_bid()
returns trigger language plpgsql as $$
begin
  update public.auctions
  set
    current_bid_usd   = new.amount_usd,
    current_bidder_id = new.bidder_id,
    bid_count         = bid_count + 1,
    updated_at        = now()
  where id = new.auction_id;
  return new;
end;
$$;

-- Sync is_listed flag on inventory_items when listing status changes
create or replace function public.sync_item_listed_flag()
returns trigger language plpgsql as $$
begin
  update public.inventory_items
  set is_listed = (new.status = 'active'),
      updated_at = now()
  where id = new.item_id;
  return new;
end;
$$;

-- Sync is_in_auction flag on inventory_items when auction status changes
create or replace function public.sync_item_auction_flag()
returns trigger language plpgsql as $$
begin
  update public.inventory_items
  set is_in_auction = (new.status in ('pending', 'active')),
      updated_at = now()
  where id = new.item_id;
  return new;
end;
$$;

-- =============================================================================
-- TRIGGER BINDINGS
-- =============================================================================

-- updated_at maintenance
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

create trigger trg_steam_accounts_updated_at
  before update on public.steam_accounts
  for each row execute function public.handle_updated_at();

create trigger trg_inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function public.handle_updated_at();

create trigger trg_listings_updated_at
  before update on public.listings
  for each row execute function public.handle_updated_at();

create trigger trg_auctions_updated_at
  before update on public.auctions
  for each row execute function public.handle_updated_at();

-- Business logic triggers
create trigger trg_new_user_profile
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger trg_new_message_conversation
  after insert on public.messages
  for each row execute function public.handle_new_message();

create trigger trg_new_bid_auction
  after insert on public.bids
  for each row execute function public.handle_new_bid();

create trigger trg_listing_item_flag
  after insert or update of status on public.listings
  for each row execute function public.sync_item_listed_flag();

create trigger trg_auction_item_flag
  after insert or update of status on public.auctions
  for each row execute function public.sync_item_auction_flag();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.steam_accounts      enable row level security;
alter table public.inventory_snapshots enable row level security;
alter table public.inventory_items     enable row level security;
alter table public.listings            enable row level security;
alter table public.auctions            enable row level security;
alter table public.bids                enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;

-- profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- subscriptions
create policy "Users can view their own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- steam_accounts
create policy "Steam accounts visible with inventory visibility"
  on public.steam_accounts for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and p.inventory_visibility = 'public'
    )
  );

create policy "Users manage their own steam account"
  on public.steam_accounts for all using (auth.uid() = user_id);

-- inventory_snapshots
create policy "Snapshots visible to owner or if inventory is public"
  on public.inventory_snapshots for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and p.inventory_visibility = 'public'
    )
  );

create policy "Users can insert their own snapshots"
  on public.inventory_snapshots for insert with check (auth.uid() = user_id);

-- inventory_items
create policy "Items visible to owner or if inventory is public"
  on public.inventory_items for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and p.inventory_visibility = 'public'
    )
  );

create policy "Users manage their own items"
  on public.inventory_items for all using (auth.uid() = user_id);

-- listings
create policy "Active listings are publicly visible"
  on public.listings for select using (
    status = 'active'
    or auth.uid() = seller_id
    or auth.uid() = buyer_id
  );

create policy "Premium users can create listings"
  on public.listings for insert with check (
    auth.uid() = seller_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true
    )
  );

create policy "Sellers can update their own listings"
  on public.listings for update using (auth.uid() = seller_id);

-- auctions
create policy "Active auctions are publicly visible"
  on public.auctions for select using (
    status in ('active', 'ended')
    or auth.uid() = seller_id
  );

create policy "Premium users can create auctions"
  on public.auctions for insert with check (
    auth.uid() = seller_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true
    )
  );

create policy "Sellers can update their own auctions"
  on public.auctions for update using (auth.uid() = seller_id);

-- bids
create policy "Bids on active auctions are publicly visible"
  on public.bids for select using (
    exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.status in ('active', 'ended')
    )
  );

create policy "Premium users can place bids"
  on public.bids for insert with check (
    auth.uid() = bidder_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true
    )
  );

-- conversations
create policy "Users can see their own conversations"
  on public.conversations for select using (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  );

create policy "Premium users can create conversations"
  on public.conversations for insert with check (
    (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_premium = true
    )
  );

-- messages
create policy "Participants can read messages in their conversations"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "Senders can update their own messages"
  on public.messages for update using (auth.uid() = sender_id);
