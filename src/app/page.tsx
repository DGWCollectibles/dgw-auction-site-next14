import Link from "next/link";
import Header from "@/components/Header";
import HeroAuctionCard from "@/components/HeroAuctionCard";
import { createClient } from "@/lib/supabase/server";

interface Auction {
  id: string;
  title: string;
  slug: string;
  cover_image: string | null;
  ends_at: string;
  status: string;
  lot_count?: number;
}

interface Lot {
  id: string;
  lot_number: number;
  title: string;
  current_bid: number | null;
  starting_bid: number;
  estimate_low: number | null;
  estimate_high: number | null;
  images: string[];
  auction_id: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return "$" + (amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1) + "K";
  }
  return "$" + amount.toLocaleString();
}

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default async function Home() {
  const supabase = await createClient();

  // Fetch live and preview auctions
  const { data: auctions } = await supabase
    .from("auctions")
    .select("*")
    .in("status", ["live", "preview"])
    .order("created_at", { ascending: false })
    .limit(4);

  // Get lot counts for auctions
  const auctionsWithCounts: Auction[] = [];
  if (auctions) {
    for (const auction of auctions) {
      const { count } = await supabase
        .from("lots")
        .select("*", { count: "exact", head: true })
        .eq("auction_id", auction.id);
      
      auctionsWithCounts.push({
        ...auction,
        lot_count: count || 0,
      });
    }
  }

  // Fetch featured lots (from live auctions)
  const { data: featuredLots } = await supabase
    .from("lots")
    .select("*, auctions!inner(status, ends_at)")
    .eq("auctions.status", "live")
    .order("starting_bid", { ascending: false })
    .limit(4);

  const hasAuctions = auctionsWithCounts.length > 0;
  const liveAuction = auctionsWithCounts.find(a => a.status === 'live') || null;

  // Get featured images from live auction lots
  let heroImages: string[] = [];
  if (liveAuction) {
    const { data: heroLots } = await supabase
      .from('lots')
      .select('images')
      .eq('auction_id', liveAuction.id)
      .order('lot_number', { ascending: true })
      .limit(4);
    heroImages = (heroLots || []).map(l => l.images?.[0]).filter(Boolean);
  }
  const hasLots = featuredLots && featuredLots.length > 0;

  return (
    <main className="min-h-screen pb-20 md:pb-0">
      <Header />

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Hero orb */}
        <div className="hero-orb absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-3 px-6 py-3 border border-obsidian-700/50 mb-10 animate-fade-up relative overflow-hidden"
            style={{ background: 'rgba(20,20,23,0.5)' }}
          >
            {hasAuctions && auctionsWithCounts.some(a => a.status === 'live') ? (
              <>
                <span className="live-dot" />
                <span className="text-sm font-medium text-obsidian-300 tracking-wider">Live auctions happening now</span>
              </>
            ) : (
              <span className="text-sm font-medium text-obsidian-300 tracking-wider">Premium collectibles auctions</span>
            )}
            <span 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(201,169,98,0.08), transparent)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
          </div>
          
          {/* Heading */}
          <h1 
            className="heading-display text-5xl sm:text-6xl lg:text-7xl mb-8 animate-fade-up" 
            style={{ animationDelay: "0.1s" }}
          >
            Curated Auctions for
            <br />
            <span className="text-gradient-gold">Exceptional Collectibles</span>
          </h1>
          
          {/* Diamond divider */}
          <div className="diamond-divider mb-8 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <span className="animate-diamond-pulse">◆</span>
            <div className="line" />
            <span className="animate-diamond-pulse" style={{ animationDelay: '0.3s' }}>◆</span>
            <div className="line" />
            <span className="animate-diamond-pulse" style={{ animationDelay: '0.6s' }}>◆</span>
          </div>
          
          {/* Subtitle */}
          <p 
            className="text-lg sm:text-xl text-obsidian-400 max-w-2xl mx-auto mb-12 animate-fade-up" 
            style={{ animationDelay: "0.2s" }}
          >
            Discover rare Pokémon cards, luxury timepieces, and investment-grade collectibles. 
            Bid with confidence on authenticated items.
          </p>
          
          {/* CTA */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-up" 
            style={{ animationDelay: "0.3s" }}
          >
            <Link href="/auctions" className="btn btn-primary text-base px-10 py-4">
              Explore Auctions
            </Link>
            <Link href="/auth/signup" className="btn btn-secondary text-base px-10 py-4">
              Create Account
            </Link>
          </div>

          {/* Featured Live Auction Card */}
          {liveAuction && (
            <HeroAuctionCard
              title={liveAuction.title}
              slug={liveAuction.slug}
              coverImage={liveAuction.cover_image}
              endsAt={liveAuction.ends_at}
              lotCount={liveAuction.lot_count || 0}
              status={liveAuction.status}
              featuredImages={heroImages}
            />
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: "1s" }}>
          <span className="text-[0.6rem] tracking-[0.4em] uppercase text-obsidian-600">Explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-dgw-gold to-transparent animate-pulse" />
        </div>
      </section>

      {/* ==================== LIVE AUCTIONS ==================== */}
      {hasAuctions && (
        <section className="py-24 relative overflow-hidden">
          {/* Section glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-dgw-gold/5 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-12">
              <div>
                <span className="section-label">Current</span>
                <h2 className="heading-display text-4xl">
                  {auctionsWithCounts.some(a => a.status === 'live') ? 'Live Auctions' : 'Upcoming Auctions'}
                </h2>
                <div className="gold-line" />
              </div>
              <Link href="/auctions" className="btn btn-ghost hidden sm:flex">
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {auctionsWithCounts.map((auction, index) => (
                <Link
                  key={auction.id}
                  href={`/auctions/${auction.slug}`}
                  className="auction-card group card card-hover relative"
                  style={{
                    animation: 'riseUp 0.6s ease-out forwards',
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                  }}
                >
                  {/* Shine effect */}
                  <div className="auction-card-shine" />
                  
                  {/* Corner accents */}
                  <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-dgw-gold/20 z-10 transition-colors group-hover:border-dgw-gold/50" />
                  <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-dgw-gold/20 z-10 transition-colors group-hover:border-dgw-gold/50" />
                  <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-dgw-gold/20 z-10 transition-colors group-hover:border-dgw-gold/50" />
                  <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-dgw-gold/20 z-10 transition-colors group-hover:border-dgw-gold/50" />
                  
                  {/* Image */}
                  <div className="aspect-[16/10] bg-gradient-to-br from-obsidian-800 to-obsidian-900 relative">
                    {auction.cover_image ? (
                      <img 
                        src={auction.cover_image} 
                        alt={auction.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span 
                          className="text-7xl opacity-20 transition-all duration-500 group-hover:opacity-30 group-hover:scale-110"
                          style={{ animation: 'gentleFloat 6s ease-in-out infinite' }}
                        >
                          🎴
                        </span>
                      </div>
                    )}
                    
                    {/* Status badge */}
                    <div className="absolute top-4 left-4">
                      {auction.status === 'live' ? (
                        <span className="badge badge-live">
                          <span className="live-dot" style={{ width: 4, height: 4 }} />
                          Live
                        </span>
                      ) : (
                        <span className="badge badge-gold">Preview</span>
                      )}
                    </div>
                    
                    {/* Timer */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-950/90 backdrop-blur-sm rounded text-xs">
                      <svg className="w-4 h-4 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-obsidian-200">{formatTimeRemaining(auction.ends_at)}</span>
                    </div>

                    {/* Lot count */}
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-obsidian-950/90 backdrop-blur-sm rounded text-xs">
                      <span className="text-obsidian-300">{auction.lot_count || 0} lots</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 bg-gradient-to-b from-obsidian-800/50 to-obsidian-900/50">
                    <h3 className="heading-display text-2xl text-obsidian-100 group-hover:text-dgw-gold transition-colors">
                      {auction.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center sm:hidden">
              <Link href="/auctions" className="btn btn-ghost">
                View All Auctions
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ==================== FEATURED LOTS ==================== */}
      {hasLots && (
        <section className="py-24 bg-obsidian-900/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="section-label">Don&apos;t Miss</span>
              <h2 className="heading-display text-4xl">Featured Lots</h2>
              <div className="gold-line" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredLots.map((lot: any, index: number) => (
                <Link
                  key={lot.id}
                  href={`/lots/${lot.id}`}
                  className="lot-card group"
                  style={{
                    animation: 'riseUp 0.5s ease-out forwards',
                    animationDelay: `${index * 0.08}s`,
                    opacity: 0,
                  }}
                >
                  {/* Image */}
                  <div className="lot-card-image">
                    {lot.images && lot.images.length > 0 ? (
                      <img 
                        src={lot.images[0]} 
                        alt={lot.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl opacity-20">🎴</span>
                      </div>
                    )}
                    <div className="lot-card-glow" />
                    <div className="absolute top-2 left-2 badge badge-gold text-[0.6rem]">
                      Lot {lot.lot_number}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="lot-card-body">
                    <h3 className="lot-card-title">{lot.title}</h3>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <p className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 mb-0.5">
                          {lot.current_bid ? 'Current Bid' : 'Starting Bid'}
                        </p>
                        <p className="lot-card-price">
                          {formatCurrency(lot.current_bid || lot.starting_bid)}
                        </p>
                      </div>
                      {lot.estimate_low && lot.estimate_high && (
                        <div className="text-right">
                          <p className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 mb-0.5">Est.</p>
                          <p className="text-sm text-obsidian-400">
                            {formatCurrency(lot.estimate_low)} - {formatCurrency(lot.estimate_high)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== EMPTY STATE ==================== */}
      {!hasAuctions && (
        <section className="py-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-dgw-gold/5 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-xl mx-auto px-6 text-center">
            <span className="text-6xl mb-6 block">🎴</span>
            <h2 className="heading-display text-3xl mb-4">Coming Soon</h2>
            <p className="text-obsidian-400 mb-8">
              Our first auction is being prepared. Create an account to get notified when we go live!
            </p>
            <Link href="/auth/signup" className="btn btn-primary">
              Get Notified
            </Link>
          </div>
        </section>
      )}

      {/* ==================== CTA ==================== */}
      <section className="py-28 relative overflow-hidden">
        <div className="hero-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.5 }} />
        
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <span className="section-label">Stay Ahead</span>
          <h2 className="heading-display text-4xl sm:text-5xl mb-6">
            Never Miss a Bid
          </h2>
          <div className="gold-line" />
          <p className="text-lg text-obsidian-400 mb-12 max-w-2xl mx-auto">
            Get real-time SMS alerts when you&apos;re outbid, notifications when 
            auctions are ending, and instant updates for items you&apos;ve won.
          </p>
          <Link href="/auth/signup" className="btn btn-primary text-base px-12 py-4">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-dgw-gold/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <Link href="/" className="inline-block mb-6">
                <span className="heading-display text-3xl text-gradient-gold">DGW</span>
                <span className="block text-[0.65rem] text-obsidian-600 font-semibold tracking-[0.3em] uppercase mt-1">
                  Auctions
                </span>
              </Link>
              <p className="text-sm text-obsidian-500 leading-relaxed mb-6">
                Premium auction platform for authenticated collectibles and luxury items.
              </p>
              
              {/* Decorative diamonds */}
              <div className="flex items-center gap-2 text-dgw-gold/30">
                <span className="animate-diamond-pulse">◆</span>
                <span className="w-8 h-px bg-dgw-gold/20" />
                <span className="animate-diamond-pulse" style={{ animationDelay: '0.5s' }}>◆</span>
                <span className="w-8 h-px bg-dgw-gold/20" />
                <span className="animate-diamond-pulse" style={{ animationDelay: '1s' }}>◆</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-[0.7rem] font-semibold text-dgw-gold uppercase tracking-[0.2em] mb-6">Auctions</h4>
              <ul className="space-y-4 text-sm text-obsidian-500">
                <li><Link href="/auctions" className="hover:text-dgw-gold transition-colors">All Auctions</Link></li>
                <li><Link href="/auctions?status=live" className="hover:text-dgw-gold transition-colors">Live Now</Link></li>
                <li><Link href="/auctions?status=upcoming" className="hover:text-dgw-gold transition-colors">Upcoming</Link></li>
                <li><Link href="/results" className="hover:text-dgw-gold transition-colors">Past Results</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-[0.7rem] font-semibold text-dgw-gold uppercase tracking-[0.2em] mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-obsidian-500">
                <li><Link href="/how-it-works" className="hover:text-dgw-gold transition-colors">How It Works</Link></li>
                <li><Link href="/faq" className="hover:text-dgw-gold transition-colors">FAQ</Link></li>
                <li><Link href="/search" className="hover:text-dgw-gold transition-colors">Browse Lots</Link></li>
                <li><Link href="/contact" className="hover:text-dgw-gold transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-[0.7rem] font-semibold text-dgw-gold uppercase tracking-[0.2em] mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-obsidian-500">
                <li><Link href="/terms" className="hover:text-dgw-gold transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-dgw-gold transition-colors">Privacy Policy</Link></li>
                <li><Link href="/buyer-terms" className="hover:text-dgw-gold transition-colors">Buyer Terms</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="divider mb-10" />
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-obsidian-600">
              © {new Date().getFullYear()} DGW Collectibles & Estates. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-obsidian-600 hover:text-dgw-gold transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </Link>
              <Link href="#" className="text-obsidian-600 hover:text-dgw-gold transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ==================== MOBILE TAB BAR ==================== */}
      <nav className="tab-bar md:hidden">
        <div className="flex justify-around">
          <Link href="/" className="tab-item tab-item-active">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </Link>
          <Link href="/auctions" className="tab-item">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Auctions</span>
          </Link>
          <Link href="/search" className="tab-item">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
          </Link>
          <Link href="/account/watchlist" className="tab-item">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Saved</span>
          </Link>
          <Link href="/account" className="tab-item">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Account</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}
