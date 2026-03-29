import { formatChartAxisDate } from '@/lib/utils'

export type TimePoint = { iso: string; value: number }

/** Evenly sample points in time order for the SVG path. */
export function downsampleTimePoints(points: TimePoint[], maxPoints: number): TimePoint[] {
  if (points.length <= maxPoints) return points
  const last = points.length - 1
  const out: TimePoint[] = []
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last)
    out.push(points[idx])
  }
  return out
}

function formatTimeAxisLabel(ms: number, spanYears: number): string {
  const d = new Date(ms)
  if (spanYears >= 2) {
    return d.getFullYear().toString()
  }
  return formatChartAxisDate(d.toISOString())
}

/** Four tick labels along the x-axis for a time domain [startMs, endMs]. */
export function buildFourTimeDomainLabels(startMs: number, endMs: number): [string, string, string, string] {
  const span = endMs - startMs
  if (span <= 0 || Number.isNaN(span)) return ['', '', '', '']
  const spanYears = span / (365.25 * 86400 * 1000)
  const tickMs = [0, 1 / 3, 2 / 3, 1].map((t) => startMs + t * span)
  return tickMs.map((ms) => formatTimeAxisLabel(ms, spanYears)) as [string, string, string, string]
}
