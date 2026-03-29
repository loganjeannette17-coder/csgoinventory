'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  inventory_visibility: 'public' | 'private'
}

interface Props {
  profile: Profile
}

const FALLBACK_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#111827"/><circle cx="40" cy="30" r="14" fill="#374151"/><rect x="18" y="52" width="44" height="18" rx="9" fill="#374151"/></svg>',
  )

export default function EditProfileForm({ profile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [username,    setUsername]    = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio,         setBio]         = useState(profile.bio ?? '')
  const [avatarUrl,   setAvatarUrl]   = useState(profile.avatar_url ?? '')
  const [visibility,  setVisibility]  = useState<'public' | 'private'>(profile.inventory_visibility)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [saved,       setSaved]       = useState(false)

  // Validation
  const usernameValid = /^[a-zA-Z0-9_-]{3,32}$/.test(username)
  const isChanged =
    username    !== profile.username ||
    displayName !== (profile.display_name ?? '') ||
    bio         !== (profile.bio ?? '') ||
    avatarUrl   !== (profile.avatar_url ?? '') ||
    visibility  !== profile.inventory_visibility

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!usernameValid) {
      setError('Username must be 3–32 characters: letters, numbers, _ or -')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please log in again.'); setSaving(false); return }

    // Check username uniqueness only if it changed
    if (username !== profile.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()

      if (existing) {
        setError('That username is already taken.')
        setSaving(false)
        return
      }
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        username:             username.toLowerCase(),
        display_name:         displayName.trim() || null,
        bio:                  bio.trim() || null,
        avatar_url:           avatarUrl.trim() || null,
        inventory_visibility: visibility,
      })
      .eq('id', user.id)

    if (updateErr) {
      setError(updateErr.message)
      setSaving(false)
      return
    }

    setSaved(true)
    setSaving(false)
    router.refresh()

    // If username changed, redirect to new profile URL
    if (username.toLowerCase() !== profile.username) {
      router.push(`/profile/${username.toLowerCase()}`)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5"
    >
      {/* Username */}
      <Field label="Username" hint="3–32 characters. Letters, numbers, _ and - only.">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9_-]+"
          required
          className="input"
        />
      </Field>

      {/* Display name */}
      <Field label="Display name" hint="Optional. Shown instead of username on your profile.">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={64}
          placeholder={profile.username}
          className="input"
        />
      </Field>

      {/* Bio */}
      <Field label="Bio" hint="Optional. Max 240 characters.">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={240}
          rows={3}
          placeholder="Tell people about yourself…"
          className="input resize-none"
        />
        <p className="text-xs text-gray-600 text-right mt-1">{bio.length}/240</p>
      </Field>

      {/* Profile picture */}
      <Field label="Profile picture URL" hint="Optional. Paste a direct image URL (https://...).">
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/avatar.png"
          className="input"
        />
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl.trim() || FALLBACK_AVATAR}
            alt="Profile preview"
            className="h-10 w-10 rounded-lg object-cover bg-gray-800"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = FALLBACK_AVATAR
            }}
          />
          <p className="text-xs text-gray-500">
            Preview of how your avatar appears across profile, browse, and chat.
          </p>
        </div>
      </Field>

      {/* Inventory visibility */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-300">Inventory visibility</p>
        <div className="flex gap-3">
          {(['public', 'private'] as const).map((v) => (
            <label
              key={v}
              className={`flex-1 flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-3 transition-colors ${
                visibility === v
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                className="accent-blue-500"
              />
              <span className="capitalize text-sm font-medium">{v}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {visibility === 'public'
            ? 'Your inventory and profile appear in Browse and are visible to all users.'
            : 'Only you can see your inventory. Your profile is still visible.'}
        </p>
      </div>

      {/* Error / success */}
      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-green-400 text-sm bg-green-950/40 border border-green-800 rounded-lg px-3 py-2">
          Profile saved successfully.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving || !isChanged || !usernameValid}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2"
        >
          {saving && <Spinner />}
          Save changes
        </button>
        <a
          href={`/profile/${profile.username}`}
          className="text-gray-400 hover:text-white text-sm py-2 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
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
