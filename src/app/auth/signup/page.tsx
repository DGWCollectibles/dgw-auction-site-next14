'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const supabase = createClient()
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="hero-orb top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50" />
        
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="card p-10">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="heading-display text-2xl mb-3">Check your email</h1>
            <p className="text-obsidian-400 mb-2">
              We&apos;ve sent a confirmation link to
            </p>
            <p className="text-dgw-gold font-medium mb-6">{email}</p>
            <p className="text-sm text-obsidian-500">
              Click the link in your email to verify your account and start bidding.
            </p>
          </div>
          
          <p className="mt-8">
            <Link href="/auth/login" className="text-dgw-gold hover:text-dgw-gold-light font-medium transition-colors">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

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
          <h1 className="heading-display text-3xl mb-2">Create your account</h1>
          <p className="text-obsidian-400">Join DGW Auctions and start bidding today</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-5">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-obsidian-300 mb-2">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3.5 bg-obsidian-900/50 border border-obsidian-700/50 rounded-xl text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 focus:bg-obsidian-900/80 transition-all"
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-obsidian-300 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-obsidian-900/50 border border-obsidian-700/50 rounded-xl text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 focus:bg-obsidian-900/80 transition-all"
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
              className="w-full px-4 py-3.5 bg-obsidian-900/50 border border-obsidian-700/50 rounded-xl text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 focus:bg-obsidian-900/80 transition-all"
              placeholder="••••••••"
              required
            />
            <p className="mt-1.5 text-xs text-obsidian-500">At least 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-obsidian-300 mb-2">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-obsidian-900/50 border border-obsidian-700/50 rounded-xl text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 focus:bg-obsidian-900/80 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <p className="text-sm text-obsidian-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-dgw-gold hover:text-dgw-gold-light transition-colors">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-dgw-gold hover:text-dgw-gold-light transition-colors">Privacy Policy</Link>.
          </p>

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
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-obsidian-800" />
          <span className="text-xs text-obsidian-600 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-obsidian-800" />
        </div>

        {/* Sign in link */}
        <p className="text-center text-obsidian-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-dgw-gold hover:text-dgw-gold-light font-medium transition-colors">
            Sign in
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
