'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type OAuthProvider = 'discord' | 'github'

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: 'discord', label: 'Discord' },
  { id: 'github', label: 'GitHub' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)

  const supabase = createClient()

  function formatNetworkError(message: string) {
    const m = message.toLowerCase()
    if (
      m.includes('pgrst205') ||
      m.includes("could not find the table 'public.profiles'") ||
      m.includes('schema cache')
    ) {
      return (
        'Your Supabase database schema is not initialized yet (missing public.profiles). Run supabase/schema.sql first, then migrations 001-005 in SQL Editor, and retry.'
      )
    }
    if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
      return (
        'Cannot reach Supabase (network error). Check: (1) NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local are your real project values, (2) you restarted `npm run dev` after editing .env, (3) VPN/ad-block is not blocking *.supabase.co, (4) your Supabase project is not paused in the dashboard.'
      )
    }
    return message
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
    // Check username availability before creating the auth user
    const {
      data: existing,
      error: usernameCheckError,
    } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle()

    if (usernameCheckError) {
      setError(formatNetworkError(usernameCheckError.message))
      setLoading(false)
      return
    }

    if (existing) {
      setError('That username is already taken.')
      setLoading(false)
      return
    }

    const signUpResult = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // The handle_new_user trigger creates the profile row.
        // We pass the desired username as metadata so we can update it.
        data: { preferred_username: username.trim().toLowerCase() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    const signUpError = signUpResult.error
    const signUpData = signUpResult.data

    if (signUpError) {
      setError(formatNetworkError(signUpError.message))
      setLoading(false)
      return
    }

    // Update the username that the DB trigger auto-generated
    if (signUpData.user) {
      await supabase
        .from('profiles')
        .update({ username: username.trim().toLowerCase() })
        .eq('id', signUpData.user.id)
    }

    // If email confirmation is enabled, show a message; otherwise redirect
    if (signUpData.session) {
      router.push('/upgrade')
      router.refresh()
    } else {
      setSuccess(true)
    }

    setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      setError(formatNetworkError(message))
      setLoading(false)
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null)
    setOauthLoading(provider)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/upgrade`,
      },
    })

    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
  }

  if (success) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl text-center">
        <div className="text-3xl mb-3">📬</div>
        <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
        <p className="text-gray-400 text-sm">
          We sent a confirmation link to <span className="text-white">{email}</span>.
          Click it to activate your account.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>

      {/* OAuth */}
      <div className="space-y-3 mb-6">
        {OAUTH_PROVIDERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleOAuth(id)}
            disabled={oauthLoading !== null || loading}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            {oauthLoading === id && <Spinner />}
            Continue with {label}
          </button>
        ))}
      </div>

      <Divider label="or" />

      <form onSubmit={handleRegister} className="space-y-4 mt-6">
        <div>
          <label htmlFor="username" className="block text-sm text-gray-400 mb-1.5">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_-]+"
            title="Letters, numbers, underscores and hyphens only"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
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
          Create account
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
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
