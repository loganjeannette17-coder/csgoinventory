/**
 * Illustrative portfolio-style chart for the public landing page only.
 * Static mock data — not connected to real user or market APIs.
 */
const MOCK_VALUE_SERIES = [
  8120, 8240, 8180, 8420, 8560, 8480, 8650, 8780, 8720, 8910, 9050, 8980, 9120, 9280,
  9150, 9350, 9480, 9420, 9580, 9720, 9650, 9850, 9980, 10120, 10400, 10850, 11200, 11800,
  12350, 12847,
] as const

const LABELS = ['1W', '2W', '3W', '4W'] as const

type PreviewValueChartProps = {
  className?: string
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
    const x = pad.left + (i / (values.length - 1)) * innerW
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

export function PreviewValueChart({ className = '' }: PreviewValueChartProps) {
  const w = 560
  const h = 220
  const pad = { top: 8, right: 12, bottom: 28, left: 12 }
  const innerW = w - pad.left - pad.right
  const { lineD, areaD, pts } = buildPaths(MOCK_VALUE_SERIES, w, h, pad)

  const last = MOCK_VALUE_SERIES[MOCK_VALUE_SERIES.length - 1]
  const first = MOCK_VALUE_SERIES[0]
  const changePct = ((last - first) / first) * 100
  const changeStr = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`
  const valueStr = last.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden select-none pointer-events-none ${className}`}
    >
      <div className="px-4 pt-4 pb-2 border-b border-gray-800/80">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          Portfolio value (illustrative)
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-white">{valueStr}</span>
          <span className="text-sm font-medium tabular-nums text-emerald-400">{changeStr}</span>
          <span className="text-xs text-gray-500">past 30 days</span>
        </div>
      </div>

      <div className="relative px-2 pb-1">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Illustrative line chart: inventory value trending up over the last 30 days"
        >
          <defs>
            <linearGradient id="previewChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
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

          <path d={areaD} fill="url(#previewChartFill)" />
          <path
            d={lineD}
            fill="none"
            stroke="rgb(52 211 153)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End dot */}
          {pts.length > 0 && (
            <circle
              cx={pts[pts.length - 1].x}
              cy={pts[pts.length - 1].y}
              r="4"
              fill="rgb(16 185 129)"
              stroke="rgb(6 95 70)"
              strokeWidth="1.5"
            />
          )}

          {/* X labels (weekly markers) */}
          {LABELS.map((label, i) => {
            const x = pad.left + ((i + 1) / (LABELS.length + 1)) * innerW
            return (
              <text
                key={label}
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

      <p className="px-4 pb-3 text-[11px] text-gray-600 text-center">
        Example only — your real dashboard syncs from Steam and updates with market prices.
      </p>
    </div>
  )
}
