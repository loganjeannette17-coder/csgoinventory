/** Shared copy for the public landing page and authenticated app home. */

export const PREVIEW_OFFERS = [
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

export const FEATURES = [
  {
    title: 'Steam inventory sync',
    description:
      'Connect your Steam account and pull your CS2 items with market prices so your collection stays current.',
    href: '/dashboard' as const,
  },
  {
    title: 'List & browse',
    description:
      'Showcase inventory publicly or privately, discover other traders, and list skins at fixed prices.',
    href: '/browse' as const,
  },
  {
    title: 'Messages',
    description: 'Chat with other users to coordinate trades without leaving the app.',
    href: '/chat' as const,
  },
  {
    title: 'Auctions (Pro)',
    description: 'Run timed auctions, place bids, and use buy-now when you upgrade to Pro.',
    href: '/auctions' as const,
  },
] as const

/** Clickable “snippet” destinations for the authenticated home hub. */
export const APP_HOME_DESTINATIONS = [
  {
    href: '/dashboard' as const,
    badge: 'Inventory',
    title: 'Dashboard',
    description:
      'Sync from Steam, view your items, and see total value with personal and market-style charts.',
  },
  {
    href: '/cs2-market' as const,
    badge: 'Market',
    title: 'CS2 market overview',
    description: 'Estimated long-run CS2 market size trend—same chart style as on your dashboard.',
  },
  {
    href: '/browse' as const,
    badge: 'Community',
    title: 'Browse traders',
    description: 'Discover public inventories and profiles from other users on the platform.',
  },
  {
    href: '/leaderboard' as const,
    badge: 'Rankings',
    title: 'Leaderboard',
    description: 'See top public inventories by total value and how you compare.',
  },
  {
    href: '/auctions' as const,
    badge: 'Pro',
    title: 'Marketplace & auctions',
    description: 'Listings and timed auctions—Pro plan required for full auction workflows.',
  },
  {
    href: '/chat' as const,
    badge: 'Social',
    title: 'Messages',
    description: 'Direct messages with other traders to negotiate and coordinate deals.',
  },
  {
    href: '/settings' as const,
    badge: 'Account',
    title: 'Settings',
    description: 'Link Steam, manage privacy, and configure your account preferences.',
  },
  {
    href: '/upgrade' as const,
    badge: 'Plans',
    title: 'Upgrade',
    description: 'View Basic and Pro membership options, billing, and plan features.',
  },
] as const
