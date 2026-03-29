import { formatUsd, formatRelativeTime, formatAbsoluteDate } from '@/lib/utils'

interface Snapshot {
  total_value_usd: number
  item_count: number
  captured_at: string
}

interface Props {
  current: Snapshot | null
  previous: Snapshot | null  // second-most-recent, for delta calculation
}

export function ValueSummary({ current, previous }: Props) {
  if (!current) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <p className="text-gray-500 text-sm">No inventory data yet. Sync your Steam inventory to get started.</p>
      </div>
    )
  }

  const delta = previous
    ? current.total_value_usd - previous.total_value_usd
    : null

  const deltaPercent =
    delta !== null && previous && previous.total_value_usd > 0
      ? (delta / previous.total_value_usd) * 100
      : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-1">
      <p className="text-gray-400 text-sm font-medium">Total Inventory Value</p>

      <div className="flex items-end gap-3">
        <span className="text-4xl font-extrabold text-white tracking-tight">
          {formatUsd(current.total_value_usd)}
        </span>

        {delta !== null && deltaPercent !== null && (
          <span
            className={
              delta >= 0
                ? 'text-green-400 text-sm font-semibold mb-1'
                : 'text-red-400 text-sm font-semibold mb-1'
            }
          >
            {delta >= 0 ? '+' : ''}
            {formatUsd(delta)} ({deltaPercent >= 0 ? '+' : ''}
            {deltaPercent.toFixed(1)}%)
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-gray-500 text-xs pt-1">
        <span>{current.item_count.toLocaleString()} items</span>
        <span>·</span>
        <span title={formatAbsoluteDate(current.captured_at)}>
          Updated {formatRelativeTime(current.captured_at)}
        </span>
      </div>
    </div>
  )
}
