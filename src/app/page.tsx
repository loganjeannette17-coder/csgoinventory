import Link from 'next/link'
import { PreviewValueChart } from '@/components/landing/PreviewValueChart'

const PREVIEW_OFFERS = [
  {
    title: 'Live market pricing',
    description:
      'See total inventory value in USD with updates as market prices move—like a stock portfolio for your skins.',
  },
  {
    title: 'Value history',
    description:
      'Spot trends over days and weeks so you know when your collection is up or down before you list or trade.',
  },
  {
    title: 'Steam inventory sync',
    description:
      'Connect Steam once; we pull CS2 items and keep counts and prices aligned with your inventory.',
  },
  {
    title: 'Marketplace & profile',
    description:
      'List items at fixed prices, browse public inventories, and share a trader profile with the community.',
  },
  {
    title: 'Messages',
    description: 'DM other users to negotiate and coordinate trades without leaving the app.',
  },
  {
    title: 'Auctions (Pro)',
    description:
      'Timed auctions, bids, and buy-now—when you upgrade to Pro for more advanced selling.',
  },
] as const

const FEATURES = [
  {
    title: 'Steam inventory sync',
    description:
      'Connect your Steam account and pull your CS2 items with market prices so your collection stays current.',
  },
  {
    title: 'List & browse',
    description:
      'Showcase inventory publicly or privately, discover other traders, and list skins at fixed prices.',
  },
  {
    title: 'Messages',
    description: 'Chat with other users to coordinate trades without leaving the app.',
  },
  {
    title: 'Auctions (Pro)',
    description: 'Run timed auctions, place bids, and use buy-now when you upgrade to Pro.',
  },
] as const

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="font-bold tracking-tight text-lg">CS2 Inventory</span>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="text-blue-400 text-sm font-medium tracking-wide uppercase mb-4">
            Counter-Strike 2
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl">
            Track, trade, and auction your skins
          </h1>
          <p className="mt-5 text-lg text-gray-400 max-w-2xl leading-relaxed">
            Sync your inventory from Steam, see real-time value, list items for sale, and—on
            Pro—run auctions and bids in one place.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-gray-700 hover:border-gray-600 hover:bg-gray-900 text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              I already have an account
            </Link>
          </div>
        </section>

        {/* Portfolio-style preview + what the app offers (no account required to view) */}
        <section className="border-t border-gray-800 bg-gradient-to-b from-gray-900/30 to-gray-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center sm:text-left mb-10 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Preview: your collection as a portfolio
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mt-3 leading-relaxed">
                See how CS2 Inventory tracks your market value over time—then explore listings, chat, and
                (Pro) auctions after you sign up and connect Steam.
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-start">
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  What you get
                </p>
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
                <p className="text-xs text-gray-600 pt-2 border-t border-gray-800/80">
                  This page is a preview — create an account to connect Steam and load your real inventory.
                </p>
              </div>

              <PreviewValueChart className="shadow-lg shadow-black/30" />
            </div>
          </div>
        </section>

        <section className="border-t border-gray-800 bg-gray-900/40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-2xl font-bold text-white text-center sm:text-left">
              What you can do
            </h2>
            <p className="text-gray-500 text-sm mt-2 text-center sm:text-left max-w-xl">
              Basic covers sync, listings, and messaging. Pro adds full auction workflows.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2">
              {FEATURES.map(({ title, description }) => (
                <li
                  key={title}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20"
                >
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-gray-400 leading-relaxed">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Preview strip ─────────────────────────────────────────── */}
        <section className="border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center sm:text-left mb-10">
              <h2 className="text-2xl font-bold text-white">A look inside the app</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-xl">
                Static mockups of dashboard-style screens after you connect Steam — not real data.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Inventory value card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 select-none pointer-events-none">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Dashboard · inventory value
                </p>
                <p className="text-3xl font-bold text-white">$12,847.23</p>
                <p className="text-sm text-gray-500 mt-1">47 items synced · updated just now</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Knives', value: '$5,240' },
                    { label: 'Rifles', value: '$4,100' },
                    { label: 'Pistols', value: '$3,507' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-800 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm font-semibold text-green-400 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marketplace / listings card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 select-none pointer-events-none">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Marketplace</p>
                <ul className="space-y-2">
                  {[
                    { name: 'AK-47 | Redline (FT)', price: '$18.50', badge: 'Listed' },
                    { name: 'AWP | Asiimov (BS)', price: '$42.00', badge: 'Listed' },
                    { name: 'Karambit | Fade (FN)', price: '$980.00', badge: 'Listed' },
                  ].map(({ name, price, badge }) => (
                    <li key={name} className="flex items-center justify-between gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{name}</p>
                        <span className="text-xs text-blue-400">{badge}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-400 shrink-0">{price}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Messages card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 select-none pointer-events-none">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Messages</p>
                <ul className="space-y-2">
                  {[
                    { from: 'trader99', msg: 'Hey, is the Karambit still available?', time: '2m ago' },
                    { from: 'sk1nfan', msg: 'Would you do $900 for the fade?', time: '18m ago' },
                    { from: 'cs2dealer', msg: 'Deal! I can trade tomorrow morning.', time: '1h ago' },
                  ].map(({ from, msg, time }) => (
                    <li key={from} className="flex items-start gap-3 bg-gray-800 rounded-lg px-3 py-2.5">
                      <div className="h-7 w-7 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {from[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400 truncate"><span className="text-white font-medium">@{from}</span> · {time}</p>
                        <p className="text-sm text-gray-300 truncate">{msg}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Auctions card (Pro) */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 select-none pointer-events-none relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Pro
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Live auctions</p>
                <ul className="space-y-2">
                  {[
                    { name: 'M9 Bayonet | Tiger Tooth (FN)', current: '$640', bids: 7, ends: '4h 22m' },
                    { name: 'Glock-18 | Fade (FN)', current: '$185', bids: 3, ends: '11h 05m' },
                  ].map(({ name, current, bids, ends }) => (
                    <li key={name} className="bg-gray-800 rounded-lg px-3 py-3">
                      <p className="text-sm text-white font-medium truncate">{name}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                        <span>Current bid <span className="text-green-400 font-semibold">{current}</span></span>
                        <span>{bids} bids</span>
                        <span className="ml-auto text-orange-400 font-medium">⏱ {ends}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-600 mt-3 text-center">Upgrade to Pro to create &amp; bid on auctions</p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="text-xl font-semibold text-white">Ready to connect Steam?</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
            Sign up, choose a plan when prompted, link Steam in settings, and sync your inventory.
          </p>
          <Link
            href="/register"
            className="inline-flex mt-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Get started
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} CS2 Inventory</span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-gray-300 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="hover:text-gray-300 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
