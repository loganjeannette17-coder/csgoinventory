// =============================================================================
// Steam inventory fetcher + parser
// =============================================================================

import { steamFetch, buildIconUrl } from './client'
import type {
  SteamInventoryResponse,
  SteamDescription,
  SteamTag,
  ParsedInventoryItem,
  StickerEntry,
} from './types'

const CS2_APP_ID = 730
const CS2_CONTEXT_ID = 2
const PAGE_SIZE = 2000            // Steam's max per request
const INTER_PAGE_DELAY_MS = 1500  // Be polite between paginated fetches

// ── Wear mappings ─────────────────────────────────────────────────────────────

const WEAR_MAP: Record<string, string> = {
  WearCategory0: 'factory_new',
  WearCategory1: 'minimal_wear',
  WearCategory2: 'field_tested',
  WearCategory3: 'well_worn',
  WearCategory4: 'battle_scarred',
}

// ── Rarity mappings ───────────────────────────────────────────────────────────

const RARITY_MAP: Record<string, string> = {
  Rarity_Common:          'consumer',
  Rarity_Common_Weapon:   'consumer',
  Rarity_Uncommon:        'industrial',
  Rarity_Rare:            'mil_spec',
  Rarity_Rare_Weapon:     'mil_spec',
  Rarity_Mythical:        'restricted',
  Rarity_Mythical_Weapon: 'restricted',
  Rarity_Legendary:       'classified',
  Rarity_Legendary_Weapon:'classified',
  Rarity_Ancient:         'covert',
  Rarity_Ancient_Weapon:  'covert',
  Rarity_Contraband:      'contraband',
}

// ── Parser helpers ────────────────────────────────────────────────────────────

function getTagValue(tags: SteamTag[], category: string): string | null {
  return tags.find((t) => t.category === category)?.internal_name ?? null
}

function parseWear(tags: SteamTag[]): string | null {
  const raw = getTagValue(tags, 'Exterior')
  return raw ? (WEAR_MAP[raw] ?? null) : null
}

function parseRarity(tags: SteamTag[]): string | null {
  const raw = getTagValue(tags, 'Rarity')
  return raw ? (RARITY_MAP[raw] ?? null) : null
}

// Extract the inspect-game link from the actions array.
// The link template uses %owner_steamid% and %assetid% as placeholders;
// we substitute them so the link is ready to use.
function parseInspectLink(
  description: SteamDescription,
  ownerId: string,
): string | null {
  const action = description.market_actions?.find((a) =>
    a.link.includes('csgo_econ_action_preview'),
  )
  if (!action) return null
  return action.link
    .replace('%owner_steamid%', ownerId)
    .replace('%assetid%', '%ASSETID%') // will be replaced per-asset below
}

// Parse sticker data from description HTML entries
// Steam encodes stickers as HTML inside descriptions[].value
const STICKER_NAME_RE = /Sticker: ([^<\n]+)/
function parseStickers(description: SteamDescription): StickerEntry[] | null {
  const stickers: StickerEntry[] = []
  let slot = 0

  for (const entry of description.descriptions ?? []) {
    if (entry.value?.includes('Sticker:')) {
      const match = entry.value.match(STICKER_NAME_RE)
      if (match) {
        stickers.push({ slot, name: match[1].trim() })
        slot++
      }
    }
  }
  return stickers.length > 0 ? stickers : null
}

// Extract collection name from tags (category = "ItemSet")
function parseCollection(tags: SteamTag[]): string | null {
  return tags.find((t) => t.category === 'ItemSet')?.localized_tag_name ?? null
}

// ── Main fetch + parse ────────────────────────────────────────────────────────

// Fetches all pages of a user's CS2 inventory from Steam.
// Handles pagination automatically, sleeping between pages to avoid rate limits.
export async function fetchSteamInventory(
  steamId: string,
): Promise<ParsedInventoryItem[]> {
  const items: ParsedInventoryItem[] = []
  let cursor: string | undefined

  do {
    const url = buildInventoryUrl(steamId, cursor)
    const response = await steamFetch(url)
    const data: SteamInventoryResponse = await response.json()

    // Steam returns success:false for private inventories via JSON too
    if (!data.success || data.error) {
      if (data.error?.toLowerCase().includes('private')) {
        const { SteamPrivateInventoryError } = await import('./client')
        throw new SteamPrivateInventoryError()
      }
      throw new Error(`Steam inventory error: ${data.error ?? 'unknown'}`)
    }

    // Bail out early if inventory is completely empty
    if (!data.assets?.length || !data.descriptions?.length) {
      break
    }

    // Build a lookup map: `${classid}_${instanceid}` -> description
    const descMap = new Map<string, SteamDescription>()
    for (const desc of data.descriptions) {
      descMap.set(`${desc.classid}_${desc.instanceid}`, desc)
    }

    for (const asset of data.assets) {
      const desc = descMap.get(`${asset.classid}_${asset.instanceid}`)
      if (!desc) continue // asset with no description — skip

      const tags = desc.tags ?? []
      const baseInspectLink = parseInspectLink(desc, steamId)

      items.push({
        steam_asset_id:    asset.assetid,
        steam_class_id:    asset.classid,
        steam_instance_id: asset.instanceid,
        market_hash_name:  desc.market_hash_name,
        name:              desc.name,
        name_color:        desc.name_color ? `#${desc.name_color}` : null,
        type:              desc.type || null,
        collection:        parseCollection(tags),
        rarity:            parseRarity(tags),
        wear:              parseWear(tags),
        float_value:       null,  // requires inspect-link service (CSFloat API)
        pattern_index:     null,  // same
        sticker_data:      parseStickers(desc),
        inspect_link:      baseInspectLink
          ? baseInspectLink.replace('%ASSETID%', asset.assetid)
          : null,
        icon_url:          buildIconUrl(desc.icon_url),
        icon_url_large:    desc.icon_url_large ? buildIconUrl(desc.icon_url_large) : null,
        is_tradable:       desc.tradable === 1,
        is_marketable:     desc.marketable === 1,
      })
    }

    cursor = data.more_items ? data.last_assetid : undefined

    if (cursor) {
      // Pause between pages — Steam's inventory endpoint is aggressively rate-limited
      const { sleep } = await import('./client')
      await sleep(INTER_PAGE_DELAY_MS)
    }
  } while (cursor)

  return items
}

function buildInventoryUrl(steamId: string, startAfterAssetId?: string): string {
  const params = new URLSearchParams({
    l: 'english',
    count: String(PAGE_SIZE),
  })
  if (startAfterAssetId) {
    params.set('start_assetid', startAfterAssetId)
  }
  return (
    `https://steamcommunity.com/inventory/${steamId}/${CS2_APP_ID}/${CS2_CONTEXT_ID}` +
    `?${params}`
  )
}
