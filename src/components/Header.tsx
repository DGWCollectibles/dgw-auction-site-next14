'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Handle scroll
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-obsidian-950/90 backdrop-blur-xl border-b border-dgw-gold/10' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group relative">
            <span className="heading-display text-2xl text-gradient-gold">DGW</span>
            <span className="text-[10px] text-obsidian-500 font-semibold tracking-[0.25em] uppercase hidden sm:block">
              Auctions
            </span>
            {/* Shimmer on hover */}
            <span 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(201,169,98,0.1), transparent)',
              }}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            <Link href="/auctions" className="nav-link">
              Auctions
            </Link>
            <Link href="/search" className="nav-link">
              Browse
            </Link>
            <Link href="/results" className="nav-link">
              Results
            </Link>
            {user && (
              <Link href="/account/watchlist" className="nav-link">
                Saved
              </Link>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-9 rounded-lg bg-obsidian-800/50 animate-pulse" />
            ) : user ? (
              <>
                <Link 
                  href="/account" 
                  className="hidden sm:flex items-center gap-2 text-sm text-obsidian-300 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-dgw-gold to-dgw-gold-dark flex items-center justify-center">
                    <span className="text-xs font-semibold text-obsidian-950">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  </div>
                  <span>Account</span>
                </Link>
                <button 
                  onClick={handleSignOut} 
                  className="btn btn-ghost text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-ghost text-sm hidden sm:inline-flex">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn btn-primary text-sm">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
