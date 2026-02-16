'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

interface WatchlistLot {
  watchlist_id: string;
  notify_before_end: boolean;
  notify_on_outbid: boolean;
  lot: {
    id: string;
    lot_number: number;
    title: string;
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

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'ended'>('all');

  useEffect(() => {
    const fetchWatchlist = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login?redirect=/account/watchlist');
        return;
      }

      const { data: watchlistData, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          notify_before_end,
          notify_on_outbid,
          lots (
            id, lot_number, title, current_bid, starting_bid, 
            images, ends_at, status, bid_count,
            auctions ( id, title, slug, status, ends_at )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (watchlistData) {
        const mapped = watchlistData
          .filter((w: any) => w.lots)
          .map((w: any) => ({
            watchlist_id: w.id,
            notify_before_end: w.notify_before_end,
            notify_on_outbid: w.notify_on_outbid,
            lot: {
              ...w.lots,
              auction: w.lots.auctions,
            },
          }));
        setItems(mapped);
      }
      setLoading(false);
    };

    fetchWatchlist();
  }, [router]);

  const handleRemove = async (watchlistId: string) => {
    setRemoving(watchlistId);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', watchlistId);

    if (!error) {
      setItems(prev => prev.filter(i => i.watchlist_id !== watchlistId));
    }
    setRemoving(null);
  };

  const toggleNotify = async (watchlistId: string, field: 'notify_before_end' | 'notify_on_outbid', value: boolean) => {
    const supabase = createClient();
    await supabase
      .from('watchlist')
      .update({ [field]: !value })
      .eq('id', watchlistId);

    setItems(prev => prev.map(i => 
      i.watchlist_id === watchlistId ? { ...i, [field]: !value } : i
    ));
  };

  const filtered = items.filter(item => {
    if (filter === 'live') return item.lot.auction.status === 'live';
    if (filter === 'ended') return item.lot.auction.status === 'ended';
    return true;
  });

  return (
    <main className="min-h-screen bg-obsidian-950">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-obsidian-500 mb-8">
          <Link href="/account" className="hover:text-dgw-gold transition-colors">My Account</Link>
          <span>/</span>
          <span className="text-obsidian-300">Watchlist</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="heading-display text-3xl text-obsidian-100 mb-2">Saved Lots</h1>
            <p className="text-obsidian-500">{items.length} {items.length === 1 ? 'lot' : 'lots'} saved</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(['all', 'live', 'ended'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-dgw-gold/10 text-dgw-gold border border-dgw-gold/30' 
                    : 'text-obsidian-400 hover:text-obsidian-200 border border-obsidian-800 hover:border-obsidian-600'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-obsidian-800 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-obsidian-800 rounded w-3/4" />
                    <div className="h-3 bg-obsidian-800 rounded w-1/2" />
                    <div className="h-6 bg-obsidian-800 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">
              <svg className="w-16 h-16 mx-auto text-obsidian-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-obsidian-300 text-lg mb-2">
              {filter !== 'all' ? `No ${filter} lots in your watchlist` : 'Your watchlist is empty'}
            </h3>
            <p className="text-obsidian-500 mb-6">
              Save lots you&apos;re interested in to track them here
            </p>
            <Link href="/auctions" className="btn btn-primary">
              Browse Auctions
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item, index) => {
              const lot = item.lot;
              const auction = lot.auction;
              const isLive = auction.status === 'live';
              const isEnded = auction.status === 'ended';
              const currentPrice = lot.current_bid || lot.starting_bid;
              const endTime = lot.ends_at || auction.ends_at;

              return (
                <div 
                  key={item.watchlist_id}
                  className="card overflow-hidden group"
                  style={{ animation: `riseUp 0.4s ease-out ${index * 0.05}s both` }}
                >
                  <div className="flex gap-4 p-4">
                    {/* Lot Image */}
                    <Link href={`/lots/${lot.id}`} className="shrink-0">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-obsidian-800 relative">
                        {lot.images?.[0] ? (
                          <img 
                            src={lot.images[0]} 
                            alt={lot.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-obsidian-600 text-2xl">
                            ?
                          </div>
                        )}
                        {isLive && (
                          <div className="absolute top-1 left-1">
                            <span className="badge badge-live text-[10px] px-1.5 py-0.5">
                              <span className="live-dot" style={{ width: 3, height: 3 }} />
                              Live
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Lot Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-dgw-gold text-[10px] tracking-widest uppercase mb-0.5">
                            Lot {lot.lot_number} &middot; {auction.title}
                          </p>
                          <Link href={`/lots/${lot.id}`}>
                            <h3 className="text-obsidian-100 font-medium text-sm leading-snug line-clamp-2 hover:text-dgw-gold transition-colors">
                              {lot.title}
                            </h3>
                          </Link>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => handleRemove(item.watchlist_id)}
                          disabled={removing === item.watchlist_id}
                          className="shrink-0 p-1.5 rounded-lg text-obsidian-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Remove from watchlist"
                        >
                          {removing === item.watchlist_id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Price & Time */}
                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <p className="text-obsidian-500 text-[10px] tracking-widest uppercase">
                            {lot.bid_count > 0 ? 'Current Bid' : 'Starting Bid'}
                          </p>
                          <p className="text-dgw-gold text-lg font-mono font-semibold">
                            {formatCurrency(currentPrice)}
                          </p>
                          {lot.bid_count > 0 && (
                            <p className="text-obsidian-500 text-xs">{lot.bid_count} bid{lot.bid_count !== 1 ? 's' : ''}</p>
                          )}
                        </div>

                        {isLive && (
                          <div className="text-right">
                            <p className="text-obsidian-500 text-[10px] tracking-widest uppercase">Time Left</p>
                            <p className="text-obsidian-200 text-sm font-mono">
                              {formatTimeRemaining(endTime)}
                            </p>
                          </div>
                        )}

                        {isEnded && (
                          <span className="text-xs px-2 py-1 rounded bg-obsidian-800 text-obsidian-400 border border-obsidian-700">
                            {lot.status === 'sold' ? 'Sold' : 'Ended'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notification toggles */}
                  {isLive && (
                    <div className="px-4 pb-3 flex gap-4 border-t border-obsidian-800/50 pt-3">
                      <button
                        onClick={() => toggleNotify(item.watchlist_id, 'notify_before_end', item.notify_before_end)}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          item.notify_before_end ? 'text-dgw-gold' : 'text-obsidian-500 hover:text-obsidian-300'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Ending soon
                      </button>
                      <button
                        onClick={() => toggleNotify(item.watchlist_id, 'notify_on_outbid', item.notify_on_outbid)}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          item.notify_on_outbid ? 'text-dgw-gold' : 'text-obsidian-500 hover:text-obsidian-300'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Outbid alerts
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
