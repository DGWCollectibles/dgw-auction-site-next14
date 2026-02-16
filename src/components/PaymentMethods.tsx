'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

// Card brand icons
const brandIcons: Record<string, string> = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
  discover: '💳',
  default: '💳',
};

function AddCardForm({ 
  clientSecret, 
  onSuccess, 
  onCancel 
}: { 
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/account?tab=payment`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-[#0a0a0a] p-4 rounded border border-[#27272c]">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-[#27272c] text-[#b8b8c1] hover:border-[#5d5d6a] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-3 font-semibold text-[#0a0a0a] disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
          }}
        >
          {loading ? 'Saving...' : 'Save Card'}
        </button>
      </div>

      <p className="text-xs text-[#5d5d6a] text-center">
        Your payment info is securely processed by Stripe. We never store your card details.
      </p>
    </form>
  );
}

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const syncPaymentMethodsToDb = async () => {
    try {
      await fetch('/api/stripe/sync-payment-method', { method: 'POST' });
    } catch { /* non-fatal -- gate will still work after next sync */ }
  };

  const fetchPaymentMethods = async () => {
    const res = await fetch(`/api/stripe/payment-methods`);
    const data = await res.json();
    setPaymentMethods(data.paymentMethods || []);
    setLoading(false);
  };

  useEffect(() => {
    // Sync Stripe -> DB on mount (catches any out-of-sync state)
    syncPaymentMethodsToDb().then(() => fetchPaymentMethods());
  }, []);

  const handleAddCard = async () => {
    setShowAddCard(true);
    
    // Get setup intent
    const res = await fetch('/api/stripe/create-setup-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    
    if (data.clientSecret) {
      setClientSecret(data.clientSecret);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    setProcessing(paymentMethodId);
    
    try {
      await fetch('/api/stripe/set-default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      });

      await fetchPaymentMethods();
    } catch (err) {
      console.error('Set default error:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Remove this payment method?')) return;
    
    setProcessing(paymentMethodId);
    
    try {
      await fetch('/api/stripe/delete-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      });

      await fetchPaymentMethods();
    } catch (err) {
      console.error('Delete payment method error:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleCardAdded = async () => {
    setShowAddCard(false);
    setClientSecret(null);
    // Sync new card from Stripe to our DB (enables bidding gate)
    await syncPaymentMethodsToDb();
    await fetchPaymentMethods();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#C9A962]/30 border-t-[#C9A962] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Payment Methods */}
      {paymentMethods.length > 0 ? (
        <div className="space-y-3">
          {paymentMethods.map(pm => (
            <div 
              key={pm.id}
              className={`flex items-center justify-between p-4 border transition-colors ${
                pm.isDefault 
                  ? 'bg-[#C9A962]/5 border-[#C9A962]/30' 
                  : 'bg-[#141417] border-[#27272c]'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{brandIcons[pm.brand] || brandIcons.default}</span>
                <div>
                  <p className="font-medium text-white capitalize">
                    {pm.brand} •••• {pm.last4}
                    {pm.isDefault && (
                      <span className="ml-2 text-xs text-[#C9A962] border border-[#C9A962]/30 px-2 py-0.5 rounded">
                        DEFAULT
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[#747484]">
                    Expires {pm.expMonth.toString().padStart(2, '0')}/{pm.expYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!pm.isDefault && (
                  <button
                    onClick={() => handleSetDefault(pm.id)}
                    disabled={processing === pm.id}
                    className="px-3 py-1.5 text-xs text-[#C9A962] border border-[#C9A962]/30 hover:bg-[#C9A962]/10 transition-colors disabled:opacity-50"
                  >
                    {processing === pm.id ? '...' : 'Set Default'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(pm.id)}
                  disabled={processing === pm.id}
                  className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                >
                  {processing === pm.id ? '...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#5d5d6a]">
          <p className="mb-2">No payment methods on file</p>
          <p className="text-sm">Add a card to enable bidding and automatic payment</p>
        </div>
      )}

      {/* Add Card Section */}
      {showAddCard && clientSecret ? (
        <div className="mt-6 p-6 bg-[#141417] border border-[#27272c]">
          <h3 className="text-lg font-medium text-white mb-4">Add Payment Method</h3>
          <Elements 
            stripe={stripePromise} 
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#C9A962',
                  colorBackground: '#0a0a0a',
                  colorText: '#ffffff',
                  colorDanger: '#ef4444',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderRadius: '0px',
                },
              },
            }}
          >
            <AddCardForm 
              clientSecret={clientSecret}
              onSuccess={handleCardAdded}
              onCancel={() => {
                setShowAddCard(false);
                setClientSecret(null);
              }}
            />
          </Elements>
        </div>
      ) : (
        <button
          onClick={handleAddCard}
          className="w-full py-3 border border-dashed border-[#27272c] text-[#747484] hover:border-[#C9A962] hover:text-[#C9A962] transition-colors"
        >
          + Add Payment Method
        </button>
      )}

      {/* Legal Notice */}
      <div className="mt-6 p-4 bg-[#0d0d0f] border border-[#1e1e22] text-xs text-[#5d5d6a]">
        <p className="mb-2">
          <strong className="text-[#747484]">Secure Payment Processing</strong>
        </p>
        <p>
          Payment processing is handled by Stripe, Inc. Your card details are transmitted directly 
          to Stripe via their secure API and are never stored on our servers. By saving a payment method, 
          you authorize DGW to charge this method for auction wins plus applicable buyer's premium and fees.
        </p>
      </div>
    </div>
  );
}
