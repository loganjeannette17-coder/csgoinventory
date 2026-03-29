import Link from 'next/link'

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
