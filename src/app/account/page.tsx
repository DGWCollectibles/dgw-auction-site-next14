'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

interface BidWithLot {
  id: string;
  amount: number;
  max_bid: number;
  is_winning: boolean;
  created_at: string;
  lot: {
    id: string;
    lot_number: number;
    title: string;
    current_bid: number;
    starting_bid: number;
    images: string[];
    auction: {
      id: string;
      title: string;
      slug: string;
      status: string;
      ends_at: string;
    };
  };
}

interface UserStats {
  totalBids: number;
  activeBids: number;
  winning: number;
  won: number;
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
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Floating gold dust particles
function FloatingDust() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            background: `rgba(201, 169, 98, ${Math.random() * 0.2 + 0.1})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `dust-float ${15 + Math.random() * 25}s linear infinite`,
            animationDelay: `${Math.random() * 15}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes dust-float {
          0% { opacity: 0; transform: translateY(100vh); }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-100vh); }
        }
      `}</style>
    </div>
  );
}

// Bid card component
function BidCard({ bid, showStatus = true }: { bid: BidWithLot; showStatus?: boolean }) {
  const isLive = bid.lot.auction.status === 'live';
  const isEnded = bid.lot.auction.status === 'ended';
  const currentBid = bid.lot.current_bid || bid.lot.starting_bid;
  
  return (
    <div 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(201,169,98,0.15)]"
      style={{
        background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.9) 0%, rgba(13, 11, 9, 0.95) 100%)',
        border: '1px solid rgba(201, 169, 98, 0.15)',
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-dgw-gold/30 transition-colors group-hover:border-dgw-gold/60" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-dgw-gold/30 transition-colors group-hover:border-dgw-gold/60" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-dgw-gold/30 transition-colors group-hover:border-dgw-gold/60" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-dgw-gold/30 transition-colors group-hover:border-dgw-gold/60" />

      <div className="flex gap-4 p-4">
        {/* Image */}
        <Link href={`/lots/${bid.lot.id}`} className="flex-shrink-0">
          <div className="w-24 h-24 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a1612 0%, #0d0b09 100%)' }}>
            {bid.lot.images && bid.lot.images.length > 0 ? (
              <img src={bid.lot.images[0]} alt={bid.lot.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-3xl opacity-20">🎴</span>
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link href={`/lots/${bid.lot.id}`} className="hover:text-dgw-gold transition-colors">
              <h3 className="font-medium text-white text-sm leading-tight line-clamp-2">{bid.lot.title}</h3>
            </Link>
            {showStatus && (
              <div className="flex-shrink-0">
                {bid.is_winning && isLive && (
                  <span className="px-2 py-1 text-[0.6rem] font-bold tracking-wider uppercase bg-green-500/20 text-green-400 border border-green-500/30">
                    Winning
                  </span>
                )}
                {!bid.is_winning && isLive && (
                  <span className="px-2 py-1 text-[0.6rem] font-bold tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                    Outbid
                  </span>
                )}
                {bid.is_winning && isEnded && (
                  <span className="px-2 py-1 text-[0.6rem] font-bold tracking-wider uppercase bg-dgw-gold/20 text-dgw-gold border border-dgw-gold/30">
                    Won
                  </span>
                )}
                {!bid.is_winning && isEnded && (
                  <span className="px-2 py-1 text-[0.6rem] font-bold tracking-wider uppercase bg-obsidian-700/50 text-obsidian-400 border border-obsidian-600">
                    Lost
                  </span>
                )}
              </div>
            )}
          </div>
          
          <Link href={`/auctions/${bid.lot.auction.slug}`} className="text-xs text-obsidian-500 hover:text-dgw-gold transition-colors block mb-2">
            {bid.lot.auction.title} • Lot {bid.lot.lot_number}
          </Link>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 block">
                {isEnded ? 'Final Bid' : 'Current Bid'}
              </span>
              <span className="heading-display text-lg text-dgw-gold">{formatCurrency(currentBid)}</span>
            </div>
            <div className="text-right">
              <span className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 block">Your Max</span>
              <span className="text-sm text-obsidian-300">{formatCurrency(bid.max_bid)}</span>
            </div>
            {isLive && (
              <div className="text-right">
                <span className="text-[0.6rem] uppercase tracking-wider text-obsidian-500 block">Time Left</span>
                <span className="text-sm text-obsidian-200">{formatTimeRemaining(bid.lot.auction.ends_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons for outbid items */}
      {!bid.is_winning && isLive && (
        <div className="px-4 pb-4">
          <Link 
            href={`/lots/${bid.lot.id}`}
            className="block w-full py-2 text-center text-sm font-semibold bg-dgw-gold/10 border border-dgw-gold/30 text-dgw-gold hover:bg-dgw-gold/20 transition-colors"
          >
            Bid Again →
          </Link>
        </div>
      )}

      {/* Action for won items */}
      {bid.is_winning && isEnded && (
        <div className="px-4 pb-4">
          <div className="w-full py-2 text-center text-sm text-obsidian-400 bg-obsidian-800/50 border border-obsidian-700">
            Invoice Coming Soon
          </div>
        </div>
      )}
    </div>
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const tabParam = searchParams.get('tab');
  const [section, setSection] = useState<'bids' | 'orders' | 'settings'>(
    (tabParam === 'orders' ? 'orders' : tabParam === 'settings' || tabParam === 'payment' ? 'settings' : 'bids') as any
  );
  const [activeTab, setActiveTab] = useState<'active' | 'won' | 'lost'>('active');
  const [bids, setBids] = useState<BidWithLot[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalBids: 0, activeBids: 0, winning: 0, won: 0 });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Auto-redirect to payment methods page when ?tab=payment
  useEffect(() => {
    if (tabParam === 'payment') {
      router.push('/account/payment-methods');
    }
    if (tabParam === 'messages') {
      router.push('/account/messages');
    }
  }, [tabParam, router]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);

      // Fetch user's bids with lot and auction info
      const { data: bidsData, error } = await supabase
        .from('bids')
        .select(`
          id,
          amount,
          max_bid,
          is_winning,
          created_at,
          lot_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bids:', error);
        setLoading(false);
        return;
      }

      // Get unique lot IDs (most recent bid per lot)
      const lotBidsMap = new Map<string, any>();
      (bidsData || []).forEach(bid => {
        if (!lotBidsMap.has(bid.lot_id)) {
          lotBidsMap.set(bid.lot_id, bid);
        }
      });
      const uniqueBids = Array.from(lotBidsMap.values());
      const lotIds = uniqueBids.map(b => b.lot_id);

      if (lotIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch lots
      const { data: lotsData } = await supabase
        .from('lots')
        .select('id, lot_number, title, current_bid, starting_bid, images, auction_id')
        .in('id', lotIds);

      // Get auction IDs
      const auctionIds = [...new Set((lotsData || []).map(l => l.auction_id))];
      
      // Fetch auctions
      const { data: auctionsData } = await supabase
        .from('auctions')
        .select('id, title, slug, status, ends_at')
        .in('id', auctionIds);

      // Build auction map
      const auctionMap = new Map();
      (auctionsData || []).forEach(a => auctionMap.set(a.id, a));

      // Build lot map with auction
      const lotMap = new Map();
      (lotsData || []).forEach(l => {
        lotMap.set(l.id, {
          ...l,
          auction: auctionMap.get(l.auction_id),
        });
      });

      // Check current winning status for each lot
      const { data: winningBids } = await supabase
        .from('bids')
        .select('lot_id, user_id')
        .in('lot_id', lotIds)
        .eq('is_winning', true);

      const winningMap = new Map();
      (winningBids || []).forEach(wb => {
        winningMap.set(wb.lot_id, wb.user_id);
      });

      // Combine everything
      const fullBids: BidWithLot[] = uniqueBids.map(bid => ({
        ...bid,
        is_winning: winningMap.get(bid.lot_id) === user.id,
        lot: lotMap.get(bid.lot_id),
      })).filter(b => b.lot && b.lot.auction);

      setBids(fullBids);

      // Calculate stats
      const activeBids = fullBids.filter(b => b.lot.auction.status === 'live');
      const winning = activeBids.filter(b => b.is_winning);
      const wonItems = fullBids.filter(b => b.lot.auction.status === 'ended' && b.is_winning);

      setStats({
        totalBids: bidsData?.length || 0,
        activeBids: activeBids.length,
        winning: winning.length,
        won: wonItems.length,
      });

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // Fetch invoices when orders tab is selected
  useEffect(() => {
    if (section !== 'orders' || !user || invoices.length > 0) return;
    
    const fetchInvoices = async () => {
      setInvoicesLoading(true);
      const supabase = createClient();
      
      const { data } = await supabase
        .from('invoices')
        .select('*, auctions(title, slug), invoice_items(id, lot_title, lot_number, winning_bid, lot_image)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setInvoices(data || []);
      setInvoicesLoading(false);
    };

    fetchInvoices();
  }, [section, user]);

  // Filter bids by tab
  const filteredBids = bids.filter(bid => {
    const isLive = bid.lot.auction.status === 'live';
    const isEnded = bid.lot.auction.status === 'ended';
    
    if (activeTab === 'active') return isLive;
    if (activeTab === 'won') return isEnded && bid.is_winning;
    if (activeTab === 'lost') return isEnded && !bid.is_winning;
    return false;
  });

  // Further split active into winning/outbid
  const winningBids = filteredBids.filter(b => b.is_winning && b.lot.auction.status === 'live');
  const outbidBids = filteredBids.filter(b => !b.is_winning && b.lot.auction.status === 'live');

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

  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20 relative overflow-hidden">
      <Header />
      <FloatingDust />
      
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-radial from-dgw-gold/[0.05] via-transparent to-transparent blur-3xl" />
      </div>

      <section className="relative z-10 py-10">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="mb-10">
            <h1 className="heading-display text-3xl sm:text-4xl mb-2">
              <span className="text-gradient-gold">My Account</span>
            </h1>
            <p className="text-obsidian-400">{user?.email}</p>
          </div>

          {/* Section Navigation */}
          <div className="flex gap-6 mb-8 border-b border-dgw-gold/10 pb-4">
            {([
              { key: 'bids' as const, label: 'My Bids', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
              { key: 'orders' as const, label: 'Orders & Invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { key: 'settings' as const, label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
            ]).map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-all border-b-2 -mb-[18px] ${
                  section === s.key
                    ? 'text-dgw-gold border-dgw-gold'
                    : 'text-obsidian-400 hover:text-obsidian-200 border-transparent'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>

          {/* ===== BIDS SECTION ===== */}
          {section === 'bids' && (<>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Bids', value: stats.totalBids, color: 'text-white' },
              { label: 'Active Bids', value: stats.activeBids, color: 'text-white' },
              { label: 'Currently Winning', value: stats.winning, color: 'text-green-400' },
              { label: 'Items Won', value: stats.won, color: 'text-dgw-gold' },
            ].map((stat, i) => (
              <div 
                key={i}
                className="relative p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.8) 0%, rgba(13, 11, 9, 0.9) 100%)',
                  border: '1px solid rgba(201, 169, 98, 0.15)',
                }}
              >
                <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-dgw-gold/30" />
                <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-dgw-gold/30" />
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-obsidian-500 block mb-1">{stat.label}</span>
                <span className={`heading-display text-3xl ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1" style={{ background: 'rgba(20, 20, 20, 0.5)' }}>
            {[
              { key: 'active', label: 'Active Bids', count: stats.activeBids },
              { key: 'won', label: 'Won', count: stats.won },
              { key: 'lost', label: 'Ended', count: bids.filter(b => b.lot.auction.status === 'ended' && !b.is_winning).length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.key
                    ? 'bg-dgw-gold/10 text-dgw-gold border border-dgw-gold/30'
                    : 'text-obsidian-400 hover:text-obsidian-200 border border-transparent'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs ${
                    activeTab === tab.key ? 'bg-dgw-gold/20' : 'bg-obsidian-800'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'active' && (
            <div className="space-y-8">
              {/* Winning Section */}
              {winningBids.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <h2 className="text-sm uppercase tracking-[0.2em] text-green-400 font-medium">Currently Winning</h2>
                  </div>
                  <div className="grid gap-4">
                    {winningBids.map(bid => (
                      <BidCard key={bid.id} bid={bid} showStatus={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Outbid Section */}
              {outbidBids.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <h2 className="text-sm uppercase tracking-[0.2em] text-red-400 font-medium">Outbid - Action Needed</h2>
                  </div>
                  <div className="grid gap-4">
                    {outbidBids.map(bid => (
                      <BidCard key={bid.id} bid={bid} showStatus={false} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {winningBids.length === 0 && outbidBids.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4 opacity-20">🎴</div>
                  <p className="text-obsidian-400 mb-6">No active bids</p>
                  <Link href="/auctions" className="btn btn-primary">
                    Browse Auctions
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'won' && (
            <div>
              {filteredBids.length > 0 ? (
                <div className="grid gap-4">
                  {filteredBids.map(bid => (
                    <BidCard key={bid.id} bid={bid} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4 opacity-20">🏆</div>
                  <p className="text-obsidian-400 mb-6">No won items yet</p>
                  <Link href="/auctions" className="btn btn-primary">
                    Start Bidding
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lost' && (
            <div>
              {filteredBids.length > 0 ? (
                <div className="grid gap-4">
                  {filteredBids.map(bid => (
                    <BidCard key={bid.id} bid={bid} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4 opacity-20">📋</div>
                  <p className="text-obsidian-400">No ended auctions</p>
                </div>
              )}
            </div>
          )}

          </>)}

          {/* ===== ORDERS SECTION ===== */}
          {section === 'orders' && (
            <div>
              <h2 className="text-lg font-semibold text-obsidian-100 mb-6">Orders & Invoices</h2>
              {invoicesLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin mb-4" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4 opacity-20">🧾</div>
                  <p className="text-obsidian-400 mb-2">No orders yet</p>
                  <p className="text-obsidian-500 text-sm">Win an auction and your invoice will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="relative p-5"
                      style={{
                        background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.8) 0%, rgba(13, 11, 9, 0.9) 100%)',
                        border: '1px solid rgba(201, 169, 98, 0.15)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-obsidian-200 font-medium">{(inv.auctions as any)?.title || 'Auction'}</p>
                          <p className="text-obsidian-500 text-xs mt-0.5">
                            {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 font-semibold uppercase tracking-wider ${
                          inv.shipped_at ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          inv.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          inv.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {inv.shipped_at ? 'Shipped' : inv.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 mb-4">
                        {(inv.invoice_items || []).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-obsidian-800 shrink-0 overflow-hidden">
                              {item.lot_image ? (
                                <img src={item.lot_image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-obsidian-600 text-xs">?</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-obsidian-300 text-sm truncate">Lot {item.lot_number}: {item.lot_title}</p>
                            </div>
                            <p className="text-dgw-gold text-sm font-mono shrink-0">{formatCurrency(item.winning_bid)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="flex items-center justify-between pt-3 border-t border-obsidian-800">
                        <div className="text-xs text-obsidian-500">
                          {(inv.invoice_items || []).length} item{(inv.invoice_items || []).length !== 1 ? 's' : ''}
                          {inv.buyers_premium > 0 && ` + ${formatCurrency(inv.buyers_premium)} premium`}
                        </div>
                        <p className="text-dgw-gold font-semibold heading-display text-xl">{formatCurrency(inv.total)}</p>
                      </div>

                      {/* Tracking */}
                      {inv.tracking_number && (
                        <div className="mt-3 pt-3 border-t border-obsidian-800 flex items-center gap-3">
                          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <div>
                            <p className="text-obsidian-400 text-xs">Tracking: <code className="text-obsidian-200 bg-obsidian-800 px-1.5 py-0.5 rounded text-xs">{inv.tracking_number}</code></p>
                            {inv.shipped_at && (
                              <p className="text-obsidian-600 text-xs mt-0.5">
                                Shipped {new Date(inv.shipped_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== SETTINGS SECTION ===== */}
          {section === 'settings' && (
            <div>
              <h2 className="text-lg font-semibold text-obsidian-100 mb-6">Account Settings</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link href="/account/payment-methods" className="p-5 text-left bg-obsidian-900/50 border border-obsidian-800 hover:border-dgw-gold/30 transition-colors group">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-obsidian-200 group-hover:text-white transition-colors font-medium">Payment Methods</span>
                  </div>
                  <span className="text-xs text-obsidian-500">Add or update your card on file</span>
                </Link>
                <Link href="/account/watchlist" className="p-5 text-left bg-obsidian-900/50 border border-obsidian-800 hover:border-dgw-gold/30 transition-colors group">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-obsidian-200 group-hover:text-white transition-colors font-medium">Watchlist</span>
                  </div>
                  <span className="text-xs text-obsidian-500">View your saved lots</span>
                </Link>
                <Link href="/account/messages" className="p-5 text-left bg-obsidian-900/50 border border-obsidian-800 hover:border-dgw-gold/30 transition-colors group">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-obsidian-200 group-hover:text-white transition-colors font-medium">Messages</span>
                  </div>
                  <span className="text-xs text-obsidian-500">Conversations with DGW</span>
                </Link>
                <div className="p-5 text-left bg-obsidian-900/50 border border-obsidian-800">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-obsidian-200 font-medium">Profile</span>
                  </div>
                  <p className="text-xs text-obsidian-500">{user?.email}</p>
                </div>
                <div className="p-5 text-left bg-obsidian-900/50 border border-obsidian-800">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-obsidian-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="text-obsidian-200 font-medium">Notifications</span>
                  </div>
                  <p className="text-xs text-obsidian-500">Email and outbid alert preferences</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0a0a] pt-20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin mb-4" />
            <p className="text-dgw-gold/70 font-light tracking-widest text-sm">LOADING</p>
          </div>
        </div>
      </main>
    }>
      <AccountContent />
    </Suspense>
  );
}
