'use client'

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ContactPage() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          name: user.user_metadata?.full_name || '',
        }));
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (!formData.subject || !formData.message) {
      setError('Please fill in subject and message');
      return;
    }
    if (!user && (!formData.name || !formData.email)) {
      setError('Please fill in your name and email');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          message: formData.message,
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSending(false);
    }
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
            <div className="p-6 border border-obsidian-800 rounded-lg bg-obsidian-950/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-dgw-gold/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-obsidian-100 font-medium">Email</h3>
              </div>
              <a href="mailto:dgwcollectibles@gmail.com" className="text-dgw-gold text-sm hover:underline">
                dgwcollectibles@gmail.com
              </a>
              <p className="text-obsidian-500 text-xs mt-2">We typically respond within a few hours</p>
            </div>

            <div className="p-6 border border-obsidian-800 rounded-lg bg-obsidian-950/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-dgw-gold/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-obsidian-100 font-medium">Location</h3>
              </div>
              <p className="text-obsidian-400 text-sm">
                DGW Collectibles & Estates<br />
                Poughkeepsie, NY 12603
              </p>
            </div>

            <div className="p-6 border border-obsidian-800 rounded-lg bg-obsidian-950/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-dgw-gold/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-obsidian-100 font-medium">Quick Links</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li><Link href="/how-it-works" className="text-obsidian-400 hover:text-dgw-gold transition-colors">How It Works</Link></li>
                <li><Link href="/faq" className="text-obsidian-400 hover:text-dgw-gold transition-colors">FAQ</Link></li>
                <li><Link href="/terms" className="text-obsidian-400 hover:text-dgw-gold transition-colors">Terms of Service</Link></li>
                <li><Link href="/buyer-terms" className="text-obsidian-400 hover:text-dgw-gold transition-colors">Buyer Terms</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            {sent ? (
              <div className="p-8 border border-dgw-gold/20 rounded-lg bg-dgw-gold/5 text-center">
                <svg className="w-12 h-12 text-dgw-gold mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-obsidian-100 text-lg font-medium mb-2">Message Sent!</h3>
                <p className="text-obsidian-400 text-sm mb-4">
                  We&apos;ve received your message and will get back to you shortly.
                  {user && <> You can track this conversation in your <Link href="/account?tab=messages" className="text-dgw-gold hover:underline">account</Link>.</>}
                </p>
                <button
                  onClick={() => { setSent(false); setFormData(prev => ({ ...prev, subject: '', message: '' })); }}
                  className="text-sm text-dgw-gold hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="p-8 border border-obsidian-800 rounded-lg bg-obsidian-950/50">
                <h2 className="text-obsidian-100 text-lg font-medium mb-6">Send Us a Message</h2>

                {user && (
                  <p className="text-obsidian-500 text-xs mb-4">
                    Logged in as {user.email}. Your reply history will be in your account.
                  </p>
                )}

                <div className="space-y-5">
                  {!user && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">Name *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 rounded-lg text-sm text-obsidian-100 placeholder:text-obsidian-700 focus:outline-none focus:border-dgw-gold/50 transition-colors"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 rounded-lg text-sm text-obsidian-100 placeholder:text-obsidian-700 focus:outline-none focus:border-dgw-gold/50 transition-colors"
                          placeholder="you@email.com"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">Subject *</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 rounded-lg text-sm text-obsidian-100 focus:outline-none focus:border-dgw-gold/50 transition-colors"
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
                    <label className="block text-obsidian-500 text-xs tracking-wider uppercase mb-2">Message *</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-obsidian-800 rounded-lg text-sm text-obsidian-100 placeholder:text-obsidian-700 focus:outline-none focus:border-dgw-gold/50 transition-colors resize-none"
                      placeholder="How can we help?"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm">{error}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="w-full py-3.5 rounded-lg font-semibold text-sm text-[#0a0a0a] transition-all hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
                    }}
                  >
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
