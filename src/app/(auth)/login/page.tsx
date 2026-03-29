'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

type OAuthProvider = 'discord' | 'github' | 'google'

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: 'discord', label: 'Discord' },
  { id: 'github', label: 'GitHub' },
]

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get('next') ?? '/dashboard'
  const urlError = searchParams?.get('error') ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(urlError)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)

  const supabase = createClient()

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Do not leak whether the email exists — use a generic message
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null)
    setOauthLoading(provider)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
    // On success Supabase redirects the browser — no need to handle the response
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

      {/* OAuth */}
      <div className="space-y-3 mb-6">
        {OAUTH_PROVIDERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleOAuth(id)}
            disabled={oauthLoading !== null || loading}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {oauthLoading === id ? (
              <Spinner />
            ) : null}
            Continue with {label}
          </button>
        ))}
      </div>

      <Divider label="or" />

      {/* Email / password */}
      <form onSubmit={handleEmailLogin} className="space-y-4 mt-6">
        <div>
          <label htmlFor="email" className="block text-sm text-gray-400 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-400 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || oauthLoading !== null}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Spinner />}
          Sign in
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl animate-pulse min-h-[320px]" />
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-800" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-gray-900 px-3 text-gray-500">{label}</span>
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
