import { createClient } from '@/lib/supabase/server'
import type { ItemCardData } from '@/components/inventory/ItemCard'
import { notFound } from 'next/navigation'
import { ProfileListings } from './ProfileListings'
import { InventoryGrid } from '../../dashboard/InventoryGrid'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import { formatUsd, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { Suspense } from 'react'
import MessageButton from './MessageButton'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — CS2 Inventory` }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Current viewer (may be unauthenticated — but middleware ensures premium)
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()

  // ── Load target profile ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, inventory_visibility, created_at')
    .eq('username', username.toLowerCase())
    .single()

  if (!profile) notFound()

  const isOwner = viewer?.id === profile.id
  const isPublic = profile.inventory_visibility === 'public'

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [
    { data: steamAccount },
    { data: latestSnapshot },
    { data: listings },
    { data: inventoryItems },
  ] = await Promise.all([
    supabase
      .from('steam_accounts')
      .select('persona_name, avatar_url, profile_url, steam_id')
      .eq('user_id', profile.id)
      .maybeSingle(),

    supabase
      .from('inventory_snapshots')
      .select('total_value_usd, item_count, captured_at')
      .eq('user_id', profile.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('listings')
      .select(
        'id, price_usd, description, created_at, ' +
        'inventory_items(id, name, market_hash_name, icon_url, icon_url_large, ' +
        'rarity, wear, float_value, market_price_usd, is_marketable, is_tradable, ' +
        'is_listed, is_in_auction, inspect_link, sticker_data)',
      )
      .eq('seller_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),

    // Only fetch inventory if public or owner
    (isPublic || isOwner)
      ? supabase
          .from('inventory_items')
          .select(
            'id, name, market_hash_name, icon_url, icon_url_large, rarity, wear, ' +
            'float_value, market_price_usd, is_marketable, is_tradable, ' +
            'is_listed, is_in_auction, inspect_link, sticker_data',
          )
          .eq('user_id', profile.id)
          .order('market_price_usd', { ascending: false, nullsFirst: false })
      : { data: null },
  ])

  const displayName = profile.display_name ?? steamAccount?.persona_name ?? profile.username
  const avatar      = steamAccount?.avatar_url ?? profile.avatar_url

  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Profile header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={displayName}
              className="h-20 w-20 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-gray-800 flex items-center justify-center text-3xl font-bold text-gray-500 shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              {isOwner ? (
                <Link
                  href="/profile/edit"
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-1 transition-colors"
                >
                  Edit profile
                </Link>
              ) : (
                <MessageButton recipientId={profile.id} recipientName={displayName} />
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">@{profile.username}</p>

            {profile.bio && (
              <p className="text-gray-300 text-sm mt-2 leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap text-sm">
              {latestSnapshot && (
                <>
                  <Stat
                    label="Inventory value"
                    value={formatUsd(latestSnapshot.total_value_usd)}
                    highlight
                  />
                  <Stat
                    label="Items"
                    value={latestSnapshot.item_count.toLocaleString()}
                  />
                  <Stat
                    label="Last synced"
                    value={formatRelativeTime(latestSnapshot.captured_at)}
                  />
                </>
              )}
              {steamAccount?.profile_url && (
                <a
                  href={steamAccount.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  Steam profile ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active listings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          Items for Sale
          {listings && listings.length > 0 && (
            <span className="ml-2 text-sm text-gray-500 font-normal">
              {listings.length}
            </span>
          )}
        </h2>
        <ProfileListings
          listings={(listings ?? []) as unknown as Parameters<typeof ProfileListings>[0]['listings']}
          isOwner={isOwner}
        />
      </section>

      {/* Full inventory */}
      {(isPublic || isOwner) ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Full Inventory
            {inventoryItems && inventoryItems.length > 0 && (
              <span className="ml-2 text-sm text-gray-500 font-normal">
                {inventoryItems.length} items
              </span>
            )}
          </h2>
          <Suspense
            fallback={
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <ItemCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <InventoryGrid items={(inventoryItems ?? []) as unknown as ItemCardData[]} />
          </Suspense>
        </section>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-2">
          <p className="text-gray-400 font-medium">This inventory is private</p>
          <p className="text-gray-600 text-sm">
            {displayName} has chosen to keep their inventory private.
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className={highlight ? 'text-green-400 font-semibold' : 'text-white'}>
        {value}
      </span>
    </div>
  )
}
