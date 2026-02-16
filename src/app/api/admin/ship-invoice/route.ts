import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifyAdmin } from '@/lib/admin-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://dgw.auction';
const FROM_EMAIL = process.env.FROM_EMAIL || 'auctions@dgwcollectibles.com';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier.toLowerCase()) {
    case 'usps': return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case 'ups': return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case 'fedex': return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    default: return '';
  }
}

function generateShippedEmail(data: {
  recipientName: string;
  auctionTitle: string;
  trackingNumber: string;
  carrier: string;
  invoiceTotal: number;
  itemCount: number;
}): string {
  const trackingUrl = getTrackingUrl(data.carrier, data.trackingNumber);
  
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;">
        <tr><td align="center" style="padding-bottom:30px;">
          <span style="font-family:'Georgia',serif;font-size:28px;color:#C9A962;letter-spacing:0.1em;">DGW</span>
          <span style="font-family:'Helvetica Neue',sans-serif;font-size:12px;color:#666;display:block;letter-spacing:0.2em;margin-top:4px;">COLLECTIBLES & ESTATES</span>
        </td></tr>
        <tr><td>
          <table role="presentation" style="width:100%;border-collapse:collapse;background:linear-gradient(180deg,#1a1612 0%,#0d0b09 100%);border:1px solid rgba(201,169,98,0.2);">
            <tr><td style="background:rgba(59,130,246,0.1);border-bottom:1px solid rgba(59,130,246,0.2);padding:16px 24px;text-align:center;">
              <span style="color:#60a5fa;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">📦 YOUR ORDER HAS SHIPPED</span>
            </td></tr>
            <tr><td style="padding:30px 24px 20px;">
              <p style="margin:0;color:#eee;font-size:16px;">Hi ${data.recipientName},</p>
            </td></tr>
            <tr><td style="padding:0 24px 24px;">
              <p style="margin:0;color:#999;font-size:14px;line-height:1.6;">
                Your ${data.itemCount === 1 ? 'item' : `${data.itemCount} items`} from <strong style="color:#eee;">${data.auctionTitle}</strong> ${data.itemCount === 1 ? 'has' : 'have'} been shipped and ${data.itemCount === 1 ? 'is' : 'are'} on the way!
              </p>
            </td></tr>
            <tr><td style="padding:0 24px 24px;">
              <table role="presentation" style="width:100%;background:rgba(10,10,10,0.5);border:1px solid rgba(201,169,98,0.15);">
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 4px;color:#666;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;">CARRIER</p>
                  <p style="margin:0 0 16px;color:#eee;font-size:16px;">${data.carrier.toUpperCase()}</p>
                  <p style="margin:0 0 4px;color:#666;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;">TRACKING NUMBER</p>
                  <p style="margin:0;color:#C9A962;font-size:18px;font-family:'Georgia',serif;">${data.trackingNumber}</p>
                </td></tr>
              </table>
            </td></tr>
            ${trackingUrl ? `
            <tr><td style="padding:0 24px 30px;">
              <table role="presentation" style="width:100%;"><tr><td align="center">
                <a href="${trackingUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#A68B4B 0%,#C9A962 50%,#D4BC7D 100%);color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
                  TRACK YOUR PACKAGE
                </a>
              </td></tr></table>
            </td></tr>
            ` : ''}
            <tr><td style="padding:20px 24px;border-top:1px solid rgba(201,169,98,0.1);">
              <p style="margin:0;color:#888;font-size:13px;">
                Invoice total: <strong style="color:#C9A962;">${formatCurrency(data.invoiceTotal)}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:30px 24px;text-align:center;">
          <p style="margin:0 0 8px;color:#666;font-size:12px;">
            Questions? Email us at <a href="mailto:dgwcollectibles@gmail.com" style="color:#C9A962;text-decoration:none;">dgwcollectibles@gmail.com</a>
          </p>
          <p style="margin:0;color:#444;font-size:11px;">&copy; ${new Date().getFullYear()} DGW Collectibles & Estates.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { invoice_id, tracking_number, carrier, shipping_cost } = await request.json();

    if (!invoice_id || !tracking_number || !carrier) {
      return NextResponse.json({ error: 'invoice_id, tracking_number, and carrier required' }, { status: 400 });
    }

    // Get invoice + user profile + auction info
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, profiles(email, full_name, display_name), auctions(title)')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get item count
    const { count: itemCount } = await supabaseAdmin
      .from('invoice_items')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_id', invoice_id);

    // Update invoice
    const updateData: any = {
      tracking_number,
      shipped_at: new Date().toISOString(),
    };
    if (shipping_cost) updateData.shipping = shipping_cost;

    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', invoice_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Send shipped email
    const profile = invoice.profiles as any;
    const auction = invoice.auctions as any;
    const recipientName = profile?.display_name || profile?.full_name || profile?.email?.split('@')[0] || 'Collector';

    let emailSent = false;
    if (profile?.email) {
      try {
        await resend.emails.send({
          from: `DGW Auctions <${FROM_EMAIL}>`,
          to: profile.email,
          subject: `📦 Your Order Has Shipped - ${auction?.title || 'DGW Auction'}`,
          html: generateShippedEmail({
            recipientName,
            auctionTitle: auction?.title || 'DGW Auction',
            trackingNumber: tracking_number,
            carrier,
            invoiceTotal: invoice.total,
            itemCount: itemCount || 1,
          }),
        });
        emailSent = true;
      } catch (emailErr) {
        console.error('Failed to send shipped email:', emailErr);
      }
    }

    // Create in-app notification
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: invoice.user_id,
        type: 'shipped',
        title: 'Your order has shipped!',
        message: `Tracking: ${tracking_number} via ${carrier.toUpperCase()}`,
        link: '/account',
      });

    return NextResponse.json({
      success: true,
      email_sent: emailSent,
      tracking_number,
      carrier,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
