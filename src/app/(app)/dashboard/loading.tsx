import { ItemCardSkeleton, ValueSummarySkeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-md bg-gray-800" />
          <div className="h-4 w-56 animate-pulse rounded-md bg-gray-800" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-gray-800" />
      </div>

      {/* Value summary */}
      <ValueSummarySkeleton />

      {/* Inventory grid */}
      <div>
        <div className="h-5 w-32 animate-pulse rounded-md bg-gray-800 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
