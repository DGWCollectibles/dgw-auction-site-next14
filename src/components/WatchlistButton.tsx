'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WatchlistButtonProps {
  lotId: string
  userId: string | null
  /** 'icon' = small heart overlay (lot cards), 'full' = button with text (lot detail) */
  variant?: 'icon' | 'full'
  className?: string
}

export default function WatchlistButton({ lotId, userId, variant = 'icon', className = '' }: WatchlistButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [watchlistId, setWatchlistId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    const checkWatchlist = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', userId)
        .eq('lot_id', lotId)
        .maybeSingle()

      if (data) {
        setSaved(true)
        setWatchlistId(data.id)
      }
    }

    checkWatchlist()
  }, [lotId, userId])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      // Redirect to login
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      if (saved && watchlistId) {
        // Optimistic remove
        setSaved(false)
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('id', watchlistId)

        if (error) {
          setSaved(true) // Revert
        } else {
          setWatchlistId(null)
        }
      } else {
        // Optimistic add
        setSaved(true)
        const { data, error } = await supabase
          .from('watchlist')
          .insert({
            user_id: userId,
            lot_id: lotId,
            notify_before_end: true,
            notify_on_outbid: true,
          })
          .select('id')
          .single()

        if (error) {
          setSaved(false) // Revert
        } else if (data) {
          setWatchlistId(data.id)
        }
      }
    } catch (err) {
      // Revert on unexpected error
      setSaved(prev => !prev)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 ${
          saved
            ? 'bg-red-400/10 border-red-400/30 text-red-400 hover:bg-red-400/20'
            : 'border-obsidian-700 text-obsidian-400 hover:border-dgw-gold/30 hover:text-dgw-gold'
        } ${className}`}
      >
        <svg
          className="w-4 h-4"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={saved ? 0 : 1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {saved ? 'Saved' : 'Save Lot'}
      </button>
    )
  }

  // Icon variant (for lot cards)
  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-50 ${
        saved
          ? 'text-red-400 bg-red-400/10'
          : 'text-obsidian-500 hover:text-red-400 bg-[#0a0a0a]/60 hover:bg-red-400/10'
      } ${className}`}
    >
      <svg
        className={`w-5 h-5 transition-transform ${loading ? 'scale-90' : saved ? 'scale-110' : ''}`}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={saved ? 0 : 1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  )
}
