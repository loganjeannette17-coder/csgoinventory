/**
 * Illustrative series for “total CS2 market” style charts.
 *
 * There is no official public API that exposes a single true “global CS2 market cap.”
 * These numbers are smooth synthetic walks in **billions USD** for UI/demo purposes only.
 */

/** ~52 weeks — short window (e.g. CS2 market page). */
const WEEKS = 52
const SHORT_START_B = 2.78
const SHORT_END_B = 3.24

export const CS2_MARKET_ESTIMATE_USD_BILLIONS: readonly number[] = Array.from(
  { length: WEEKS },
  (_, i) => {
    const t = i / (WEEKS - 1 || 1)
    const base = SHORT_START_B + (SHORT_END_B - SHORT_START_B) * t
    const wobble = Math.sin(i * 0.35) * 0.045 + Math.sin(i * 0.11) * 0.02
    return Math.round((base + wobble) * 100) / 100
  },
) as readonly number[]

/** Approximate tick labels for the 52-week illustrative window. */
export const CS2_MARKET_CHART_X_LABELS = ['Jan', 'Apr', 'Jul', 'Oct'] as const

/**
 * Long synthetic “all-time style” curve (monthly points) for dashboards.
 * Not historical truth — cosmetic trend only (~late CS:GO era → today scale).
 */
const ALLTIME_MONTHS = 96
const ALLTIME_START_B = 0.48
const ALLTIME_END_B = 3.26

export const CS2_MARKET_ALLTIME_ESTIMATE_USD_BILLIONS: readonly number[] = Array.from(
  { length: ALLTIME_MONTHS },
  (_, i) => {
    const t = i / (ALLTIME_MONTHS - 1 || 1)
    // Slight upward curvature + seasonal noise
    const eased = t * t * 0.82 + t * 0.18
    const base = ALLTIME_START_B + (ALLTIME_END_B - ALLTIME_START_B) * eased
    const wobble =
      Math.sin(i * 0.22) * 0.09 + Math.sin(i * 0.08) * 0.05 + Math.sin(i * 0.45) * 0.03
    return Math.round((base + wobble) * 100) / 100
  },
) as readonly number[]

/** Axis ticks for the long series (approximate years). */
export const CS2_MARKET_ALLTIME_X_LABELS = ['2018', '2020', '2022', '2024'] as const
