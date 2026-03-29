'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'

const PRESENCE_CHANNEL = 'cs2_online_users'

// Tracks the current user as online and returns the set of all online user IDs.
//
// Uses Supabase Realtime Presence — a CRDT-based pub/sub primitive.
// Each browser tab calls channel.track() to assert "I am online."
// Supabase replicates this state to all subscribers on the same channel.
// When a tab disconnects, its presence entry is automatically removed.
export function usePresence(currentUserId: string): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  // Keep a stable ref to the channel so we only create one per mount
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!currentUserId) return

    const supabase = createClient()

    // Setting config.presence.key = userId means the presenceState() object
    // will be keyed by userId, making it trivial to look up who is online.
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: currentUserId } },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineIds(new Set(Object.keys(state)))
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineIds((prev) => new Set([...prev, key]))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineIds((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // track() broadcasts our presence to other subscribers
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      // untrack() tells other clients we went offline immediately,
      // rather than waiting for the heartbeat timeout (~30s)
      channel.untrack().then(() => supabase.removeChannel(channel))
    }
  }, [currentUserId])

  return onlineIds
}

// Convenience: check if a single user is online
export function useIsOnline(targetUserId: string, currentUserId: string): boolean {
  const online = usePresence(currentUserId)
  return online.has(targetUserId)
}
