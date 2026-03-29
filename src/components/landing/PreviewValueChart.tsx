import { ValueOverTimeChart } from '@/components/charts/ValueOverTimeChart'

/** Same illustrative series as before — landing page only. */
const MOCK_VALUE_SERIES = [
  8120, 8240, 8180, 8420, 8560, 8480, 8650, 8780, 8720, 8910, 9050, 8980, 9120, 9280, 9150, 9350, 9480,
  9420, 9580, 9720, 9650, 9850, 9980, 10120, 10400, 10850, 11200, 11800, 12350, 12847,
] as const

type PreviewValueChartProps = {
  className?: string
}

export function PreviewValueChart({ className = '' }: PreviewValueChartProps) {
  return (
    <ValueOverTimeChart
      chartId="landing-preview"
      values={[...MOCK_VALUE_SERIES]}
      eyebrow="Portfolio value (illustrative)"
      periodLabel="past 30 days"
      xLabels={['1W', '2W', '3W', '4W']}
      footer="Example only — your real dashboard syncs from Steam and updates with market prices."
      decorative
      className={className}
    />
  )
}
