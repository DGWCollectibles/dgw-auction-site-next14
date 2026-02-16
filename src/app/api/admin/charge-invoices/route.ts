import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAdmin, getAdminClient } from '@/lib/admin-auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  // Verify admin access
  const auth = await verifyAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabaseAdmin = getAdminClient();

  try {
    const { auction_id } = await request.json();

    if (!auction_id) {
      return NextResponse.json({ error: 'auction_id required' }, { status: 400 });
    }

    // Get all pending invoices for this auction
    const { data: invoices, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('auction_id', auction_id)
      .eq('status', 'pending');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending invoices to charge',
        charged: 0,
        total: 0 
      });
    }

    const results = {
      charged: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const invoice of invoices) {
      try {
        // DOUBLE-CHARGE GUARD: Skip if already has a payment intent
        if (invoice.stripe_payment_intent_id) {
          console.log(`Invoice ${invoice.id} already has PI ${invoice.stripe_payment_intent_id}, skipping`);
          continue;
        }

        // Get user's Stripe customer ID from profiles
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('stripe_customer_id, email')
          .eq('id', invoice.user_id)
          .single();

        if (!profile?.stripe_customer_id) {
          await supabaseAdmin
            .from('invoices')
            .update({ status: 'charge_failed', notes: 'No Stripe customer ID on file' })
            .eq('id', invoice.id);
          results.errors.push({
            invoice_id: invoice.id,
            email: profile?.email || 'Unknown',
            error: 'No Stripe customer ID on file'
          });
          results.failed++;
          continue;
        }

        // Get customer's default payment method
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id) as Stripe.Customer;
        
        if (!customer.invoice_settings?.default_payment_method && !customer.default_source) {
          await supabaseAdmin
            .from('invoices')
            .update({ status: 'charge_failed', notes: 'No payment method on file' })
            .eq('id', invoice.id);
          results.errors.push({
            invoice_id: invoice.id,
            email: profile?.email || 'Unknown',
            error: 'No payment method on file'
          });
          results.failed++;
          continue;
        }

        const paymentMethodId = customer.invoice_settings?.default_payment_method as string || customer.default_source as string;

        // Create PaymentIntent with idempotency key to prevent double-charges
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(invoice.total * 100), // Convert to cents
          currency: 'usd',
          customer: profile.stripe_customer_id,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `DGW Auction Invoice - ${invoice.id}`,
          metadata: {
            invoice_id: invoice.id,
            auction_id: auction_id,
            user_id: invoice.user_id,
          },
        }, {
          idempotencyKey: `charge-invoice-${invoice.id}`,
        });

        if (paymentIntent.status === 'succeeded') {
          // Update invoice as paid
          await supabaseAdmin
            .from('invoices')
            .update({
              status: 'paid',
              stripe_payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

          results.charged++;
        } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
          // SCA/3DS required -- mark for manual follow-up
          await supabaseAdmin
            .from('invoices')
            .update({
              status: 'requires_action',
              stripe_payment_intent_id: paymentIntent.id,
              notes: 'Card requires 3D Secure verification. Customer must complete payment manually.',
            })
            .eq('id', invoice.id);

          results.errors.push({
            invoice_id: invoice.id,
            email: profile?.email || 'Unknown',
            error: 'Requires 3D Secure -- customer must pay manually'
          });
          results.failed++;
        } else {
          await supabaseAdmin
            .from('invoices')
            .update({
              status: 'charge_failed',
              stripe_payment_intent_id: paymentIntent.id,
              notes: `Payment status: ${paymentIntent.status}`,
            })
            .eq('id', invoice.id);

          results.errors.push({
            invoice_id: invoice.id,
            email: profile?.email || 'Unknown',
            error: `Payment status: ${paymentIntent.status}`
          });
          results.failed++;
        }

      } catch (stripeError: any) {
        console.error(`Stripe error for invoice ${invoice.id}:`, stripeError);
        
        // Get email for error reporting
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', invoice.user_id)
          .single();

        // Mark as failed so it's not retried blindly
        await supabaseAdmin
          .from('invoices')
          .update({
            status: 'charge_failed',
            notes: stripeError.message || 'Stripe charge failed',
          })
          .eq('id', invoice.id);
          
        results.errors.push({
          invoice_id: invoice.id,
          email: profile?.email || 'Unknown',
          error: stripeError.message
        });
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      charged: results.charged,
      failed: results.failed,
      total: invoices.length,
      errors: results.errors,
    });

  } catch (error: any) {
    console.error('Charge invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
