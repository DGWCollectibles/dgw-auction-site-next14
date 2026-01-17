'use client'

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

// Bid increment chart (Auction Ninja style)
const bidIncrements = [
  { min: 0, max: 21, increment: 1 },
  { min: 21, max: 60, increment: 2 },
  { min: 61, max: 200, increment: 5 },
  { min: 201, max: 500, increment: 10 },
  { min: 501, max: 1000, increment: 25 },
  { min: 1001, max: 2500, increment: 50 },
  { min: 2501, max: 5000, increment: 100 },
  { min: 5001, max: 10000, increment: 500 },
  { min: 10001, max: 25000, increment: 1000 },
  { min: 25001, max: 60000, increment: 2500 },
  { min: 60001, max: 120000, increment: 5000 },
  { min: 120001, max: 200000, increment: 7500 },
  { min: 200001, max: 350000, increment: 10000 },
  { min: 350001, max: null, increment: 15000 },
];

function getMinBid(currentBid: number): number {
  const tier = bidIncrements.find(t => 
    currentBid >= t.min && (t.max === null || currentBid < t.max)
  );
  return currentBid + (tier?.increment || 1);
}

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
  buyers_premium_percent: number;
  lot_close_interval_seconds: number;
  terms_conditions: string | null;
}

interface Lot {
  id: string;
  lot_number: number;
  title: string;
  description: string | null;
  category: string | null;
  current_bid: number | null;
  starting_bid: number;
  estimate_low: number | null;
  estimate_high: number | null;
  bid_count: number;
  ends_at: string | null;
  status: string;
  images: string[];
  high_bidder_id: string | null;
  extended_count?: number;
}

type SortOption = 'lot_number' | 'price_high' | 'price_low' | 'bids_high' | 'bids_low' | 'ending_soon';
type FilterOption = 'all' | 'ending_soon' | 'no_bids' | 'my_bids' | 'winning' | 'outbid';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Floating gold dust particles
function FloatingDust() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            background: `rgba(201, 169, 98, ${Math.random() * 0.25 + 0.1})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `dust-float ${15 + Math.random() * 25}s linear infinite`,
            animationDelay: `${Math.random() * 15}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes dust-float {
          0% {
            opacity: 0;
            transform: translateY(100vh) translateX(0);
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
          }
        }
      `}</style>
    </div>
  );
}

// Gold sparkle celebration component
function GoldSparkles({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
    type: 'star' | 'diamond' | 'circle';
  }>>([]);

  useEffect(() => {
    if (active) {
      const newParticles = [];
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 10 + 5,
          delay: Math.random() * 0.6,
          duration: Math.random() * 1.2 + 0.8,
          type: ['star', 'diamond', 'circle'][Math.floor(Math.random() * 3)] as 'star' | 'diamond' | 'circle',
        });
      }
      setParticles(newParticles);
      
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `sparkle-burst ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        >
          {p.type === 'star' && (
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 6px rgba(201,169,98,0.8))' }}>
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="#C9A962" />
            </svg>
          )}
          {p.type === 'diamond' && (
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 6px rgba(212,188,125,0.8))' }}>
              <path d="M12 0L24 12L12 24L0 12L12 0Z" fill="#D4BC7D" />
            </svg>
          )}
          {p.type === 'circle' && (
            <div 
              className="rounded-full"
              style={{ 
                width: p.size * 0.4, 
                height: p.size * 0.4,
                background: '#C9A962',
                filter: 'drop-shadow(0 0 4px rgba(201,169,98,0.7))',
              }}
            />
          )}
        </div>
      ))}
      <style jsx>{`
        @keyframes sparkle-burst {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(120vh) rotate(540deg) scale(0.3);
          }
        }
      `}</style>
    </div>
  );
}

// Live countdown component
function LiveCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const isEnded = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isEnded) {
    return <span className="text-obsidian-400">Auction Ended</span>;
  }

  return (
    <div className="flex gap-3">
      <div className="text-center">
        <span className="heading-display text-3xl text-white block">{timeLeft.days}</span>
        <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500">Days</span>
      </div>
      <span className="heading-display text-3xl text-dgw-gold/50">:</span>
      <div className="text-center">
        <span className="heading-display text-3xl text-white block">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500">Hours</span>
      </div>
      <span className="heading-display text-3xl text-dgw-gold/50">:</span>
      <div className="text-center">
        <span className="heading-display text-3xl text-white block">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500">Mins</span>
      </div>
      <span className="heading-display text-3xl text-dgw-gold/50">:</span>
      <div className="text-center">
        <span className="heading-display text-3xl text-white block">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500">Secs</span>
      </div>
    </div>
  );
}

// Terms & Conditions Modal
function TermsModal({ isOpen, onClose, content }: { isOpen: boolean; onClose: () => void; content: string | null }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-obsidian-950/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-gradient-to-b from-obsidian-900 to-obsidian-950 border border-dgw-gold/20 overflow-hidden">
        <div className="absolute top-2 left-2 w-6 h-6 border-t border-l border-dgw-gold/40" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t border-r border-dgw-gold/40" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-dgw-gold/40" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b border-r border-dgw-gold/40" />
        
        <div className="sticky top-0 bg-obsidian-900/95 backdrop-blur-sm border-b border-dgw-gold/10 px-6 py-4 flex items-center justify-between">
          <h2 className="heading-display text-2xl text-gradient-gold">Terms & Conditions</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-obsidian-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(80vh-80px)] text-obsidian-300 text-sm leading-relaxed whitespace-pre-wrap">
          {content || "No specific terms have been set for this auction. Please contact us if you have questions."}
        </div>
      </div>
    </div>
  );
}

// Bid Increment Chart Modal
function BidIncrementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-obsidian-950/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-gradient-to-b from-obsidian-900 to-obsidian-950 border border-dgw-gold/20 overflow-hidden">
        <div className="absolute top-2 left-2 w-6 h-6 border-t border-l border-dgw-gold/40" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t border-r border-dgw-gold/40" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-dgw-gold/40" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b border-r border-dgw-gold/40" />
        
        <div className="border-b border-dgw-gold/10 px-6 py-4 flex items-center justify-between">
          <h2 className="heading-display text-xl text-gradient-gold">Bid Increments</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-obsidian-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-obsidian-800">
                <th className="text-left py-2 text-obsidian-400 font-medium">Bid Value</th>
                <th className="text-right py-2 text-obsidian-400 font-medium">Increment</th>
              </tr>
            </thead>
            <tbody className="text-obsidian-300">
              {bidIncrements.map((tier, i) => (
                <tr key={i} className="border-b border-obsidian-800/50">
                  <td className="py-2">
                    {tier.max === null 
                      ? `> ${formatCurrency(tier.min)}`
                      : tier.min === 0
                        ? `< ${formatCurrency(tier.max)}`
                        : `${formatCurrency(tier.min)} - ${formatCurrency(tier.max)}`
                    }
                  </td>
                  <td className="py-2 text-right text-dgw-gold">{formatCurrency(tier.increment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AuctionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const slug = params.id; // param is "id" but value is the slug
  const [auction, setAuction] = useState<Auction | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);
  const [incrementsOpen, setIncrementsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('lot_number');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [user, setUser] = useState<any>(null);
  const [userOutbidLots, setUserOutbidLots] = useState<Set<string>>(new Set());
  const [userBidLots, setUserBidLots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      const supabase = createClient();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch auction by slug
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('slug', slug)
        .single();

      if (auctionError || !auctionData) {
        setLoading(false);
        return;
      }

      setAuction(auctionData);

      // Fetch lots for this auction
      const { data: lotsData } = await supabase
        .from('lots')
        .select('*')
        .eq('auction_id', auctionData.id)
        .order('lot_number', { ascending: true });

      // Fetch winning bids for all lots (ordered by most recent)
      const lotIds = (lotsData || []).map(lot => lot.id);
      const { data: winningBids } = await supabase
        .from('bids')
        .select('lot_id, user_id, created_at')
        .in('lot_id', lotIds)
        .eq('is_winning', true)
        .order('created_at', { ascending: false });

      // Create a map of lot_id -> high_bidder_id (first/most recent wins)
      const highBidderMap: Record<string, string> = {};
      (winningBids || []).forEach(bid => {
        if (!highBidderMap[bid.lot_id]) {
          highBidderMap[bid.lot_id] = bid.user_id;
        }
      });

      // Find lots where user has bid but is not winning (outbid)
      if (user) {
        const { data: userBids } = await supabase
          .from('bids')
          .select('lot_id')
          .eq('user_id', user.id)
          .in('lot_id', lotIds);
        
        const userBidLotIds = new Set((userBids || []).map(b => b.lot_id));
        const outbidLots = new Set<string>();
        
        userBidLotIds.forEach(lotId => {
          if (highBidderMap[lotId] !== user.id) {
            outbidLots.add(lotId);
          }
        });
        
        setUserOutbidLots(outbidLots);
        setUserBidLots(userBidLotIds);
      }

      // Add bid_count and high_bidder_id
      const lotsWithBidCount = (lotsData || []).map(lot => ({
        ...lot,
        bid_count: lot.bid_count || 0,
        ends_at: auctionData.ends_at,
        high_bidder_id: highBidderMap[lot.id] || null,
      }));

      setLots(lotsWithBidCount);
      setLoading(false);
    };

    fetchData();
  }, [slug]);

  // Realtime subscription for live bid updates
  useEffect(() => {
    if (!auction) return;

    const supabase = createClient();
    
    // Subscribe to changes on lots for this auction
    const channel = supabase
      .channel('lot-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lots',
          filter: `auction_id=eq.${auction.id}`,
        },
        async (payload) => {
          const updatedLot = payload.new as any;
          
          // Fetch the current winning bidder for this lot
          const { data: winningBid } = await supabase
            .from('bids')
            .select('user_id')
            .eq('lot_id', updatedLot.id)
            .eq('is_winning', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Update local state (including ends_at for soft-close)
          setLots(prevLots => prevLots.map(lot => 
            lot.id === updatedLot.id 
              ? { 
                  ...lot, 
                  current_bid: updatedLot.current_bid, 
                  bid_count: updatedLot.bid_count,
                  high_bidder_id: winningBid?.user_id || lot.high_bidder_id,
                  ends_at: updatedLot.ends_at,
                  extended_count: updatedLot.extended_count,
                }
              : lot
          ));
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction]);

  // Handler for when a bid is placed - updates local state immediately
  const handleBidPlaced = (lotId: string, newBid: number, bidderId: string, newBidCount?: number, newEndsAt?: string, newExtendedCount?: number) => {
    setLots(prevLots => prevLots.map(lot => 
      lot.id === lotId 
        ? { 
            ...lot, 
            current_bid: newBid, 
            bid_count: newBidCount !== undefined ? newBidCount : (lot.bid_count || 0) + 1, 
            high_bidder_id: bidderId,
            ends_at: newEndsAt || lot.ends_at,
            extended_count: newExtendedCount ?? lot.extended_count
          }
        : lot
    ));
  };

  // Filter and sort lots
  const filteredAndSortedLots = useMemo(() => {
    let filtered = lots;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lot => 
        lot.title.toLowerCase().includes(query) ||
        (lot.description?.toLowerCase() || '').includes(query) ||
        (lot.category?.toLowerCase() || '').includes(query) ||
        lot.lot_number.toString().includes(query)
      );
    }
    
    // Category/status filters
    switch (filterBy) {
      case 'ending_soon':
        filtered = filtered.filter(lot => {
          if (!lot.ends_at) return false;
          const timeLeft = new Date(lot.ends_at).getTime() - Date.now();
          return timeLeft > 0 && timeLeft <= 60 * 60 * 1000; // 1 hour
        });
        break;
      case 'no_bids':
        filtered = filtered.filter(lot => lot.bid_count === 0);
        break;
      case 'my_bids':
        filtered = filtered.filter(lot => userBidLots.has(lot.id));
        break;
      case 'winning':
        filtered = filtered.filter(lot => user && lot.high_bidder_id === user.id);
        break;
      case 'outbid':
        filtered = filtered.filter(lot => userOutbidLots.has(lot.id));
        break;
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'lot_number':
          return a.lot_number - b.lot_number;
        case 'price_high':
          return (b.current_bid || b.starting_bid) - (a.current_bid || a.starting_bid);
        case 'price_low':
          return (a.current_bid || a.starting_bid) - (b.current_bid || b.starting_bid);
        case 'bids_high':
          return b.bid_count - a.bid_count;
        case 'bids_low':
          return a.bid_count - b.bid_count;
        case 'ending_soon':
          const aTime = a.ends_at ? new Date(a.ends_at).getTime() : Infinity;
          const bTime = b.ends_at ? new Date(b.ends_at).getTime() : Infinity;
          return aTime - bTime;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [lots, searchQuery, sortBy, filterBy, user, userBidLots, userOutbidLots]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-dgw-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-obsidian-400">Loading auction...</p>
        </div>
      </main>
    );
  }
  
  if (!auction) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-display text-4xl mb-4">Auction Not Found</h1>
          <Link href="/auctions" className="text-dgw-gold hover:underline">View All Auctions</Link>
        </div>
      </main>
    );
  }

  const isLive = auction.status === "live";
  const isPreview = auction.status === "preview";
  const isEnded = auction.status === "ended";

  return (
    <main className="min-h-screen pb-20 md:pb-0 bg-[#0a0a0a] relative overflow-hidden">
      <Header />
      <FloatingDust />
      
      {/* Luxury ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-radial from-dgw-gold/[0.06] via-transparent to-transparent blur-3xl" />
      </div>

      {/* Hero Image Section */}
      <section className="relative pt-20">
        <div className="relative aspect-[3/2] max-h-[500px] overflow-hidden">
          {auction.cover_image ? (
            <img src={auction.cover_image} alt={auction.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a1612 0%, #0a0a0a 100%)' }}>
              <span className="text-[120px] opacity-10">🎴</span>
            </div>
          )}
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/30 via-transparent to-[#0a0a0a]/30" />
          
          <div className="absolute top-6 left-6">
            {isLive && (
              <span className="badge badge-live text-sm px-4 py-2">
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                Live Now
              </span>
            )}
            {isPreview && <span className="badge badge-gold text-sm px-4 py-2">Preview</span>}
            {isEnded && <span className="badge text-sm px-4 py-2" style={{ background: 'rgba(100,100,100,0.5)', color: '#999' }}>Ended</span>}
          </div>
        </div>
      </section>

      {/* Auction Info Section */}
     <section className="relative pb-12 -mt-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-3 text-sm text-obsidian-500 mb-4">
            <Link href="/" className="hover:text-dgw-gold transition-colors duration-300">Home</Link>
            <span className="text-dgw-gold/40">◆</span>
            <Link href="/auctions" className="hover:text-dgw-gold transition-colors duration-300">Auctions</Link>
            <span className="text-dgw-gold/40">◆</span>
            <span className="text-dgw-gold truncate max-w-[200px]">{auction.title}</span>
          </nav>

          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <h1 className="heading-display text-3xl sm:text-4xl lg:text-5xl mb-4">
                <span className="text-gradient-gold">{auction.title}</span>
              </h1>
              <p className="text-base text-obsidian-400 leading-relaxed mb-4 max-w-2xl">{auction.description}</p>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => setTermsOpen(true)} className="inline-flex items-center gap-2 text-sm text-dgw-gold hover:text-dgw-gold-light transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Terms & Conditions
                </button>
                <button onClick={() => setIncrementsOpen(true)} className="inline-flex items-center gap-2 text-sm text-dgw-gold hover:text-dgw-gold-light transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Bid Increments
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="relative p-6" style={{ background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%)' }}>
                <div className="absolute inset-0 border border-dgw-gold/20 pointer-events-none" />
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-dgw-gold/50" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-dgw-gold/50" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-dgw-gold/50" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-dgw-gold/50" />
                
                {/* Breathing glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-dgw-gold/[0.03] to-transparent animate-breathe pointer-events-none" />

                {isLive && (
                  <div className="mb-5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500 block mb-2">Auction Ends In</span>
                    <LiveCountdown endsAt={auction.ends_at} />
                  </div>
                )}

                {isPreview && (
                  <div className="mb-5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500 block mb-2">Auction Starts</span>
                    <p className="text-obsidian-200">{formatDate(auction.starts_at)}</p>
                  </div>
                )}

                {isEnded && (
                  <div className="mb-5">
                    <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500 block mb-2">Auction Ended</span>
                    <p className="text-obsidian-200">{formatDate(auction.ends_at)}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-obsidian-800">
                  <div>
                    <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500 block mb-1">Total Lots</span>
                    <span className="heading-display text-2xl text-white">{lots.length}</span>
                  </div>
                  <div>
                    <span className="text-[0.6rem] uppercase tracking-widest text-obsidian-500 block mb-1">Buyer&apos;s Premium</span>
                    <span className="heading-display text-2xl text-white">{auction.buyers_premium_percent}%</span>
                  </div>
                </div>

                {!user && !isEnded && (
                  <Link href="/auth/signup" className="btn btn-primary w-full mt-6">
                    Register to Bid
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="sticky top-20 z-30 bg-obsidian-950/95 backdrop-blur-md border-y border-obsidian-800 py-4">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top row: Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
            {/* Search */}
            <div className="relative w-full sm:w-96">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search lots by title, description, or lot #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-obsidian-900/80 border border-obsidian-700/50 text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold/50 transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-obsidian-500 hover:text-obsidian-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort & Results Count */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-obsidian-500">
                {filteredAndSortedLots.length} lot{filteredAndSortedLots.length !== 1 ? 's' : ''}
                {filterBy !== 'all' && ` (filtered)`}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 bg-obsidian-900/80 border border-obsidian-700/50 text-obsidian-200 text-sm focus:outline-none focus:border-dgw-gold/50"
              >
                <option value="lot_number">Sort by Lot #</option>
                <option value="ending_soon">Ending Soonest</option>
                <option value="price_high">Price: High → Low</option>
                <option value="price_low">Price: Low → High</option>
                <option value="bids_high">Most Bids</option>
                <option value="bids_low">Least Bids</option>
              </select>
            </div>
          </div>
          
          {/* Bottom row: Filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterBy('all')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                filterBy === 'all'
                  ? 'bg-dgw-gold text-obsidian-950 font-semibold'
                  : 'bg-obsidian-800/50 text-obsidian-300 hover:bg-obsidian-700/50'
              }`}
            >
              All Lots
            </button>
            <button
              onClick={() => setFilterBy('ending_soon')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                filterBy === 'ending_soon'
                  ? 'bg-red-500 text-white font-semibold'
                  : 'bg-obsidian-800/50 text-obsidian-300 hover:bg-obsidian-700/50'
              }`}
            >
              🔥 Ending Soon
            </button>
            <button
              onClick={() => setFilterBy('no_bids')}
              className={`px-4 py-2 text-sm rounded-full transition-all ${
                filterBy === 'no_bids'
                  ? 'bg-dgw-gold text-obsidian-950 font-semibold'
                  : 'bg-obsidian-800/50 text-obsidian-300 hover:bg-obsidian-700/50'
              }`}
            >
              No Bids Yet
            </button>
            {user && (
              <>
                <button
                  onClick={() => setFilterBy('my_bids')}
                  className={`px-4 py-2 text-sm rounded-full transition-all ${
                    filterBy === 'my_bids'
                      ? 'bg-dgw-gold text-obsidian-950 font-semibold'
                      : 'bg-obsidian-800/50 text-obsidian-300 hover:bg-obsidian-700/50'
                  }`}
                >
                  My Bids ({userBidLots.size})
                </button>
                <button
                  onClick={() => setFilterBy('winning')}
                  className={`px-4 py-2 text-sm rounded-full transition-all ${
                    filterBy === 'winning'
                      ? 'bg-green-500 text-white font-semibold'
                      : 'bg-obsidian-800/50 text-obsidian-300 hover:bg-obsidian-700/50'
                  }`}
                >
                  ✓ Winning
                </button>
                {userOutbidLots.size > 0 && (
                  <button
                    onClick={() => setFilterBy('outbid')}
                    className={`px-4 py-2 text-sm rounded-full transition-all ${
                      filterBy === 'outbid'
                        ? 'bg-red-500 text-white font-semibold'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    ⚠ Outbid ({userOutbidLots.size})
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Lots Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6">
          {filteredAndSortedLots.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="heading-display text-xl mb-2">No lots found</h3>
              <p className="text-obsidian-500">
                {lots.length === 0 
                  ? 'No lots have been added to this auction yet.' 
                  : filterBy !== 'all'
                    ? `No lots match the "${filterBy.replace('_', ' ')}" filter.`
                    : 'Try adjusting your search terms.'
                }
              </p>
              <div className="mt-4 flex items-center justify-center gap-4">
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-dgw-gold hover:underline">
                    Clear search
                  </button>
                )}
                {filterBy !== 'all' && (
                  <button onClick={() => setFilterBy('all')} className="text-dgw-gold hover:underline">
                    Show all lots
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAndSortedLots.map((lot, index) => (
                <LotCard 
                  key={lot.id} 
                  lot={lot} 
                  index={index} 
                  user={user}
                  auctionEnded={isEnded}
                  isOutbid={userOutbidLots.has(lot.id)}
                  onBidPlaced={handleBidPlaced}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} content={auction.terms_conditions} />
      <BidIncrementModal isOpen={incrementsOpen} onClose={() => setIncrementsOpen(false)} />
    </main>
  );
}

function LotCard({ 
  lot, 
  index,
  user,
  auctionEnded,
  isOutbid,
  onBidPlaced,
}: { 
  lot: Lot;
  index: number;
  user: any;
  auctionEnded: boolean;
  isOutbid: boolean;
  onBidPlaced: (lotId: string, newBid: number, bidderId: string, newBidCount?: number, newEndsAt?: string, newExtendedCount?: number) => void;
}) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState("");
  const [showCustomBid, setShowCustomBid] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [showIncreaseMax, setShowIncreaseMax] = useState(false);
  const [maxBidAmount, setMaxBidAmount] = useState("");
  
  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  const currentBid = lot.current_bid || lot.starting_bid;
  const minBid = getMinBid(currentBid);
  const isEndingSoon = lot.ends_at ? new Date(lot.ends_at).getTime() - Date.now() < 60 * 60 * 1000 : false;
  const isUserWinning = user && lot.high_bidder_id === user.id;

  useEffect(() => {
    if (!lot.ends_at) return;
    const update = () => setTimeLeft(formatTimeRemaining(lot.ends_at!));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lot.ends_at]);

  // Reset success message after 2 seconds
  useEffect(() => {
    if (bidSuccess) {
      const timer = setTimeout(() => setBidSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [bidSuccess]);

  const placeBid = async (amount: number, isIncreasingMax: boolean = false) => {
    if (!user) {
      router.push('/auth/signup');
      return;
    }

    // If user is already winning and NOT increasing their max, show error
    if (isUserWinning && !isIncreasingMax) {
      setBidError("You're already the high bidder! Use 'Increase Max Bid' to raise your ceiling.");
      setShowConfirm(null);
      return;
    }

    if (amount < minBid && !isIncreasingMax) {
      setBidError(`Minimum bid is ${formatCurrency(minBid)}`);
      return;
    }

    // If increasing max, amount must be higher than current bid
    if (isIncreasingMax && amount <= currentBid) {
      setBidError(`Max bid must be higher than current bid (${formatCurrency(currentBid)})`);
      return;
    }

    setBidding(true);
    setBidError("");
    setShowConfirm(null);
    setShowIncreaseMax(false);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('bids')
        .insert({
          lot_id: lot.id,
          user_id: user.id,
          amount: amount,
          max_bid: amount,
        });

      if (error) throw error;

      // Fetch updated lot (including possibly extended ends_at) AND the actual winning bidder
      const { data: updatedLot } = await supabase
        .from('lots')
        .select('current_bid, bid_count, ends_at, extended_count')
        .eq('id', lot.id)
        .single();
      
      const { data: winningBid } = await supabase
        .from('bids')
        .select('user_id')
        .eq('lot_id', lot.id)
        .eq('is_winning', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (updatedLot && winningBid) {
        onBidPlaced(lot.id, updatedLot.current_bid, winningBid.user_id, updatedLot.bid_count, updatedLot.ends_at, updatedLot.extended_count);
      }
      
      // Show appropriate message
      if (winningBid?.user_id === user.id) {
        setBidSuccess(true);
      } else {
        setBidError("Outbid! Someone has a higher max bid.");
      }
      
      setCustomBidAmount("");
      setMaxBidAmount("");
      setShowCustomBid(false);
    } catch (error: any) {
      console.error('Bid error:', error);
      setBidError(error.message || 'Failed to place bid');
    } finally {
      setBidding(false);
    }
  };

  const handleQuickBid = () => {
    if (!user) {
      router.push('/auth/signup');
      return;
    }
    setShowConfirm(minBid);
  };

  const handleCustomBid = () => {
    const amount = parseInt(customBidAmount);
    if (!amount || amount < minBid) {
      setBidError(`Minimum bid is ${formatCurrency(minBid)}`);
      return;
    }
    setShowConfirm(amount);
  };

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const current = e.targetTouches[0].clientX;
    const diff = current - touchStart;
    // Only track right swipes, max 100px
    if (diff > 0) {
      setSwipeProgress(Math.min(diff / 100, 1));
    }
    setTouchEnd(current);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchEnd - touchStart;
    // If swiped more than 80px to the right, trigger quick bid (but not if already winning)
    if (distance > 80 && user && !auctionEnded && !isUserWinning) {
      setShowConfirm(minBid);
    }
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeProgress(0);
  };

  return (
    <div
      className="group flex flex-col relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,169,98,0.15)]"
      style={{
        animation: 'riseUp 0.4s ease-out forwards',
        animationDelay: `${index * 0.03}s`,
        opacity: 0,
        background: 'linear-gradient(180deg, #1a1612 0%, #0d0b09 100%)',
        border: '1px solid rgba(201, 169, 98, 0.1)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Corner accents */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-dgw-gold/20 z-20 transition-colors group-hover:border-dgw-gold/50" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-dgw-gold/20 z-20 transition-colors group-hover:border-dgw-gold/50" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-dgw-gold/20 z-20 transition-colors group-hover:border-dgw-gold/50" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-dgw-gold/20 z-20 transition-colors group-hover:border-dgw-gold/50" />

      {/* OUTBID Banner */}
      {isOutbid && !auctionEnded && (
        <div className="absolute top-0 left-0 right-0 z-30 overflow-hidden">
          <div 
            className="relative py-1.5 text-center text-[0.65rem] font-bold tracking-[0.2em] uppercase"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.5)',
            }}
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
            />
            <span className="relative text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">⚠ OUTBID</span>
          </div>
        </div>
      )}
      
      {/* Swipe indicator background */}
      {swipeProgress > 0 && !isUserWinning && (
        <div 
          className="absolute inset-y-0 left-0 bg-dgw-gold/20 z-10 flex items-center justify-center transition-all"
          style={{ width: `${swipeProgress * 100}%` }}
        >
          {swipeProgress > 0.5 && (
            <span className="text-dgw-gold font-bold text-sm">
              BID {formatCurrency(minBid)}
            </span>
          )}
        </div>
      )}

      {/* Bid Confirmation Modal */}
      {showConfirm !== null && (
        <div className="absolute inset-0 z-50 bg-obsidian-950/95 flex flex-col items-center justify-center p-4">
          <p className="text-obsidian-400 text-sm mb-2">Set your max bid</p>
          <p className="heading-display text-3xl text-dgw-gold mb-2">{formatCurrency(showConfirm)}</p>
          <p className="text-obsidian-500 text-xs mb-4 text-center max-w-[200px]">
            You&apos;ll only pay what&apos;s needed to stay ahead
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(null)}
              className="px-6 py-2 border border-obsidian-600 text-obsidian-300 hover:border-obsidian-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => placeBid(showConfirm, false)}
              disabled={bidding}
              className="px-6 py-2 bg-dgw-gold text-obsidian-950 font-semibold hover:bg-dgw-gold-light transition-colors disabled:opacity-50"
            >
              {bidding ? 'Placing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {bidSuccess && (
        <div className="absolute inset-0 z-40 bg-green-500/20 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500 text-white px-4 py-2 rounded font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Bid Placed!
          </div>
        </div>
      )}

      {/* Image */}
      <Link href={`/lots/${lot.id}`} className="block relative aspect-square cursor-pointer overflow-hidden" style={{ background: 'linear-gradient(180deg, #141210 0%, #0a0908 100%)' }}>
        {lot.images && lot.images.length > 0 ? (
          <>
            <img src={lot.images[imageIndex]} alt={lot.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            {lot.images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {lot.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); setImageIndex(i); }}
                    className={`w-2 h-2 rounded-full transition-colors ${i === imageIndex ? 'bg-dgw-gold' : 'bg-obsidian-600 hover:bg-obsidian-500'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl opacity-10 group-hover:opacity-20 transition-opacity">🎴</span>
          </div>
        )}
        
        {/* Spotlight effect on hover */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-gradient-to-b from-dgw-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Bottom glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-gradient-to-t from-dgw-gold/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Lot number */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-[#0a0a0a]/90 backdrop-blur-sm border border-dgw-gold/30 text-[0.6rem] font-semibold tracking-[0.2em] text-dgw-gold z-10">
          LOT {lot.lot_number}
        </div>

        {/* Heart/Watchlist */}
        <button 
          onClick={(e) => e.preventDefault()}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-obsidian-500 hover:text-red-400 transition-colors z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </Link>
      
      {/* Content */}
      <div className="flex-1 flex flex-col p-4" style={{ background: 'linear-gradient(180deg, #151310 0%, #0d0b09 100%)' }}>
        <Link href={`/lots/${lot.id}`}>
          <h3 className="text-sm font-medium leading-tight mb-1 line-clamp-2 text-obsidian-100 hover:text-dgw-gold transition-colors duration-300 cursor-pointer">{lot.title}</h3>
        </Link>
        
        {/* Timer */}
        {lot.ends_at && (
          <div className={`text-xs font-semibold mb-2 flex items-center gap-2 ${isEndingSoon ? 'text-red-400' : 'text-dgw-gold'}`}>
            <span>{timeLeft}</span>
            {lot.extended_count && lot.extended_count > 0 && (
              <span className="px-1.5 py-0.5 bg-dgw-gold/20 text-dgw-gold text-[0.6rem] uppercase tracking-wider rounded animate-pulse">
                Extended
              </span>
            )}
          </div>
        )}

        {/* Bid Info */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-obsidian-800">
          <div>
            <span className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 block">
              {lot.bid_count > 0 ? 'Current Bid' : 'Starting Bid'}
            </span>
            <span className="heading-display text-xl text-dgw-gold">{formatCurrency(currentBid)}</span>
          </div>
          <div className="text-right">
            {isUserWinning ? (
              <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                ✓ You&apos;re Winning!
              </span>
            ) : (
              <>
                <span className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 block">Bids</span>
                <span className="text-lg text-obsidian-200">{lot.bid_count || 0}</span>
              </>
            )}
          </div>
        </div>

        {/* Bidding UI */}
        {!auctionEnded && (
          <div className="mt-auto space-y-2">
            {/* You're Winning State - with Increase Max Bid option */}
            {isUserWinning ? (
              <>
                <div className="w-full py-2 bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-sm text-center">
                  ✓ High Bidder
                </div>
                
                {/* Increase Max Bid Toggle */}
                <button
                  onClick={() => setShowIncreaseMax(!showIncreaseMax)}
                  className="w-full text-xs text-obsidian-400 hover:text-obsidian-200 transition-colors py-1"
                >
                  {showIncreaseMax ? 'Hide' : 'Increase Max Bid ▼'}
                </button>

                {/* Increase Max Bid Input */}
                {showIncreaseMax && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-500 text-sm">$</span>
                        <input
                          type="text"
                          placeholder={`Above ${currentBid.toLocaleString()}`}
                          value={maxBidAmount}
                          onChange={(e) => {
                            setBidError("");
                            setMaxBidAmount(e.target.value.replace(/[^0-9]/g, ''));
                          }}
                          className="w-full pl-7 pr-3 py-2 bg-obsidian-900 border border-obsidian-700 text-obsidian-100 text-sm placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const amount = parseInt(maxBidAmount);
                          if (amount > currentBid) {
                            placeBid(amount, true);
                          } else {
                            setBidError(`Must be higher than ${formatCurrency(currentBid)}`);
                          }
                        }}
                        disabled={bidding || !maxBidAmount}
                        className="px-3 py-2 bg-green-600 text-white text-xs font-semibold hover:bg-green-500 transition-colors disabled:opacity-50"
                      >
                        Set
                      </button>
                    </div>
                    <p className="text-[0.6rem] text-obsidian-500 text-center">
                      Set your ceiling. Bid only rises when outbid.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Quick Bid Button - Premium */
              <button
                onClick={handleQuickBid}
                disabled={bidding}
                className="group/btn relative w-full py-3 overflow-hidden disabled:opacity-50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(201,169,98,0.3)]"
                style={{
                  background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2 text-[#0a0a0a] font-bold">
                  {bidding ? (
                    'Placing bid...'
                  ) : user ? (
                    <>
                      <span className="tracking-wider">BID</span>
                      <span className="text-lg">{formatCurrency(minBid)}</span>
                    </>
                  ) : (
                    <span className="tracking-wider">Register to Bid</span>
                  )}
                </span>
              </button>
            )}

            {/* Toggle custom bid - only show if not winning */}
            {user && !isUserWinning && (
              <button
                onClick={() => setShowCustomBid(!showCustomBid)}
                className="w-full text-xs text-obsidian-500 hover:text-obsidian-300 transition-colors py-1"
              >
                {showCustomBid ? 'Hide custom bid' : 'Enter higher max bid ▼'}
              </button>
            )}

            {/* Custom bid input */}
            {showCustomBid && !isUserWinning && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-500 text-sm">$</span>
                  <input
                    type="text"
                    placeholder={`${minBid.toLocaleString()} or more`}
                    value={customBidAmount}
                    onChange={(e) => {
                      setBidError("");
                      setCustomBidAmount(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    className="w-full pl-7 pr-3 py-2 bg-obsidian-900 border border-obsidian-700 text-obsidian-100 text-sm placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50"
                  />
                </div>
                <button
                  onClick={handleCustomBid}
                  disabled={bidding || !customBidAmount}
                  className="px-4 py-2 bg-obsidian-700 text-obsidian-100 text-sm font-semibold hover:bg-obsidian-600 transition-colors disabled:opacity-50"
                >
                  Bid
                </button>
              </div>
            )}

            {bidError && (
              <p className="text-red-400 text-xs">{bidError}</p>
            )}

            {/* Mobile hint - only show if not winning */}
            {!isUserWinning && (
              <p className="text-[0.6rem] text-obsidian-600 text-center md:hidden">
                Swipe right to quick bid →
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
