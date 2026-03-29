// =============================================================================
// Steam Web API — raw response types
// =============================================================================

// GET https://steamcommunity.com/inventory/{steamId}/730/2
export interface SteamInventoryResponse {
  assets?: SteamAsset[]
  descriptions?: SteamDescription[]
  more_items?: 0 | 1
  last_assetid?: string        // pagination cursor
  total_inventory_count?: number
  success?: 1 | boolean
  error?: string               // "This profile is private."
  // Steam sometimes returns rwgrsn=-2 for rate limits
  rwgrsn?: number
}

export interface SteamAsset {
  appid: number
  contextid: string
  assetid: string
  classid: string
  instanceid: string
  amount: string
}

export interface SteamDescription {
  appid: number
  classid: string
  instanceid: string
  currency: number
  background_color: string
  icon_url: string
  icon_url_large?: string
  descriptions: SteamDescriptionEntry[]
  tradable: 0 | 1
  actions?: SteamAction[]
  market_actions?: SteamAction[]
  name: string
  name_color?: string
  type: string
  market_name: string
  market_hash_name: string
  commodity: 0 | 1
  marketable: 0 | 1
  tags?: SteamTag[]
}

export interface SteamDescriptionEntry {
  type: string                  // 'text' | 'html'
  value: string
  color?: string
}

export interface SteamAction {
  link: string
  name: string
}

export interface SteamTag {
  category: string              // 'Rarity' | 'Exterior' | 'Type' | 'Weapon' | 'Quality'
  internal_name: string
  localized_category_name: string
  localized_tag_name: string
  color?: string
}

// GET https://steamcommunity.com/market/priceoverview/
export interface SteamMarketPriceResponse {
  success: boolean
  lowest_price?: string         // "$1.23"
  median_price?: string
  volume?: string               // "1,234"
}

// Parsed, normalised item we pass around internally
export interface ParsedInventoryItem {
  steam_asset_id: string
  steam_class_id: string
  steam_instance_id: string
  market_hash_name: string
  name: string
  name_color: string | null
  type: string | null
  collection: string | null
  rarity: string | null
  wear: string | null
  float_value: null             // requires separate inspect-link service; omitted
  pattern_index: number | null
  sticker_data: StickerEntry[] | null
  inspect_link: string | null
  icon_url: string
  icon_url_large: string | null
  is_tradable: boolean
  is_marketable: boolean
}

export interface StickerEntry {
  slot: number
  name: string
  icon_url?: string
}

export interface SyncResult {
  itemsUpserted: number
  totalValueUsd: number
  durationMs: number
  skippedReason?: string
}
