import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getAuthenticatedUserId } from '@/lib/auth-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST: Sync all Stripe payment methods to DB for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ synced: 0 });
    }

    // Get all current payment methods from Stripe
    const stripeMethods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    });

    // Get customer default
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id) as Stripe.Customer;
    const defaultPmId = customer.invoice_settings?.default_payment_method as string | null;

    // Get existing DB records
    const { data: existingDb } = await supabaseAdmin
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', userId);

    const existingIds = new Set((existingDb || []).map(r => r.stripe_payment_method_id));
    const stripeIds = new Set(stripeMethods.data.map(pm => pm.id));

    // Insert new ones from Stripe that aren't in DB
    const toInsert = stripeMethods.data
      .filter(pm => !existingIds.has(pm.id))
      .map(pm => ({
        user_id: userId,
        stripe_payment_method_id: pm.id,
        card_brand: pm.card?.brand || null,
        card_last4: pm.card?.last4 || null,
        card_exp_month: pm.card?.exp_month || null,
        card_exp_year: pm.card?.exp_year || null,
        is_default: pm.id === defaultPmId,
      }));

    if (toInsert.length > 0) {
      await supabaseAdmin.from('payment_methods').insert(toInsert);
    }

    // Remove DB records that no longer exist in Stripe
    const toDelete = (existingDb || [])
      .filter(r => !stripeIds.has(r.stripe_payment_method_id))
      .map(r => r.stripe_payment_method_id);

    if (toDelete.length > 0) {
      await supabaseAdmin
        .from('payment_methods')
        .delete()
        .eq('user_id', userId)
        .in('stripe_payment_method_id', toDelete);
    }

    // Update is_default for all
    if (defaultPmId) {
      await supabaseAdmin
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('stripe_payment_method_id', defaultPmId);

      await supabaseAdmin
        .from('payment_methods')
        .update({ is_default: true })
        .eq('user_id', userId)
        .eq('stripe_payment_method_id', defaultPmId);
    }

    return NextResponse.json({
      synced: toInsert.length,
      removed: toDelete.length,
      total: stripeMethods.data.length,
    });

  } catch (error: any) {
    console.error('Sync payment methods error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
