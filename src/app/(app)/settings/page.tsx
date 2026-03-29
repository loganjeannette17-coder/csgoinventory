import { createClient } from '@/lib/supabase/server'
import SteamSettings from './SteamSettings'
import MembershipSettings from './MembershipSettings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: steamAccount } = await supabase
    .from('steam_accounts')
    .select('steam_id, persona_name, avatar_url, last_synced_at, is_public')
    .eq('user_id', user!.id)
    .maybeSingle()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at, stripe_subscription_id, grace_period_ends_at')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <MembershipSettings initialSubscription={subscription} />
      <SteamSettings initialAccount={steamAccount} />
    </div>
  )
}
