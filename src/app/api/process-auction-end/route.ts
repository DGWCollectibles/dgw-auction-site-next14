import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        'x-internal-call': 'true',
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
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find auctions that should have ended
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

    const results = [];

    for (const auction of endedAuctions) {
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
      message: `Processed ${endedAuctions.length} auction(s)`,
      processed: endedAuctions.length,
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
