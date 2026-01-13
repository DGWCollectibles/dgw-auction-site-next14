'use client'

import { useEffect, useState } from 'react'

export default function LuxuryAmbient() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Primary breathing glow - top center */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full animate-breathe"
        style={{
          background: 'radial-gradient(circle, rgba(201,169,98,0.07) 0%, transparent 60%)',
        }}
      />
      
      {/* Secondary breathing glow - bottom right */}
      <div 
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(201,169,98,0.04) 0%, transparent 60%)',
          animation: 'breathe 12s ease-in-out infinite',
          animationDelay: '4s',
        }}
      />

      {/* Tertiary glow - left side */}
      <div 
        className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(201,169,98,0.03) 0%, transparent 60%)',
          animation: 'breathe 10s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />

      {/* Floating dust particles */}
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute w-[2px] h-[2px] rounded-full"
          style={{
            left: `${(i * 2.7 + 5) % 100}%`,
            top: `${(i * 3.9 + 10) % 100}%`,
            background: '#C9A962',
            opacity: 0,
            animation: `dustFloat ${12 + (i % 8) * 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Light rays from above */}
      <div 
        className="absolute top-0 left-1/4 w-px h-[400px]"
        style={{
          background: 'linear-gradient(180deg, rgba(201,169,98,0.15) 0%, transparent 100%)',
          opacity: 0.04,
          animation: 'breathe 8s ease-in-out infinite',
        }}
      />
      <div 
        className="absolute top-0 left-1/2 w-px h-[500px]"
        style={{
          background: 'linear-gradient(180deg, rgba(201,169,98,0.15) 0%, transparent 100%)',
          opacity: 0.03,
          animation: 'breathe 10s ease-in-out infinite',
          animationDelay: '3s',
        }}
      />
      <div 
        className="absolute top-0 right-1/3 w-px h-[350px]"
        style={{
          background: 'linear-gradient(180deg, rgba(201,169,98,0.15) 0%, transparent 100%)',
          opacity: 0.04,
          animation: 'breathe 7s ease-in-out infinite',
          animationDelay: '5s',
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,10,12,0.4) 100%)',
        }}
      />
    </div>
  )
}
