'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/account'
  const isAdminLogin = redirect.startsWith('/admin')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Force a hard navigation to ensure server picks up new session
    window.location.href = redirect
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {isAdminLogin && (
        <div className="p-4 bg-dgw-gold/10 border border-dgw-gold/20 text-dgw-gold text-sm">
          🔐 Admin Login — Sign in with your admin credentials
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-obsidian-300 mb-2">
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3.5 bg-obsidian-900/50 border border-obsidian-700/50 text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 focus:bg-obsidian-900/80 transition-all"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-obsidian-300 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3.5 bg-obsidian-900/50 border border-obsidian-700/50 text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 focus:bg-obsidian-900/80 transition-all"
          placeholder="••••••••"
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2.5 text-sm text-obsidian-400 cursor-pointer">
          <input 
            type="checkbox" 
            className="w-4 h-4 border-obsidian-700 bg-obsidian-900 text-dgw-gold focus:ring-dgw-gold/20 focus:ring-offset-0"
          />
          Remember me
        </label>
        <Link 
          href="/auth/forgot-password" 
          className="text-sm text-dgw-gold hover:text-dgw-gold-light transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full btn btn-primary py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="hero-orb top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6">
            <span className="heading-display text-4xl text-gradient-gold">DGW</span>
          </Link>
          <h1 className="heading-display text-3xl mb-2">Welcome back</h1>
          <p className="text-obsidian-400">Sign in to continue bidding</p>
        </div>

        {/* Form with Suspense */}
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-obsidian-500">Loading...</div>}>
          <LoginForm />
        </Suspense>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-obsidian-800" />
          <span className="text-xs text-obsidian-600 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-obsidian-800" />
        </div>

        {/* Sign up link */}
        <p className="text-center text-obsidian-400">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-dgw-gold hover:text-dgw-gold-light font-medium transition-colors">
            Create one
          </Link>
        </p>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
