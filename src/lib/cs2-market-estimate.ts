/**
 * Illustrative weekly series for “total CS2 market” style charts.
 *
 * There is no official public API that exposes a single true “global CS2 market cap.”
 * These numbers are a smooth synthetic walk in **billions USD** for UI/demo purposes only.
 * See the CS2 market page for the full disclaimer.
 */
const WEEKS = 52
const START_B = 2.78
const END_B = 3.24

export const CS2_MARKET_ESTIMATE_USD_BILLIONS: readonly number[] = Array.from(
  { length: WEEKS },
  (_, i) => {
    const t = i / (WEEKS - 1 || 1)
    const base = START_B + (END_B - START_B) * t
    const wobble = Math.sin(i * 0.35) * 0.045 + Math.sin(i * 0.11) * 0.02
    return Math.round((base + wobble) * 100) / 100
  },
) as readonly number[]

/** Approximate tick labels for the 52-week illustrative window. */
export const CS2_MARKET_CHART_X_LABELS = ['Jan', 'Apr', 'Jul', 'Oct'] as const
