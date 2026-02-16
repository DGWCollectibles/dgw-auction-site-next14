'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HeroAuctionProps {
  title: string
  slug: string
  coverImage: string | null
  endsAt: string
  lotCount: number
  status: string
  featuredImages?: string[]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function HeroAuctionCard({ title, slug, coverImage, endsAt, lotCount, status, featuredImages = [] }: HeroAuctionProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 })

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 })
        return
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        totalMs: diff,
      })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  const isLive = status === 'live'
  const isEnded = timeLeft.totalMs <= 0 && isLive

  return (
    <div className="mt-12 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.4s' }}>
      <Link
        href={`/auctions/${slug}`}
        className="block relative overflow-hidden group"
        style={{
          background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.9) 0%, rgba(13, 11, 9, 0.95) 100%)',
          border: '1px solid rgba(201, 169, 98, 0.25)',
        }}
      >
        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-dgw-gold/40 group-hover:border-dgw-gold/70 transition-colors" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-dgw-gold/40 group-hover:border-dgw-gold/70 transition-colors" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-dgw-gold/40 group-hover:border-dgw-gold/70 transition-colors" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-dgw-gold/40 group-hover:border-dgw-gold/70 transition-colors" />

        {/* Hover glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-dgw-gold/0 via-dgw-gold/5 to-dgw-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="p-5 sm:p-6">
          {/* Top row: Status + Title */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {isLive && <span className="live-dot" />}
                <span className={`text-[0.55rem] uppercase tracking-[0.2em] font-semibold ${isLive ? 'text-red-400' : 'text-blue-400'}`}>
                  {isLive ? 'Live Now' : 'Coming Soon'}
                </span>
                <span className="text-obsidian-700">|</span>
                <span className="text-obsidian-500 text-xs">{lotCount} lots</span>
              </div>
              <h3 className="text-obsidian-100 font-medium text-lg leading-tight group-hover:text-dgw-gold transition-colors">
                {title}
              </h3>
            </div>

            {/* Arrow */}
            <svg className="w-5 h-5 text-dgw-gold/40 group-hover:text-dgw-gold group-hover:translate-x-1 transition-all shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Featured lot images */}
          {featuredImages.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-hidden">
              {featuredImages.slice(0, 4).map((img, i) => (
                <div
                  key={i}
                  className="w-16 h-16 shrink-0 overflow-hidden border border-dgw-gold/10 group-hover:border-dgw-gold/25 transition-colors"
                >
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
              {lotCount > 4 && (
                <div className="w-16 h-16 shrink-0 border border-obsidian-800 flex items-center justify-center bg-obsidian-900/50">
                  <span className="text-obsidian-500 text-xs">+{lotCount - 4}</span>
                </div>
              )}
            </div>
          )}

          {/* Live countdown */}
          {isLive && !isEnded && (
            <div className="flex items-center gap-3 pt-3 border-t border-dgw-gold/10">
              <span className="text-[0.55rem] uppercase tracking-[0.2em] text-obsidian-500">Lots begin closing in</span>
              <div className="flex gap-1 font-mono text-sm">
                {timeLeft.days > 0 && (
                  <>
                    <span className="px-1.5 py-0.5 bg-obsidian-800 text-dgw-gold rounded">{timeLeft.days}d</span>
                  </>
                )}
                <span className="px-1.5 py-0.5 bg-obsidian-800 text-dgw-gold rounded tabular-nums">{pad(timeLeft.hours)}h</span>
                <span className="px-1.5 py-0.5 bg-obsidian-800 text-dgw-gold rounded tabular-nums">{pad(timeLeft.minutes)}m</span>
                <span className="px-1.5 py-0.5 bg-obsidian-800 text-dgw-gold rounded tabular-nums animate-pulse">{pad(timeLeft.seconds)}s</span>
              </div>
            </div>
          )}

          {/* Preview state */}
          {status === 'preview' && (
            <div className="pt-3 border-t border-blue-400/10">
              <span className="text-blue-400/60 text-xs">Bidding opens soon</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}
