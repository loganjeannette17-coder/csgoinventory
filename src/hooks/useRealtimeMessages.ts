'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  status: 'sent' | 'delivered' | 'read'
  read_at: string | null
  created_at: string
}

interface UseRealtimeMessagesOptions {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
}

interface UseRealtimeMessagesResult {
  messages: Message[]
  sendMessage: (content: string) => Promise<void>
  sending: boolean
  error: string | null
}

export function useRealtimeMessages({
  conversationId,
  currentUserId,
  initialMessages,
}: UseRealtimeMessagesOptions): UseRealtimeMessagesResult {
  // Use a Map for O(1) deduplication — critical because our own INSERT will
  // fire both the optimistic update AND the realtime event.
  const msgMapRef = useRef<Map<string, Message>>(
    new Map(initialMessages.map((m) => [m.id, m])),
  )
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Stable setter that reads from the map and re-derives the array
  const commitMessages = useCallback(() => {
    const sorted = [...msgMapRef.current.values()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    setMessages(sorted)
  }, [])

  function upsertMessage(msg: Message) {
    msgMapRef.current.set(msg.id, msg)
    commitMessages()
  }

  // ── Mark unread messages as read on mount ─────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .neq('status', 'read')
      .then(({ error }) => {
        if (error) console.warn('[chat] Failed to mark messages as read:', error.message)
      })

    // Also update local state optimistically so the UI reflects read status
    msgMapRef.current.forEach((msg, id) => {
      if (msg.sender_id !== currentUserId && msg.status !== 'read') {
        msgMapRef.current.set(id, {
          ...msg,
          status: 'read',
          read_at: new Date().toISOString(),
        })
      }
    })
    commitMessages()
  }, [conversationId, currentUserId, commitMessages])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Deduplicate: our own optimistic insert will already be in the map
          if (!msgMapRef.current.has(newMsg.id)) {
            upsertMessage(newMsg)
          }
          // If the new message is from the other user, mark it read immediately
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from('messages')
              .update({ status: 'read', read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(() => {
                upsertMessage({ ...newMsg, status: 'read', read_at: new Date().toISOString() })
              })
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Picks up status changes (delivered → read) from the other user
          upsertMessage(payload.new as Message)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId])

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || sending) return

      setSending(true)
      setError(null)

      // Optimistic message — uses a temporary ID that will be replaced
      // when the realtime event arrives with the real DB-generated UUID
      const tempId    = `optimistic-${Date.now()}`
      const optimistic: Message = {
        id:              tempId,
        conversation_id: conversationId,
        sender_id:       currentUserId,
        content:         trimmed,
        status:          'sent',
        read_at:         null,
        created_at:      new Date().toISOString(),
      }
      upsertMessage(optimistic)

      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id:       currentUserId,
          content:         trimmed,
        })
        .select('id, conversation_id, sender_id, content, status, read_at, created_at')
        .single()

      if (insertError) {
        // Roll back the optimistic update
        msgMapRef.current.delete(tempId)
        commitMessages()
        setError('Failed to send message. Please try again.')
      } else if (data) {
        // Replace the temp message with the real one (same content, real ID)
        msgMapRef.current.delete(tempId)
        upsertMessage(data as Message)
      }

      setSending(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, currentUserId, sending],
  )

  return { messages, sendMessage, sending, error }
}
