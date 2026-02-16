'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-xl text-[#e8e8ec] font-medium mb-3">Something Went Wrong</h1>
        <p className="text-[#747484] text-sm mb-8">
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-8 py-3 text-center font-semibold text-sm text-[#0a0a0a] hover:brightness-110 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)' }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-8 py-3 text-center text-sm text-[#747484] border border-[#27272c] hover:border-[#3d3d44] hover:text-[#b8b8c1] transition-colors"
          >
            Return Home
          </Link>
        </div>

        {error.digest && (
          <p className="text-[#3d3d44] text-xs mt-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}
