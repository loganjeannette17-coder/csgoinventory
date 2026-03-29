'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface SubscriptionInfo {
  plan: 'basic' | 'pro' | null
  status: string
  current_period_end: string | null
  cancel_at: string | null
  stripe_subscription_id: string | null
  grace_period_ends_at: string | null
}

interface Props {
  initialSubscription: SubscriptionInfo | null
}

export default function MembershipSettings({ initialSubscription }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasSubscription = !!initialSubscription?.stripe_subscription_id
  const isCanceled = initialSubscription?.status === 'canceled'
  const canCancel = hasSubscription && !isCanceled && !initialSubscription?.cancel_at

  const planLabel = useMemo(() => {
    if (!initialSubscription?.plan) return 'No active plan'
    return initialSubscription.plan === 'basic' ? 'Basic' : 'Pro'
  }, [initialSubscription?.plan])

  async function handleCancelMembership() {
    if (!canCancel) return
    const ok = window.confirm(
      'Cancel membership at period end? You will keep access until the end of the current billing period.',
    )
    if (!ok) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/stripe/subscription/cancel', { method: 'POST' })
      const data = (await res.json()) as { error?: string; message?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel membership.')
        return
      }
      setSuccess(data.message ?? 'Membership cancellation scheduled.')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Membership</h2>

      {initialSubscription ? (
        <div className="space-y-2 text-sm">
          <p className="text-gray-300">
            Plan: <span className="font-medium text-white">{planLabel}</span>
          </p>
          <p className="text-gray-400">
            Status: <span className="capitalize text-gray-200">{initialSubscription.status}</span>
          </p>
          {initialSubscription.current_period_end && (
            <p className="text-gray-400">
              Current period ends:{' '}
              <span className="text-gray-200">
                {new Date(initialSubscription.current_period_end).toLocaleString()}
              </span>
            </p>
          )}
          {initialSubscription.cancel_at && (
            <p className="text-yellow-300">
              Cancellation scheduled for{' '}
              <span className="font-medium">{new Date(initialSubscription.cancel_at).toLocaleString()}</span>
            </p>
          )}
          {initialSubscription.grace_period_ends_at && (
            <p className="text-yellow-300">
              Grace period ends{' '}
              <span className="font-medium">
                {new Date(initialSubscription.grace_period_ends_at).toLocaleString()}
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No membership record yet.</p>
      )}

      {error && (
        <p className="text-red-300 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="text-green-300 text-sm bg-green-950/40 border border-green-800 rounded-lg px-3 py-2">
          {success}
        </p>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleCancelMembership}
          disabled={!canCancel || loading}
          className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Canceling...' : 'Cancel membership'}
        </button>
      </div>
    </section>
  )
}
