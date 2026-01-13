import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
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
        // Get user's Stripe customer ID from profiles
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('stripe_customer_id, email')
          .eq('id', invoice.user_id)
          .single();

        if (!profile?.stripe_customer_id) {
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
          results.errors.push({
            invoice_id: invoice.id,
            email: profile?.email || 'Unknown',
            error: 'No payment method on file'
          });
          results.failed++;
          continue;
        }

        const paymentMethodId = customer.invoice_settings?.default_payment_method as string || customer.default_source as string;

        // Create PaymentIntent and confirm immediately
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
        });

        if (paymentIntent.status === 'succeeded') {
          // Update invoice as paid
          await supabaseAdmin
            .from('invoices')
            .update({
              status: 'paid',
              stripe_payment_intent_id: paymentIntent.id,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

          results.charged++;
        } else {
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
