// =============================================================================
// Steam Market price fetcher
// Fetches prices sequentially with enforced delays to stay within rate limits.
// =============================================================================

import { steamFetch, sleep, SteamApiError } from './client'
import type { SteamMarketPriceResponse } from './types'

const CS2_APP_ID = 730

// Steam Market is extremely rate-limited (~1 req/sec without auth).
// We use a conservative 1.5s delay and stop fetching after too many failures
// to avoid burning the rate limit budget for other users on the same IP.
const INTER_REQUEST_DELAY_MS = 1500
const MAX_CONSECUTIVE_FAILURES = 5

// Steam prices include currency symbol and commas: "$1,234.56" or "1.234,56€"
// We normalise to a plain number in USD.
function parseUsdPrice(raw: string | undefined): number | null {
  if (!raw) return null
  // Strip everything except digits and the last separator
  const cleaned = raw.replace(/[^0-9.,]/g, '')
  // Handle "1,234.56" (US) vs "1.234,56" (EU) by treating the last separator
  // as the decimal point
  const lastDot   = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  let normalised: string

  if (lastDot > lastComma) {
    // US format: 1,234.56
    normalised = cleaned.replace(/,/g, '')
  } else if (lastComma > lastDot) {
    // EU format: 1.234,56
    normalised = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalised = cleaned
  }

  const value = parseFloat(normalised)
  return isNaN(value) ? null : value
}

async function fetchSinglePrice(
  marketHashName: string,
): Promise<number | null> {
  const url =
    'https://steamcommunity.com/market/priceoverview/?' +
    new URLSearchParams({
      appid:            String(CS2_APP_ID),
      currency:         '1',              // USD
      market_hash_name: marketHashName,
    })

  let response: Response
  try {
    response = await steamFetch(url, { maxRetries: 2, baseDelayMs: 2000 })
  } catch (err) {
    if (err instanceof SteamApiError) {
      // Log but don't throw — a missing price is not a fatal error
      console.warn(`[market] Failed to fetch price for "${marketHashName}":`, err.message)
      return null
    }
    throw err
  }

  const data: SteamMarketPriceResponse = await response.json()
  if (!data.success) return null

  // Prefer median over lowest — more stable for displaying value
  return parseUsdPrice(data.median_price) ?? parseUsdPrice(data.lowest_price)
}

export interface PriceMap {
  [marketHashName: string]: number | null
}

// Fetch prices for a deduplicated set of market hash names.
// Runs sequentially with a delay between requests.
// Calls onProgress after each fetch so callers can stream progress.
export async function fetchMarketPrices(
  marketHashNames: string[],
  onProgress?: (fetched: number, total: number) => void,
): Promise<PriceMap> {
  // Deduplicate — many items share the same market hash name (e.g. AK-47 | Redline)
  const unique = [...new Set(marketHashNames)]
  const prices: PriceMap = {}
  let consecutiveFailures = 0

  for (let i = 0; i < unique.length; i++) {
    const name = unique[i]

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(
        `[market] Stopping price fetch after ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`,
      )
      // Fill remaining with null
      for (let j = i; j < unique.length; j++) {
        prices[unique[j]] = null
      }
      break
    }

    const price = await fetchSinglePrice(name)
    prices[name] = price

    if (price === null) {
      consecutiveFailures++
    } else {
      consecutiveFailures = 0
    }

    onProgress?.(i + 1, unique.length)

    // Always sleep — even on the last item, in case the caller batches calls
    if (i < unique.length - 1) {
      await sleep(INTER_REQUEST_DELAY_MS)
    }
  }

  return prices
}

// Calculate total inventory value from a list of items and a price map.
// Items without prices contribute $0 to the total.
export function calculateTotalValue(
  items: Array<{ market_hash_name: string; is_marketable: boolean }>,
  priceMap: PriceMap,
): number {
  return items.reduce((sum, item) => {
    if (!item.is_marketable) return sum
    const price = priceMap[item.market_hash_name]
    return sum + (price ?? 0)
  }, 0)
}
