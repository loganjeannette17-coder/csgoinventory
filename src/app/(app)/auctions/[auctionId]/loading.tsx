import { Skeleton } from '@/components/ui/Skeleton'

export default function AuctionDetailLoading() {
  return (
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Item header */}
      <div className="flex flex-col sm:flex-row gap-6">
        <Skeleton className="w-full sm:w-64 h-48 rounded-xl shrink-0" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Auction detail grid */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Bid history */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-1 items-end flex flex-col">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Bid panel */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
