import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifyAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for email batch

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dgw.auction';
const FROM_EMAIL = process.env.FROM_EMAIL || 'auctions@dgwcollectibles.com';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatAuctionDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(dateStr));
}

interface AuctionData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string;
  buyers_premium_percent: number;
  lot_close_interval_seconds: number | null;
  status: string;
}

interface LotPreview {
  title: string;
  lot_number: number;
  starting_bid: number;
  images: string[];
}

function generateAuctionLiveEmail(
  auction: AuctionData,
  lotCount: number,
  featuredLots: LotPreview[],
  recipientName: string,
): string {
  const auctionUrl = `${SITE_URL}/auctions/${auction.slug}`;

  const featuredLotsHtml = featuredLots.slice(0, 4).map(lot => `
    <td style="width: 25%; padding: 8px; vertical-align: top;">
      ${lot.images?.[0] ? `
        <img src="${lot.images[0]}" alt="${lot.title}" style="width: 100%; aspect-ratio: 1; object-fit: cover; display: block; border: 1px solid rgba(201, 169, 98, 0.15);">
      ` : `
        <div style="width: 100%; aspect-ratio: 1; background: #141417; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(201, 169, 98, 0.15);">
          <span style="color: #333; font-size: 24px;">?</span>
        </div>
      `}
      <p style="margin: 6px 0 2px; color: #C9A962; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;">LOT ${lot.lot_number}</p>
      <p style="margin: 0 0 2px; color: #ddd; font-size: 11px; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${lot.title}</p>
      <p style="margin: 0; color: #C9A962; font-size: 12px; font-family: 'Georgia', serif;">Starting ${formatCurrency(lot.starting_bid)}</p>
    </td>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <span style="font-family: 'Georgia', serif; font-size: 28px; color: #C9A962; letter-spacing: 0.1em;">DGW</span>
              <span style="font-family: 'Helvetica Neue', sans-serif; font-size: 12px; color: #666; display: block; letter-spacing: 0.2em; margin-top: 4px;">COLLECTIBLES & ESTATES</span>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(180deg, #1a1612 0%, #0d0b09 100%); border: 1px solid rgba(201, 169, 98, 0.2);">
                
                <!-- Live Banner -->
                <tr>
                  <td style="background: rgba(201, 169, 98, 0.08); border-bottom: 1px solid rgba(201, 169, 98, 0.15); padding: 16px 24px; text-align: center;">
                    <span style="color: #C9A962; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase;">BIDDING IS NOW OPEN</span>
                  </td>
                </tr>
                
                <!-- Cover Image -->
                ${auction.cover_image ? `
                <tr>
                  <td style="padding: 0;">
                    <img src="${auction.cover_image}" alt="${auction.title}" style="width: 100%; height: auto; display: block;">
                  </td>
                </tr>
                ` : ''}
                
                <!-- Greeting -->
                <tr>
                  <td style="padding: 30px 24px 16px;">
                    <p style="margin: 0; color: #eee; font-size: 16px;">Hi ${recipientName},</p>
                  </td>
                </tr>
                
                <!-- Auction Title -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <h1 style="margin: 0 0 12px; color: #fff; font-family: 'Georgia', serif; font-size: 26px; line-height: 1.3;">${auction.title}</h1>
                    ${auction.description ? `
                      <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6;">${auction.description}</p>
                    ` : ''}
                  </td>
                </tr>
                
                <!-- Auction Details -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <table role="presentation" style="width: 100%; background: rgba(10, 10, 10, 0.5); border: 1px solid rgba(201, 169, 98, 0.12);">
                      <tr>
                        <td style="padding: 16px; width: 33%; text-align: center; border-right: 1px solid rgba(201, 169, 98, 0.08);">
                          <p style="margin: 0 0 4px; color: #666; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;">Lots</p>
                          <p style="margin: 0; color: #C9A962; font-size: 22px; font-family: 'Georgia', serif;">${lotCount}</p>
                        </td>
                        <td style="padding: 16px; width: 33%; text-align: center; border-right: 1px solid rgba(201, 169, 98, 0.08);">
                          <p style="margin: 0 0 4px; color: #666; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;">Premium</p>
                          <p style="margin: 0; color: #C9A962; font-size: 22px; font-family: 'Georgia', serif;">${auction.buyers_premium_percent}%</p>
                        </td>
                        <td style="padding: 16px; width: 33%; text-align: center;">
                          <p style="margin: 0 0 4px; color: #666; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;">Closing</p>
                          <p style="margin: 0; color: #ddd; font-size: 13px; line-height: 1.4;">${formatAuctionDate(auction.ends_at)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Featured Lots -->
                ${featuredLots.length > 0 ? `
                <tr>
                  <td style="padding: 0 24px 8px;">
                    <p style="margin: 0; color: #888; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;">Featured Lots</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 16px 24px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        ${featuredLotsHtml}
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 24px 30px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td align="center">
                          <a href="${auctionUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%); color: #0a0a0a; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">
                            START BIDDING
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Closing Date Reminder -->
                <tr>
                  <td style="padding: 20px 24px; border-top: 1px solid rgba(201, 169, 98, 0.1); text-align: center;">
                    <p style="margin: 0; color: #888; font-size: 13px;">
                      Lots begin closing: <strong style="color: #ddd;">${formatAuctionDate(auction.ends_at)}</strong>
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 24px; text-align: center;">
              <p style="margin: 0 0 8px; color: #666; font-size: 12px;">
                <a href="${SITE_URL}/account" style="color: #C9A962; text-decoration: none;">My Account</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${SITE_URL}/auctions" style="color: #C9A962; text-decoration: none;">All Auctions</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${SITE_URL}/how-it-works" style="color: #C9A962; text-decoration: none;">How It Works</a>
              </p>
              <p style="margin: 0; color: #444; font-size: 11px;">
                &copy; ${new Date().getFullYear()} DGW Collectibles & Estates. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function POST(request: NextRequest) {
  // Verify admin access
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { auction_id } = await request.json();

    if (!auction_id) {
      return NextResponse.json({ error: 'auction_id required' }, { status: 400 });
    }

    // ========================================
    // STEP 1: Validate auction
    // ========================================
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from('auctions')
      .select('*')
      .eq('id', auction_id)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    if (auction.status === 'live') {
      return NextResponse.json({ error: 'Auction is already live' }, { status: 400 });
    }

    if (auction.status === 'ended') {
      return NextResponse.json({ error: 'Cannot relaunch an ended auction' }, { status: 400 });
    }

    // Validate dates
    const now = new Date();
    const endsAt = new Date(auction.ends_at);
    if (endsAt <= now) {
      return NextResponse.json({ 
        error: 'Auction end date is in the past. Update the end date before going live.' 
      }, { status: 400 });
    }

    // Validate lots exist
    const { count: lotCount } = await supabaseAdmin
      .from('lots')
      .select('*', { count: 'exact', head: true })
      .eq('auction_id', auction_id);

    if (!lotCount || lotCount === 0) {
      return NextResponse.json({ 
        error: 'Auction has no lots. Add at least one lot before going live.' 
      }, { status: 400 });
    }

    // ========================================
    // STEP 2: Initialize staggered lot end times
    // ========================================
    const { data: initResult, error: initError } = await supabaseAdmin.rpc(
      'initialize_lot_end_times',
      { auction_uuid: auction_id }
    );

    if (initError) {
      console.error('Failed to initialize lot end times:', initError);
      return NextResponse.json({ 
        error: `Failed to initialize lot timing: ${initError.message}` 
      }, { status: 500 });
    }

    console.log(`Initialized staggered closing for ${lotCount} lots`);

    // ========================================
    // STEP 3: Set auction status to live
    // ========================================
    const { error: updateError } = await supabaseAdmin
      .from('auctions')
      .update({ status: 'live' })
      .eq('id', auction_id);

    if (updateError) {
      console.error('Failed to update auction status:', updateError);
      return NextResponse.json({ 
        error: `Failed to set auction live: ${updateError.message}` 
      }, { status: 500 });
    }

    console.log(`Auction ${auction.title} is now LIVE`);

    // ========================================
    // STEP 4: Get featured lots for email
    // ========================================
    const { data: featuredLots } = await supabaseAdmin
      .from('lots')
      .select('title, lot_number, starting_bid, images')
      .eq('auction_id', auction_id)
      .order('lot_number', { ascending: true })
      .limit(4);

    // ========================================
    // STEP 5: Send notification emails
    // ========================================
    // Get all users who have accounts (opted into the platform)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, display_name');

    let emailsSent = 0;
    let emailsFailed = 0;

    if (users && users.length > 0) {
      // Send in batches to respect Resend rate limits
      const BATCH_SIZE = 10;
      
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        
        const emailPromises = batch.map(async (user) => {
          if (!user.email) return;
          
          const recipientName = user.display_name || user.full_name || 'Collector';

          try {
            await resend.emails.send({
              from: `DGW Auctions <${FROM_EMAIL}>`,
              to: user.email,
              subject: `Now Live: ${auction.title}`,
              html: generateAuctionLiveEmail(
                auction as AuctionData,
                lotCount,
                (featuredLots || []) as LotPreview[],
                recipientName,
              ),
            });
            emailsSent++;
          } catch (emailError) {
            console.error(`Failed to send live email to ${user.email}:`, emailError);
            emailsFailed++;
          }
        });

        await Promise.all(emailPromises);

        // Brief pause between batches for rate limiting
        if (i + BATCH_SIZE < users.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // ========================================
    // STEP 6: Create in-app notifications
    // ========================================
    if (users && users.length > 0) {
      const notificationInserts = users.map(user => ({
        user_id: user.id,
        type: 'auction_start',
        title: 'Auction Now Live',
        message: `${auction.title} is now open for bidding with ${lotCount} lots. Don't miss out!`,
        link: `/auctions/${auction.slug}`,
      }));

      await supabaseAdmin
        .from('notifications')
        .insert(notificationInserts);
    }

    return NextResponse.json({
      success: true,
      auction_id: auction_id,
      status: 'live',
      lots_initialized: lotCount,
      staggered_interval: auction.lot_close_interval_seconds || 20,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_users: users?.length || 0,
    });

  } catch (error: any) {
    console.error('Go-live error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
