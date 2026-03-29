import { ItemCard, type ItemCardData } from '@/components/inventory/ItemCard'
import { formatUsd } from '@/lib/utils'

interface Listing {
  id: string
  price_usd: number
  description: string | null
  created_at: string
  inventory_items: ItemCardData
}

interface Props {
  listings: Listing[]
  isOwner: boolean
}

export function ProfileListings({ listings, isOwner }: Props) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 space-y-1">
        <p className="text-gray-400 font-medium">No items for sale</p>
        {isOwner && (
          <p className="text-sm">
            Go to your inventory to list items for sale.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <div key={listing.id} className="space-y-2">
          <ItemCard item={listing.inventory_items} compact />
          <div className="px-1">
            <p className="text-green-400 font-semibold text-sm">
              {formatUsd(listing.price_usd)}
            </p>
            {listing.description && (
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                {listing.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
