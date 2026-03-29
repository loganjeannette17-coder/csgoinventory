import { downsampleTimePoints, type TimePoint } from '@/lib/chart-time'

export type SnapshotPoint = {
  total_value_usd: number
  captured_at: string
}

/** Selectable ranges for the personal inventory value chart. */
export type PersonalChartRange = '1d' | '1w' | '1m' | '6m' | 'ytd' | 'all'

export const PERSONAL_CHART_RANGE_ORDER: PersonalChartRange[] = [
  '1d',
  '1w',
  '1m',
  '6m',
  'ytd',
  'all',
]

export const PERSONAL_CHART_RANGE_OPTIONS: { value: PersonalChartRange; label: string }[] = [
  { value: '1d', label: 'Daily (24h)' },
  { value: '1w', label: 'Weekly (7d)' },
  { value: '1m', label: 'Monthly (30d)' },
  { value: '6m', label: '6 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
]

type Point = { tMs: number; value: number }

const DAY_MS = 86_400_000

function toSortedPoints(snaps: SnapshotPoint[]): Point[] {
  return snaps
    .map((s) => ({
      tMs: new Date(s.captured_at).getTime(),
      value: Number(s.total_value_usd),
    }))
    .filter((p) => !Number.isNaN(p.tMs))
    .sort((a, b) => a.tMs - b.tMs)
}

function startOfUtcHour(tMs: number): number {
  const d = new Date(tMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours())
}

function startOfUtcDay(tMs: number): number {
  const d = new Date(tMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Monday 00:00 UTC of the week containing tMs. */
function startOfIsoWeekUtc(tMs: number): number {
  const d = new Date(tMs)
  const mid = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const day = new Date(mid).getUTCDay()
  const daysFromMonday = (day + 6) % 7
  return mid - daysFromMonday * DAY_MS
}

function startOfUtcMonth(tMs: number): number {
  const d = new Date(tMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
}

/** One point per bucket: latest snapshot in that bucket wins. */
function bucketLast(points: Point[], bucketStart: (tMs: number) => number): Point[] {
  const map = new Map<number, Point>()
  for (const p of points) {
    const key = bucketStart(p.tMs)
    const cur = map.get(key)
    if (!cur || p.tMs > cur.tMs) map.set(key, { tMs: p.tMs, value: p.value })
  }
  return Array.from(map.values()).sort((a, b) => a.tMs - b.tMs)
}

function filterWindow(points: Point[], startMs: number, endMs: number): Point[] {
  return points.filter((p) => p.tMs >= startMs && p.tMs <= endMs)
}

const MAX_CHART_POINTS = 90

/**
 * Filters snapshots to the selected window, aggregates into day/week/month/hour buckets,
 * then downsamples for display. Pass `nowMs` from the client after mount to avoid SSR drift.
 */
export function aggregatePersonalSnapshots(
  snapsOldestToNewest: SnapshotPoint[],
  range: PersonalChartRange,
  nowMs: number,
): { datesIso: string[]; values: number[]; periodLabel: string } {
  const points = toSortedPoints(snapsOldestToNewest)
  const label = PERSONAL_CHART_RANGE_OPTIONS.find((o) => o.value === range)?.label ?? range

  if (points.length === 0) {
    return { datesIso: [], values: [], periodLabel: label }
  }

  let windowStart: number
  const windowEnd = nowMs

  switch (range) {
    case '1d':
      windowStart = nowMs - DAY_MS
      break
    case '1w':
      windowStart = nowMs - 7 * DAY_MS
      break
    case '1m':
      windowStart = nowMs - 30 * DAY_MS
      break
    case '6m':
      windowStart = nowMs - 180 * DAY_MS
      break
    case 'ytd': {
      const d = new Date(nowMs)
      windowStart = new Date(d.getFullYear(), 0, 1).getTime()
      break
    }
    case 'all':
      windowStart = points[0].tMs
      break
    default:
      windowStart = points[0].tMs
  }

  const filtered =
    range === 'all' ? points : filterWindow(points, windowStart, windowEnd)

  if (filtered.length === 0) {
    return { datesIso: [], values: [], periodLabel: label }
  }

  let aggregated: Point[]
  switch (range) {
    case '1d':
      aggregated = bucketLast(filtered, startOfUtcHour)
      break
    case '1w':
    case '1m':
      aggregated = bucketLast(filtered, startOfUtcDay)
      break
    case '6m':
      aggregated = bucketLast(filtered, startOfIsoWeekUtc)
      break
    case 'ytd': {
      const span = windowEnd - windowStart
      aggregated =
        span > 120 * DAY_MS
          ? bucketLast(filtered, startOfIsoWeekUtc)
          : bucketLast(filtered, startOfUtcDay)
      break
    }
    case 'all': {
      const span = windowEnd - windowStart
      if (span > 2 * 365 * DAY_MS) aggregated = bucketLast(filtered, startOfUtcMonth)
      else if (span > 120 * DAY_MS) aggregated = bucketLast(filtered, startOfIsoWeekUtc)
      else aggregated = bucketLast(filtered, startOfUtcDay)
      break
    }
    default:
      aggregated = filtered
  }

  const zipped: TimePoint[] = aggregated.map((p) => ({
    iso: new Date(p.tMs).toISOString(),
    value: p.value,
  }))

  const sampled = zipped.length <= 1 ? zipped : downsampleTimePoints(zipped, MAX_CHART_POINTS)

  return {
    datesIso: sampled.map((p) => p.iso),
    values: sampled.map((p) => p.value),
    periodLabel: label,
  }
}
