'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface InvoiceItem {
  id: string;
  lot_id: string;
  winning_bid: number;
  lot_number: number;
  lot_title: string;
  lot_image: string | null;
}

interface Invoice {
  id: string;
  user_id: string;
  subtotal: number;
  buyers_premium: number;
  buyers_premium_percent: number;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  paid_at: string | null;
  user_email?: string;
  items?: InvoiceItem[];
}

interface ReserveNotMetLot {
  id: string;
  lot_number: number;
  title: string;
  current_bid: number;
  reserve_price: number;
  high_bidder_email?: string;
  images: string[];
}

interface Auction {
  id: string;
  title: string;
  slug: string;
  status: string;
  ends_at: string;
  buyers_premium_percent: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AuctionResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const auctionId = params.id;
  const [auction, setAuction] = useState<Auction | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reserveNotMet, setReserveNotMet] = useState<ReserveNotMetLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingLot, setProcessingLot] = useState<string | null>(null);
  const [chargeStatus, setChargeStatus] = useState<string>('');

  useEffect(() => {
    if (!auctionId) return;
    fetchData();
  }, [auctionId]);

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch auction
    const { data: auctionData, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auctionData) {
      console.error('Auction not found');
      setLoading(false);
      return;
    }

    setAuction(auctionData);

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('auction_id', auctionData.id)
      .order('total', { ascending: false });

    // Fetch user emails and invoice items for each invoice
    const invoicesWithItems: Invoice[] = [];
    
    for (const invoice of (invoicesData || [])) {
      // Get user email from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', invoice.user_id)
        .single();

      // Get invoice items
      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('lot_number', { ascending: true });

      invoicesWithItems.push({
        ...invoice,
        user_email: profileData?.email || `User ${invoice.user_id.slice(0, 8)}`,
        items: items || [],
      });
    }

    setInvoices(invoicesWithItems);

    // Fetch lots with reserve not met
    const { data: reserveLots } = await supabase
      .from('lots')
      .select('*')
      .eq('auction_id', auctionData.id)
      .eq('reserve_status', 'not_met');

    // Get high bidder emails for reserve not met lots
    const reserveWithBidders: ReserveNotMetLot[] = [];
    
    for (const lot of (reserveLots || [])) {
      const { data: winningBid } = await supabase
        .from('bids')
        .select('user_id')
        .eq('lot_id', lot.id)
        .eq('is_winning', true)
        .single();

      let email = 'Unknown';
      if (winningBid) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', winningBid.user_id)
          .single();
        email = profileData?.email || 'Unknown';
      }

      reserveWithBidders.push({
        ...lot,
        high_bidder_email: email,
      });
    }

    setReserveNotMet(reserveWithBidders);
    setLoading(false);
  };

  const handleReleaseLot = async (lotId: string) => {
    setProcessingLot(lotId);
    
    const response = await fetch('/api/admin/release-reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId }),
    });

    const result = await response.json();
    
    if (result.success) {
      fetchData(); // Refresh data
    } else {
      alert(`Error: ${result.error}`);
    }
    
    setProcessingLot(null);
  };

  const handleMarkUnsold = async (lotId: string) => {
    setProcessingLot(lotId);
    
    const response = await fetch('/api/admin/mark-unsold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId }),
    });

    const result = await response.json();
    
    if (result.success) {
      fetchData();
    } else {
      alert(`Error: ${result.error}`);
    }
    
    setProcessingLot(null);
  };

  const handleConfirmCharges = async () => {
    if (!confirm('Are you sure you want to charge ALL pending invoices? This action cannot be undone.')) {
      return;
    }

    setProcessing(true);
    setChargeStatus('Processing...');

    const response = await fetch('/api/admin/charge-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auction_id: auction?.id }),
    });

    const result = await response.json();

    if (result.success) {
      setChargeStatus(`✅ Charged ${result.charged} of ${result.total} invoices`);
      fetchData();
    } else {
      setChargeStatus(`❌ Error: ${result.error}`);
    }

    setProcessing(false);
  };

  // Calculate totals
  const totals = invoices.reduce((acc, inv) => ({
    subtotal: acc.subtotal + inv.subtotal,
    buyers_premium: acc.buyers_premium + inv.buyers_premium,
    tax: acc.tax + inv.tax,
    total: acc.total + inv.total,
    pending: acc.pending + (inv.status === 'pending' ? 1 : 0),
    paid: acc.paid + (inv.status === 'paid' ? 1 : 0),
  }), { subtotal: 0, buyers_premium: 0, tax: 0, total: 0, pending: 0, paid: 0 });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-8">
        <p className="text-red-400">Auction not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-[#1e1e22] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-[#C9A962] text-sm hover:underline mb-1 block">
              ← Back to Admin
            </Link>
            <h1 className="font-serif text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#D4BC7D] via-[#C9A962] to-[#A68B4B]">
              {auction.title} - Results
            </h1>
            <p className="text-[#747484] text-sm mt-1">
              {auction.status === 'ended' ? 'Auction Ended' : `Status: ${auction.status}`}
            </p>
          </div>
          
          {totals.pending > 0 && (
            <button
              onClick={handleConfirmCharges}
              disabled={processing}
              className="px-6 py-3 font-bold text-[#0a0a0a] disabled:opacity-50 transition-all"
              style={{
                background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
              }}
            >
              {processing ? 'Processing...' : `⚡ CONFIRM CHARGES (${totals.pending})`}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {chargeStatus && (
          <div className={`mb-6 p-4 rounded ${chargeStatus.includes('✅') ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
            {chargeStatus}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#141417] border border-[#27272c] p-4">
            <p className="text-[#747484] text-xs uppercase tracking-wider mb-1">Winners</p>
            <p className="text-2xl font-serif text-white">{invoices.length}</p>
          </div>
          <div className="bg-[#141417] border border-[#27272c] p-4">
            <p className="text-[#747484] text-xs uppercase tracking-wider mb-1">Subtotal</p>
            <p className="text-2xl font-serif text-white">{formatCurrency(totals.subtotal)}</p>
          </div>
          <div className="bg-[#141417] border border-[#27272c] p-4">
            <p className="text-[#747484] text-xs uppercase tracking-wider mb-1">Buyer's Premium</p>
            <p className="text-2xl font-serif text-[#C9A962]">{formatCurrency(totals.buyers_premium)}</p>
          </div>
          <div className="bg-[#141417] border border-[#27272c] p-4">
            <p className="text-[#747484] text-xs uppercase tracking-wider mb-1">Grand Total</p>
            <p className="text-2xl font-serif text-[#C9A962]">{formatCurrency(totals.total)}</p>
          </div>
        </div>

        {/* Reserve Not Met Section */}
        {reserveNotMet.length > 0 && (
          <div className="mb-8 bg-red-900/10 border border-red-500/30 p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
              ⚠️ Reserve Not Met ({reserveNotMet.length} lots)
            </h2>
            <div className="space-y-3">
              {reserveNotMet.map(lot => (
                <div key={lot.id} className="flex items-center justify-between bg-[#0a0a0a] p-4 border border-red-500/20">
                  <div className="flex items-center gap-4">
                    {lot.images?.[0] && (
                      <img src={lot.images[0]} alt={lot.title} className="w-16 h-16 object-cover" />
                    )}
                    <div>
                      <p className="font-medium">Lot {lot.lot_number}: {lot.title}</p>
                      <p className="text-sm text-[#747484]">
                        High Bid: <span className="text-white">{formatCurrency(lot.current_bid)}</span>
                        {' / '}
                        Reserve: <span className="text-red-400">{formatCurrency(lot.reserve_price)}</span>
                      </p>
                      <p className="text-xs text-[#5d5d6a]">Bidder: {lot.high_bidder_email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReleaseLot(lot.id)}
                      disabled={processingLot === lot.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {processingLot === lot.id ? '...' : '✓ Release to Bidder'}
                    </button>
                    <button
                      onClick={() => handleMarkUnsold(lot.id)}
                      disabled={processingLot === lot.id}
                      className="px-4 py-2 bg-[#27272c] hover:bg-[#3a3a3a] text-white text-sm font-medium disabled:opacity-50"
                    >
                      {processingLot === lot.id ? '...' : '✗ Mark Unsold'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-[#141417] border border-[#27272c]">
          <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-[#27272c] text-xs uppercase tracking-wider text-[#747484]">
            <div className="col-span-2">Winner</div>
            <div className="text-center">Items</div>
            <div className="text-right">Subtotal</div>
            <div className="text-right">BP ({auction.buyers_premium_percent}%)</div>
            <div className="text-right">Total</div>
            <div className="text-center">Status</div>
          </div>

          {invoices.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#5d5d6a]">
              No invoices yet. Auction may still be processing.
            </div>
          ) : (
            invoices.map(invoice => (
              <div key={invoice.id}>
                {/* Invoice Row */}
                <div 
                  className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-[#1e1e22] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-[#5d5d6a]">{expandedInvoice === invoice.id ? '▼' : '▶'}</span>
                    <span className="truncate">{invoice.user_email}</span>
                  </div>
                  <div className="text-center">{invoice.items?.length || 0}</div>
                  <div className="text-right">{formatCurrency(invoice.subtotal)}</div>
                  <div className="text-right text-[#C9A962]">{formatCurrency(invoice.buyers_premium)}</div>
                  <div className="text-right font-semibold">{formatCurrency(invoice.total)}</div>
                  <div className="text-center">
                    {invoice.status === 'paid' ? (
                      <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">PAID</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">PENDING</span>
                    )}
                  </div>
                </div>

                {/* Expanded Items */}
                {expandedInvoice === invoice.id && invoice.items && (
                  <div className="bg-[#0d0d0f] border-b border-[#1e1e22]">
                    {invoice.items.map(item => (
                      <div key={item.id} className="grid grid-cols-7 gap-4 px-6 py-3 pl-12 text-sm">
                        <div className="col-span-4 flex items-center gap-3">
                          {item.lot_image && (
                            <img src={item.lot_image} alt={item.lot_title} className="w-10 h-10 object-cover" />
                          )}
                          <span className="text-[#C9A962] mr-2">Lot {item.lot_number}</span>
                          <span className="text-[#b8b8c1]">{item.lot_title}</span>
                        </div>
                        <div className="col-span-2 text-right text-white">
                          {formatCurrency(item.winning_bid)}
                        </div>
                        <div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
