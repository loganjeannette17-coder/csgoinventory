'use client'

import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface Props {
  lastSyncedAt: string | null
  hasSteamAccount: boolean
}

interface SyncResponse {
  itemsUpserted?: number
  totalValueUsd?: number
  error?: string
  retryAfterSeconds?: number
}

// Each step label + estimated duration (seconds) for the progress bar
const STEPS = [
  { label: 'Connecting to Steam',    est: 3  },
  { label: 'Fetching inventory',     est: 12 },
  { label: 'Getting market prices',  est: 20 },
  { label: 'Saving to database',     est: 5  },
] as const

type Step = 0 | 1 | 2 | 3

export function SyncButton({ lastSyncedAt, hasSteamAccount }: Props) {
  const router = useRouter()
  const [syncing, setSyncing]         = useState(false)
  const [step,    setStep]            = useState<Step>(0)
  const [progress, setProgress]       = useState(0)     // 0-100 within current step
  const [error,   setError]           = useState<string | null>(null)
  const [result,  setResult]          = useState<string | null>(null)
  const [cooldownSecs, setCooldownSecs] = useState(0)

  // Count-down cooldown
  useEffect(() => {
    if (cooldownSecs <= 0) return
    const id = setInterval(() => setCooldownSecs((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldownSecs])

  // Animate progress within the current step
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startProgressForStep(s: Step) {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    setProgress(0)
    const stepEst = STEPS[s].est * 1000   // ms
    const tickMs  = 250
    const tickPct = (tickMs / stepEst) * 85  // reach 85% naturally; last 15% unlocks on completion

    progressTimerRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + tickPct, 85))
    }, tickMs)
  }

  function stopProgress() {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
  }

  async function handleSync() {
    setError(null)
    setResult(null)
    setSyncing(true)
    setStep(0)
    startProgressForStep(0)

    // Simulate step advancement at realistic intervals while fetch runs
    const stepTimers = [
      setTimeout(() => { setStep(1); startProgressForStep(1) }, 3_000),
      setTimeout(() => { setStep(2); startProgressForStep(2) }, 15_000),
      setTimeout(() => { setStep(3); startProgressForStep(3) }, 35_000),
    ]

    try {
      const res  = await fetch('/api/steam/sync', { method: 'POST' })
      const data: SyncResponse = await res.json()

      stepTimers.forEach(clearTimeout)
      stopProgress()
      setProgress(100)

      if (!res.ok) {
        if (res.status === 429 && data.retryAfterSeconds) {
          setCooldownSecs(data.retryAfterSeconds)
          setError(`Cooldown active — try again in ${data.retryAfterSeconds}s.`)
        } else {
          setError(data.error ?? 'Sync failed. Please try again.')
        }
      } else {
        setResult(`${data.itemsUpserted ?? 0} items synced · $${(data.totalValueUsd ?? 0).toFixed(2)} total`)
        router.refresh()
      }
    } catch {
      stepTimers.forEach(clearTimeout)
      stopProgress()
      setError('Network error. Please check your connection.')
    } finally {
      setSyncing(false)
    }
  }

  if (!hasSteamAccount) {
    return (
      <a
        href="/settings"
        className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        Link Steam account to sync →
      </a>
    )
  }

  const totalSteps = STEPS.length
  const overallPct = Math.round(((step / totalSteps) * 100) + (progress / totalSteps))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSync}
          disabled={syncing || cooldownSecs > 0}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {syncing ? <Spinner /> : <RefreshIcon />}
          {syncing ? 'Syncing…' : cooldownSecs > 0 ? `Wait ${cooldownSecs}s` : 'Refresh inventory'}
        </button>

        {!syncing && lastSyncedAt && !result && !error && (
          <p className="text-gray-500 text-sm">
            Last synced {formatRelative(lastSyncedAt)}
          </p>
        )}
        {result && (
          <p className="text-green-400 text-sm">{result}</p>
        )}
      </div>

      {/* Step progress */}
      {syncing && (
        <div className="space-y-2 max-w-sm">
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>

          {/* Steps list */}
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const done    = i < step
              const current = i === step
              return (
                <div key={s.label} className={cn('flex items-center gap-2 text-xs', done ? 'text-green-400' : current ? 'text-blue-300' : 'text-gray-600')}>
                  {done    && <CheckDot />}
                  {current && <SpinDot />}
                  {!done && !current && <EmptyDot />}
                  <span>{s.label}</span>
                  {current && (
                    <span className="text-gray-600 ml-auto">~{s.est}s</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 max-w-sm">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(date: string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
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

function CheckDot() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current shrink-0">
      <circle cx="6" cy="6" r="6" className="opacity-20" />
      <path d="M3.5 6l1.5 1.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinDot() {
  return (
    <svg className="animate-spin h-3 w-3 shrink-0" fill="none" viewBox="0 0 12 12">
      <circle className="opacity-20" cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="2" />
      <path className="opacity-75" fill="currentColor" d="M6 1a5 5 0 015 5h-2a3 3 0 00-3-3V1z" />
    </svg>
  )
}

function EmptyDot() {
  return <span className="h-3 w-3 rounded-full border border-gray-700 shrink-0 inline-block" />
}
