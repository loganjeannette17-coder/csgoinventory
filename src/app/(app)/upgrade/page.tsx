'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const BASIC_FEATURES = [
  'Sync your CS2 inventory from Steam',
  'Real-time market value of all items',
  'Public or private inventory',
  'List items for sale at fixed prices',
  'Message other traders',
]

const PRO_EXTRA_FEATURES = [
  'Everything in Basic',
  'Create and bid in auctions',
  'Buy-now auction purchases',
]

export default function UpgradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const wasCanceled  = searchParams?.get('payment') === 'canceled'
  const highlightPro = searchParams?.get('plan') === 'pro'

  const [loadingPlan, setLoadingPlan] = useState<'basic' | 'pro' | null>(null)
  const [error, setError]             = useState<string | null>(null)

  async function handleCheckout(plan: 'basic' | 'pro') {
    setError(null)
    setLoadingPlan(plan)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      })

      const raw = await res.text()
      let data: { error?: string; url?: string } = {}
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string; url?: string }
        } catch {
          throw new Error(
            'Server returned a non-JSON response. If this persists, check the Stripe checkout API route and your environment variables.',
          )
        }
      }

      if (!res.ok) {
        // Already on this plan (or better) — send them to the dashboard
        if (res.status === 409) {
          router.push('/dashboard')
          return
        }
        throw new Error(data.error ?? `Request failed (${res.status}).`)
      }

      if (!data.url) {
        throw new Error(data.error ?? 'No checkout URL returned from the server.')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Page header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Choose your plan</h1>
          <p className="text-gray-400 text-sm mt-2">
            Cancel anytime. Access continues until the end of the billing period.
          </p>
        </div>

        {/* Canceled / error notices */}
        {wasCanceled && (
          <p className="text-yellow-400 text-sm bg-yellow-950/40 border border-yellow-800 rounded-lg px-3 py-2 mb-6 text-center">
            Payment was canceled. You can try again whenever you&apos;re ready.
          </p>
        )}
        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 mb-6 text-center">
            {error}
          </p>
        )}

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* ── Basic ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col">
            <div className="mb-4">
              <span className="inline-block bg-gray-700/60 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Basic
              </span>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">$1.99</span>
              <span className="text-gray-500 text-sm ml-1">/ month</span>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <CheckIcon className="text-green-400" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('basic')}
              disabled={loadingPlan !== null}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loadingPlan === 'basic' ? <><Spinner /> Redirecting…</> : 'Get Basic'}
            </button>
          </div>

          {/* ── Pro ── */}
          <div className={`bg-gray-900 border rounded-xl p-6 flex flex-col ${highlightPro ? 'border-blue-500 ring-1 ring-blue-500' : 'border-blue-800'}`}>
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-block bg-blue-600/20 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                Pro
              </span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                Recommended
              </span>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">$4.99</span>
              <span className="text-gray-500 text-sm ml-1">/ month</span>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {PRO_EXTRA_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <CheckIcon className="text-blue-400" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('pro')}
              disabled={loadingPlan !== null}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loadingPlan === 'pro' ? <><Spinner /> Redirecting…</> : 'Get Pro'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Secured by Stripe. We never store your payment details.
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 mt-0.5 ${className ?? ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
