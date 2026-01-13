import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { payment_method_id } = await request.json();

    if (!payment_method_id) {
      return NextResponse.json({ error: 'payment_method_id required' }, { status: 400 });
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(payment_method_id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Delete payment method error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
