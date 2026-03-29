'use client'

import { useEffect, useState } from 'react'

interface Countdown {
  totalMs:   number
  days:      number
  hours:     number
  minutes:   number
  seconds:   number
  label:     string          // human-readable, e.g. "2d 4h" or "12m 30s"
  isExpired: boolean
  urgency:   'normal' | 'soon' | 'critical'  // for colour coding
}

export function useCountdown(endsAt: string): Countdown {
  const compute = (): Countdown => {
    const ms      = Math.max(0, new Date(endsAt).getTime() - Date.now())
    const totalS  = Math.floor(ms / 1000)
    const days    = Math.floor(totalS / 86400)
    const hours   = Math.floor((totalS % 86400) / 3600)
    const minutes = Math.floor((totalS % 3600) / 60)
    const seconds = totalS % 60

    let label: string
    if      (ms === 0)   label = 'Ended'
    else if (days > 0)   label = `${days}d ${hours}h`
    else if (hours > 0)  label = `${hours}h ${minutes}m`
    else if (minutes > 0)label = `${minutes}m ${seconds}s`
    else                 label = `${seconds}s`

    const urgency: Countdown['urgency'] =
      ms === 0         ? 'critical'
      : ms < 300_000   ? 'critical'   // < 5 min
      : ms < 3_600_000 ? 'soon'       // < 1 hour
      : 'normal'

    return { totalMs: ms, days, hours, minutes, seconds, label, isExpired: ms === 0, urgency }
  }

  const [state, setState] = useState(compute)

  useEffect(() => {
    if (state.isExpired) return

    const id = setInterval(() => {
      const next = compute()
      setState(next)
      if (next.isExpired) clearInterval(id)
    }, 1000)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, state.isExpired])

  return state
}
