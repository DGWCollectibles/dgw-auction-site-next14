'use client'

import { useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Opens default email client with pre-filled fields
    const mailtoSubject = encodeURIComponent(formData.subject || 'Inquiry from DGW Auction Site');
    const mailtoBody = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`
    );
    window.location.href = `mailto:dgwcollectibles@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-obsidian-950">
      <Header />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-obsidian-500 mb-8">
          <Link href="/" className="hover:text-dgw-gold transition-colors">Home</Link>
          <span>/</span>
          <span className="text-obsidian-300">Contact</span>
        </div>

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-dgw-gold text-xs tracking-[0.3em] uppercase mb-3">Get In Touch</p>
          <h1 className="heading-display text-3xl md:text-4xl text-obsidian-100 mb-4">Contact Us</h1>
          <p className="text-obsidian-400 max-w-xl mx-auto">
            Have a question about an auction, consignment, or your account? We&apos;re here to help.
          </p>
          <div className="w-16 h-px bg-dgw-gold/30 mt-6 mx-auto" />
        </div>

        <div className="grid md:grid-cols-5 gap-12">
          {/* Contact Info */}
          <div className="md:col-span-2 space-y-8">
            {/* Email */}
            <div className="p-6 border border-[#1e1e22] rounded-lg bg-[#0d0d0f]/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9A962]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-[#e8e8ec] font-medium">Email</h3>
              </div>
              <a
                href="mailto:dgwcollectibles@gmail.com"
                className="text-[#C9A962] text-sm hover:underline"
              >
                dgwcollectibles@gmail.com
              </a>
              <p className="text-[#747484] text-xs mt-2">We respond within one business day</p>
            </div>

            {/* Location */}
            <div className="p-6 border border-[#1e1e22] rounded-lg bg-[#0d0d0f]/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9A962]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-[#e8e8ec] font-medium">Location</h3>
              </div>
              <p className="text-[#8e8e9e] text-sm">
                DGW Collectibles & Estates<br />
                Poughkeepsie, NY 12603
              </p>
            </div>

            {/* Quick Links */}
            <div className="p-6 border border-[#1e1e22] rounded-lg bg-[#0d0d0f]/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#C9A962]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#C9A962]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-[#e8e8ec] font-medium">Quick Links</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/how-it-works" className="text-[#8e8e9e] hover:text-[#C9A962] transition-colors">How It Works</Link></li>
                <li><Link href="/faq" className="text-[#8e8e9e] hover:text-[#C9A962] transition-colors">FAQ</Link></li>
                <li><Link href="/terms" className="text-[#8e8e9e] hover:text-[#C9A962] transition-colors">Terms of Service</Link></li>
                <li><Link href="/buyer-terms" className="text-[#8e8e9e] hover:text-[#C9A962] transition-colors">Buyer Terms</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            {submitted ? (
              <div className="p-8 border border-[#C9A962]/20 rounded-lg bg-[#C9A962]/5 text-center">
                <svg className="w-12 h-12 text-[#C9A962] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-[#e8e8ec] text-lg font-medium mb-2">Your email client should have opened</h3>
                <p className="text-[#8e8e9e] text-sm mb-4">
                  Send the pre-filled email to complete your inquiry. If your email client didn&apos;t open,
                  you can email us directly at{" "}
                  <a href="mailto:dgwcollectibles@gmail.com" className="text-[#C9A962]">dgwcollectibles@gmail.com</a>.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm text-[#C9A962] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="p-8 border border-[#1e1e22] rounded-lg bg-[#0d0d0f]/50">
                <h2 className="text-[#e8e8ec] text-lg font-medium mb-6">Send Us a Message</h2>
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#747484] text-xs tracking-wider uppercase mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#27272c] rounded-lg text-sm text-[#e8e8ec] placeholder:text-[#3d3d44] focus:outline-none focus:border-[#C9A962]/50 transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-[#747484] text-xs tracking-wider uppercase mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#27272c] rounded-lg text-sm text-[#e8e8ec] placeholder:text-[#3d3d44] focus:outline-none focus:border-[#C9A962]/50 transition-colors"
                        placeholder="you@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#747484] text-xs tracking-wider uppercase mb-2">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#27272c] rounded-lg text-sm text-[#e8e8ec] focus:outline-none focus:border-[#C9A962]/50 transition-colors"
                    >
                      <option value="">Select a topic...</option>
                      <option value="Auction Question">Auction Question</option>
                      <option value="Bidding Help">Bidding Help</option>
                      <option value="Payment / Invoice">Payment / Invoice</option>
                      <option value="Shipping Question">Shipping Question</option>
                      <option value="Consignment Inquiry">Consignment Inquiry</option>
                      <option value="Account Issue">Account Issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#747484] text-xs tracking-wider uppercase mb-2">
                      Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#27272c] rounded-lg text-sm text-[#e8e8ec] placeholder:text-[#3d3d44] focus:outline-none focus:border-[#C9A962]/50 transition-colors resize-none"
                      placeholder="How can we help?"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    className="w-full py-3.5 rounded-lg font-semibold text-sm text-[#0a0a0a] transition-all hover:brightness-110"
                    style={{
                      background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
                    }}
                  >
                    Send Message
                  </button>

                  <p className="text-[#4d4d55] text-xs text-center">
                    This opens your email client with a pre-filled message. You can also email us
                    directly at dgwcollectibles@gmail.com.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
