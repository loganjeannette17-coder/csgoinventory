import {
  CS2_MARKET_CHART_X_LABELS,
  CS2_MARKET_ESTIMATE_USD_BILLIONS,
} from '@/lib/cs2-market-estimate'
import { ValueOverTimeChart } from '@/components/charts/ValueOverTimeChart'

export default function Cs2MarketPage() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-bold text-white">CS2 market overview</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          A stock-style view of an <strong className="text-gray-300">estimated</strong> total market
          size for Counter-Strike 2 cosmetics (liquidity-weighted composite in billions USD). This is
          not a live feed from Steam or a single exchange — it is generated for visualization in this
          app and should not be used as financial advice.
        </p>
      </div>

      <ValueOverTimeChart
        chartId="cs2-global-market"
        eyebrow="Estimated CS2 market size"
        title="Composite index (USD billions)"
        values={[...CS2_MARKET_ESTIMATE_USD_BILLIONS]}
        valueFormat="billions"
        periodLabel="past ~12 months (weekly)"
        xLabels={[...CS2_MARKET_CHART_X_LABELS]}
        footer="Illustrative series only. Real market aggregates depend on item coverage, pricing sources, and methodology."
      />

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-3 text-xs text-gray-500 leading-relaxed max-w-2xl">
        For your own collection, use the dashboard chart — it uses your saved inventory snapshots and
        updates when you sync from Steam.
      </div>
    </div>
  )
}
