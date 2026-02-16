import Link from 'next/link'
import Header from '@/components/Header'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-lg">
          {/* Lot number style */}
          <div className="inline-block mb-6">
            <span className="text-[10px] text-obsidian-600 uppercase tracking-[0.3em] block mb-1">Lot</span>
            <span className="heading-display text-8xl text-gradient-gold leading-none">404</span>
          </div>

          <h1 className="text-xl text-obsidian-200 font-medium mb-3">
            This lot doesn&apos;t exist
          </h1>
          <p className="text-obsidian-500 text-sm mb-10">
            The page you&apos;re looking for may have been moved, removed, or never existed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-8 py-3 text-center font-semibold text-sm text-[#0a0a0a] hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)' }}
            >
              Browse Auctions
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 text-center text-sm text-obsidian-400 border border-obsidian-800 hover:border-obsidian-600 hover:text-obsidian-200 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
