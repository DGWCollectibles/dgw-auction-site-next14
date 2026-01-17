import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dgw.auction';
const FROM_EMAIL = process.env.FROM_EMAIL || 'auctions@dgwcollectibles.com';

interface WinnerLot {
  lot_id: string;
  lot_number: number;
  lot_title: string;
  lot_image: string | null;
  winning_bid: number;
}

interface WinnerData {
  user_id: string;
  user_email: string;
  user_name: string;
  auction_id: string;
  auction_title: string;
  auction_slug: string;
  lots: WinnerLot[];
  subtotal: number;
  buyers_premium: number;
  buyers_premium_percent: number;
  total: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function generateWinnerEmailHtml(winner: WinnerData): string {
  const accountUrl = `${SITE_URL}/account`;
  
  const lotsHtml = winner.lots.map(lot => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid rgba(201, 169, 98, 0.1);">
        <table role="presentation" style="width: 100%;">
          <tr>
            ${lot.lot_image ? `
            <td style="width: 60px; padding-right: 12px;">
              <img src="${lot.lot_image}" alt="${lot.lot_title}" style="width: 60px; height: 60px; object-fit: cover; display: block;">
            </td>
            ` : ''}
            <td style="vertical-align: top;">
              <p style="margin: 0 0 4px; color: #C9A962; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;">LOT ${lot.lot_number}</p>
              <p style="margin: 0; color: #eee; font-size: 14px; line-height: 1.4;">${lot.lot_title}</p>
            </td>
            <td style="width: 100px; text-align: right; vertical-align: top;">
              <p style="margin: 0; color: #C9A962; font-size: 16px; font-family: 'Georgia', serif;">${formatCurrency(lot.winning_bid)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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
                
                <!-- Success Banner -->
                <tr>
                  <td style="background: rgba(34, 197, 94, 0.1); border-bottom: 1px solid rgba(34, 197, 94, 0.2); padding: 16px 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td>
                          <span style="color: #4ade80; font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;">🎉 CONGRATULATIONS, YOU WON!</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Greeting -->
                <tr>
                  <td style="padding: 30px 24px 20px;">
                    <p style="margin: 0; color: #eee; font-size: 16px;">Hi ${winner.user_name},</p>
                  </td>
                </tr>
                
                <!-- Message -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.6;">
                      Great news! You won ${winner.lots.length === 1 ? '1 lot' : `${winner.lots.length} lots`} in <strong style="color: #eee;">${winner.auction_title}</strong>. 
                      Please complete your payment to secure your items.
                    </p>
                  </td>
                </tr>
                
                <!-- Lots List -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <table role="presentation" style="width: 100%; background: rgba(10, 10, 10, 0.5); border: 1px solid rgba(201, 169, 98, 0.15);">
                      <tr>
                        <td style="padding: 16px;">
                          <table role="presentation" style="width: 100%;">
                            ${lotsHtml}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Totals -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <table role="presentation" style="width: 100%; background: rgba(201, 169, 98, 0.05); border: 1px solid rgba(201, 169, 98, 0.2);">
                      <tr>
                        <td style="padding: 16px;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="padding: 4px 0; color: #999; font-size: 14px;">Subtotal</td>
                              <td style="padding: 4px 0; color: #eee; font-size: 14px; text-align: right;">${formatCurrency(winner.subtotal)}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #999; font-size: 14px;">Buyer's Premium (${winner.buyers_premium_percent}%)</td>
                              <td style="padding: 4px 0; color: #eee; font-size: 14px; text-align: right;">${formatCurrency(winner.buyers_premium)}</td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding: 8px 0 0;">
                                <div style="height: 1px; background: rgba(201, 169, 98, 0.2);"></div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0 0; color: #C9A962; font-size: 16px; font-weight: 600;">TOTAL DUE</td>
                              <td style="padding: 12px 0 0; color: #C9A962; font-size: 24px; font-family: 'Georgia', serif; text-align: right;">${formatCurrency(winner.total)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Payment Note -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.6;">
                      Your card on file will be charged automatically. If you need to update your payment method, please visit your account.
                    </p>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td style="padding: 0 24px 30px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td align="center">
                          <a href="${accountUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%); color: #0a0a0a; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;">
                            VIEW MY ACCOUNT →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 24px; text-align: center;">
              <p style="margin: 0 0 8px; color: #666; font-size: 12px;">
                Questions? Reply to this email or contact us at support@dgwcollectibles.com
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
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { auction_id } = await request.json();

    if (!auction_id) {
      return NextResponse.json({ error: 'auction_id required' }, { status: 400 });
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from('auctions')
      .select('id, title, slug, buyers_premium_percent')
      .eq('id', auction_id)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Get all invoices for this auction (these are the winners)
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('auction_id', auction_id)
      .eq('status', 'pending');

    if (invoicesError) {
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ message: 'No winners to notify', sent: 0 });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const invoice of invoices) {
      try {
        // Get user profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', invoice.user_id)
          .single();

        if (!profile?.email) {
          results.errors.push(`No email for user ${invoice.user_id}`);
          results.failed++;
          continue;
        }

        // Get invoice items (lots won)
        const { data: items } = await supabaseAdmin
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoice.id)
          .order('lot_number', { ascending: true });

        const winnerData: WinnerData = {
          user_id: invoice.user_id,
          user_email: profile.email,
          user_name: profile.full_name || profile.email.split('@')[0],
          auction_id: auction.id,
          auction_title: auction.title,
          auction_slug: auction.slug,
          lots: (items || []).map(item => ({
            lot_id: item.lot_id,
            lot_number: item.lot_number,
            lot_title: item.lot_title,
            lot_image: item.lot_image,
            winning_bid: item.winning_bid,
          })),
          subtotal: invoice.subtotal,
          buyers_premium: invoice.buyers_premium,
          buyers_premium_percent: auction.buyers_premium_percent || 15,
          total: invoice.total,
        };

        await resend.emails.send({
          from: `DGW Auctions <${FROM_EMAIL}>`,
          to: profile.email,
          subject: `🎉 You Won ${winnerData.lots.length === 1 ? '1 Lot' : `${winnerData.lots.length} Lots`} - ${auction.title}`,
          html: generateWinnerEmailHtml(winnerData),
        });

        // Create a 'won' notification record
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: invoice.user_id,
            type: 'won',
            title: `You won ${winnerData.lots.length} lot(s)!`,
            body: `Total due: ${formatCurrency(invoice.total)}`,
            auction_id: auction.id,
            email_sent: true,
          });

        results.sent++;
      } catch (emailError: any) {
        console.error(`Failed to send winner email:`, emailError);
        results.errors.push(emailError.message);
        results.failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      message: `Sent ${results.sent} winner emails`,
      ...results,
    });

  } catch (error: any) {
    console.error('Winner email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
