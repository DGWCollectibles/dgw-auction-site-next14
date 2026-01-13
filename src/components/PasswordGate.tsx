'use client';

import { useState, useEffect } from 'react';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const auth = document.cookie.includes('site_auth=true');
    setAuthenticated(auth);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setAuthenticated(true);
    } else {
      setError('Incorrect password');
      setLoading(false);
    }
  };

  // Still checking
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin" />
      </div>
    );
  }

  // Authenticated - show site
  if (authenticated) {
    return <>{children}</>;
  }

  // Not authenticated - show password form
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div 
        className="w-full max-w-sm p-8 relative"
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

        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#D4BC7D] via-[#C9A962] to-[#A68B4B] mb-2">
            DGW
          </h1>
          <p className="text-[0.65rem] tracking-[0.3em] text-[#747484] uppercase">
            Private Preview
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#27272c] text-white placeholder:text-[#5d5d6a] focus:outline-none focus:border-[#C9A962]/50 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 font-semibold text-[#0a0a0a] disabled:opacity-50 transition-all"
            style={{
              background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)',
            }}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}
