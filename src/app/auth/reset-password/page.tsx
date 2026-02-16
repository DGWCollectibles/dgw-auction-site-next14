'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  // Supabase handles the token exchange automatically when the page loads
  // via the URL hash fragment from the email link
  useEffect(() => {
    const supabase = createClient()

    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if we already have a session (user might have clicked link while logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    // If no session after 5 seconds, show error
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setSessionError(true)
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => router.push('/account'), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-md">
          <div className="relative p-8 border border-obsidian-800 bg-obsidian-950/80">
            <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-dgw-gold/30" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-dgw-gold/30" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-dgw-gold/30" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-dgw-gold/30" />

            <div className="text-center mb-8">
              <Link href="/" className="inline-block heading-display text-2xl text-gradient-gold mb-4">DGW</Link>
              <h1 className="text-xl text-obsidian-100 font-medium mb-2">Set New Password</h1>
            </div>

            {sessionError ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-obsidian-100 font-medium mb-2">Link Expired</h2>
                <p className="text-obsidian-400 text-sm mb-6">
                  This reset link has expired or is invalid. Please request a new one.
                </p>
                <Link
                  href="/auth/forgot-password"
                  className="inline-block px-6 py-3 font-semibold text-sm text-[#0a0a0a] hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)' }}
                >
                  Request New Link
                </Link>
              </div>
            ) : success ? (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-obsidian-100 font-medium mb-2">Password Updated!</h2>
                <p className="text-obsidian-400 text-sm">
                  Redirecting you to your account...
                </p>
              </div>
            ) : !sessionReady ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin mx-auto mb-4" />
                <p className="text-obsidian-500 text-sm">Verifying reset link...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 text-obsidian-100 text-sm placeholder:text-obsidian-700 focus:outline-none focus:border-dgw-gold/50 transition-colors"
                    placeholder="At least 6 characters"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 text-obsidian-100 text-sm placeholder:text-obsidian-700 focus:outline-none focus:border-dgw-gold/50 transition-colors"
                    placeholder="Confirm your password"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={saving || !password || !confirmPassword}
                  className="w-full py-3.5 font-semibold text-sm text-[#0a0a0a] disabled:opacity-50 transition-all hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
                  }}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
