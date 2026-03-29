import Link from 'next/link'
import { PreviewValueChart } from '@/components/landing/PreviewValueChart'
import { HomeMarketSparkline } from '@/components/home/HomeMarketSparkline'
import { FEATURES, PREVIEW_OFFERS } from '@/lib/marketing-copy'
import { CS2_MARKET_ALLTIME_ESTIMATE_USD_BILLIONS } from '@/lib/cs2-market-estimate'
import type { HomeHubData } from '@/lib/home-hub-data'
import { formatUsd, formatRelativeTime } from '@/lib/utils'

const RANK_RING: Record<number, string> = {
  1: 'ring-amber-500/50 bg-amber-500/10',
  2: 'ring-gray-400/40 bg-gray-400/5',
  3: 'ring-amber-700/40 bg-amber-800/10',
}

function CrownMini({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M2 18h20v2H2v-2zm1.5-2L5 6l4.5 4.5L12 3l2.5 7.5L19 6l1.5 10H3.5z" />
    </svg>
  )
}

export function HomeHubShell({ data }: { data: HomeHubData }) {
  const sparkValues = CS2_MARKET_ALLTIME_ESTIMATE_USD_BILLIONS.slice(-28)

  return (
    <div className="min-h-full">
      {/* Hero + live snippets strip */}
      <section className="relative overflow-hidden border-b border-gray-800/80 bg-gradient-to-br from-slate-950 via-gray-950 to-blue-950/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgb(59 130 246) 0%, transparent 45%),
              radial-gradient(circle at 80% 60%, rgb(16 185 129) 0%, transparent 40%)`,
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8 sm:pt-14 sm:pb-12">
          <p className="text-blue-400 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
            CS2 Inventory hub
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight max-w-3xl">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">{data.displayName}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
            Live previews from across the app—tap any card to jump in. Skins trade like a market: liquidity,
            hype, and patch meta all move prices over time.
          </p>
        </div>

        {/* Snippet grid — top of page */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Live snapshots
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              className="group relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-gray-900/90 to-gray-950 p-5 shadow-lg shadow-emerald-950/20 transition-all hover:border-emerald-400/50 hover:shadow-emerald-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">
                  Your portfolio
                </span>
                <span className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
              {data.mySnapshot ? (
                <>
                  <p className="mt-3 text-3xl font-bold tabular-nums text-white tracking-tight">
                    {formatUsd(data.mySnapshot.totalValueUsd)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {data.mySnapshot.itemCount.toLocaleString()} items · updated{' '}
                    {formatRelativeTime(data.mySnapshot.capturedAt)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                  Link Steam and sync to see your inventory total here.
                </p>
              )}
            </Link>

            {/* Leaderboard */}
            <Link
              href="/leaderboard"
              className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-gray-900/90 to-gray-950 p-5 shadow-lg shadow-amber-950/10 transition-all hover:border-amber-400/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90">
                  Leaderboard
                </span>
                <span className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Full ranks →
                </span>
              </div>
              {data.leaderboardTop3.length === 0 ? (
                <p className="text-sm text-gray-500">No public inventories yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.leaderboardTop3.map((row) => (
                    <li
                      key={row.username}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ring-1 ${RANK_RING[row.rank] ?? 'ring-gray-700/50 bg-gray-800/30'}`}
                    >
                      <span
                        className="flex w-7 shrink-0 flex-col items-center justify-center text-amber-400"
                        title={`Rank ${row.rank}`}
                      >
                        <CrownMini className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-bold leading-none text-amber-200/90">
                          {row.rank}
                        </span>
                      </span>
                      {row.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                          {row.displayName[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{row.displayName}</p>
                        <p className="text-xs text-green-400 font-semibold">{formatUsd(row.totalValueUsd)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Link>

            {/* Browse */}
            <Link
              href="/browse"
              className="group rounded-2xl border border-sky-500/20 bg-gradient-to-br from-gray-900/90 to-gray-950 p-5 shadow-lg shadow-sky-950/10 transition-all hover:border-sky-400/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/90">
                  Browse
                </span>
                <span className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Discover →
                </span>
              </div>
              {data.browseNewest.length === 0 ? (
                <p className="text-sm text-gray-500">No public profiles yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.browseNewest.map((u) => (
                    <li key={u.username} className="flex items-center gap-2">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                          {u.displayName[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">@{u.username}</p>
                        <p className="text-[11px] text-gray-500">{formatUsd(u.totalValueUsd)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-gray-600">Newest public traders</p>
            </Link>

            {/* CS2 market */}
            <Link
              href="/cs2-market"
              className="group rounded-2xl border border-violet-500/25 bg-gradient-to-br from-gray-900/90 to-violet-950/20 p-5 shadow-lg shadow-violet-950/20 transition-all hover:border-violet-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300/90">
                  CS2 market pulse
                </span>
                <span className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Chart →
                </span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">Est. index (illustrative)</p>
                  <p className="text-lg font-bold text-white">
                    ${data.marketIndexEndB.toFixed(2)}B
                    <span
                      className={`ml-2 text-sm font-semibold ${data.marketIndexChangePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {data.marketIndexChangePct >= 0 ? '+' : ''}
                      {data.marketIndexChangePct.toFixed(0)}% long-run
                    </span>
                  </p>
                </div>
                <HomeMarketSparkline values={sparkValues} gradientId="home-hub-market-spark" />
              </div>
            </Link>

            {/* Auctions */}
            <Link
              href="/auctions"
              className="group rounded-2xl border border-orange-500/20 bg-gradient-to-br from-gray-900/90 to-gray-950 p-5 shadow-lg transition-all hover:border-orange-400/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
                  Marketplace
                </span>
                <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                  {data.activeAuctionCount} active
                </span>
              </div>
              {data.activeAuctions.length === 0 ? (
                <p className="text-sm text-gray-500">No live auctions right now.</p>
              ) : (
                <ul className="space-y-2">
                  {data.activeAuctions.map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="text-white font-medium line-clamp-1">{a.itemName}</span>
                      <span className="block text-xs text-gray-500">
                        {a.currentBidUsd != null ? formatUsd(a.currentBidUsd) : 'No bids'} · ends{' '}
                        {formatRelativeTime(a.endsAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View all auctions →
              </p>
            </Link>

            {/* Chat */}
            <Link
              href="/chat"
              className="group relative rounded-2xl border border-blue-500/25 bg-gradient-to-br from-gray-900/90 to-blue-950/30 p-5 shadow-lg transition-all hover:border-blue-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/90">
                  Messages
                </span>
                {data.unreadMessages > 0 && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {data.unreadMessages > 99 ? '99+' : data.unreadMessages}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                {data.unreadMessages > 0
                  ? `${data.unreadMessages} unread — coordinate trades without leaving the app.`
                  : 'Inbox is clear. Open chats to negotiate with other traders.'}
              </p>
              <p className="mt-4 text-xs text-blue-400 font-medium">Open →</p>
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              className="group rounded-2xl border border-gray-600/80 bg-gray-900/80 p-5 transition-all hover:border-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Settings
              </span>
              <p className="mt-3 text-sm text-white">
                Steam:{' '}
                <span className={data.steam.linked ? 'text-emerald-400' : 'text-amber-400'}>
                  {data.steam.linked ? 'Linked' : 'Not linked'}
                </span>
              </p>
              {data.steam.linked && data.steam.personaName && (
                <p className="mt-1 text-xs text-gray-500 truncate">{data.steam.personaName}</p>
              )}
              <p className="mt-4 text-xs text-blue-400 font-medium">Manage →</p>
            </Link>

            {/* Upgrade */}
            <Link
              href="/upgrade"
              className="group rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-950/20 to-gray-950 p-5 transition-all hover:border-fuchsia-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300/90">
                Membership
              </span>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                Pro unlocks auctions, higher limits, and premium tools—compare plans anytime.
              </p>
              <p className="mt-4 text-xs text-blue-400 font-medium">View plans →</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CS2 market narrative */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-b border-gray-800/80">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Why CS2 skins move like a market
        </h2>
        <p className="mt-3 text-gray-400 max-w-3xl leading-relaxed">
          Counter-Strike cosmetics trade on liquidity, rarity, float, stickers, and patch meta. Major releases
          and tournament seasons can swing demand; the Steam Community Market is only one venue—third-party
          sites and peer trades add depth. That is why we track <strong className="text-gray-300">your</strong>{' '}
          inventory as a portfolio and show an <strong className="text-gray-300">illustrative</strong> macro
          index on the CS2 market page (not a live exchange feed).
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Liquidity waves',
              body: 'Popular skins see tighter spreads; niche items can gap when few sellers list.',
              accent: 'border-cyan-500/30 bg-cyan-950/20',
            },
            {
              title: 'Event-driven hype',
              body: 'Majors, cases, and operations can reprice entire categories overnight.',
              accent: 'border-rose-500/30 bg-rose-950/20',
            },
            {
              title: 'Your timeline',
              body: 'We plot snapshots on your Steam timeline—real USD only after you sync here.',
              accent: 'border-lime-500/30 bg-lime-950/15',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`rounded-xl border p-5 ${card.accent}`}
            >
              <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio + preview chart */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl font-bold text-white">Your collection as a portfolio</h2>
        <p className="mt-2 text-gray-500 max-w-2xl">
          The same story we show on the public landing page—illustrative curve on the right; real data lives
          on your dashboard after Steam sync.
        </p>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12 items-start">
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">What you get</p>
            <ul className="space-y-4">
              {PREVIEW_OFFERS.map(({ title, description }) => (
                <li key={title} className="flex gap-3">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/90"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <PreviewValueChart className="shadow-xl shadow-black/40 ring-1 ring-gray-800/80" />
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-gray-800/80">
        <h2 className="text-xl font-bold text-white">Quick actions</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ title, description, href }) => (
            <li key={title}>
              <Link
                href={href}
                className="block h-full rounded-xl border border-gray-800 bg-gray-900/60 p-5 transition-all hover:border-blue-500/40 hover:bg-gray-900/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              >
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
                <p className="mt-4 text-sm text-blue-400 font-medium">Open →</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center sm:text-left border-t border-gray-800/80">
        <h2 className="text-xl font-semibold text-white">Ready for another sync?</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          Pull the latest prices from Steam and refresh your inventory snapshot.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Open dashboard
        </Link>
      </section>
    </div>
  )
}
