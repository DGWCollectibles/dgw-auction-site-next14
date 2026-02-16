'use client'

import InfoPageLayout from "@/components/InfoPageLayout";
import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      title: "Create Your Account",
      description: "Register with your email address and set up your profile. Add a payment method to enable bidding. Your card information is securely processed through Stripe and is never stored on our servers.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Browse & Research",
      description: "Explore our curated auctions featuring authenticated collectibles and luxury items. Review lot descriptions, photographs, and condition details. Do your due diligence before bidding.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Place Your Bids",
      description: "Bid on any lot with a single click. Use our proxy bidding system to set a maximum bid and let the platform bid on your behalf up to that amount. You'll be notified if you're outbid so you can respond.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
    },
    {
      number: "04",
      title: "Win & Pay",
      description: "When the auction closes, winners are notified by email. Your default payment method is charged automatically within 24 hours for the total amount: hammer price plus buyer's premium plus applicable taxes.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      number: "05",
      title: "Receive Your Items",
      description: "All lots ship fully insured within 7 business days of confirmed payment. You'll receive tracking information by email. Items are professionally packed to ensure safe delivery.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ];

  return (
    <InfoPageLayout title="How It Works" subtitle="Getting Started">
      <p>
        Whether you&apos;re a seasoned collector or new to the auction world, bidding with DGW is
        straightforward and secure. Here&apos;s everything you need to know.
      </p>

      {/* Steps */}
      <div className="space-y-8 mt-10">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className="flex gap-6 p-6 rounded-lg border border-[#1e1e22] bg-[#0d0d0f]/50 hover:border-[rgba(201,169,98,0.2)] transition-colors"
          >
            <div className="shrink-0 flex flex-col items-center">
              <span className="text-[#C9A962] text-2xl font-mono font-bold mb-3">{step.number}</span>
              <span className="text-[#C9A962]/60">{step.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#e8e8ec] mb-2">{step.title}</h3>
              <p className="text-[#8e8e9e] text-sm leading-relaxed m-0">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>Understanding Proxy Bidding</h2>
      <p>
        Our proxy bidding system works on your behalf. When you enter a maximum bid, the platform will
        automatically place the minimum bids necessary to keep you in the lead, up to your maximum amount.
        For example: if the current bid is $50 and you enter a maximum bid of $200, the system will bid
        $55 for you (the minimum increment). If another bidder bids $60, the system will automatically
        respond with $65, and so on, until your $200 maximum is reached.
      </p>
      <p>
        In the event two bidders have the same maximum bid, the bidder who placed their maximum bid
        first takes priority.
      </p>

      <h2>Soft-Close / Anti-Sniping</h2>
      <p>
        To ensure fair bidding, we use a soft-close system. If any bid is placed within the final
        minutes of a lot&apos;s closing time, the closing time automatically extends by a short period.
        This gives all bidders a fair chance to respond and prevents last-second &quot;sniping.&quot;
      </p>

      <h2>Buyer&apos;s Premium</h2>
      <p>
        A buyer&apos;s premium is added to the hammer price (your winning bid) of each lot. The percentage
        is clearly stated on each auction listing before you bid. This is standard practice across the
        auction industry.
      </p>

      <h2>Shipping & Insurance</h2>
      <p>
        All items ship fully insured. Shipping costs are calculated based on item size, weight, value,
        and destination. High-value items may be shipped via priority or overnight carriers with
        signature confirmation. You will receive a tracking number by email once your item ships.
      </p>

      <div className="callout" style={{ marginTop: '2rem' }}>
        <p>
          <strong>Ready to start bidding?</strong>{" "}
          <Link href="/auth/signup" style={{ color: '#C9A962' }}>Create your account</Link> or{" "}
          <Link href="/auctions" style={{ color: '#C9A962' }}>browse current auctions</Link>.
        </p>
      </div>
    </InfoPageLayout>
  );
}
