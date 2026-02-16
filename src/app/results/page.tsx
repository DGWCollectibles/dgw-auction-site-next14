'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

interface PastAuction {
  id: string;
  title: string;
  slug: string;
  ends_at: string;
  cover_image: string | null;
  category: string | null;
  lot_count: number;
  total_sold: number;
  total_hammer: number;
}

interface PastLot {
  id: string;
  lot_number: number;
  title: string;
  current_bid: number | null;
  starting_bid: number;
  images: string[];
  status: string;
  category: string | null;
  auction: {
    id: string;
    title: string;
    slug: string;
    ends_at: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export default function ResultsPage() {
  const [view, setView] = useState<'auctions' | 'lots'>('auctions');
  const [auctions, setAuctions] = useState<PastAuction[]>([]);
  const [lots, setLots] = useState<PastLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price_desc' | 'price_asc'>('date');
  const [selectedAuction, setSelectedAuction] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      if (view === 'auctions') {
        // Fetch ended auctions with stats
        const { data: auctionData } = await supabase
          .from('auctions')
          .select('id, title, slug, ends_at, cover_image, category')
          .eq('status', 'ended')
          .order('ends_at', { ascending: false });

        if (auctionData) {
          // Get lot stats for each auction
          const enriched: PastAuction[] = [];
          for (const auction of auctionData) {
            const { count: lotCount } = await supabase
              .from('lots')
              .select('*', { count: 'exact', head: true })
              .eq('auction_id', auction.id);

            const { data: soldLots } = await supabase
              .from('lots')
              .select('current_bid')
              .eq('auction_id', auction.id)
              .eq('status', 'sold');

            const totalHammer = (soldLots || []).reduce((sum, l) => sum + (l.current_bid || 0), 0);

            enriched.push({
              ...auction,
              lot_count: lotCount || 0,
              total_sold: soldLots?.length || 0,
              total_hammer: totalHammer,
            });
          }
          setAuctions(enriched);
        }
      } else {
        // Fetch all sold lots (prices realized)
        let query = supabase
          .from('lots')
          .select(`
            id, lot_number, title, current_bid, starting_bid, 
            images, status, category,
            auctions!inner ( id, title, slug, ends_at )
          `)
          .eq('status', 'sold')
          .not('current_bid', 'is', null);

        if (selectedAuction) {
          query = query.eq('auction_id', selectedAuction);
        }

        if (searchQuery.trim()) {
          query = query.ilike('title', `%${searchQuery.trim()}%`);
        }

        switch (sortBy) {
          case 'price_desc':
            query = query.order('current_bid', { ascending: false });
            break;
          case 'price_asc':
            query = query.order('current_bid', { ascending: true });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        query = query.limit(100);

        const { data } = await query;
        if (data) {
          setLots(data.map((l: any) => ({ ...l, auction: l.auctions })));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [view, selectedAuction, searchQuery, sortBy]);

  return (
    <main className="min-h-screen bg-obsidian-950">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-20">
        {/* Page Header */}
        <div className="text-center mb-12">
          <p className="text-dgw-gold text-xs tracking-[0.3em] uppercase mb-3">Archive</p>
          <h1 className="heading-display text-4xl md:text-5xl text-obsidian-100 mb-4">
            Prices Realized
          </h1>
          <p className="text-obsidian-400 max-w-2xl mx-auto">
            Browse past auction results and hammer prices from DGW Collectibles & Estates
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-1 bg-obsidian-900 rounded-lg p-1 border border-obsidian-800">
            <button
              onClick={() => setView('auctions')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                view === 'auctions'
                  ? 'bg-dgw-gold/10 text-dgw-gold'
                  : 'text-obsidian-400 hover:text-obsidian-200'
              }`}
            >
              Past Auctions
            </button>
            <button
              onClick={() => setView('lots')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                view === 'lots'
                  ? 'bg-dgw-gold/10 text-dgw-gold'
                  : 'text-obsidian-400 hover:text-obsidian-200'
              }`}
            >
              Individual Lots
            </button>
          </div>
        </div>

        {/* === PAST AUCTIONS VIEW === */}
        {view === 'auctions' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                  <div key={i} className="card animate-pulse">
                    <div className="aspect-[16/10] bg-obsidian-800" />
                    <div className="p-6 space-y-3">
                      <div className="h-5 bg-obsidian-800 rounded w-3/4" />
                      <div className="h-4 bg-obsidian-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : auctions.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-obsidian-400">No past auctions yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.map((auction, index) => (
                  <div
                    key={auction.id}
                    className="card overflow-hidden group cursor-pointer"
                    onClick={() => { setSelectedAuction(auction.id); setView('lots'); }}
                    style={{ animation: `riseUp 0.4s ease-out ${index * 0.08}s both` }}
                  >
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
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl opacity-15">
                            {auction.category === 'pokemon' ? '⚡' : auction.category === 'watches' ? '⌚' : '💎'}
                          </span>
                        </div>
                      )}
                      
                      {/* Ended overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 to-transparent" />
                      
                      <div className="absolute top-4 left-4">
                        <span className="text-xs px-2 py-1 rounded bg-obsidian-900/80 text-obsidian-300 border border-obsidian-700/50 backdrop-blur-sm">
                          Ended {formatDate(auction.ends_at)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 bg-gradient-to-b from-obsidian-800/30 to-transparent">
                      <h3 className="heading-display text-xl text-obsidian-100 group-hover:text-dgw-gold transition-colors mb-4">
                        {auction.title}
                      </h3>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-obsidian-500 text-[10px] tracking-widest uppercase mb-1">Lots</p>
                          <p className="text-obsidian-200 text-lg font-mono">{auction.lot_count}</p>
                        </div>
                        <div>
                          <p className="text-obsidian-500 text-[10px] tracking-widest uppercase mb-1">Sold</p>
                          <p className="text-green-400 text-lg font-mono">{auction.total_sold}</p>
                        </div>
                        <div>
                          <p className="text-obsidian-500 text-[10px] tracking-widest uppercase mb-1">Total</p>
                          <p className="text-dgw-gold text-lg font-mono">{formatCurrency(auction.total_hammer)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* === INDIVIDUAL LOTS VIEW (Prices Realized) === */}
        {view === 'lots' && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sold lots..."
                  className="w-full px-4 py-2 pl-10 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-200 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-obsidian-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Auction filter */}
              {selectedAuction && (
                <button
                  onClick={() => setSelectedAuction('')}
                  className="px-3 py-2 rounded-lg text-sm bg-dgw-gold/10 text-dgw-gold border border-dgw-gold/30 flex items-center gap-1.5"
                >
                  {auctions.find(a => a.id === selectedAuction)?.title || 'Filtered'}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-300 focus:outline-none focus:border-dgw-gold/50"
              >
                <option value="date">Most Recent</option>
                <option value="price_desc">Highest Price</option>
                <option value="price_asc">Lowest Price</option>
              </select>

              {/* Back to auctions */}
              <button
                onClick={() => { setView('auctions'); setSelectedAuction(''); }}
                className="ml-auto text-sm text-obsidian-400 hover:text-dgw-gold transition-colors"
              >
                View all auctions
              </button>
            </div>

            {/* Lots Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="aspect-square bg-obsidian-800" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-obsidian-800 rounded w-2/3" />
                      <div className="h-5 bg-obsidian-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : lots.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-obsidian-400">No sold lots found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {lots.map((lot, index) => (
                  <Link
                    key={lot.id}
                    href={`/lots/${lot.id}`}
                    className="card overflow-hidden group"
                    style={{ animation: `riseUp 0.3s ease-out ${index * 0.02}s both` }}
                  >
                    {/* Image */}
                    <div className="aspect-square bg-obsidian-800 relative overflow-hidden">
                      {lot.images?.[0] ? (
                        <img 
                          src={lot.images[0]} 
                          alt={lot.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-obsidian-700 text-3xl">?</div>
                      )}

                      {/* SOLD badge */}
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-semibold tracking-wider">
                          SOLD
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <p className="text-dgw-gold/50 text-[9px] tracking-widest uppercase mb-1">
                        Lot {lot.lot_number}
                      </p>
                      <h3 className="text-obsidian-200 text-xs font-medium leading-snug line-clamp-2 mb-2 group-hover:text-dgw-gold transition-colors">
                        {lot.title}
                      </h3>
                      <div>
                        <p className="text-obsidian-500 text-[9px] tracking-widest uppercase">Hammer Price</p>
                        <p className="text-dgw-gold text-lg font-mono font-semibold leading-tight">
                          {formatCurrency(lot.current_bid || 0)}
                        </p>
                      </div>
                      <p className="text-obsidian-600 text-[10px] mt-2 line-clamp-1">
                        {lot.auction.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
