'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  recipientId: string
  recipientName: string
}

// Calls the find-or-create conversation API, then navigates to /chat/{id}.
export default function MessageButton({ recipientId, recipientName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipientId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Could not start conversation.')
        setLoading(false)
        return
      }

      router.push(`/chat/${data.conversationId}`)
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 font-medium transition-colors flex items-center gap-1.5"
      >
        {loading ? (
          <>
            <Spinner /> Opening chat…
          </>
        ) : (
          <>
            <ChatIcon /> Message {recipientName}
          </>
        )}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
