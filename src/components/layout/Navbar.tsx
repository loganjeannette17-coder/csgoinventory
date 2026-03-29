'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavbarProps {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  unreadCount: number
}

const NAV_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cs2-market', label: 'CS2 market' },
  { href: '/auctions', label: 'Marketplace' },
  { href: '/browse', label: 'Browse' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export function Navbar({ username, displayName, avatarUrl, unreadCount }: NavbarProps) {
  const pathname  = usePathname() ?? ''
  const router    = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const name = displayName ?? username ?? 'Account'

  return (
    <header className="h-14 shrink-0 bg-gray-950 border-b border-gray-800 flex items-center px-4 sm:px-6 gap-4 z-30 relative">
      {/* Logo */}
      <Link href="/home" className="text-white font-bold text-base tracking-tight mr-2 shrink-0">
        CS2 Inventory
      </Link>

      {/* Primary nav */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith(link.href)
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Chat icon with unread badge */}
      <Link
        href="/chat"
        className={cn(
          'relative p-2 rounded-md transition-colors',
          pathname.startsWith('/chat')
            ? 'text-white bg-gray-800'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/50',
        )}
        aria-label="Messages"
      >
        <ChatIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
              {name[0]?.toUpperCase() ?? '?'}
            </span>
          )}
          <span className="hidden sm:block max-w-[120px] truncate">{name}</span>
          <ChevronIcon />
        </button>

        {menuOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
              {username && (
                <Link
                  href={`/profile/${username}`}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  View profile
                </Link>
              )}
              <Link
                href="/profile/edit"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Edit profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Settings
              </Link>
              <div className="border-t border-gray-800 my-1" />
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
      <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current opacity-60">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}
