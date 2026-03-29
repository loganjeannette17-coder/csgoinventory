import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PreviewValueChart } from '@/components/landing/PreviewValueChart'
import { HomeLookInsideSnippets } from '@/components/home/HomeLookInsideSnippets'
import {
  APP_HOME_DESTINATIONS,
  FEATURES,
  PREVIEW_OFFERS,
} from '@/lib/marketing-copy'

export default async function AppHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user!.id)
    .single()

  const displayName = profile?.display_name ?? profile?.username ?? 'there'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-0 pb-20">
      <section className="pb-8 sm:pb-12">
        <p className="text-blue-400 text-sm font-medium tracking-wide uppercase mb-3">Welcome back</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-3xl">
          Hi, {displayName}
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-2xl leading-relaxed">
          Your CS2 Inventory hub—same ideas as the public preview, with live links to every part of the
          app. Pick a card below to jump in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Go to dashboard
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center border border-gray-700 hover:border-gray-600 hover:bg-gray-900 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Settings
          </Link>
        </div>
      </section>

      <section className="border-t border-gray-800 pt-12 sm:pt-16">
        <div className="text-center sm:text-left mb-10 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Your collection as a portfolio
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mt-3 leading-relaxed">
            How we think about value and trends—illustrative chart on the right; your real numbers live
            on the dashboard after Steam sync.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-start">
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

          <PreviewValueChart className="shadow-lg shadow-black/30" />
        </div>
      </section>

      <section className="border-t border-gray-800 pt-12 sm:pt-16 mt-12 sm:mt-16">
        <h2 className="text-2xl font-bold text-white text-center sm:text-left">What you can do</h2>
        <p className="text-gray-500 text-sm mt-2 text-center sm:text-left max-w-xl">
          Basic covers sync, listings, and messaging. Pro adds full auction workflows. Click a card to
          open that area.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ title, description, href }) => (
            <li key={title}>
              <Link
                href={href}
                className="block h-full bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/20 transition-colors hover:border-blue-500/40 hover:bg-gray-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              >
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{description}</p>
                <p className="mt-4 text-sm text-blue-400 font-medium">Open →</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-gray-800 pt-12 sm:pt-16 mt-12 sm:mt-16">
        <h2 className="text-2xl font-bold text-white text-center sm:text-left">Explore the app</h2>
        <p className="text-gray-500 text-sm mt-2 text-center sm:text-left max-w-xl">
          Shortcuts to every main screen—snippets are illustrative; real data is on each destination.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APP_HOME_DESTINATIONS.map(({ href, badge, title, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col h-full rounded-xl border border-gray-800 bg-gray-900/80 p-5 transition-colors hover:border-blue-500/40 hover:bg-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400/90">
                  {badge}
                </span>
                <span className="mt-2 text-base font-semibold text-white">{title}</span>
                <span className="mt-2 text-sm text-gray-500 leading-relaxed flex-1">{description}</span>
                <span className="mt-4 text-sm text-blue-400 font-medium">Go to page →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-gray-800 pt-12 sm:pt-16 mt-12 sm:mt-16">
        <div className="text-center sm:text-left mb-10">
          <h2 className="text-2xl font-bold text-white">A look inside</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-xl">
            Static mockups—same style as the public landing page. Click any card to go to the real
            screen.
          </p>
        </div>

        <HomeLookInsideSnippets />
      </section>

      <section className="border-t border-gray-800 pt-12 sm:pt-16 mt-12 sm:mt-16 text-center sm:text-left">
        <h2 className="text-xl font-semibold text-white">Ready to sync?</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          Open your inventory dashboard to pull the latest items and prices from Steam.
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
