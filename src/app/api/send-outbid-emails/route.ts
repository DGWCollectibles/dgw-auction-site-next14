import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize clients
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctions.dgwcollectibles.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'auctions@dgwcollectibles.com';

interface OutbidNotification {
  notification_id: string;
  user_email: string;
  user_name: string;
  lot_id: string;
  lot_title: string;
  lot_number: number;
  lot_image: string | null;
  auction_title: string;
  auction_slug: string;
  auction_ends_at: string;
  current_bid: number;
  outbid_amount: number;
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
  if (diff <= 0) return 'Ending soon!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function generateEmailHtml(notification: OutbidNotification): string {
  const lotUrl = `${SITE_URL}/lots/${notification.lot_id}`;
  const auctionUrl = `${SITE_URL}/auctions/${notification.auction_slug}`;
  const timeRemaining = formatTimeRemaining(notification.auction_ends_at);

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
                
                <!-- Alert Banner -->
                <tr>
                  <td style="background: rgba(239, 68, 68, 0.1); border-bottom: 1px solid rgba(239, 68, 68, 0.2); padding: 16px 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td>
                          <span style="color: #f87171; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;">⚠️ OUTBID ALERT</span>
                        </td>
                        <td align="right">
                          <span style="color: #999; font-size: 12px;">${timeRemaining} left</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Greeting -->
                <tr>
                  <td style="padding: 30px 24px 20px;">
                    <p style="margin: 0; color: #eee; font-size: 16px;">Hi ${notification.user_name},</p>
                  </td>
                </tr>
                
                <!-- Message -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6;">
                      You've been outbid on the following lot. Don't let it slip away!
                    </p>
                  </td>
                </tr>
                
                <!-- Lot Details -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <table role="presentation" style="width: 100%; background: rgba(10, 10, 10, 0.5); border: 1px solid rgba(201, 169, 98, 0.15);">
                      <tr>
                        ${notification.lot_image ? `
                        <td style="width: 120px; padding: 16px;">
                          <img src="${notification.lot_image}" alt="${notification.lot_title}" style="width: 100%; height: auto; display: block;">
                        </td>
                        ` : ''}
                        <td style="padding: 16px; vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #C9A962; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">LOT ${notification.lot_number}</p>
                          <p style="margin: 0 0 12px; color: #fff; font-size: 16px; font-weight: 500; line-height: 1.4;">${notification.lot_title}</p>
                          <p style="margin: 0 0 4px; color: #666; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">CURRENT BID</p>
                          <p style="margin: 0; color: #C9A962; font-size: 24px; font-family: 'Georgia', serif;">${formatCurrency(notification.current_bid)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 24px 30px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td align="center">
                          <a href="${lotUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%); color: #0a0a0a; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">
                            BID NOW →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Auction Info -->
                <tr>
                  <td style="padding: 20px 24px; border-top: 1px solid rgba(201, 169, 98, 0.1);">
                    <p style="margin: 0; color: #666; font-size: 12px;">
                      Part of: <a href="${auctionUrl}" style="color: #C9A962; text-decoration: none;">${notification.auction_title}</a>
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
                &nbsp;&nbsp;•&nbsp;&nbsp;
                <a href="${SITE_URL}/auctions" style="color: #C9A962; text-decoration: none;">All Auctions</a>
              </p>
              <p style="margin: 0; color: #444; font-size: 11px;">
                © ${new Date().getFullYear()} DGW Collectibles & Estates. All rights reserved.
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
  // Verify authorization (use a secret key for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get pending notifications
    const { data: notifications, error: fetchError } = await supabaseAdmin.rpc(
      'get_pending_outbid_notifications',
      { batch_size: 50 }
    );

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications', sent: 0 });
    }

    console.log(`Processing ${notifications.length} outbid notifications`);

    const sentIds: string[] = [];
    const failedIds: string[] = [];

    for (const notification of notifications as OutbidNotification[]) {
      try {
        await resend.emails.send({
          from: `DGW Auctions <${FROM_EMAIL}>`,
          to: notification.user_email,
          subject: `Outbid Alert: ${notification.lot_title}`,
          html: generateEmailHtml(notification),
        });
        
        sentIds.push(notification.notification_id);
      } catch (emailError) {
        console.error(`Failed to send email to ${notification.user_email}:`, emailError);
        failedIds.push(notification.notification_id);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark successful notifications as sent
    if (sentIds.length > 0) {
      await supabaseAdmin.rpc('mark_notifications_sent', {
        notification_ids: sentIds,
      });
    }

    return NextResponse.json({
      message: `Processed ${notifications.length} notifications`,
      sent: sentIds.length,
      failed: failedIds.length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Also support GET for easy cron testing
export async function GET(request: NextRequest) {
  return POST(request);
}
