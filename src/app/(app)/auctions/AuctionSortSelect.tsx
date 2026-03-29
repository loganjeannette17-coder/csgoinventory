'use client'

export function AuctionSortSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="sort"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.submit()}
      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none cursor-pointer"
    >
      <option value="ending_soon">Ending soon</option>
      <option value="highest_bid">Highest bid</option>
      <option value="most_bids">Most bids</option>
      <option value="newest">Newest first</option>
    </select>
  )
}
