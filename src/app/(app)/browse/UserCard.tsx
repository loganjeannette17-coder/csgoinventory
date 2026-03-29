import { formatUsd } from '@/lib/utils'
import Link from 'next/link'

export interface PublicUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  steam_persona_name: string | null
  steam_avatar_url: string | null
  total_value_usd: number
  item_count: number
}

export function UserCard({ user }: { user: PublicUser }) {
  const avatar = user.steam_avatar_url ?? user.avatar_url
  const displayName = user.display_name ?? user.steam_persona_name ?? user.username

  return (
    <Link
      href={`/profile/${user.username}`}
      className="group flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={displayName}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-xl font-bold">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate group-hover:text-blue-300 transition-colors">
          {displayName}
        </p>
        <p className="text-gray-500 text-xs truncate">@{user.username}</p>
        <div className="flex items-center gap-2 mt-1.5 text-xs">
          <span className="text-green-400 font-semibold">
            {formatUsd(user.total_value_usd)}
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">
            {user.item_count.toLocaleString()} items
          </span>
        </div>
      </div>

      <ChevronIcon />
    </Link>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-gray-600 shrink-0" fill="currentColor">
      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  )
}
