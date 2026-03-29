'use client'

import { useRealtimeMessages, type Message } from '@/hooks/useRealtimeMessages'
import { useIsOnline } from '@/hooks/usePresence'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface OtherUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  steam_avatar_url: string | null
}

interface Props {
  conversationId: string
  currentUserId: string
  otherUser: OtherUser
  initialMessages: Message[]
}

// ── Message grouping ──────────────────────────────────────────────────────────
// Consecutive messages from the same sender within 5 minutes form a group.
// Only the last message in a group shows its timestamp.
// Only the first message in a group from the *other* user shows their avatar.

const GROUP_WINDOW_MS = 5 * 60 * 1000

interface MessageGroup {
  senderId: string
  messages: Message[]
  isOwn: boolean
}

function groupMessages(messages: Message[], currentUserId: string): MessageGroup[] {
  const groups: MessageGroup[] = []

  for (const msg of messages) {
    const last = groups[groups.length - 1]
    const timeDiff = last
      ? new Date(msg.created_at).getTime() -
        new Date(last.messages[last.messages.length - 1].created_at).getTime()
      : Infinity

    if (last && last.senderId === msg.sender_id && timeDiff < GROUP_WINDOW_MS) {
      last.messages.push(msg)
    } else {
      groups.push({
        senderId: msg.sender_id,
        messages: [msg],
        isOwn:    msg.sender_id === currentUserId,
      })
    }
  }

  return groups
}

// ── Date separator ────────────────────────────────────────────────────────────

function formatDay(dateStr: string): string {
  const date  = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString())     return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toDateString()
}

// ── Read receipt icon ─────────────────────────────────────────────────────────

function ReadReceipt({ status }: { status: Message['status'] }) {
  if (status === 'read') {
    return <span className="text-blue-400" title="Read">✓✓</span>
  }
  if (status === 'delivered') {
    return <span className="text-gray-500" title="Delivered">✓✓</span>
  }
  return <span className="text-gray-600" title="Sent">✓</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatWindow({ conversationId, currentUserId, otherUser, initialMessages }: Props) {
  const { messages, sendMessage, sending, error } = useRealtimeMessages({
    conversationId,
    currentUserId,
    initialMessages,
  })

  const isOtherOnline = useIsOnline(otherUser.id, currentUserId)
  const otherName     = otherUser.display_name ?? otherUser.username
  const otherAvatar   = otherUser.steam_avatar_url ?? otherUser.avatar_url

  const [draft, setDraft]           = useState('')
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const listRef                     = useRef<HTMLDivElement>(null)
  const isNearBottomRef             = useRef(true)

  // Auto-scroll: only scroll if the user is near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceFromBottom < 120
  }

  async function handleSend() {
    if (!draft.trim() || sending) return
    const content = draft
    setDraft('')
    await sendMessage(content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const groups    = groupMessages(messages, currentUserId)
  let lastDayKey  = ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 bg-gray-950 shrink-0">
        <div className="relative">
          {otherAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherAvatar} alt={otherName} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
              {otherName[0]?.toUpperCase()}
            </div>
          )}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-gray-950',
              isOtherOnline ? 'bg-green-400' : 'bg-gray-600',
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{otherName}</p>
          <p className={cn('text-xs', isOtherOnline ? 'text-green-400' : 'text-gray-500')}>
            {isOtherOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </header>

      {/* ── Message list ────────────────────────────────────────────────── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      >
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm pt-10">
            No messages yet. Say hello!
          </p>
        )}

        {groups.map((group, gi) => {
          const firstMsg     = group.messages[0]
          const dayKey       = getDayKey(firstMsg.created_at)
          const showDaySep   = dayKey !== lastDayKey
          lastDayKey         = dayKey

          return (
            <div key={`group-${gi}`}>
              {/* Day separator */}
              {showDaySep && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatDay(firstMsg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
              )}

              {/* Message group */}
              <div className={cn('flex gap-2 items-end', group.isOwn && 'flex-row-reverse')}>
                {/* Avatar — shown once per group, from the other user only */}
                {!group.isOwn ? (
                  <div className="shrink-0 mb-1">
                    {otherAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={otherAvatar} alt={otherName} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold">
                        {otherName[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  // Spacer so own messages align correctly
                  <div className="w-7 shrink-0" />
                )}

                {/* Bubbles */}
                <div className={cn('flex flex-col gap-0.5 max-w-[70%]', group.isOwn && 'items-end')}>
                  {group.messages.map((msg, mi) => {
                    const isLast   = mi === group.messages.length - 1
                    const isOptimistic = msg.id.startsWith('optimistic-')

                    return (
                      <div key={msg.id} className="group/msg">
                        <div
                          className={cn(
                            'px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
                            group.isOwn
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-gray-800 text-gray-100 rounded-bl-sm',
                            // Round the corners of middle bubbles in a group
                            mi > 0 && group.isOwn  && 'rounded-tr-sm',
                            mi > 0 && !group.isOwn && 'rounded-tl-sm',
                            isOptimistic && 'opacity-70',
                          )}
                        >
                          {msg.content}
                        </div>

                        {/* Timestamp + read receipt on last message of group */}
                        {isLast && (
                          <div
                            className={cn(
                              'flex items-center gap-1 mt-0.5 px-1',
                              group.isOwn ? 'justify-end' : 'justify-start',
                            )}
                          >
                            <span className="text-[10px] text-gray-600">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour:   '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {group.isOwn && (
                              <span className="text-[10px]">
                                <ReadReceipt status={msg.status} />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-800 px-4 py-3 bg-gray-950">
        {error && (
          <p className="text-red-400 text-xs mb-2 text-center">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            disabled={sending}
            className={cn(
              'flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2',
              'text-white text-sm placeholder:text-gray-500 outline-none resize-none',
              'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors',
              'max-h-32 overflow-y-auto disabled:opacity-60',
            )}
            style={{
              // Auto-grow textarea
              height: 'auto',
              minHeight: '2.5rem',
            }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className={cn(
              'shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
              draft.trim() && !sending
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed',
            )}
            title="Send (Enter)"
          >
            {sending ? <Spinner /> : <SendIcon />}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1 text-right">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
