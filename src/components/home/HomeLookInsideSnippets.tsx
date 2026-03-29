import Link from 'next/link'

/**
 * Same static mock content as the public landing “A look inside” section,
 * but each card navigates to the matching area of the app.
 */
export function HomeLookInsideSnippets() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Link
        href="/dashboard"
        className="group bg-gray-900 border border-gray-800 rounded-xl p-5 transition-colors hover:border-blue-500/50 hover:bg-gray-900/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
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
        <p className="text-xs text-blue-400 mt-4 font-medium group-hover:underline">Open dashboard →</p>
      </Link>

      <Link
        href="/browse"
        className="group bg-gray-900 border border-gray-800 rounded-xl p-5 transition-colors hover:border-blue-500/50 hover:bg-gray-900/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Marketplace</p>
        <ul className="space-y-2">
          {[
            { name: 'AK-47 | Redline (FT)', price: '$18.50', badge: 'Listed' },
            { name: 'AWP | Asiimov (BS)', price: '$42.00', badge: 'Listed' },
            { name: 'Karambit | Fade (FN)', price: '$980.00', badge: 'Listed' },
          ].map(({ name, price, badge }) => (
            <li
              key={name}
              className="flex items-center justify-between gap-3 bg-gray-800 rounded-lg px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{name}</p>
                <span className="text-xs text-blue-400">{badge}</span>
              </div>
              <span className="text-sm font-semibold text-green-400 shrink-0">{price}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-blue-400 mt-4 font-medium group-hover:underline">Browse listings →</p>
      </Link>

      <Link
        href="/chat"
        className="group bg-gray-900 border border-gray-800 rounded-xl p-5 transition-colors hover:border-blue-500/50 hover:bg-gray-900/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
      >
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
                <p className="text-xs text-gray-400 truncate">
                  <span className="text-white font-medium">@{from}</span> · {time}
                </p>
                <p className="text-sm text-gray-300 truncate">{msg}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-blue-400 mt-4 font-medium group-hover:underline">Open messages →</p>
      </Link>

      <Link
        href="/auctions"
        className="group bg-gray-900 border border-gray-800 rounded-xl p-5 transition-colors hover:border-blue-500/50 hover:bg-gray-900/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 relative overflow-hidden"
      >
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
                <span>
                  Current bid <span className="text-green-400 font-semibold">{current}</span>
                </span>
                <span>{bids} bids</span>
                <span className="ml-auto text-orange-400 font-medium">⏱ {ends}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-600 mt-3 text-center">Upgrade to Pro to create &amp; bid on auctions</p>
        <p className="text-xs text-blue-400 mt-2 font-medium text-center group-hover:underline">
          Go to marketplace →
        </p>
      </Link>
    </div>
  )
}
