'use client'

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

interface SearchLot {
  id: string;
  lot_number: number;
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  current_bid: number | null;
  starting_bid: number;
  images: string[];
  ends_at: string | null;
  status: string;
  bid_count: number;
  auction: {
    id: string;
    title: string;
    slug: string;
    status: string;
    ends_at: string;
  };
}

type SortOption = 'ending_soon' | 'price_asc' | 'price_desc' | 'newest' | 'most_bids';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'pokemon', label: 'Pokemon Cards' },
  { value: 'sports', label: 'Sports Cards' },
  { value: 'watches', label: 'Watches' },
  { value: 'luxury', label: 'Luxury Items' },
  { value: 'mixed', label: 'Mixed' },
];

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

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'ending_soon');
  const [priceMin, setPriceMin] = useState(searchParams.get('min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('max') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'live');
  
  const [lots, setLots] = useState<SearchLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let lotQuery = supabase
      .from('lots')
      .select(`
        id, lot_number, title, description, category, condition,
        current_bid, starting_bid, images, ends_at, status, bid_count,
        auctions!inner ( id, title, slug, status, ends_at )
      `, { count: 'exact' });

    // Text search (title + description)
    if (query.trim()) {
      lotQuery = lotQuery.or(`title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`);
    }

    // Category filter (on lot or auction level)
    if (category) {
      lotQuery = lotQuery.eq('category', category);
    }

    // Status filter
    if (statusFilter === 'live') {
      lotQuery = lotQuery.eq('auctions.status', 'live');
    } else if (statusFilter === 'ended') {
      lotQuery = lotQuery.in('status', ['sold', 'unsold']);
    }

    // Price range
    if (priceMin) {
      lotQuery = lotQuery.gte('current_bid', Number(priceMin));
    }
    if (priceMax) {
      lotQuery = lotQuery.lte('current_bid', Number(priceMax));
    }

    // Sorting
    switch (sortBy) {
      case 'ending_soon':
        lotQuery = lotQuery.order('ends_at', { ascending: true, nullsFirst: false });
        break;
      case 'price_asc':
        lotQuery = lotQuery.order('current_bid', { ascending: true, nullsFirst: true });
        break;
      case 'price_desc':
        lotQuery = lotQuery.order('current_bid', { ascending: false, nullsFirst: true });
        break;
      case 'newest':
        lotQuery = lotQuery.order('created_at', { ascending: false });
        break;
      case 'most_bids':
        lotQuery = lotQuery.order('bid_count', { ascending: false });
        break;
    }

    lotQuery = lotQuery.limit(60);

    const { data, count, error } = await lotQuery;

    if (data) {
      const mapped = data.map((lot: any) => ({
        ...lot,
        auction: lot.auctions,
      }));
      setLots(mapped);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [query, category, sortBy, priceMin, priceMax, statusFilter]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (sortBy !== 'ending_soon') params.set('sort', sortBy);
    if (priceMin) params.set('min', priceMin);
    if (priceMax) params.set('max', priceMax);
    if (statusFilter !== 'live') params.set('status', statusFilter);
    
    const paramString = params.toString();
    const newUrl = paramString ? `/search?${paramString}` : '/search';
    window.history.replaceState(null, '', newUrl);
  }, [query, category, sortBy, priceMin, priceMax, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults();
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setPriceMin('');
    setPriceMax('');
    setSortBy('ending_soon');
    setStatusFilter('live');
  };

  const hasActiveFilters = query || category || priceMin || priceMax || statusFilter !== 'live';

  return (
    <main className="min-h-screen bg-obsidian-950">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-20">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="heading-display text-3xl text-obsidian-100 mb-6">Search & Browse</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lots by title, description, card name..."
              className="w-full px-6 py-4 pl-14 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 text-lg placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold/50 transition-colors"
            />
            <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-obsidian-500 hover:text-obsidian-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Status tabs */}
          <div className="flex gap-1 bg-obsidian-900 rounded-lg p-1 border border-obsidian-800">
            {[
              { value: 'live', label: 'Live' },
              { value: 'ended', label: 'Past' },
              { value: '', label: 'All' },
            ].map(s => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  statusFilter === s.value
                    ? 'bg-dgw-gold/10 text-dgw-gold'
                    : 'text-obsidian-400 hover:text-obsidian-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-300 focus:outline-none focus:border-dgw-gold/50"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-300 focus:outline-none focus:border-dgw-gold/50"
          >
            <option value="ending_soon">Ending Soon</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="most_bids">Most Bids</option>
            <option value="newest">Newest</option>
          </select>

          {/* Price filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              showFilters || priceMin || priceMax
                ? 'border-dgw-gold/30 text-dgw-gold bg-dgw-gold/5'
                : 'border-obsidian-700 text-obsidian-400 hover:text-obsidian-200'
            }`}
          >
            <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Price Range
          </button>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-obsidian-500 hover:text-obsidian-300 transition-colors"
            >
              Clear all
            </button>
          )}

          {/* Result count */}
          <span className="ml-auto text-sm text-obsidian-500">
            {totalCount} result{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Price range (expandable) */}
        {showFilters && (
          <div className="card p-4 mb-6 flex items-center gap-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <span className="text-sm text-obsidian-400">Price:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="Min"
                className="w-28 px-3 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-200 focus:outline-none focus:border-dgw-gold/50"
              />
              <span className="text-obsidian-600">to</span>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Max"
                className="w-28 px-3 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-sm text-obsidian-200 focus:outline-none focus:border-dgw-gold/50"
              />
            </div>
          </div>
        )}

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-obsidian-800" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-obsidian-800 rounded w-1/3" />
                  <div className="h-4 bg-obsidian-800 rounded w-3/4" />
                  <div className="h-5 bg-obsidian-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : lots.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-obsidian-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-obsidian-300 text-lg mb-2">No lots found</h3>
            <p className="text-obsidian-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lots.map((lot, index) => {
              const currentPrice = lot.current_bid || lot.starting_bid;
              const isLive = lot.auction.status === 'live';
              const endTime = lot.ends_at || lot.auction.ends_at;

              return (
                <Link
                  key={lot.id}
                  href={`/lots/${lot.id}`}
                  className="card overflow-hidden group"
                  style={{ animation: `riseUp 0.3s ease-out ${index * 0.03}s both` }}
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
                      <div className="w-full h-full flex items-center justify-center text-obsidian-700 text-4xl">?</div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {isLive && (
                        <span className="badge badge-live text-[10px] px-1.5 py-0.5">
                          <span className="live-dot" style={{ width: 3, height: 3 }} />
                          Live
                        </span>
                      )}
                      {lot.status === 'sold' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-semibold tracking-wider">
                          SOLD
                        </span>
                      )}
                    </div>

                    {/* Timer */}
                    {isLive && endTime && (
                      <div className="absolute bottom-2 right-2 bid-indicator text-xs">
                        <svg className="w-3 h-3 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="timer text-xs">{formatTimeRemaining(endTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <p className="text-dgw-gold/60 text-[10px] tracking-widest uppercase mb-1">
                      Lot {lot.lot_number} &middot; {lot.auction.title}
                    </p>
                    <h3 className="text-obsidian-200 text-sm font-medium leading-snug line-clamp-2 mb-2 group-hover:text-dgw-gold transition-colors">
                      {lot.title}
                    </h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-obsidian-500 text-[9px] tracking-widest uppercase">
                          {lot.bid_count > 0 ? 'Current Bid' : 'Starting'}
                        </p>
                        <p className="text-dgw-gold text-lg font-mono font-semibold leading-tight">
                          {formatCurrency(currentPrice)}
                        </p>
                      </div>
                      {lot.bid_count > 0 && (
                        <p className="text-obsidian-500 text-xs">
                          {lot.bid_count} bid{lot.bid_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
