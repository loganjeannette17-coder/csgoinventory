import { createClient } from '@/lib/supabase/server'
import type { ItemCardData } from '@/components/inventory/ItemCard'
import { Suspense } from 'react'
import CheckoutSuccessHandler from './CheckoutSuccessHandler'
import { SyncButton } from './SyncButton'
import { ValueSummary } from './ValueSummary'
import { InventoryGrid } from './InventoryGrid'
import { ItemCardSkeleton, ValueSummarySkeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { ValueOverTimeChart } from '@/components/charts/ValueOverTimeChart'
import {
  buildFourChartLabels,
  downsampleSnapshotSeries,
  type SnapshotPoint,
} from './chart-helpers'

function chartSpanLabel(dates: string[]): string {
  if (dates.length < 2) return 'sync history'
  const a = new Date(dates[0]).getTime()
  const b = new Date(dates[dates.length - 1]).getTime()
  const days = Math.max(1, Math.round((b - a) / (86400 * 1000)))
  return `~${days} day span`
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // All queries fired in parallel
  const [
    { data: steamAccount },
    { data: items },
    { data: snapshotRows },
  ] = await Promise.all([
    supabase
      .from('steam_accounts')
      .select('steam_id, persona_name, avatar_url, last_synced_at, is_public')
      .eq('user_id', user!.id)
      .maybeSingle(),

    supabase
      .from('inventory_items')
      .select(
        'id, name, market_hash_name, icon_url, icon_url_large, rarity, wear, ' +
        'float_value, market_price_usd, is_marketable, is_tradable, ' +
        'is_listed, is_in_auction, inspect_link, sticker_data',
      )
      .eq('user_id', user!.id)
      .order('market_price_usd', { ascending: false, nullsFirst: false }),

    supabase
      .from('inventory_snapshots')
      .select('total_value_usd, item_count, captured_at')
      .eq('user_id', user!.id)
      .order('captured_at', { ascending: false })
      .limit(400),
  ])

  const snapshotsDesc = snapshotRows ?? []
  const [currentSnapshot, previousSnapshot] = snapshotsDesc
  const historyAsc: SnapshotPoint[] = [...snapshotsDesc].reverse()
  const { values: chartValues, dates: chartDates } = downsampleSnapshotSeries(historyAsc, 90)
  const chartXLabels = buildFourChartLabels(chartDates)

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <CheckoutSuccessHandler />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {steamAccount?.persona_name
              ? `${steamAccount.persona_name}'s Inventory`
              : 'My Inventory'}
          </h1>
          {steamAccount && (
            <p className="text-gray-500 text-sm mt-0.5">
              Steam ID: {steamAccount.steam_id}
            </p>
          )}
        </div>

        <SyncButton
          lastSyncedAt={steamAccount?.last_synced_at ?? null}
          hasSteamAccount={!!steamAccount}
        />
      </div>

      {/* Private inventory warning */}
      {steamAccount && !steamAccount.is_public && (
        <div className="bg-yellow-950/40 border border-yellow-800 rounded-xl px-4 py-3 text-yellow-300 text-sm">
          Your Steam inventory is set to <strong>private</strong>. Sync will fail until you set it to Public
          in{' '}
          <a
            href="https://store.steampowered.com/account/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-yellow-200"
          >
            Steam Privacy Settings
          </a>
          .
        </div>
      )}

      {/* No Steam account */}
      {!steamAccount && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center space-y-3">
          <p className="text-gray-300 font-medium">No Steam account linked</p>
          <p className="text-gray-500 text-sm">
            Link your Steam account to sync your CS2 inventory and track your item values.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            Link Steam account
          </Link>
        </div>
      )}

      {/* Value summary */}
      <Suspense fallback={<ValueSummarySkeleton />}>
        <ValueSummary
          current={currentSnapshot ?? null}
          previous={previousSnapshot ?? null}
        />
      </Suspense>

      <ValueOverTimeChart
        chartId="dashboard-personal"
        eyebrow="Your inventory"
        title="Total value over time"
        values={chartValues}
        xLabels={[...chartXLabels]}
        periodLabel={chartSpanLabel(chartDates)}
        emptyMessage="No snapshots yet. Link Steam and sync your inventory a few times to see value over time."
        footer={
          chartValues.length >= 2
            ? 'Based on stored snapshots from each sync. More syncs produce a smoother curve.'
            : undefined
        }
      />

      {/* Inventory grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 18 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <InventoryGrid items={(items ?? []) as unknown as ItemCardData[]} />
      </Suspense>
    </div>
  )
}
