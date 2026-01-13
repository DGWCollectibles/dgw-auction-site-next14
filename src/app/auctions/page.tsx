import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

interface Auction {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  starts_at: string;
  ends_at: string;
  status: "draft" | "preview" | "live" | "ended";
  category: string | null;
  lot_count?: number;
}

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function formatStartsIn(startsAt: string): string {
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff <= 0) return "Started";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  return `Starts in ${hours}h`;
}

function getCategoryIcon(category: string | null): string {
  const icons: Record<string, string> = {
    pokemon: "🎴",
    watches: "⌚",
    sports: "⚾",
    jewelry: "💎",
    luxury: "✨",
  };
  return icons[category || ""] || "✨";
}

export default async function AuctionsPage() {
  const supabase = await createClient();

  // Fetch all published auctions (not draft)
  const { data: auctions } = await supabase
    .from("auctions")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  // Get lot counts for each auction
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

  const liveAuctions = auctionsWithCounts.filter(a => a.status === "live");
  const upcomingAuctions = auctionsWithCounts.filter(a => a.status === "preview");
  const pastAuctions = auctionsWithCounts.filter(a => a.status === "ended");

  return (
    <main className="min-h-screen pb-20 md:pb-0">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="hero-orb absolute top-0 left-1/2 -translate-x-1/2 opacity-30" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="section-label">Browse</span>
            <h1 className="heading-display text-5xl sm:text-6xl mb-6">
              <span className="text-gradient-gold">All Auctions</span>
            </h1>
            <p className="text-lg text-obsidian-400">
              Discover curated auctions featuring authenticated collectibles, 
              luxury timepieces, and investment-grade items.
            </p>
          </div>
        </div>
      </section>

      {/* Live Auctions */}
      {liveAuctions.length > 0 && (
        <section className="py-16 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-10">
              <span className="live-dot" />
              <h2 className="heading-display text-3xl">Live Now</h2>
              <span className="text-obsidian-500 text-sm ml-2">({liveAuctions.length})</span>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {liveAuctions.map((auction, index) => (
                <AuctionCard key={auction.id} auction={auction} index={index} isLive />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Auctions */}
      {upcomingAuctions.length > 0 && (
        <section className="py-16 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-dgw-gold/30 to-transparent" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-10">
              <span className="text-dgw-gold text-xl">◆</span>
              <h2 className="heading-display text-3xl">Upcoming</h2>
              <span className="text-obsidian-500 text-sm ml-2">({upcomingAuctions.length})</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingAuctions.map((auction, index) => (
                <AuctionCard key={auction.id} auction={auction} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Past Auctions */}
      {pastAuctions.length > 0 && (
        <section className="py-16 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-obsidian-700/50 to-transparent" />
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-10">
              <h2 className="heading-display text-3xl text-obsidian-400">Past Auctions</h2>
              <span className="text-obsidian-600 text-sm ml-2">({pastAuctions.length})</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastAuctions.map((auction, index) => (
                <AuctionCard key={auction.id} auction={auction} index={index} isPast />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {auctionsWithCounts.length === 0 && (
        <section className="py-32">
          <div className="max-w-md mx-auto text-center px-6">
            <span className="text-6xl mb-6 block">🎴</span>
            <h2 className="heading-display text-2xl mb-4">No Auctions Yet</h2>
            <p className="text-obsidian-400 mb-8">
              Check back soon for upcoming auctions featuring premium collectibles.
            </p>
            <Link href="/" className="btn btn-secondary">
              Back to Home
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function AuctionCard({ 
  auction, 
  index, 
  isLive = false,
  isPast = false 
}: { 
  auction: Auction;
  index: number;
  isLive?: boolean;
  isPast?: boolean;
}) {
  return (
    <Link
      href={`/auctions/${auction.slug}`}
      className={`group auction-card card card-hover relative ${isPast ? 'opacity-60 hover:opacity-100' : ''}`}
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
      <div className="aspect-[16/10] bg-gradient-to-br from-obsidian-800 to-obsidian-900 relative overflow-hidden">
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
              {getCategoryIcon(auction.category)}
            </span>
          </div>
        )}
        
        {/* Status badge */}
        <div className="absolute top-4 left-4">
          {isLive ? (
            <span className="badge badge-live">
              <span className="live-dot" style={{ width: 4, height: 4 }} />
              Live
            </span>
          ) : isPast ? (
            <span className="badge" style={{ background: 'rgba(100,100,100,0.3)', border: '1px solid rgba(150,150,150,0.3)', color: '#999' }}>
              Ended
            </span>
          ) : (
            <span className="badge badge-gold">Preview</span>
          )}
        </div>
        
        {/* Timer */}
        {!isPast && (
          <div className="absolute bottom-4 right-4 bid-indicator">
            <svg className="w-4 h-4 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="timer">
              {isLive ? formatTimeRemaining(auction.ends_at) : formatStartsIn(auction.starts_at)}
            </span>
          </div>
        )}

        {/* Lot count */}
        <div className="absolute bottom-4 left-4 bid-indicator">
          <span className="text-obsidian-300">{auction.lot_count || 0} lots</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 bg-gradient-to-b from-obsidian-800/50 to-obsidian-900/50">
        <h3 className="heading-display text-2xl text-obsidian-100 group-hover:text-dgw-gold transition-colors mb-2">
          {auction.title}
        </h3>
        {auction.description && (
          <p className="text-sm text-obsidian-500 line-clamp-2">
            {auction.description}
          </p>
        )}
      </div>
    </Link>
  );
}
