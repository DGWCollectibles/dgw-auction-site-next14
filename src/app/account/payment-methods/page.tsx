'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import PaymentMethods from '@/components/PaymentMethods';
import { createClient } from '@/lib/supabase/client';

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A962]/30 border-t-[#C9A962] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Header />
      
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link href="/account" className="text-[#C9A962] text-sm hover:underline">
              ← Back to Account
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#D4BC7D] via-[#C9A962] to-[#A68B4B] mb-2">
              Payment Methods
            </h1>
            <p className="text-[#747484]">
              Manage your saved payment methods for auction purchases
            </p>
          </div>

          {/* Card container */}
          <div 
            className="relative p-6"
            style={{
              background: 'linear-gradient(145deg, rgba(26, 22, 18, 0.9) 0%, rgba(13, 11, 9, 0.95) 100%)',
              border: '1px solid rgba(201, 169, 98, 0.2)',
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#C9A962]/40" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#C9A962]/40" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#C9A962]/40" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#C9A962]/40" />

            <PaymentMethods userId={user.id} />
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-[#141417] border border-[#27272c]">
            <h3 className="font-medium text-white mb-3">How payment works</h3>
            <ul className="space-y-2 text-sm text-[#747484]">
              <li className="flex items-start gap-2">
                <span className="text-[#C9A962]">1.</span>
                Save a payment method to your account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#C9A962]">2.</span>
                Place bids on auction items
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#C9A962]">3.</span>
                If you win, your default payment method is charged automatically
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#C9A962]">4.</span>
                Receive invoice and shipping confirmation via email
              </li>
            </ul>
          </div>

          {/* FAQ */}
          <div className="mt-8 space-y-4">
            <h3 className="font-medium text-white">Frequently Asked Questions</h3>
            
            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-[#141417] border border-[#27272c] cursor-pointer hover:border-[#C9A962]/30 transition-colors">
                <span className="text-[#b8b8c1]">Is my payment information secure?</span>
                <span className="text-[#5d5d6a] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 bg-[#0d0d0f] border border-t-0 border-[#27272c] text-sm text-[#747484]">
                Yes. We use Stripe for payment processing. Your card details are transmitted directly 
                to Stripe and are never stored on our servers. Stripe is PCI Level 1 certified, 
                the highest level of security certification.
              </div>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-[#141417] border border-[#27272c] cursor-pointer hover:border-[#C9A962]/30 transition-colors">
                <span className="text-[#b8b8c1]">When will I be charged?</span>
                <span className="text-[#5d5d6a] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 bg-[#0d0d0f] border border-t-0 border-[#27272c] text-sm text-[#747484]">
                Your payment method is charged after the auction ends and all invoices are confirmed 
                by our team. This typically occurs within 24-48 hours of auction close. You'll receive 
                an email confirmation when your payment is processed.
              </div>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-[#141417] border border-[#27272c] cursor-pointer hover:border-[#C9A962]/30 transition-colors">
                <span className="text-[#b8b8c1]">What fees are included?</span>
                <span className="text-[#5d5d6a] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 bg-[#0d0d0f] border border-t-0 border-[#27272c] text-sm text-[#747484]">
                Your total includes the hammer price (winning bid), buyer's premium (typically 20%), 
                and applicable shipping costs. Sales tax may apply depending on your location. 
                All fees are clearly displayed before you place a bid.
              </div>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
