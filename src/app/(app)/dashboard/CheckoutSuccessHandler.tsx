'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function Inner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      setMessage('Payment succeeded — activating your plan… If nothing changes, keep Stripe CLI running (`stripe listen`) or check webhooks.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/stripe/sync-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          if (!cancelled) setMessage(data.error ?? 'Could not activate subscription yet.')
          return
        }
        router.replace('/dashboard')
        router.refresh()
      } catch {
        if (!cancelled) setMessage('Could not confirm payment with the server. Try refreshing the page.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  if (!message) return null

  return (
    <div className="mb-4 rounded-lg border border-yellow-800 bg-yellow-950/40 px-4 py-3 text-sm text-yellow-200">
      {message}
    </div>
  )
}

export default function CheckoutSuccessHandler() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
