// =============================================================================
// Steam HTTP client — retry logic, rate-limit handling, error classification
// =============================================================================

const STEAM_CDN = 'https://community.cloudflare.steamstatic.com/economy/image'

export const STEAM_ICON_BASE = STEAM_CDN

// Errors we treat as retryable
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

export class SteamApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message)
    this.name = 'SteamApiError'
  }
}

export class SteamPrivateInventoryError extends SteamApiError {
  constructor() {
    super('This inventory is private.', 403, false)
    this.name = 'SteamPrivateInventoryError'
  }
}

export class SteamRateLimitError extends SteamApiError {
  constructor(public readonly retryAfterMs: number) {
    super(`Steam rate limit hit. Retry after ${retryAfterMs}ms.`, 429, true)
    this.name = 'SteamRateLimitError'
  }
}

interface FetchOptions {
  maxRetries?: number
  baseDelayMs?: number
}

// Exponential backoff with full jitter: delay = random(0, min(cap, base * 2^attempt))
function backoffDelay(attempt: number, baseMs = 1000, capMs = 30_000): number {
  const ceiling = Math.min(capMs, baseMs * Math.pow(2, attempt))
  return Math.floor(Math.random() * ceiling)
}

export async function steamFetch(
  url: string,
  { maxRetries = 3, baseDelayMs = 1500 }: FetchOptions = {},
): Promise<Response> {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = backoffDelay(attempt - 1, baseDelayMs)
      await sleep(delay)
    }

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          // Identify our service; good practice for Steam's logs
          'User-Agent': 'CS2-Inventory-Platform/1.0',
        },
        next: { revalidate: 0 }, // never use Next.js cache for Steam calls
      })
    } catch (networkErr) {
      // DNS / TCP failure — always retryable
      lastError = networkErr instanceof Error ? networkErr : new Error(String(networkErr))
      continue
    }

    if (response.status === 403) {
      // 403 from Steam inventory = private profile; no point retrying
      throw new SteamPrivateInventoryError()
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') ?? '60', 10)
      lastError = new SteamRateLimitError(retryAfter * 1000)
      if (attempt < maxRetries) {
        await sleep(retryAfter * 1000)
        continue
      }
      throw lastError
    }

    if (RETRYABLE_STATUSES.has(response.status)) {
      lastError = new SteamApiError(`Steam returned ${response.status}`, response.status, true)
      continue
    }

    if (!response.ok) {
      throw new SteamApiError(`Unexpected Steam response: ${response.status}`, response.status, false)
    }

    return response
  }

  throw lastError
}

// Builds the full CDN URL for an item icon
export function buildIconUrl(iconPath: string): string {
  return `${STEAM_ICON_BASE}/${iconPath}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
