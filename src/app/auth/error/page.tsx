import Link from 'next/link'
import Header from '@/components/Header'

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md text-center">
          <div className="relative p-8 border border-obsidian-800 bg-obsidian-950/80">
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-red-500/30" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-red-500/30" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-red-500/30" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-red-500/30" />

            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-xl text-obsidian-100 font-medium mb-3">Authentication Error</h1>
            <p className="text-obsidian-400 text-sm mb-8">
              Something went wrong during sign-in. This usually means the link expired or was already used.
            </p>

            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="block w-full py-3 text-center font-semibold text-sm text-[#0a0a0a] hover:brightness-110 transition-all"
                style={{ background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)' }}
              >
                Try Signing In Again
              </Link>
              <Link
                href="/"
                className="block w-full py-3 text-center text-sm text-obsidian-400 border border-obsidian-800 hover:border-obsidian-600 hover:text-obsidian-200 transition-colors"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
