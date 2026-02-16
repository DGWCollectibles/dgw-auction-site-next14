'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import WatchlistButton from "@/components/WatchlistButton";
import LotCountdown from "@/components/LotCountdown";
import { createClient } from "@/lib/supabase/client";

// Bid increment chart
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

interface Lot {
  id: string;
  auction_id: string;
  lot_number: number;
  title: string;
  description: string | null;
  current_bid: number | null;
  starting_bid: number;
  estimate_low: number | null;
  estimate_high: number | null;
  bid_count: number;
  status: string;
  images: string[];
  condition: string | null;
  provenance: string | null;
  ends_at: string | null;
  extended_count: number;
  winning_bidder_id: string | null;
}

interface Auction {
  id: string;
  title: string;
  slug: string;
  status: string;
  ends_at: string;
  starts_at: string;
  buyers_premium_percent: number;
}

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  user_id: string;
  is_winning: boolean;
  bidder_name?: string;
}

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

function formatBidTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Gold sparkle celebration component
function GoldSparkles({ active }: { active: boolean }) {
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
      for (let i = 0; i < 60; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 12 + 6,
          delay: Math.random() * 0.8,
          duration: Math.random() * 1.5 + 1,
          type: ['star', 'diamond', 'circle'][Math.floor(Math.random() * 3)] as 'star' | 'diamond' | 'circle',
        });
      }
      setParticles(newParticles);
      
      const timer = setTimeout(() => setParticles([]), 3500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-sparkle-burst"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.type === 'star' && (
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" className="drop-shadow-[0_0_8px_rgba(201,169,98,0.9)]">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" fill="#C9A962" />
            </svg>
          )}
          {p.type === 'diamond' && (
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" className="drop-shadow-[0_0_8px_rgba(212,188,125,0.9)]">
              <path d="M12 0L24 12L12 24L0 12L12 0Z" fill="#D4BC7D" />
            </svg>
          )}
          {p.type === 'circle' && (
            <div 
              className="rounded-full bg-dgw-gold drop-shadow-[0_0_6px_rgba(201,169,98,0.8)]"
              style={{ width: p.size * 0.5, height: p.size * 0.5 }}
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
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(150vh) rotate(720deg) scale(0.3);
          }
        }
        .animate-sparkle-burst {
          animation: sparkle-burst ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Floating gold dust particles
function FloatingDust() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            background: `rgba(201, 169, 98, ${Math.random() * 0.3 + 0.1})`,
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

export default function LotDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const lotId = params.id;
  const [lot, setLot] = useState<Lot | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [highBidderId, setHighBidderId] = useState<string | null>(null);
  const [userHasBid, setUserHasBid] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  
  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showBidHistory, setShowBidHistory] = useState(false);
  
  // Bidding state
  const [showCustomBid, setShowCustomBid] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState("");
  const [showIncreaseMax, setShowIncreaseMax] = useState(false);
  const [maxBidAmount, setMaxBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const biddingRef = useRef(false); // Synchronous guard against double-tap
  const [bidError, setBidError] = useState("");
  const [bidSuccess, setBidSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showTakeover, setShowTakeover] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!lotId) return;

    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Check if user has a payment method on file (fast DB check instead of Stripe API)
      if (user) {
        try {
          const { count } = await supabase
            .from('payment_methods')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          setHasPaymentMethod((count || 0) > 0);
        } catch { /* gate stays false, user sees "add payment" prompt */ }
      }

      const { data: lotData, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', lotId)
        .single();

      if (lotError || !lotData) {
        setLoading(false);
        return;
      }

      setLot(lotData);

      const { data: auctionData } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', lotData.auction_id)
        .single();

      if (auctionData) {
        setAuction(auctionData);
      }

      const { data: bidsData } = await supabase
        .from('bids')
        .select('id, amount, created_at, user_id, is_winning')
        .eq('lot_id', lotId)
        .order('created_at', { ascending: false })
        .limit(50);

      const winningBid = (bidsData || []).find(b => b.is_winning);
      if (winningBid) {
        setHighBidderId(winningBid.user_id);
      }

      // Check if user has bid on this lot (separate fast query since bid history is limited)
      if (user) {
        const hasBid = (bidsData || []).some(b => b.user_id === user.id);
        if (!hasBid) {
          // Bid might be beyond the 50-row window -- do a targeted check
          const { count } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('lot_id', lotId)
            .eq('user_id', user.id);
          setUserHasBid((count || 0) > 0);
        } else {
          setUserHasBid(true);
        }
      }

      const userIds = [...new Set((bidsData || []).map(b => b.user_id))];
      const bidderNames: Record<string, string> = {};
      userIds.forEach((id, index) => {
        bidderNames[id] = `Bidder ${index + 1}`;
      });

      const bidsWithNames = (bidsData || []).map(bid => ({
        ...bid,
        bidder_name: bidderNames[bid.user_id],
      }));

      setBids(bidsWithNames);
      setLoading(false);
    };

    fetchData();
  }, [lotId]);

  // Timer effect
  useEffect(() => {
    if (!auction?.ends_at) return;
    const update = () => setTimeLeft(formatTimeRemaining(auction.ends_at));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [auction?.ends_at]);

  // Realtime subscription
  useEffect(() => {
    if (!lot) return;

    const supabase = createClient();
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const channel = supabase
      .channel(`lot-detail-${lot.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lots',
          filter: `id=eq.${lot.id}`,
        },
        (payload) => {
          const updatedLot = payload.new as Lot;
          
          // Update lot state immediately (no query needed)
          setLot(prev => prev ? { ...prev, ...updatedLot } : null);
          
          // winning_bidder_id is on the lot row -- use it directly
          if (updatedLot.winning_bidder_id) {
            setHighBidderId(updatedLot.winning_bidder_id);
          }
          
          // Debounce the bid history refresh (costly query, 200 viewers x N rows)
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            const { data: bidsData } = await supabase
              .from('bids')
              .select('id, amount, created_at, user_id, is_winning')
              .eq('lot_id', lot.id)
              .order('created_at', { ascending: false })
              .limit(50);

            const userIds = [...new Set((bidsData || []).map(b => b.user_id))];
            const bidderNames: Record<string, string> = {};
            userIds.forEach((id, index) => {
              bidderNames[id] = `Bidder ${index + 1}`;
            });

            const bidsWithNames = (bidsData || []).map(bid => ({
              ...bid,
              bidder_name: bidderNames[bid.user_id],
            }));

            setBids(bidsWithNames);
          }, 200);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [lot?.id]);

  // Reset success message
  useEffect(() => {
    if (bidSuccess) {
      const timer = setTimeout(() => setBidSuccess(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [bidSuccess]);

  const currentBid = lot?.current_bid || lot?.starting_bid || 0;
  const minBid = getMinBid(currentBid);
  const isUserWinning = user && highBidderId === user.id;
  const isOutbid = user && userHasBid && !isUserWinning;
  const isLive = auction?.status === 'live';
  const isEnded = auction?.status === 'ended';
  const isPreview = auction?.status === 'preview';

  // Client-side timer check: lot is effectively ended if its end time has passed
  const lotEndTime = lot?.ends_at || auction?.ends_at;
  const [timerEnded, setTimerEnded] = useState(false);

  useEffect(() => {
    if (!lotEndTime || !isLive) return;
    const check = () => {
      const remaining = new Date(lotEndTime).getTime() - Date.now();
      if (remaining <= 0) setTimerEnded(true);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [lotEndTime, isLive]);

  const effectivelyEnded = isEnded || timerEnded;

  const placeBid = async (amount: number, isIncreasingMax: boolean = false) => {
    // Synchronous double-tap guard (React state updates are async)
    if (biddingRef.current) return;

    if (!user) {
      router.push('/auth/signup');
      return;
    }

    if (!hasPaymentMethod) {
      setBidError('Please add a payment method before bidding.');
      return;
    }

    if (isUserWinning && !isIncreasingMax) {
      setBidError("You're already the high bidder! Use 'Increase Max Bid' to raise your ceiling.");
      setShowConfirm(null);
      return;
    }

    if (amount < minBid && !isIncreasingMax) {
      setBidError(`Minimum bid is ${formatCurrency(minBid)}`);
      return;
    }

    if (isIncreasingMax && amount <= currentBid) {
      setBidError(`Max bid must be higher than current bid (${formatCurrency(currentBid)})`);
      return;
    }

    biddingRef.current = true;
    setBidding(true);
    setBidError("");
    setShowConfirm(null);
    setShowIncreaseMax(false);

    try {
      const supabase = createClient();
      
      // Use server-side place_bid RPC for atomic bid processing
      // Handles: validation, proxy bidding, soft-close extension, outbid notifications
      const { data: result, error } = await supabase.rpc('place_bid', {
        p_lot_id: lot!.id,
        p_user_id: user.id,
        p_bid_amount: amount,
        p_max_bid: amount,
      });

      if (error) throw error;

      if (result && !result.success) {
        setBidError(result.error || 'Bid failed');
        biddingRef.current = false;
        setBidding(false);
        return;
      }

      // Update UI from the RPC response (no extra fetches needed)
      if (result) {
        setLot(prev => prev ? { 
          ...prev, 
          current_bid: result.current_bid, 
          bid_count: result.bid_count,
          ends_at: result.ends_at || prev.ends_at,
          extended_count: result.extended ? (prev.extended_count || 0) + 1 : prev.extended_count,
        } : null);
        setHighBidderId(result.winning_bidder_id);
      }
      
      if (result?.is_winning) {
        setBidSuccess(true);
        setShowCelebration(true);
        setShowTakeover(true);
        setTimeout(() => setShowCelebration(false), 3500);
        setTimeout(() => setShowTakeover(false), 3000);
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
      biddingRef.current = false;
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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin mb-4" />
            <p className="text-dgw-gold/70 font-light tracking-widest text-sm">LOADING</p>
          </div>
        </div>
      </main>
    );
  }

  if (!lot || !auction) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] pt-20">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h1 className="heading-display text-3xl text-white mb-4">Lot Not Found</h1>
          <p className="text-obsidian-400 mb-8">This lot doesn&apos;t exist or has been removed.</p>
          <Link href="/auctions" className="btn btn-primary">
            Browse Auctions
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20 relative overflow-hidden">
      <Header />
      <FloatingDust />
      <GoldSparkles active={showCelebration} />
      
      {/* Luxury ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-radial from-dgw-gold/[0.07] via-transparent to-transparent blur-3xl" />
      </div>
      <div className="fixed bottom-0 left-1/4 w-[600px] h-[400px] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-radial from-dgw-gold/[0.04] via-transparent to-transparent blur-3xl" />
      </div>
      
      {/* Breadcrumb */}
      <section className="border-b border-dgw-gold/10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-3 text-sm text-obsidian-500">
            <Link href="/auctions" className="hover:text-dgw-gold transition-colors duration-300">Auctions</Link>
            <span className="text-dgw-gold/40">◆</span>
            <Link href={`/auctions/${auction.slug}`} className="hover:text-dgw-gold transition-colors duration-300 truncate max-w-[200px]">{auction.title}</Link>
            <span className="text-dgw-gold/40">◆</span>
            <span className="text-dgw-gold">Lot {lot.lot_number}</span>
          </nav>
        </div>
      </section>

      <section className="py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Left: Image Gallery - Showcase Display */}
            <div className="animate-fade-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              {/* Main Image with velvet display case feel */}
              <div 
                className="relative aspect-square cursor-zoom-in overflow-hidden group"
                onClick={() => setLightboxOpen(true)}
                style={{
                  background: 'linear-gradient(180deg, #1a1612 0%, #0d0b09 100%)',
                }}
              >
                {/* Luxury frame border */}
                <div className="absolute inset-0 border border-dgw-gold/20 z-20 pointer-events-none" />
                
                {/* Corner accents - more ornate */}
                <div className="absolute top-4 left-4 w-8 h-8 z-20">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-dgw-gold to-transparent" />
                  <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-dgw-gold to-transparent" />
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 z-20">
                  <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-dgw-gold to-transparent" />
                  <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-dgw-gold to-transparent" />
                </div>
                <div className="absolute bottom-4 left-4 w-8 h-8 z-20">
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-dgw-gold to-transparent" />
                  <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-dgw-gold to-transparent" />
                </div>
                <div className="absolute bottom-4 right-4 w-8 h-8 z-20">
                  <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-dgw-gold to-transparent" />
                  <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-dgw-gold to-transparent" />
                </div>
                
                {/* Spotlight from above */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-full bg-gradient-to-b from-dgw-gold/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10" />
                
                {/* Soft bottom glow - like museum lighting */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-t from-dgw-gold/15 to-transparent opacity-60 pointer-events-none z-10" />
                
                {lot.images && lot.images.length > 0 ? (
                  <img 
                    src={lot.images[selectedImageIndex]} 
                    alt={lot.title} 
                    className="w-full h-full object-contain relative z-0 transition-transform duration-700 group-hover:scale-[1.03]"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center z-0">
                    <span className="text-8xl opacity-10">🎴</span>
                  </div>
                )}
                
                {/* Lot number badge - elegant */}
                <div className="absolute top-6 left-6 z-30">
                  <div className="relative px-4 py-2 bg-[#0a0a0a]/95 backdrop-blur-sm">
                    <div className="absolute inset-0 border border-dgw-gold/40" />
                    <span className="relative text-[0.65rem] font-semibold tracking-[0.3em] text-dgw-gold">LOT {lot.lot_number}</span>
                  </div>
                </div>

                {/* OUTBID Badge */}
                {isOutbid && isLive && (
                  <div className="absolute top-6 right-6 z-30">
                    <div 
                      className="relative px-4 py-2 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
                        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.5)',
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
                      <span className="relative text-[0.65rem] font-bold tracking-[0.25em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">⚠ OUTBID</span>
                    </div>
                  </div>
                )}

                {/* Click to enlarge hint */}
                <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="px-3 py-1.5 bg-[#0a0a0a]/80 backdrop-blur-sm text-obsidian-400 text-xs tracking-wide">
                    Click to enlarge
                  </div>
                </div>
              </div>

              {/* Thumbnails */}
              {lot.images && lot.images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                  {lot.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative flex-shrink-0 w-20 h-20 transition-all duration-300 overflow-hidden ${
                        i === selectedImageIndex 
                          ? 'ring-2 ring-dgw-gold shadow-[0_0_20px_rgba(201,169,98,0.3)]' 
                          : 'ring-1 ring-obsidian-800 hover:ring-dgw-gold/50 opacity-50 hover:opacity-100'
                      }`}
                      style={{ background: 'linear-gradient(180deg, #1a1612 0%, #0d0b09 100%)' }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Lot Info & Bidding */}
            <div className="animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              {/* Title - Elegant typography */}
              <div className="mb-6">
                <h1 className="heading-display text-4xl sm:text-5xl leading-tight mb-3">
                  <span className="text-gradient-gold">{lot.title}</span>
                </h1>
                
                {/* Decorative line */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-dgw-gold/50 via-dgw-gold/20 to-transparent" />
                  <span className="text-dgw-gold/60 text-xs">◆</span>
                </div>

                {/* Save to watchlist */}
                <div className="mb-4">
                  <WatchlistButton lotId={lot.id} userId={user?.id || null} variant="full" />
                </div>

                {/* Estimates */}
                {(lot.estimate_low || lot.estimate_high) && (
                  <p className="text-obsidian-400 text-lg tracking-wide">
                    <span className="text-obsidian-500 text-sm uppercase tracking-widest mr-2">Estimate</span>
                    {lot.estimate_low && formatCurrency(lot.estimate_low)}
                    {lot.estimate_low && lot.estimate_high && <span className="mx-2 text-dgw-gold/40">—</span>}
                    {lot.estimate_high && formatCurrency(lot.estimate_high)}
                  </p>
                )}
              </div>

              {/* Luxury Bidding Card */}
              <div 
                className={`relative p-8 mb-8 overflow-hidden transition-shadow duration-500 ${
                  showTakeover ? 'shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
                  isUserWinning ? 'shadow-[0_0_25px_rgba(34,197,94,0.08)]' : ''
                }`}
                style={{
                  background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.9) 0%, rgba(13, 11, 9, 0.95) 100%)',
                }}
              >
                {/* Card border - green during takeover, subtle green when winning */}
                <div className={`absolute inset-0 border pointer-events-none transition-colors duration-500 ${
                  showTakeover ? 'border-green-500/60' :
                  isUserWinning ? 'border-green-500/20' :
                  'border-dgw-gold/20'
                }`} />
                <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(201,169,98,0.1)] pointer-events-none" />
                
                {/* Corner accents - animate green on takeover */}
                <div className={`absolute top-3 left-3 w-5 h-5 border-t border-l transition-colors duration-500 ${
                  showTakeover ? 'border-green-400' : isUserWinning ? 'border-green-500/40' : 'border-dgw-gold/50'
                }`} />
                <div className={`absolute top-3 right-3 w-5 h-5 border-t border-r transition-colors duration-500 ${
                  showTakeover ? 'border-green-400' : isUserWinning ? 'border-green-500/40' : 'border-dgw-gold/50'
                }`} />
                <div className={`absolute bottom-3 left-3 w-5 h-5 border-b border-l transition-colors duration-500 ${
                  showTakeover ? 'border-green-400' : isUserWinning ? 'border-green-500/40' : 'border-dgw-gold/50'
                }`} />
                <div className={`absolute bottom-3 right-3 w-5 h-5 border-b border-r transition-colors duration-500 ${
                  showTakeover ? 'border-green-400' : isUserWinning ? 'border-green-500/40' : 'border-dgw-gold/50'
                }`} />

                {/* Takeover sweep animation */}
                {showTakeover && (
                  <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 50%, transparent 100%)',
                        animation: 'takeoverFadeIn 0.4s ease-out',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.2) 50%, transparent 100%)',
                        animation: 'takeoverSweep 0.8s ease-out',
                      }}
                    />
                    {/* Top and bottom glow lines */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-px"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.8), transparent)',
                        animation: 'takeoverFadeIn 0.3s ease-out',
                      }}
                    />
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-px"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.8), transparent)',
                        animation: 'takeoverFadeIn 0.3s ease-out 0.1s both',
                      }}
                    />
                  </div>
                )}

                {/* Persistent winning glow */}
                {isUserWinning && !showTakeover && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-green-500/[0.03] to-transparent" />
                  </div>
                )}
                
                {/* Breathing ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-dgw-gold/[0.03] via-transparent to-dgw-gold/[0.02] animate-breathe pointer-events-none" />

                {/* Timer Row */}
                {isLive && (
                  <div className="mb-6 pb-6 border-b border-dgw-gold/10 flex items-end justify-between">
                    <LotCountdown
                      endsAt={lot.ends_at || auction.ends_at}
                      extendedCount={lot.extended_count || 0}
                      variant="detail"
                    />
                    <button 
                      onClick={() => setShowBidHistory(true)}
                      className="text-right group"
                    >
                      <span className="text-[0.6rem] uppercase tracking-[0.3em] text-obsidian-500 block mb-2">Bids</span>
                      <span className="text-3xl text-obsidian-300 group-hover:text-dgw-gold transition-colors duration-300 heading-display">
                        {lot.bid_count || 0}
                      </span>
                    </button>
                  </div>
                )}

                {isPreview && (
                  <div className="mb-6 pb-6 border-b border-dgw-gold/10">
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-obsidian-500 block mb-2">Auction Opens</span>
                    <span className="text-obsidian-200 text-lg">
                      {new Date(auction.starts_at).toLocaleDateString('en-US', { 
                        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                )}

                {/* Current Bid Display */}
                <div className="mb-6">
                  <span className="text-[0.6rem] uppercase tracking-[0.3em] text-obsidian-500 block mb-3">
                    {(lot.bid_count || 0) > 0 ? 'Current Bid' : 'Starting Bid'}
                  </span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="heading-display text-5xl sm:text-6xl text-gradient-gold">
                      {formatCurrency(currentBid)}
                    </span>
                    {isUserWinning && (
                      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold text-xs tracking-[0.2em] uppercase">High Bidder</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buyer's Premium */}
                <p className="text-xs text-obsidian-500 mb-2 tracking-wide">
                  Plus {auction.buyers_premium_percent}% buyer&apos;s premium
                </p>

                {/* Bid history link for non-live states */}
                {!isLive && (lot.bid_count || 0) > 0 && (
                  <button 
                    onClick={() => setShowBidHistory(true)}
                    className="text-sm text-dgw-gold/60 hover:text-dgw-gold transition-colors duration-300 mb-4 flex items-center gap-2 group"
                  >
                    <span className="group-hover:underline underline-offset-4">View {lot.bid_count} bid{lot.bid_count !== 1 ? 's' : ''}</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* Bidding UI */}
                {isLive && !effectivelyEnded && (
                  <div className="space-y-4 mt-8">
                    {/* Payment method gate */}
                    {user && !hasPaymentMethod && (
                      <div className="p-5 border border-dgw-gold/20 bg-dgw-gold/5 text-center">
                        <svg className="w-8 h-8 text-dgw-gold/60 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <p className="text-obsidian-200 text-sm font-medium mb-1">Payment Method Required</p>
                        <p className="text-obsidian-500 text-xs mb-4">Add a card on file before placing bids</p>
                        <Link
                          href="/account?tab=payment"
                          className="inline-block px-6 py-2.5 bg-gradient-to-r from-dgw-gold-dark via-dgw-gold to-dgw-gold-light text-[#0a0a0a] font-bold uppercase tracking-[0.15em] text-xs hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] transition-all"
                        >
                          Add Payment Method
                        </Link>
                      </div>
                    )}

                    {/* Confirmation Overlay */}
                    {showConfirm !== null && (
                      <div className="relative p-6 bg-[#0a0a0a]/95 border border-dgw-gold/30 mb-4">
                        <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-dgw-gold/60" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-dgw-gold/60" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-dgw-gold/60" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-dgw-gold/60" />
                        
                        <p className="text-obsidian-400 text-xs mb-3 text-center uppercase tracking-[0.3em]">Set Your Max Bid</p>
                        <p className="heading-display text-5xl text-gradient-gold mb-3 text-center">{formatCurrency(showConfirm)}</p>
                        <p className="text-obsidian-500 text-xs mb-6 text-center tracking-wide">
                          You&apos;ll only pay what&apos;s needed to stay ahead
                        </p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setShowConfirm(null)}
                            className="flex-1 py-3.5 border border-obsidian-700 text-obsidian-300 hover:border-obsidian-500 hover:text-white transition-all duration-300 uppercase tracking-[0.2em] text-xs font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => placeBid(showConfirm, false)}
                            disabled={bidding}
                            className="flex-1 py-3.5 bg-gradient-to-r from-dgw-gold-dark via-dgw-gold to-dgw-gold-light text-[#0a0a0a] font-bold hover:shadow-[0_0_30px_rgba(201,169,98,0.4)] transition-all duration-300 disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                          >
                            {bidding ? 'Placing...' : 'Confirm Bid'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {bidSuccess && (
                      <div className="p-5 bg-gradient-to-r from-green-500/10 via-green-500/15 to-green-500/10 border border-green-500/40 text-green-400 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="uppercase tracking-[0.2em] font-bold text-sm">You&apos;re the High Bidder!</span>
                        </div>
                      </div>
                    )}

                    {isUserWinning ? (
                      <>
                        <div className="w-full py-4 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 border border-green-500/30 text-green-400 font-bold text-center flex items-center justify-center gap-3">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="uppercase tracking-[0.2em] text-sm">You&apos;re Winning</span>
                        </div>
                        
                        <button
                          onClick={() => setShowIncreaseMax(!showIncreaseMax)}
                          className="w-full text-sm text-obsidian-400 hover:text-dgw-gold transition-colors duration-300 py-3 flex items-center justify-center gap-2"
                        >
                          <span className="tracking-wide">Increase Max Bid</span>
                          <svg className={`w-4 h-4 transition-transform duration-300 ${showIncreaseMax ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showIncreaseMax && (
                          <div className="space-y-3 p-5 bg-[#0a0a0a]/60 border border-dgw-gold/10">
                            <div className="flex gap-3">
                              <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-500 text-lg">$</span>
                                <input
                                  type="text"
                                  placeholder={`Above ${currentBid.toLocaleString()}`}
                                  value={maxBidAmount}
                                  onChange={(e) => {
                                    setBidError("");
                                    setMaxBidAmount(e.target.value.replace(/[^0-9]/g, ''));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && maxBidAmount) {
                                      const amount = parseInt(maxBidAmount);
                                      if (amount > currentBid) placeBid(amount, true);
                                      else setBidError(`Must be higher than ${formatCurrency(currentBid)}`);
                                    }
                                  }}
                                  className="w-full pl-10 pr-4 py-3.5 bg-[#0a0a0a] border border-obsidian-700 text-white placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 text-lg transition-colors duration-300"
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
                                className="px-6 py-3.5 bg-green-600 text-white font-bold hover:bg-green-500 transition-colors duration-300 disabled:opacity-50 uppercase tracking-[0.15em] text-sm"
                              >
                                Set
                              </button>
                            </div>
                            <p className="text-xs text-obsidian-500 text-center tracking-wide">
                              Your ceiling. Bid only rises when outbid.
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Main Bid Button - Luxurious */}
                        <button
                          onClick={handleQuickBid}
                          disabled={bidding}
                          className="group relative w-full py-5 overflow-hidden disabled:opacity-50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,169,98,0.35)]"
                          style={{
                            background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 25%, #D4BC7D 50%, #C9A962 75%, #A68B4B 100%)',
                          }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                          
                          <span className="relative flex items-center justify-center gap-4 text-[#0a0a0a]">
                            {bidding ? (
                              <span className="uppercase tracking-[0.3em] font-bold">Placing Bid...</span>
                            ) : user ? (
                              <>
                                <span className="uppercase tracking-[0.3em] font-bold">Bid</span>
                                <span className="text-2xl font-bold">{formatCurrency(minBid)}</span>
                              </>
                            ) : (
                              <span className="uppercase tracking-[0.3em] font-bold">Register to Bid</span>
                            )}
                          </span>
                        </button>

                        {/* Custom bid toggle */}
                        {user && (
                          <button
                            onClick={() => setShowCustomBid(!showCustomBid)}
                            className="w-full text-sm text-obsidian-400 hover:text-dgw-gold transition-colors duration-300 py-3 flex items-center justify-center gap-2"
                          >
                            <span className="tracking-wide">Enter Higher Max Bid</span>
                            <svg className={`w-4 h-4 transition-transform duration-300 ${showCustomBid ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}

                        {/* Custom bid input */}
                        {showCustomBid && (
                          <div className="flex gap-3">
                            <div className="relative flex-1">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-500 text-lg">$</span>
                              <input
                                type="text"
                                placeholder={`${minBid.toLocaleString()} or more`}
                                value={customBidAmount}
                                onChange={(e) => {
                                  setBidError("");
                                  setCustomBidAmount(e.target.value.replace(/[^0-9]/g, ''));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && customBidAmount) handleCustomBid();
                                }}
                                className="w-full pl-10 pr-4 py-3.5 bg-[#0a0a0a] border border-obsidian-700 text-white placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 text-lg transition-colors duration-300"
                              />
                            </div>
                            <button
                              onClick={handleCustomBid}
                              disabled={bidding || !customBidAmount}
                              className="px-6 py-3.5 bg-obsidian-800 text-white font-bold hover:bg-obsidian-700 transition-colors duration-300 disabled:opacity-50 uppercase tracking-[0.15em] text-sm border border-obsidian-700"
                            >
                              Bid
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Error message */}
                    {bidError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                        {bidError}
                      </div>
                    )}
                  </div>
                )}

                {effectivelyEnded && (
                  <div className="text-center py-8 border-t border-dgw-gold/10 mt-6">
                    <p className="text-obsidian-500 uppercase tracking-[0.3em] text-xs mb-3">Auction Ended</p>
                    {(lot.bid_count || 0) > 0 && (
                      <p className="text-xl text-white">
                        Final bid: <span className="text-gradient-gold font-bold heading-display text-3xl ml-2">{formatCurrency(currentBid)}</span>
                      </p>
                    )}
                  </div>
                )}

                {isPreview && (
                  <div className="text-center py-8 border-t border-dgw-gold/10 mt-6">
                    <p className="text-obsidian-400 mb-5">Bidding not yet open</p>
                    {!user && (
                      <Link href="/auth/signup" className="btn btn-primary">
                        Register to Bid
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Description Section */}
              {lot.description && (
                <div className="mb-8 animate-fade-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-[0.65rem] uppercase tracking-[0.3em] text-dgw-gold/70">Description</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-dgw-gold/20 to-transparent" />
                  </div>
                  <div className="text-obsidian-300 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {lot.description}
                  </div>
                </div>
              )}

              {/* Condition */}
              {lot.condition && (
                <div className="mb-8 animate-fade-up" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-[0.65rem] uppercase tracking-[0.3em] text-dgw-gold/70">Condition</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-dgw-gold/20 to-transparent" />
                  </div>
                  <p className="text-obsidian-300 text-[15px]">{lot.condition}</p>
                </div>
              )}

              {/* Provenance */}
              {lot.provenance && (
                <div className="mb-8 animate-fade-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-[0.65rem] uppercase tracking-[0.3em] text-dgw-gold/70">Provenance</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-dgw-gold/20 to-transparent" />
                  </div>
                  <p className="text-obsidian-300 text-[15px]">{lot.provenance}</p>
                </div>
              )}
            </div>
          </div>

          {/* Back to Auction */}
          <div className="mt-16 pt-8 border-t border-dgw-gold/10">
            <Link 
              href={`/auctions/${auction.slug}`}
              className="inline-flex items-center gap-3 text-obsidian-400 hover:text-dgw-gold transition-colors duration-300 group"
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="tracking-wide">Back to <span className="text-obsidian-200">{auction.title}</span></span>
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && lot.images && lot.images.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-[#0a0a0a]/98 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 text-obsidian-400 hover:text-dgw-gold p-2 transition-colors duration-300 z-50"
            onClick={() => setLightboxOpen(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img 
            src={lot.images[selectedImageIndex]} 
            alt={lot.title}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {lot.images.length > 1 && (
            <>
              <button
                className="absolute left-6 top-1/2 -translate-y-1/2 p-4 text-obsidian-400 hover:text-dgw-gold bg-[#0a0a0a]/60 hover:bg-[#0a0a0a]/80 transition-all duration-300 border border-obsidian-800 hover:border-dgw-gold/30"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => prev === 0 ? lot.images!.length - 1 : prev - 1);
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-obsidian-400 hover:text-dgw-gold bg-[#0a0a0a]/60 hover:bg-[#0a0a0a]/80 transition-all duration-300 border border-obsidian-800 hover:border-dgw-gold/30"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => prev === lot.images!.length - 1 ? 0 : prev + 1);
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-obsidian-500 text-sm tracking-widest">
            {selectedImageIndex + 1} / {lot.images.length}
          </div>
        </div>
      )}

      {/* Bid History Modal */}
      {showBidHistory && (
        <div 
          className="fixed inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBidHistory(false)}
        >
          <div 
            className="relative max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.98) 0%, rgba(10, 10, 10, 0.99) 100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Border */}
            <div className="absolute inset-0 border border-dgw-gold/20 pointer-events-none" />
            
            {/* Corner accents */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-dgw-gold/50" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-dgw-gold/50" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-dgw-gold/50" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-dgw-gold/50" />
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-dgw-gold/10">
              <h3 className="text-sm font-semibold text-white uppercase tracking-[0.25em]">Bid History</h3>
              <button 
                onClick={() => setShowBidHistory(false)}
                className="text-obsidian-400 hover:text-dgw-gold transition-colors duration-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Bids List */}
            <div className="flex-1 overflow-y-auto">
              {bids.length > 0 ? (
                <div className="divide-y divide-dgw-gold/5">
                  {bids.map((bid, index) => (
                    <div 
                      key={bid.id} 
                      className={`p-5 ${index === 0 && bid.is_winning ? 'bg-green-500/5' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-obsidian-200">
                          {bid.user_id === user?.id ? (
                            <span className="text-dgw-gold">You</span>
                          ) : (
                            bid.bidder_name
                          )}
                          {bid.is_winning && (
                            <span className="ml-3 text-[0.6rem] text-green-400 font-semibold tracking-[0.2em] uppercase">● High Bidder</span>
                          )}
                        </span>
                        <span className={`font-semibold heading-display text-xl ${bid.is_winning ? 'text-dgw-gold' : 'text-obsidian-300'}`}>
                          {formatCurrency(bid.amount)}
                        </span>
                      </div>
                      <div className="text-xs text-obsidian-500 tracking-wide">
                        {formatBidTime(bid.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <p className="text-obsidian-500 tracking-wide">No bids yet. Be the first!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
