import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getAuthenticatedUserId } from '@/lib/auth-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { payment_method_id } = await request.json();

    if (!payment_method_id) {
      return NextResponse.json({ error: 'payment_method_id required' }, { status: 400 });
    }

    // Get user's Stripe customer ID to verify ownership
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profile?.stripe_customer_id) {
      // Verify the payment method belongs to this customer
      const pm = await stripe.paymentMethods.retrieve(payment_method_id);
      if (pm.customer !== profile.stripe_customer_id) {
        return NextResponse.json({ error: 'Payment method does not belong to this user' }, { status: 403 });
      }
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(payment_method_id);

    // Also remove from our payment_methods table so payment gate stays in sync
    await supabaseAdmin
      .from('payment_methods')
      .delete()
      .eq('stripe_payment_method_id', payment_method_id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete payment method error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
