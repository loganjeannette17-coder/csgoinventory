import { formatUsd } from '@/lib/utils'

export type ValueChartValueFormat = 'currency' | 'billions' | 'compact'

type ValueOverTimeChartProps = {
  /** Oldest → newest (same order as the x-axis). */
  values: number[]
  /** Unique id prefix for SVG defs (multiple charts per page). */
  chartId: string
  /** Secondary line under eyebrow (optional). */
  title?: string
  /** e.g. "Your inventory" / "Estimated CS2 market" */
  eyebrow?: string
  periodLabel?: string
  footer?: string
  /** Shown when there are fewer than two data points. */
  emptyMessage?: string
  /** Default: 4 evenly spaced labels along the bottom. */
  xLabels?: string[]
  valueFormat?: ValueChartValueFormat
  /** When true, chart is non-interactive decorative (landing preview). */
  decorative?: boolean
  className?: string
}

function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return [...values]
  const out: number[] = []
  const last = values.length - 1
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last)
    out.push(values[idx])
  }
  return out
}

function buildPaths(
  values: readonly number[],
  width: number,
  height: number,
  pad: { top: number; right: number; bottom: number; left: number },
) {
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const span = maxV - minV || 1

  const pts = values.map((v, i) => {
    const x = pad.left + (i / (values.length - 1 || 1)) * innerW
    const y = pad.top + innerH - ((v - minV) / span) * innerH
    return { x, y }
  })

  const lineD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  const first = pts[0]
  const last = pts[pts.length - 1]
  const areaD = `${lineD} L ${last.x.toFixed(2)} ${(height - pad.bottom).toFixed(2)} L ${first.x.toFixed(
    2,
  )} ${(height - pad.bottom).toFixed(2)} Z`

  return { lineD, areaD, pts }
}

function formatDisplayValue(last: number, valueFormat: ValueChartValueFormat): string {
  if (valueFormat === 'billions') {
    return `$${last.toFixed(2)}B`
  }
  if (valueFormat === 'compact') {
    if (last >= 1_000_000_000) return `$${(last / 1_000_000_000).toFixed(2)}B`
    if (last >= 1_000_000) return `$${(last / 1_000_000).toFixed(2)}M`
    if (last >= 1_000) return `$${(last / 1_000).toFixed(1)}K`
    return formatUsd(last)
  }
  return formatUsd(last)
}

const DEFAULT_X_LABELS = ['', '', '', ''] as const

export function ValueOverTimeChart({
  values: rawValues,
  chartId,
  title,
  eyebrow,
  periodLabel = 'shown range',
  footer,
  emptyMessage = 'Not enough history yet. After you sync a few times, your value trend will appear here.',
  xLabels,
  valueFormat = 'currency',
  decorative = false,
  className = '',
}: ValueOverTimeChartProps) {
  const w = 560
  const h = 220
  const pad = { top: 8, right: 12, bottom: 28, left: 12 }
  const innerW = w - pad.left - pad.right

  const values =
    rawValues.length === 0
      ? []
      : rawValues.length === 1
        ? [rawValues[0], rawValues[0]]
        : downsample(rawValues, 90)

  const gradientId = `${chartId}-fill`
  const labels =
    xLabels && xLabels.length >= 4
      ? xLabels.slice(0, 4)
      : [...DEFAULT_X_LABELS]

  if (values.length < 2) {
    return (
      <div
        className={`rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden ${decorative ? 'select-none pointer-events-none' : ''} ${className}`}
      >
        <div className="px-4 pt-4 pb-2 border-b border-gray-800/80">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{eyebrow}</p>
          )}
          {title && <p className="text-sm font-semibold text-white mt-1">{title}</p>}
        </div>
        <div className="px-4 py-10 text-center text-sm text-gray-500">{emptyMessage}</div>
      </div>
    )
  }

  const { lineD, areaD, pts } = buildPaths(values, w, h, pad)
  const last = values[values.length - 1]
  const first = values[0]
  const changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0
  const changeStr = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`
  const up = last >= first

  const strokeRgb = up ? 'rgb(52 211 153)' : 'rgb(248 113 113)'
  const strokeRgbStrong = up ? 'rgb(16 185 129)' : 'rgb(239 68 68)'
  const strokeRing = up ? 'rgb(6 95 70)' : 'rgb(127 29 29)'
  const stopTop = up ? 'rgb(52 211 153)' : 'rgb(248 113 113)'

  const valueStr = formatDisplayValue(last, valueFormat)
  const ariaLabel = `${eyebrow ?? title ?? 'Chart'}: value ${valueStr}, change ${changeStr} over ${periodLabel}`

  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden ${decorative ? 'select-none pointer-events-none' : ''} ${className}`}
    >
        <div className="px-4 pt-4 pb-2 border-b border-gray-800/80">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{eyebrow}</p>
          )}
          {title && (
            <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
          )}
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{valueStr}</span>
          <span
            className={`text-sm font-medium tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {changeStr}
          </span>
          <span className="text-xs text-gray-500">{periodLabel}</span>
        </div>
      </div>

      <div className="relative px-2 pb-1">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block" role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stopTop} stopOpacity="0.25" />
              <stop offset="100%" stopColor={stopTop} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((t) => {
            const y = pad.top + (h - pad.top - pad.bottom) * (1 - t)
            return (
              <line
                key={t}
                x1={pad.left}
                y1={y}
                x2={w - pad.right}
                y2={y}
                stroke="rgb(55 65 81)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            )
          })}

          <path d={areaD} fill={`url(#${gradientId})`} />
          <path
            d={lineD}
            fill="none"
            stroke={strokeRgb}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {pts.length > 0 && (
            <circle
              cx={pts[pts.length - 1].x}
              cy={pts[pts.length - 1].y}
              r="4"
              fill={strokeRgbStrong}
              stroke={strokeRing}
              strokeWidth="1.5"
            />
          )}

          {labels.map((label, i) => {
            if (!label) return null
            const x = pad.left + ((i + 1) / 5) * innerW
            return (
              <text
                key={`${label}-${i}`}
                x={x}
                y={h - 8}
                textAnchor="middle"
                className="fill-gray-600"
                style={{ fontSize: 10 }}
              >
                {label}
              </text>
            )
          })}
        </svg>
      </div>

      {footer && <p className="px-4 pb-3 text-[11px] text-gray-600 text-center">{footer}</p>}
    </div>
  )
}
