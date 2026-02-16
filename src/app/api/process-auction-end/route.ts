import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dgw.auction';

async function sendWinnerEmails(auctionId: string) {
  try {
    const response = await fetch(`${SITE_URL}/api/send-winner-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ auction_id: auctionId }),
    });
    
    const result = await response.json();
    console.log(`Winner emails for auction ${auctionId}:`, result);
    return result;
  } catch (error) {
    console.error(`Failed to send winner emails for auction ${auctionId}:`, error);
    return { error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  // Accept either cron secret OR authenticated admin session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (!isCronAuth) {
    const auth = await verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Find auctions that should have ended
    // With staggered closing, we must check that ALL lots have closed,
    // not just the auction's base ends_at. The last lot may end 30+ min later,
    // and soft-close extensions push individual lots even further.
    const now = new Date().toISOString();
    
    const { data: endedAuctions, error: fetchError } = await supabaseAdmin
      .from('auctions')
      .select('id, title, slug, ends_at')
      .eq('status', 'live')
      .lt('ends_at', now);

    if (fetchError) {
      console.error('Error fetching auctions:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!endedAuctions || endedAuctions.length === 0) {
      return NextResponse.json({ 
        message: 'No auctions to process',
        processed: 0 
      });
    }

    // Filter to only auctions where ALL lots have actually closed
    const readyAuctions = [];
    for (const auction of endedAuctions) {
      // Count lots that are still open (ends_at in the future)
      const { count: openCount } = await supabaseAdmin
        .from('lots')
        .select('*', { count: 'exact', head: true })
        .eq('auction_id', auction.id)
        .in('status', ['upcoming', 'live'])
        .gt('ends_at', now);

      // Also check lots with null ends_at (shouldn't happen but safety)
      const { count: nullEndsCount } = await supabaseAdmin
        .from('lots')
        .select('*', { count: 'exact', head: true })
        .eq('auction_id', auction.id)
        .in('status', ['upcoming', 'live'])
        .is('ends_at', null);

      if ((openCount || 0) === 0 && (nullEndsCount || 0) === 0) {
        readyAuctions.push(auction);
      } else {
        console.log(`Auction ${auction.title}: ${(openCount || 0) + (nullEndsCount || 0)} lots still open (staggered/extended), skipping`);
      }
    }

    if (readyAuctions.length === 0) {
      return NextResponse.json({ 
        message: 'Auctions found but lots still closing (staggered/extended)',
        processed: 0,
        waiting: endedAuctions.length
      });
    }

    const results = [];

    for (const auction of readyAuctions) {
      console.log(`Processing auction end: ${auction.title} (${auction.id})`);
      
      // Call the process_auction_end function (creates invoices, marks lots sold, etc.)
      const { data, error } = await supabaseAdmin.rpc('process_auction_end', {
        auction_uuid: auction.id
      });

      if (error) {
        console.error(`Error processing auction ${auction.id}:`, error);
        results.push({
          auction_id: auction.id,
          title: auction.title,
          error: error.message,
          winner_emails: null
        });
      } else {
        // Send winner emails after successful processing
        const emailResult = await sendWinnerEmails(auction.id);
        
        results.push({
          auction_id: auction.id,
          title: auction.title,
          ...data,
          winner_emails: emailResult
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${readyAuctions.length} auction(s)`,
      processed: readyAuctions.length,
      results
    });

  } catch (error: any) {
    console.error('Auction end cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
