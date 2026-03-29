'use client'

import { formatAbsoluteDate, formatRelativeTime } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface Props {
  date: string | Date
  /** Show relative time ("5m ago") — default true */
  relative?: boolean
  className?: string
}

/**
 * Displays a timestamp that auto-updates its relative label every 30 seconds.
 * Shows absolute date in the `title` tooltip on hover.
 */
export function Timestamp({ date, relative = true, className }: Props) {
  const [label, setLabel] = useState(() =>
    relative ? formatRelativeTime(date) : formatAbsoluteDate(date),
  )

  useEffect(() => {
    if (!relative) return
    setLabel(formatRelativeTime(date))

    const id = setInterval(() => {
      setLabel(formatRelativeTime(date))
    }, 30_000)
    return () => clearInterval(id)
  }, [date, relative])

  const absolute = formatAbsoluteDate(date)

  return (
    <time
      dateTime={typeof date === 'string' ? date : date.toISOString()}
      title={absolute}
      className={className}
    >
      {label}
    </time>
  )
}
