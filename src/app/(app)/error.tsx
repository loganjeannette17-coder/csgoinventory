'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-20 text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-bold text-white">Something went wrong</h2>
      <p className="text-gray-400 text-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="text-gray-600 text-xs font-mono">Ref: {error.digest}</p>
      )}
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
        >
          Try again
        </button>
        <a
          href="/home"
          className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
        >
          Dashboard
        </a>
      </div>
    </div>
  )
}
