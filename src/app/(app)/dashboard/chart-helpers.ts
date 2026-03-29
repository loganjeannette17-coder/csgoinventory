import { formatChartAxisDate } from '@/lib/utils'
import type { SnapshotPoint } from '@/lib/personal-value-chart'

export type { TimePoint } from '@/lib/chart-time'
export type { SnapshotPoint }

/** Evenly sample up to `maxPoints` points for smooth charts while keeping time alignment. */
export function downsampleSnapshotSeries(
  snapsOldestToNewest: SnapshotPoint[],
  maxPoints: number,
): { values: number[]; dates: string[] } {
  if (snapsOldestToNewest.length <= maxPoints) {
    return {
      values: snapsOldestToNewest.map((s) => Number(s.total_value_usd)),
      dates: snapsOldestToNewest.map((s) => s.captured_at),
    }
  }
  const last = snapsOldestToNewest.length - 1
  const values: number[] = []
  const dates: string[] = []
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last)
    const s = snapsOldestToNewest[idx]
    values.push(Number(s.total_value_usd))
    dates.push(s.captured_at)
  }
  return { values, dates }
}

export function buildFourChartLabels(dates: string[]): [string, string, string, string] {
  if (dates.length < 2) return ['', '', '', '']
  const n = dates.length
  const ix = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]
  return ix.map((i) => formatChartAxisDate(dates[Math.min(i, n - 1)])) as [
    string,
    string,
    string,
    string,
  ]
}
