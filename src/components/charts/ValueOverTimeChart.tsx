'use client'

import type { ReactNode } from 'react'
import { formatUsd } from '@/lib/utils'
import { buildFourTimeDomainLabels, downsampleTimePoints, type TimePoint } from '@/lib/chart-time'

export type ValueChartValueFormat = 'currency' | 'billions' | 'compact'

type TimeSeriesInput = {
  steamAccountCreatedIso: string | null
  datesIso: string[]
  values: number[]
}

type ValueOverTimeChartProps = {
  chartId: string
  title?: string
  eyebrow?: string
  periodLabel?: string
  footer?: string
  emptyMessage?: string
  xLabels?: string[]
  valueFormat?: ValueChartValueFormat
  decorative?: boolean
  className?: string
  values?: number[]
  timeSeries?: TimeSeriesInput
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

function buildPathsIndex(
  vals: readonly number[],
  width: number,
  height: number,
  pad: { top: number; right: number; bottom: number; left: number },
) {
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const span = maxV - minV || 1

  const pts = vals.map((v, i) => {
    const x = pad.left + (i / (vals.length - 1 || 1)) * innerW
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

function buildPathsTime(
  points: { tMs: number; value: number }[],
  domainStartMs: number,
  domainEndMs: number,
  width: number,
  height: number,
  pad: { top: number; right: number; bottom: number; left: number },
) {
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const spanMs = Math.max(domainEndMs - domainStartMs, 1)
  const vals = points.map((p) => p.value)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const spanV = maxV - minV || 1

  const pts = points.map((p) => {
    const x = pad.left + ((p.tMs - domainStartMs) / spanMs) * innerW
    const y = pad.top + innerH - ((p.value - minV) / spanV) * innerH
    return { x, y, tMs: p.tMs, value: p.value }
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

function ChartSvgFrame({
  children,
  w,
  h,
  ariaLabel,
}: {
  children: ReactNode
  w: number
  h: number
  ariaLabel: string
}) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block" role="img" aria-label={ariaLabel}>
      {children}
    </svg>
  )
}

export function ValueOverTimeChart({
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
  values: rawValues,
  timeSeries,
}: ValueOverTimeChartProps) {
  const w = 560
  const h = 220
  const pad = { top: 8, right: 12, bottom: 28, left: 12 }
  const innerW = w - pad.left - pad.right
  const gradientId = `${chartId}-fill`

  // ── Time mode (dashboard): snapshots on timeline from Steam account age → now ──
  if (timeSeries) {
    const zipped: TimePoint[] = timeSeries.datesIso
      .map((iso, i) => ({ iso, value: timeSeries.values[i] ?? 0 }))
      .filter((_, i) => i < timeSeries.values.length)

    if (zipped.length < 1) {
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

    const sampled = zipped.length === 1 ? zipped : downsampleTimePoints(zipped, 90)
    const pathData = sampled.map((p) => ({
      tMs: new Date(p.iso).getTime(),
      value: p.value,
    }))

    const firstMs = new Date(zipped[0].iso).getTime()
    const lastMs = new Date(zipped[zipped.length - 1].iso).getTime()
    const steamMs = timeSeries.steamAccountCreatedIso
      ? new Date(timeSeries.steamAccountCreatedIso).getTime()
      : null
    const domainStartMs =
      steamMs !== null && !Number.isNaN(steamMs) ? Math.min(steamMs, firstMs) : firstMs
    const domainEndMs = Math.max(Date.now(), lastMs, domainStartMs + 86_400_000)

    const last = zipped[zipped.length - 1].value
    const first = zipped[0].value
    const changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0
    const changeStr = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`
    const up = last >= first

    const strokeRgb = up ? 'rgb(52 211 153)' : 'rgb(248 113 113)'
    const strokeRgbStrong = up ? 'rgb(16 185 129)' : 'rgb(239 68 68)'
    const strokeRing = up ? 'rgb(6 95 70)' : 'rgb(127 29 29)'
    const stopTop = up ? 'rgb(52 211 153)' : 'rgb(248 113 113)'

    const valueStr = formatDisplayValue(last, valueFormat)
    const ariaLabel = `${eyebrow ?? title ?? 'Chart'}: value ${valueStr}, change ${changeStr} over ${periodLabel}`

    const labels =
      xLabels && xLabels.length >= 4
        ? xLabels.slice(0, 4)
        : [...buildFourTimeDomainLabels(domainStartMs, domainEndMs)]

    const single = pathData.length === 1
    const { lineD, areaD, pts } = single
      ? { lineD: '', areaD: '', pts: [] as { x: number; y: number }[] }
      : buildPathsTime(pathData, domainStartMs, domainEndMs, w, h, pad)

    const spanMs = Math.max(domainEndMs - domainStartMs, 1)
    const innerH = h - pad.top - pad.bottom
    const vals = pathData.map((p) => p.value)
    const minV = Math.min(...vals)
    const maxV = Math.max(...vals)
    const spanV = maxV - minV || 1

    const one = pathData[0]
    const oneX = pad.left + ((one.tMs - domainStartMs) / spanMs) * innerW
    const oneY = pad.top + innerH - ((one.value - minV) / spanV) * innerH

    return (
      <div
        className={`rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden ${decorative ? 'select-none pointer-events-none' : ''} ${className}`}
      >
        <div className="px-4 pt-4 pb-2 border-b border-gray-800/80">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{eyebrow}</p>
          )}
          {title && <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>}
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-white">{valueStr}</span>
            <span className={`text-sm font-medium tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {changeStr}
            </span>
            <span className="text-xs text-gray-500">{periodLabel}</span>
          </div>
        </div>

        <div className="relative px-2 pb-1">
          <ChartSvgFrame w={w} h={h} ariaLabel={ariaLabel}>
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

            {!single && (
              <>
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
              </>
            )}

            {single && (
              <circle cx={oneX} cy={oneY} r="5" fill={strokeRgbStrong} stroke={strokeRing} strokeWidth="1.5" />
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
          </ChartSvgFrame>
        </div>

        {footer && <p className="px-4 pb-3 text-[11px] text-gray-600 text-center">{footer}</p>}
      </div>
    )
  }

  // ── Index mode ─────────────────────────────────────────────────
  const values =
    !rawValues || rawValues.length === 0
      ? []
      : rawValues.length === 1
        ? [rawValues[0], rawValues[0]]
        : downsample(rawValues, 90)

  const labels =
    xLabels && xLabels.length >= 4
      ? xLabels.slice(0, 4)
      : [...DEFAULT_X_LABELS]

  if (!rawValues || values.length < 2) {
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

  const { lineD, areaD, pts } = buildPathsIndex(values, w, h, pad)
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
        {title && <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>}
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{valueStr}</span>
          <span className={`text-sm font-medium tabular-nums ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {changeStr}
          </span>
          <span className="text-xs text-gray-500">{periodLabel}</span>
        </div>
      </div>

      <div className="relative px-2 pb-1">
        <ChartSvgFrame w={w} h={h} ariaLabel={ariaLabel}>
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
        </ChartSvgFrame>
      </div>

      {footer && <p className="px-4 pb-3 text-[11px] text-gray-600 text-center">{footer}</p>}
    </div>
  )
}
