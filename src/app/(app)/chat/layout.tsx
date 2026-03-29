import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { redirect } from 'next/navigation'
import { ConversationList, type ConversationSummary } from './ConversationList'

type LastMessageRow = Pick<
  Database['public']['Tables']['messages']['Row'],
  'id' | 'conversation_id' | 'sender_id' | 'content' | 'created_at'
>
type UnreadCountRow = Pick<Database['public']['Tables']['messages']['Row'], 'conversation_id'>

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Fetch conversations ───────────────────────────────────────────────────
  const { data: rawConversations } = await supabase
    .from('conversations')
    .select('id, last_message_at, user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const conversations = rawConversations ?? []

  // ── Batch-fetch other users' profiles ────────────────────────────────────
  const otherUserIds = conversations.map((c) =>
    c.user_a_id === user.id ? c.user_b_id : c.user_a_id,
  )

  const { data: profiles } = otherUserIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, steam_accounts(avatar_url)')
        .in('id', otherUserIds)
    : { data: [] }

  const profileMap = new Map(
    (profiles ?? []).map((p) => {
      const steam = Array.isArray(p.steam_accounts) ? p.steam_accounts[0] : p.steam_accounts
      return [
        p.id,
        {
          id:               p.id,
          username:         p.username,
          display_name:     p.display_name,
          avatar_url:       p.avatar_url,
          steam_avatar_url: steam?.avatar_url ?? null,
        },
      ]
    }),
  )

  // ── Batch-fetch last message + unread count per conversation ──────────────
  const convIds = conversations.map((c) => c.id)

  const [{ data: lastMessages }, { data: unreadCounts }] = await Promise.all([
    // Latest message per conversation: fetch all, dedupe in JS
    convIds.length
      ? supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
      : { data: [] as LastMessageRow[] },

    // Unread messages addressed to the current user
    convIds.length
      ? supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .neq('sender_id', user.id)
          .neq('status', 'read')
      : { data: [] as UnreadCountRow[] },
  ])

  // Keep only the latest message per conversation
  const lastMessageMap = new Map<string, LastMessageRow>()
  for (const msg of lastMessages ?? []) {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg)
    }
  }

  // Count unread per conversation
  const unreadMap = new Map<string, number>()
  for (const row of unreadCounts ?? []) {
    unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1)
  }

  // ── Assemble the final shape ──────────────────────────────────────────────
  const summaries: ConversationSummary[] = conversations.flatMap((c) => {
    const otherId = c.user_a_id === user.id ? c.user_b_id : c.user_a_id
    const profile = profileMap.get(otherId)
    if (!profile) return [] // profile deleted — skip

    const last = lastMessageMap.get(c.id)

    return [{
      id:              c.id,
      last_message_at: c.last_message_at,
      other_user:      profile,
      last_message:    last
        ? { content: last.content, sender_id: last.sender_id, created_at: last.created_at }
        : null,
      unread_count: unreadMap.get(c.id) ?? 0,
    }]
  })

  return (
    // Chat shell fills the remaining viewport below the 56px navbar
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-gray-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 flex flex-col border-r border-gray-800 bg-gray-950">
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Messages</h2>
        </div>

        <ConversationList conversations={summaries} currentUserId={user.id} />
      </aside>

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
