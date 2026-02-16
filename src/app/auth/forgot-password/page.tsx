'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSending(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md">
          {/* Corner accents */}
          <div className="relative p-8 border border-obsidian-800 bg-obsidian-950/80">
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-dgw-gold/30" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-dgw-gold/30" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-dgw-gold/30" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-dgw-gold/30" />

            <div className="text-center mb-8">
              <Link href="/" className="inline-block heading-display text-2xl text-gradient-gold mb-4">DGW</Link>
              <h1 className="text-xl text-obsidian-100 font-medium mb-2">Reset Your Password</h1>
              <p className="text-obsidian-500 text-sm">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {sent ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-obsidian-100 font-medium mb-2">Check Your Email</h2>
                <p className="text-obsidian-400 text-sm mb-6">
                  If an account exists for <span className="text-obsidian-200">{email}</span>, you&apos;ll receive a password reset link shortly.
                </p>
                <p className="text-obsidian-600 text-xs mb-6">
                  Don&apos;t see it? Check your spam folder.
                </p>
                <Link href="/auth/login" className="text-dgw-gold text-sm hover:underline">
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 text-obsidian-100 text-sm placeholder:text-obsidian-700 focus:outline-none focus:border-dgw-gold/50 transition-colors"
                    placeholder="you@email.com"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={sending || !email}
                  className="w-full py-3.5 font-semibold text-sm text-[#0a0a0a] disabled:opacity-50 transition-all hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
                  }}
                >
                  {sending ? 'Sending...' : 'Send Reset Link'}
                </button>

                <p className="text-center text-obsidian-500 text-sm">
                  Remember your password?{' '}
                  <Link href="/auth/login" className="text-dgw-gold hover:underline">Sign in</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
