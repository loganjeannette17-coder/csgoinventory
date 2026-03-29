import { UserCardSkeleton } from '@/components/ui/Skeleton'

export default function BrowseLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-44 animate-pulse rounded-md bg-gray-800" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-gray-800" />
      </div>

      {/* User grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <UserCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
