'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Auction {
  id: string
  title: string
  slug: string
  description: string | null
  category: string | null
  starts_at: string
  ends_at: string
  status: string
  buyers_premium_percent: number
  auto_extend_minutes: number
  lot_close_interval_seconds: number | null
  terms_conditions: string | null
}

export default function AuctionEditForm({ auction }: { auction: Auction }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: auction.title,
    slug: auction.slug,
    description: auction.description || '',
    category: auction.category || '',
    starts_at: new Date(auction.starts_at).toISOString().slice(0, 16),
    ends_at: new Date(auction.ends_at).toISOString().slice(0, 16),
    status: auction.status,
    buyers_premium_percent: auction.buyers_premium_percent,
    auto_extend_minutes: auction.auto_extend_minutes,
    lot_close_interval_seconds: auction.lot_close_interval_seconds || 20,
    terms_conditions: auction.terms_conditions || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('auctions')
      .update({
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        category: formData.category || null,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
        status: formData.status,
        buyers_premium_percent: formData.buyers_premium_percent,
        auto_extend_minutes: formData.auto_extend_minutes,
        lot_close_interval_seconds: formData.lot_close_interval_seconds,
        terms_conditions: formData.terms_conditions || null,
      })
      .eq('id', auction.id)

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          Auction saved successfully!
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-obsidian-100">Basic Information</h2>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">
            Auction Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">
            URL Slug
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            >
              <option value="">Select category...</option>
              <option value="pokemon">Pokémon Cards</option>
              <option value="sports">Sports Cards</option>
              <option value="watches">Watches</option>
              <option value="luxury">Luxury Items</option>
              <option value="mixed">Mixed / Multi-Category</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            >
              <option value="draft">Draft</option>
              <option value="preview">Preview</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-obsidian-100">Schedule</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.starts_at}
              onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.ends_at}
              onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
              required
            />
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-obsidian-100">Settings</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Buyer&apos;s Premium (%)
            </label>
            <input
              type="number"
              value={formData.buyers_premium_percent}
              onChange={(e) => setFormData({ ...formData, buyers_premium_percent: Number(e.target.value) })}
              min="0"
              max="50"
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Auto-Extend (minutes)
            </label>
            <input
              type="number"
              value={formData.auto_extend_minutes}
              onChange={(e) => setFormData({ ...formData, auto_extend_minutes: Number(e.target.value) })}
              min="0"
              max="10"
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Lot Close Interval (seconds)
            </label>
            <input
              type="number"
              value={formData.lot_close_interval_seconds}
              onChange={(e) => setFormData({ ...formData, lot_close_interval_seconds: Number(e.target.value) })}
              min="5"
              max="120"
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            />
            <p className="text-xs text-obsidian-500 mt-1">
              Time between each lot closing. Default: 20s. Used when going live.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-obsidian-300 mb-2">
            Auction-Specific Terms & Conditions
          </label>
          <textarea
            value={formData.terms_conditions}
            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
            rows={4}
            placeholder="Optional. Add any terms specific to this auction (e.g. special reserve policies, category-specific disclaimers). General terms always apply."
            className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
