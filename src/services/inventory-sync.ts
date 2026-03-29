// =============================================================================
// Inventory Sync Service
//
// Orchestrates: Steam fetch → parse → DB upsert → market prices → snapshot
//
// Call runInventorySync() from the /api/steam/sync route handler.
// This is the single authoritative place for all sync logic.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import { fetchSteamInventory } from '@/lib/steam/inventory'
import { fetchMarketPrices, calculateTotalValue } from '@/lib/steam/market'
import { SteamPrivateInventoryError, SteamApiError } from '@/lib/steam/client'
import type { SyncResult } from '@/lib/steam/types'

// How long a user must wait between syncs (in milliseconds)
const SYNC_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

// We fetch market prices for marketable items only, capped to avoid
// burning the rate limit on accounts with 500+ items.
// Items without a fresh price fall back to their last stored price.
const MAX_PRICE_FETCHES = 200

export type SyncError =
  | { code: 'COOLDOWN';      retryAfterMs: number }
  | { code: 'NO_STEAM_ACCOUNT' }
  | { code: 'PRIVATE_INVENTORY' }
  | { code: 'STEAM_API_ERROR'; message: string }
  | { code: 'DB_ERROR';      message: string }

export type SyncOutcome =
  | { success: true;  result: SyncResult }
  | { success: false; error: SyncError }

export async function runInventorySync(userId: string): Promise<SyncOutcome> {
  const started = Date.now()
  const supabase = await createClient()

  // ── 1. Load the user's Steam account ─────────────────────────────────────
  const { data: steamAccount, error: steamErr } = await supabase
    .from('steam_accounts')
    .select('steam_id, last_synced_at')
    .eq('user_id', userId)
    .single()

  if (steamErr || !steamAccount) {
    return { success: false, error: { code: 'NO_STEAM_ACCOUNT' } }
  }

  // ── 2. Enforce cooldown ───────────────────────────────────────────────────
  if (steamAccount.last_synced_at) {
    const lastSync = new Date(steamAccount.last_synced_at).getTime()
    const elapsed  = Date.now() - lastSync

    if (elapsed < SYNC_COOLDOWN_MS) {
      return {
        success: false,
        error: {
          code:         'COOLDOWN',
          retryAfterMs: SYNC_COOLDOWN_MS - elapsed,
        },
      }
    }
  }

  // ── 3. Fetch inventory from Steam ─────────────────────────────────────────
  let rawItems
  try {
    rawItems = await fetchSteamInventory(steamAccount.steam_id)
  } catch (err) {
    if (err instanceof SteamPrivateInventoryError) {
      // Update the flag in our DB so the UI can surface a helpful message
      await supabase
        .from('steam_accounts')
        .update({ is_public: false })
        .eq('user_id', userId)
      return { success: false, error: { code: 'PRIVATE_INVENTORY' } }
    }

    if (err instanceof SteamApiError) {
      return {
        success: false,
        error: { code: 'STEAM_API_ERROR', message: err.message },
      }
    }

    throw err // unexpected — let it bubble to the route handler
  }

  if (rawItems.length === 0) {
    // Valid but empty inventory — still update the sync timestamp
    await supabase
      .from('steam_accounts')
      .update({ last_synced_at: new Date().toISOString(), is_public: true })
      .eq('user_id', userId)

    return {
      success: true,
      result: { itemsUpserted: 0, totalValueUsd: 0, durationMs: Date.now() - started },
    }
  }

  // ── 4. Fetch market prices ─────────────────────────────────────────────────
  // Only fetch prices for marketable items, deduped by market_hash_name,
  // up to the cap. Non-fetched items retain their existing price in the DB.
  const marketableNames = [
    ...new Set(
      rawItems.filter((i) => i.is_marketable).map((i) => i.market_hash_name),
    ),
  ].slice(0, MAX_PRICE_FETCHES)

  const priceMap = await fetchMarketPrices(marketableNames)

  // ── 5. Upsert inventory items ─────────────────────────────────────────────
  // Build the rows, merging in prices where available.
  // We set price_updated_at only for items that actually got a new price.
  const now = new Date().toISOString()

  const rows = rawItems.map((item) => {
    const price = priceMap[item.market_hash_name]

    return {
      user_id:           userId,
      steam_asset_id:    item.steam_asset_id,
      steam_class_id:    item.steam_class_id,
      steam_instance_id: item.steam_instance_id,
      market_hash_name:  item.market_hash_name,
      name:              item.name,
      name_color:        item.name_color,
      type:              item.type,
      collection:        item.collection,
      rarity:            item.rarity,
      wear:              item.wear,
      float_value:       null,
      pattern_index:     item.pattern_index,
      sticker_data:      item.sticker_data ? JSON.stringify(item.sticker_data) : null,
      inspect_link:      item.inspect_link,
      icon_url:          item.icon_url,
      icon_url_large:    item.icon_url_large,
      is_tradable:       item.is_tradable,
      is_marketable:     item.is_marketable,
      // Only update price fields when we actually fetched a price
      ...(price !== undefined && price !== null
        ? { market_price_usd: price, price_updated_at: now }
        : {}),
      last_synced_at: now,
    }
  })

  // Upsert in chunks to avoid Supabase's 1MB request body limit
  const CHUNK_SIZE = 100
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error: upsertErr } = await supabase
      .from('inventory_items')
      .upsert(chunk, {
        onConflict:        'user_id,steam_asset_id',
        ignoreDuplicates:  false,  // always update existing rows
      })

    if (upsertErr) {
      console.error('[sync] Upsert failed at chunk', i, upsertErr)
      return {
        success: false,
        error: { code: 'DB_ERROR', message: upsertErr.message },
      }
    }
  }

  // ── 6. Remove items no longer in the inventory ────────────────────────────
  // An item that was in the DB but not returned by Steam has been traded/sold.
  const currentAssetIds = rawItems.map((i) => i.steam_asset_id)

  await supabase
    .from('inventory_items')
    .delete()
    .eq('user_id', userId)
    .not('steam_asset_id', 'in', `(${currentAssetIds.map((id) => `"${id}"`).join(',')})`)
    // Only delete items that aren't listed/auctioned (those are the user's problem to resolve)
    .eq('is_listed', false)
    .eq('is_in_auction', false)

  // ── 7. Calculate total value and insert snapshot ──────────────────────────
  // Re-read the final stored prices from DB (includes prices from previous
  // syncs for items we didn't refresh this time).
  const { data: storedItems } = await supabase
    .from('inventory_items')
    .select('market_hash_name, market_price_usd, is_marketable')
    .eq('user_id', userId)

  const totalValueUsd = storedItems
    ? storedItems.reduce((sum, item) => {
        if (!item.is_marketable) return sum
        return sum + (item.market_price_usd ?? 0)
      }, 0)
    : calculateTotalValue(rawItems, priceMap)

  await supabase.from('inventory_snapshots').insert({
    user_id:         userId,
    total_value_usd: totalValueUsd,
    item_count:      rawItems.length,
    captured_at:     now,
  })

  // ── 8. Update Steam account metadata ──────────────────────────────────────
  await supabase
    .from('steam_accounts')
    .update({ last_synced_at: now, is_public: true })
    .eq('user_id', userId)

  return {
    success: true,
    result: {
      itemsUpserted: rawItems.length,
      totalValueUsd: Math.round(totalValueUsd * 100) / 100,
      durationMs:    Date.now() - started,
    },
  }
}
