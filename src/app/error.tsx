'use client'

import { useEffect } from 'react'

// Do not use <html> or <body> here — root layout.tsx already provides them.
// (Dev overlay can render this inside the existing document; extra <html> = React error.)

export default function RouteError({
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
    <div className="bg-gray-950 text-white min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-gray-600 text-xs font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            Try again
          </button>
          <a
            href="/home"
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors inline-flex items-center"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
