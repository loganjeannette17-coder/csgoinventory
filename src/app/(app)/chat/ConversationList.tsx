'use client'

import { createClient } from '@/lib/supabase/client'
import { usePresence } from '@/hooks/usePresence'
import { cn, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export interface ConversationSummary {
  id: string
  last_message_at: string | null
  other_user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
    steam_avatar_url: string | null
  }
  last_message: {
    content: string
    sender_id: string
    created_at: string
  } | null
  unread_count: number
}

interface Props {
  conversations: ConversationSummary[]
  currentUserId: string
}

export function ConversationList({ conversations: initial, currentUserId }: Props) {
  const params = useParams<{ conversationId?: string }>()
  const activeId = params?.conversationId

  const [conversations, setConversations] = useState(initial)
  const onlineIds = usePresence(currentUserId)

  // Map for O(1) updates when messages arrive
  const convMapRef = useRef(new Map(initial.map((c) => [c.id, c])))

  // ── Subscribe to new messages in known conversations ──────────────────────
  useEffect(() => {
    const supabase = createClient()
    const conversationIds = [...convMapRef.current.keys()]
    if (conversationIds.length === 0) return

    const channel = supabase
      .channel('inbox_messages')
      // New messages in any conversation we're part of
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
        },
        (payload) => {
          const msg = payload.new as {
            id: string
            conversation_id: string
            sender_id: string
            content: string
            created_at: string
          }

          const conv = convMapRef.current.get(msg.conversation_id)
          if (!conv) return  // not one of our conversations

          const isActive = msg.conversation_id === activeId
          const isFromOther = msg.sender_id !== currentUserId

          const updated: ConversationSummary = {
            ...conv,
            last_message_at: msg.created_at,
            last_message: {
              content:    msg.content,
              sender_id:  msg.sender_id,
              created_at: msg.created_at,
            },
            // Only increment unread if the conversation isn't currently open
            unread_count: !isActive && isFromOther ? conv.unread_count + 1 : conv.unread_count,
          }

          convMapRef.current.set(msg.conversation_id, updated)

          // Re-derive sorted array
          const sorted = [...convMapRef.current.values()].sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
            return tb - ta
          })
          setConversations(sorted)
        },
      )
      // Subscribe to new conversations (someone starts a chat with us)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'conversations',
          filter: `user_b_id=eq.${currentUserId}`,
        },
        () => {
          // Refresh the page to pick up the new conversation with full profile data.
          // A full client-side refetch would need the other user's profile which
          // isn't available in the raw DB event.
          window.location.reload()
        },
      )
      .subscribe()

    // Clear unread count when a conversation is opened
    if (activeId) {
      const conv = convMapRef.current.get(activeId)
      if (conv && conv.unread_count > 0) {
        convMapRef.current.set(activeId, { ...conv, unread_count: 0 })
        setConversations([...convMapRef.current.values()])
      }
    }

    return () => { supabase.removeChannel(channel) }
  }, [activeId, currentUserId])

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm text-center">
          No conversations yet.
          <br />
          Visit a user&apos;s profile to start chatting.
        </p>
      </div>
    )
  }

  return (
    <nav className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const user    = conv.other_user
        const avatar  = user.steam_avatar_url ?? user.avatar_url
        const name    = user.display_name ?? user.username
        const isOnline = onlineIds.has(user.id)
        const isActive = conv.id === activeId

        return (
          <Link
            key={conv.id}
            href={`/chat/${conv.id}`}
            className={cn(
              'flex items-center gap-3 px-4 py-3 transition-colors',
              'hover:bg-gray-800/60 border-b border-gray-800/50',
              isActive && 'bg-gray-800',
            )}
          >
            {/* Avatar + presence dot */}
            <div className="relative shrink-0">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                  {name[0]?.toUpperCase()}
                </div>
              )}
              {/* Online indicator */}
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-gray-900',
                  isOnline ? 'bg-green-400' : 'bg-gray-600',
                )}
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={cn('text-sm font-medium truncate', isActive ? 'text-white' : 'text-gray-200')}>
                  {name}
                </span>
                {conv.last_message_at && (
                  <span className="text-[10px] text-gray-500 shrink-0">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p className="text-xs text-gray-500 truncate">
                  {conv.last_message
                    ? (conv.last_message.sender_id === currentUserId ? 'You: ' : '') +
                      conv.last_message.content
                    : 'No messages yet'}
                </p>
                {conv.unread_count > 0 && (
                  <span className="shrink-0 h-4 min-w-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
