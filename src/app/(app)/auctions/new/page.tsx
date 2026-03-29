import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateAuctionForm from './CreateAuctionForm'

export default async function NewAuctionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch items eligible for listing:
  // owned by the user, marketable, not already listed or in auction
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name, icon_url, rarity, wear, market_price_usd')
    .eq('user_id', user.id)
    .eq('is_marketable', true)
    .eq('is_listed', false)
    .eq('is_in_auction', false)
    .order('market_price_usd', { ascending: false, nullsFirst: false })

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Start an Auction</h1>
      </div>
      <CreateAuctionForm eligibleItems={items ?? []} />
    </div>
  )
}
