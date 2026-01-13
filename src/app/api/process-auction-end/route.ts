import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Verify cron secret (optional but recommended)
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
      
      // Call the process_auction_end function
      const { data, error } = await supabaseAdmin.rpc('process_auction_end', {
        auction_uuid: auction.id
      });

      if (error) {
        console.error(`Error processing auction ${auction.id}:`, error);
        results.push({
          auction_id: auction.id,
          title: auction.title,
          error: error.message
        });
      } else {
        results.push({
          auction_id: auction.id,
          title: auction.title,
          ...data
        });

        // TODO: Trigger winner notification emails here
        // await sendWinnerEmails(auction.id);
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
