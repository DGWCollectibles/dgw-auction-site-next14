'use client'

import { useState } from "react";
import InfoPageLayout from "@/components/InfoPageLayout";
import Link from "next/link";

interface FAQItem {
  question: string;
  answer: string;
}

const faqSections: { title: string; items: FAQItem[] }[] = [
  {
    title: "Bidding",
    items: [
      {
        question: "How do I place a bid?",
        answer: "Navigate to any live auction and click on a lot you're interested in. Enter your bid amount (or use the quick-bid button for the minimum increment) and confirm. You'll need a payment method on file before you can bid.",
      },
      {
        question: "What is proxy bidding?",
        answer: "Proxy bidding lets you set a maximum bid amount. The system will automatically bid on your behalf using the smallest increments necessary to keep you in the lead, up to your maximum. Other bidders won't see your maximum bid. If two bidders have the same maximum, the earlier bid takes priority.",
      },
      {
        question: "Can I retract a bid?",
        answer: "All bids are binding and irrevocable. Bids can only be retracted at DGW's sole discretion in extraordinary circumstances. Please bid carefully.",
      },
      {
        question: "What is the soft-close / anti-sniping system?",
        answer: "If a bid is placed in the final minutes before a lot closes, the closing time automatically extends by a short period. This prevents last-second sniping and gives all bidders a fair chance to respond.",
      },
      {
        question: "How are bid increments determined?",
        answer: "Bid increments are based on the current bid amount and follow an industry-standard tiered scale. As the bid rises, the minimum increment increases. The minimum next bid is always displayed on each lot.",
      },
      {
        question: "What happens if there's a reserve price?",
        answer: "Some lots have a confidential reserve price set by the consignor. If bidding doesn't reach the reserve, the lot won't sell. We'll indicate on the platform when a reserve has been met.",
      },
    ],
  },
  {
    title: "Payment",
    items: [
      {
        question: "How does payment work?",
        answer: "You must have a credit card on file to bid. After the auction ends, your card is automatically charged for the total amount: hammer price + buyer's premium + applicable taxes + shipping. Payment is processed within 24 hours of auction close.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit and debit cards through Stripe (Visa, Mastercard, American Express, Discover). Your card is saved securely through Stripe's PCI Level 1 certified infrastructure. We never store your full card details.",
      },
      {
        question: "What is the buyer's premium?",
        answer: "The buyer's premium is an additional percentage added to the hammer price (your winning bid). The exact percentage is clearly stated on each auction listing before you bid. This is standard practice across the auction industry.",
      },
      {
        question: "Is sales tax charged?",
        answer: "Yes, applicable state and local sales tax is calculated based on your shipping address and added to your invoice. Tax-exempt buyers must provide a valid exemption certificate before the auction closes.",
      },
      {
        question: "What if I can't pay within 24 hours?",
        answer: "Contact us immediately at dgwcollectibles@gmail.com. If you don't pay or make arrangements within the required timeframe, your purchase may be cancelled, a 20% restocking fee may apply, and your bidding privileges may be suspended.",
      },
    ],
  },
  {
    title: "Shipping",
    items: [
      {
        question: "How are items shipped?",
        answer: "All items are professionally packed and shipped fully insured. Shipping carrier and method depend on the value and size of the item. High-value items are shipped via priority or overnight carriers with signature confirmation.",
      },
      {
        question: "How long does shipping take?",
        answer: "Items ship within 7 business days of confirmed payment. You'll receive a tracking number by email. Transit times vary by carrier and destination.",
      },
      {
        question: "Do you ship internationally?",
        answer: "Yes, international shipping is available for an additional fee. Please contact us at dgwcollectibles@gmail.com for international shipping quotes.",
      },
      {
        question: "What if my item arrives damaged?",
        answer: "All shipments are fully insured. If your item arrives damaged, do not discard any packaging. Document the damage with photos immediately and contact the shipping carrier to file a claim. Then reach out to us at dgwcollectibles@gmail.com and we'll assist you through the process.",
      },
    ],
  },
  {
    title: "Account & General",
    items: [
      {
        question: "Do I need an account to bid?",
        answer: "Yes. You must register for an account and have a valid payment method on file before placing any bids.",
      },
      {
        question: "Can I return an item?",
        answer: "All sales are final. Items are sold AS IS, WHERE IS, with no returns, refunds, or exchanges. The only exception is if an item explicitly described as authentic is later proven counterfeit by a recognized authentication authority (PSA, PCGS, GIA, etc.) within 60 days of receipt.",
      },
      {
        question: "How do I contact DGW?",
        answer: "Email us at dgwcollectibles@gmail.com. We respond to all inquiries within one business day.",
      },
      {
        question: "How do I consign items with DGW?",
        answer: "If you have collectibles, estate items, or luxury goods you'd like to consign, please email dgwcollectibles@gmail.com with a description and photos. We'll review your items and follow up with consignment terms.",
      },
      {
        question: "What types of items does DGW auction?",
        answer: "We specialize in authenticated Pokemon cards, trading card games, sports cards, luxury watches, fine jewelry, and curated estate collections. We're always expanding our categories based on collector demand.",
      },
    ],
  },
];

function FAQSection({ title, items }: { title: string; items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-10">
      <h2 style={{ marginTop: '2rem' }}>{title}</h2>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-[#1e1e22] rounded-lg overflow-hidden transition-colors hover:border-[rgba(201,169,98,0.15)]"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-4 text-left bg-[#0d0d0f]/50 hover:bg-[#141417] transition-colors"
            >
              <span className="text-[#d1d1d9] text-sm font-medium pr-4">{item.question}</span>
              <svg
                className={`w-4 h-4 shrink-0 text-[#C9A962] transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4 bg-[#0d0d0f]/30">
                <p className="text-[#8e8e9e] text-sm leading-relaxed m-0">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <InfoPageLayout title="Frequently Asked Questions" subtitle="Support">
      <p>
        Find answers to common questions about bidding, payment, shipping, and more. If you can&apos;t
        find what you&apos;re looking for, please don&apos;t hesitate to{" "}
        <Link href="/contact" style={{ color: '#C9A962' }}>contact us</Link>.
      </p>

      {faqSections.map((section) => (
        <FAQSection key={section.title} title={section.title} items={section.items} />
      ))}

      <div className="callout" style={{ marginTop: '2rem' }}>
        <p>
          <strong>Still have questions?</strong> Email us at{" "}
          <a href="mailto:dgwcollectibles@gmail.com">dgwcollectibles@gmail.com</a> and
          we&apos;ll get back to you within one business day.
        </p>
      </div>
    </InfoPageLayout>
  );
}
