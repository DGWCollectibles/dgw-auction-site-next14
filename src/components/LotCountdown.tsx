'use client'

import { useState, useEffect, useRef } from 'react'

interface LotCountdownProps {
  endsAt: string | null
  extendedCount?: number
  /** 'card' = compact for lot cards, 'detail' = large for lot detail page */
  variant?: 'card' | 'detail'
  className?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

function calcTimeLeft(endsAt: string): TimeLeft {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    totalMs: diff,
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function LotCountdown({ endsAt, extendedCount = 0, variant = 'card', className = '' }: LotCountdownProps) {
  const [time, setTime] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 })
  const [showExtendFlash, setShowExtendFlash] = useState(false)
  const [extendAnimKey, setExtendAnimKey] = useState(0)
  const prevEndsAtRef = useRef(endsAt)
  const prevExtCountRef = useRef(extendedCount)

  // Detect soft-close extension
  useEffect(() => {
    if (
      endsAt && prevEndsAtRef.current && endsAt !== prevEndsAtRef.current &&
      new Date(endsAt).getTime() > new Date(prevEndsAtRef.current).getTime()
    ) {
      setShowExtendFlash(true)
      setExtendAnimKey(k => k + 1)
      const timer = setTimeout(() => setShowExtendFlash(false), 4000)
      prevEndsAtRef.current = endsAt
      return () => clearTimeout(timer)
    }
    prevEndsAtRef.current = endsAt
  }, [endsAt])

  useEffect(() => {
    if (extendedCount > prevExtCountRef.current) {
      setShowExtendFlash(true)
      setExtendAnimKey(k => k + 1)
      const timer = setTimeout(() => setShowExtendFlash(false), 4000)
      prevExtCountRef.current = extendedCount
      return () => clearTimeout(timer)
    }
    prevExtCountRef.current = extendedCount
  }, [extendedCount])

  // Tick every second (faster when critical)
  useEffect(() => {
    if (!endsAt) return
    const update = () => setTime(calcTimeLeft(endsAt))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  if (!endsAt) return null

  const isEnded = time.totalMs <= 0
  const isCritical = time.totalMs > 0 && time.totalMs <= 10 * 1000   // < 10s
  const isDanger = time.totalMs > 0 && time.totalMs <= 30 * 1000     // < 30s
  const isUrgent = time.totalMs > 0 && time.totalMs <= 2 * 60 * 1000 // < 2 min
  const isWarning = time.totalMs > 0 && time.totalMs <= 10 * 60 * 1000 // < 10 min
  const isEndingSoon = time.totalMs > 0 && time.totalMs <= 60 * 60 * 1000 // < 1 hr

  const timerColor = isEnded ? 'text-obsidian-500' :
    isCritical ? 'text-red-400' :
    isDanger ? 'text-red-400' :
    isUrgent ? 'text-orange-400' :
    isWarning ? 'text-yellow-400' :
    isEndingSoon ? 'text-dgw-gold' :
    'text-obsidian-300'

  // ============ CARD VARIANT ============
  if (variant === 'card') {
    if (isEnded) {
      return <span className={`text-xs text-obsidian-500 ${className}`}>Ended</span>
    }

    let timeStr: string
    if (time.days > 0) {
      timeStr = `${time.days}d ${time.hours}h ${pad(time.minutes)}m`
    } else if (time.hours > 0) {
      timeStr = `${time.hours}h ${pad(time.minutes)}m ${pad(time.seconds)}s`
    } else {
      timeStr = `${pad(time.minutes)}:${pad(time.seconds)}`
    }

    return (
      <div className={`relative ${className}`}>
        {/* Extension sweep animation */}
        {showExtendFlash && (
          <div key={`flash-${extendAnimKey}`} className="absolute inset-0 -mx-2 -my-1 rounded overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-green-400/20 animate-[fadeOut_2s_ease-out_forwards]" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-green-400/30 to-transparent animate-[sweepRight_0.8s_ease-out]" />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Extension badge */}
          {showExtendFlash && (
            <span className="px-1.5 py-0.5 bg-green-500/25 text-green-400 text-[0.55rem] font-bold uppercase tracking-wider rounded-sm animate-bounce border border-green-500/30">
              +Time
            </span>
          )}

          {/* Timer */}
          <div className={`flex items-center gap-1 ${isCritical ? 'animate-pulse' : ''}`}>
            {(isDanger || isCritical) && (
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCritical ? 'bg-red-400' : 'bg-red-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isCritical ? 'bg-red-500' : 'bg-red-400'}`} />
              </span>
            )}
            {!isDanger && time.hours === 0 && time.days === 0 && (
              <svg className={`w-3 h-3 ${timerColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className={`text-xs font-semibold font-mono tabular-nums ${timerColor}`}>
              {timeStr}
            </span>
          </div>

          {/* Extended badge */}
          {extendedCount > 0 && !showExtendFlash && (
            <span className="px-1.5 py-0.5 bg-dgw-gold/15 text-dgw-gold text-[0.55rem] uppercase tracking-wider rounded-sm border border-dgw-gold/20">
              +{extendedCount}
            </span>
          )}
        </div>

        {/* Critical: micro progress bar */}
        {isDanger && (
          <div className="mt-1.5 h-0.5 bg-obsidian-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-red-400'}`}
              style={{ width: `${Math.max(2, (time.totalMs / (30 * 1000)) * 100)}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // ============ DETAIL VARIANT ============
  if (isEnded) {
    return (
      <div className={`text-center ${className}`}>
        <span className="text-obsidian-500 uppercase tracking-[0.3em] text-xs">Lot Closed</span>
      </div>
    )
  }

  // Circular progress for last 2 minutes
  const showRing = isUrgent
  const ringProgress = showRing ? Math.max(0, time.totalMs / (2 * 60 * 1000)) : 1
  const ringCircumference = 2 * Math.PI * 38
  const ringOffset = ringCircumference * (1 - ringProgress)

  return (
    <div className={`relative ${className}`}>
      {/* Extension flash overlay */}
      {showExtendFlash && (
        <div key={`detail-flash-${extendAnimKey}`} className="absolute -inset-4 z-10 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-green-500/10 animate-[fadeOut_3s_ease-out_forwards]" />
          <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-green-400/20 to-transparent animate-[sweepRight_1s_ease-out]" />
          <div className="absolute inset-0 flex items-start justify-center pt-0">
            <div className="px-4 py-2 bg-green-500/90 text-white text-xs font-bold uppercase tracking-[0.25em] rounded shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-[bounceIn_0.5s_ease-out]">
              Time Extended!
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-6">
        {/* Optional ring timer for critical periods */}
        {showRing && (
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              {/* Background ring */}
              <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              {/* Progress ring */}
              <circle
                cx="40" cy="40" r="38" fill="none"
                stroke={isCritical ? '#ef4444' : isDanger ? '#f87171' : '#fb923c'}
                strokeWidth="3"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-mono text-xl font-bold tabular-nums ${isCritical ? 'text-red-400 animate-pulse' : isDanger ? 'text-red-400' : 'text-orange-400'}`}>
                {time.minutes > 0 ? `${time.minutes}:${pad(time.seconds)}` : time.seconds}
              </span>
            </div>
            {isCritical && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-10 bg-red-500" />
            )}
          </div>
        )}

        <div className="flex-1">
          <span className={`text-[0.6rem] uppercase tracking-[0.3em] block mb-2 ${
            isCritical ? 'text-red-400 font-bold animate-pulse' :
            isDanger ? 'text-red-400' :
            isUrgent ? 'text-orange-400' :
            isEndingSoon ? 'text-yellow-400/80' :
            'text-obsidian-500'
          }`}>
            {isCritical ? 'Closing Now!' :
             isDanger ? 'Closing Soon!' :
             isUrgent ? 'Under 2 Minutes' :
             isEndingSoon ? 'Closing Soon' :
             'Time Remaining'}
          </span>

          {/* Segmented display */}
          <div className={`flex gap-1.5 items-baseline ${
            isCritical ? 'drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
            isDanger ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]' : ''
          }`}>
            {time.days > 0 && (
              <>
                <div className="text-center">
                  <span className={`heading-display text-3xl block ${timerColor} tabular-nums`}>{time.days}</span>
                  <span className="text-[0.5rem] uppercase tracking-widest text-obsidian-600">Day{time.days !== 1 ? 's' : ''}</span>
                </div>
                <span className={`heading-display text-2xl ${timerColor} opacity-40`}>:</span>
              </>
            )}
            {(time.days > 0 || time.hours > 0) && (
              <>
                <div className="text-center">
                  <span className={`heading-display text-3xl block ${timerColor} tabular-nums`}>{pad(time.hours)}</span>
                  <span className="text-[0.5rem] uppercase tracking-widest text-obsidian-600">Hr</span>
                </div>
                <span className={`heading-display text-2xl ${timerColor} opacity-40`}>:</span>
              </>
            )}
            <div className="text-center">
              <span className={`heading-display ${isCritical ? 'text-4xl' : 'text-3xl'} block ${timerColor} tabular-nums ${isCritical ? 'animate-pulse' : ''}`}>
                {pad(time.minutes)}
              </span>
              <span className="text-[0.5rem] uppercase tracking-widest text-obsidian-600">Min</span>
            </div>
            <span className={`heading-display text-2xl ${timerColor} opacity-40 ${isDanger ? 'animate-[blink_1s_ease-in-out_infinite]' : ''}`}>:</span>
            <div className="text-center">
              <span className={`heading-display ${isCritical ? 'text-4xl' : 'text-3xl'} block ${timerColor} tabular-nums ${isCritical ? 'animate-pulse' : ''}`}>
                {pad(time.seconds)}
              </span>
              <span className="text-[0.5rem] uppercase tracking-widest text-obsidian-600">Sec</span>
            </div>
          </div>

          {/* Extended count */}
          {extendedCount > 0 && !showExtendFlash && (
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-dgw-gold/10 border border-dgw-gold/20 text-dgw-gold text-[0.6rem] uppercase tracking-wider">
                Extended {extendedCount}x
              </span>
              <span className="text-obsidian-600 text-[0.6rem]">Anti-snipe active</span>
            </div>
          )}
        </div>
      </div>

      {/* Urgency progress bar (for > 30s but < 1hr) */}
      {isEndingSoon && !showRing && (
        <div className="mt-3 h-1 bg-obsidian-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isWarning ? 'bg-orange-400' : 'bg-yellow-400'
            }`}
            style={{
              width: `${Math.max(2, Math.min(100, (time.totalMs / (60 * 60 * 1000)) * 100))}%`,
            }}
          />
        </div>
      )}

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes sweepRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes bounceIn {
          0% { transform: translateY(-20px); opacity: 0; }
          50% { transform: translateY(5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
