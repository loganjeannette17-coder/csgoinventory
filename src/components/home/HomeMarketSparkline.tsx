/** Tiny SVG sparkline for hub cards (values in same units, e.g. billions). */
export function HomeMarketSparkline({
  values,
  gradientId = 'hub-spark-fill',
}: {
  values: readonly number[]
  gradientId?: string
}) {
  if (values.length < 2) return null
  const w = 120
  const h = 36
  const pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const innerW = w - pad * 2
  const innerH = h - pad * 2

  const linePts: { x: number; y: number }[] = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * innerW,
    y: pad + innerH - ((v - min) / span) * innerH,
  }))
  const lineD = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const first = linePts[0]
  const last = linePts[linePts.length - 1]
  const areaD = `${lineD} L ${last.x.toFixed(1)} ${h - pad} L ${first.x.toFixed(1)} ${h - pad} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full max-w-[120px] h-9 shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={lineD}
        fill="none"
        stroke="rgb(52 211 153)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
