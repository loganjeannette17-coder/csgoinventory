import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load profile + user's conversation IDs in parallel
  const [{ data: profile }, { data: convRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single(),

    supabase
      .from('conversations')
      .select('id')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
  ])

  // Count unread messages across those conversations
  const convIds = (convRows ?? []).map((c) => c.id)
  const { count: unreadCount } = convIds.length
    ? await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .neq('status', 'read')
    : { count: 0 }

  // Steam avatar as fallback
  let avatarUrl = profile?.avatar_url ?? null
  if (!avatarUrl) {
    const { data: steam } = await supabase
      .from('steam_accounts')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single()
    avatarUrl = steam?.avatar_url ?? null
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? null}
        avatarUrl={avatarUrl}
        unreadCount={unreadCount ?? 0}
      />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
