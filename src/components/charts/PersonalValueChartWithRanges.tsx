'use client'

import { useEffect, useMemo, useState } from 'react'
import { ValueOverTimeChart } from '@/components/charts/ValueOverTimeChart'
import {
  aggregatePersonalSnapshots,
  PERSONAL_CHART_RANGE_OPTIONS,
  type PersonalChartRange,
  type SnapshotPoint,
} from '@/lib/personal-value-chart'

function rangeFooter(range: PersonalChartRange): string {
  switch (range) {
    case '1d':
      return 'Last 24 hours, bucketed by UTC hour (latest snapshot per hour).'
    case '1w':
      return 'Last 7 days, one point per UTC day (latest snapshot that day).'
    case '1m':
      return 'Last 30 days, one point per UTC day (latest snapshot that day).'
    case '6m':
      return 'Last 6 months, one point per UTC week (latest snapshot that week).'
    case 'ytd':
      return 'From Jan 1 in your local calendar through today; weeks or days depending on span.'
    case 'all':
      return 'Full history: months for multi-year spans, then weeks, then days. Values exist only when you sync.'
    default:
      return 'Values exist only when this app saves a snapshot after a sync.'
  }
}

function emptyCopy(range: PersonalChartRange): string {
  if (range === '1d') {
    return 'No snapshots in the last 24 hours. Sync your inventory or pick a longer range.'
  }
  return 'No snapshots in this time range. Try another range or sync your inventory.'
}

type PersonalValueChartWithRangesProps = {
  chartId: string
  snapshotsOldestToNewest: SnapshotPoint[]
  steamAccountCreatedIso: string | null
}

export function PersonalValueChartWithRanges({
  chartId,
  snapshotsOldestToNewest,
  steamAccountCreatedIso,
}: PersonalValueChartWithRangesProps) {
  const [range, setRange] = useState<PersonalChartRange>('1m')
  const [nowMs, setNowMs] = useState<number | null>(null)

  useEffect(() => {
    setNowMs(Date.now())
  }, [])

  const { datesIso, values, periodLabel } = useMemo(() => {
    if (nowMs == null) {
      return { datesIso: [] as string[], values: [] as number[], periodLabel: '' }
    }
    return aggregatePersonalSnapshots(snapshotsOldestToNewest, range, nowMs)
  }, [snapshotsOldestToNewest, range, nowMs])

  const footer = useMemo(() => {
    const base = rangeFooter(range)
    if (steamAccountCreatedIso) {
      const y = new Date(steamAccountCreatedIso).getFullYear()
      return `${base} Steam account since ${y}.`
    }
    return base
  }, [range, steamAccountCreatedIso])

  const title = 'Total value over time (sync snapshots)'

  if (nowMs == null) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden animate-pulse">
        <div className="px-4 pt-4 pb-2 border-b border-gray-800/80">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Your inventory</p>
          <p className="text-xs font-medium text-gray-500 mt-0.5">{title}</p>
          <div className="mt-3 h-9 rounded-lg bg-gray-800/80 max-w-xs" />
        </div>
        <div className="h-[220px] bg-gray-900/50" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor={`${chartId}-range`} className="text-xs text-gray-400">
          Time frame
        </label>
        <select
          id={`${chartId}-range`}
          value={range}
          onChange={(e) => setRange(e.target.value as PersonalChartRange)}
          className="w-full sm:w-64 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {PERSONAL_CHART_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <ValueOverTimeChart
        chartId={chartId}
        eyebrow="Your inventory"
        title={title}
        timeSeries={{
          steamAccountCreatedIso: null,
          datesIso,
          values,
        }}
        periodLabel={periodLabel}
        emptyMessage={
          snapshotsOldestToNewest.length === 0
            ? 'No snapshots yet. Link Steam and sync your inventory a few times to see value over time.'
            : emptyCopy(range)
        }
        footer={datesIso.length >= 1 ? footer : undefined}
      />
    </div>
  )
}
