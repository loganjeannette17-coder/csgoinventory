import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ChatWindow } from './ChatWindow'

interface Props {
  params: Promise<{ conversationId: string }>
}

const INITIAL_MESSAGE_LIMIT = 50

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ── Verify the caller is a participant ────────────────────────────────────
  // RLS enforces this too, but an explicit check gives us the other user's ID.
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, user_a_id, user_b_id')
    .eq('id', conversationId)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .single()

  if (!conversation) notFound()

  const otherUserId =
    conversation.user_a_id === user.id
      ? conversation.user_b_id
      : conversation.user_a_id

  // ── Load the other user's profile ─────────────────────────────────────────
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, steam_accounts(avatar_url)')
    .eq('id', otherUserId)
    .single()

  if (!otherProfile) notFound()

  const steam = Array.isArray(otherProfile.steam_accounts)
    ? otherProfile.steam_accounts[0]
    : otherProfile.steam_accounts

  // ── Load initial messages (most recent N, reversed for display) ───────────
  const { data: rawMessages } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, status, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(INITIAL_MESSAGE_LIMIT)

  // Reverse so oldest-first for rendering
  const initialMessages = (rawMessages ?? []).reverse()

  return (
    <ChatWindow
      conversationId={conversationId}
      currentUserId={user.id}
      otherUser={{
        id:               otherProfile.id,
        username:         otherProfile.username,
        display_name:     otherProfile.display_name,
        avatar_url:       otherProfile.avatar_url,
        steam_avatar_url: steam?.avatar_url ?? null,
      }}
      initialMessages={initialMessages}
    />
  )
}
