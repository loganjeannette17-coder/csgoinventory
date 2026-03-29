'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface SteamAccount {
  steam_id: string
  persona_name: string | null
  avatar_url: string | null
  last_synced_at: string | null
  is_public: boolean
}

interface Props {
  initialAccount: SteamAccount | null
}

interface SyncResult {
  itemsUpserted: number
  totalValueUsd: number
  durationMs: number
}

interface SyncErrorResponse {
  error: string
  retryAfterSeconds?: number
}

export default function SteamSettings({ initialAccount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const steamLinked = searchParams?.get('steam_linked') === '1'
  const steamError = searchParams?.get('steam_error')

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    setCooldownSeconds(null)

    try {
      const res = await fetch('/api/steam/sync', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        const err = data as SyncErrorResponse
        if (res.status === 429 && err.retryAfterSeconds) {
          setCooldownSeconds(err.retryAfterSeconds)
          setSyncError(`You can sync again in ${err.retryAfterSeconds} seconds.`)
        } else {
          setSyncError(err.error ?? 'Sync failed. Please try again.')
        }
        return
      }

      setSyncResult(data as SyncResult)
      router.refresh()
    } catch {
      setSyncError('Network error. Please check your connection and try again.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-white">Steam Account</h2>

      {/* Success banner after OAuth link */}
      {steamLinked && (
        <div className="bg-green-950/40 border border-green-800 rounded-lg px-4 py-3 text-green-300 text-sm">
          Steam account linked successfully.
        </div>
      )}

      {/* Error banner from OAuth callback */}
      {steamError && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
          {steamError}
        </div>
      )}

      {initialAccount ? (
        // ── Linked state ──────────────────────────────────────────────────
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {initialAccount.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={initialAccount.avatar_url}
                alt="Steam avatar"
                className="w-12 h-12 rounded-lg"
              />
            )}
            <div>
              <p className="text-white font-medium">
                {initialAccount.persona_name ?? initialAccount.steam_id}
              </p>
              <p className="text-gray-500 text-xs">Steam ID: {initialAccount.steam_id}</p>
              {initialAccount.last_synced_at && (
                <p className="text-gray-500 text-xs">
                  Last synced:{' '}
                  {new Date(initialAccount.last_synced_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {!initialAccount.is_public && (
            <div className="bg-yellow-950/40 border border-yellow-800 rounded-lg px-4 py-3 text-yellow-300 text-sm">
              Your Steam inventory is <strong>private</strong>. Go to Steam &rarr; Privacy Settings
              and set your inventory to Public, then sync again.
            </div>
          )}

          {/* Sync result */}
          {syncResult && (
            <div className="bg-blue-950/40 border border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-200 space-y-1">
              <p className="font-medium text-blue-300">Sync complete</p>
              <p>{syncResult.itemsUpserted} items synced</p>
              <p>Total value: ${syncResult.totalValueUsd.toFixed(2)}</p>
              <p className="text-xs text-blue-400">Took {(syncResult.durationMs / 1000).toFixed(1)}s</p>
            </div>
          )}

          {syncError && (
            <div className="bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
              {syncError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing || cooldownSeconds !== null}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2"
            >
              {syncing && <Spinner />}
              {syncing ? 'Syncing...' : 'Sync inventory'}
            </button>

            <a
              href="/api/steam/auth"
              className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Re-link Steam account
            </a>
          </div>
        </div>
      ) : (
        // ── Unlinked state ─────────────────────────────────────────────────
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Link your Steam account to sync your CS2 inventory.
          </p>
          <a
            href="/api/steam/auth"
            className="inline-flex items-center gap-2 bg-[#1b2838] hover:bg-[#2a475e] border border-[#4c6b22] text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <SteamIcon />
            Sign in through Steam
          </a>
        </div>
      )}
    </section>
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

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.37l3.12-7.65a3.5 3.5 0 01-.83-6.9L8.1 4.56A12 12 0 0112 0zm0 2c2.26 0 4.35.63 6.13 1.72l-5.1 4.45a3.5 3.5 0 00-4.57 4.58L4.2 17.9A10 10 0 012 12C2 6.48 6.48 2 12 2zm4.5 5.5a2 2 0 110 4 2 2 0 010-4zm-8.75 4.25a1.5 1.5 0 011.97 1.41 1.5 1.5 0 01-1.5 1.5 1.5 1.5 0 01-1.5-1.5 1.5 1.5 0 011.03-1.41z" />
    </svg>
  )
}
