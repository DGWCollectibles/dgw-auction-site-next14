'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Lot {
  id: string
  lot_number: number
  title: string
  description: string | null
  category: string | null
  condition: string | null
  starting_bid: number
  reserve_price: number | null
  estimate_low: number | null
  estimate_high: number | null
  status: string
  images: string[]
}

export default function LotEditForm({ lot }: { lot: Lot }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    lot_number: lot.lot_number,
    title: lot.title,
    description: lot.description || '',
    category: lot.category || '',
    condition: lot.condition || '',
    starting_bid: lot.starting_bid,
    reserve_price: lot.reserve_price?.toString() || '',
    estimate_low: lot.estimate_low?.toString() || '',
    estimate_high: lot.estimate_high?.toString() || '',
    status: lot.status,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('lots')
      .update({
        lot_number: formData.lot_number,
        title: formData.title,
        description: formData.description || null,
        category: formData.category || null,
        condition: formData.condition || null,
        starting_bid: formData.starting_bid,
        reserve_price: formData.reserve_price ? Number(formData.reserve_price) : null,
        estimate_low: formData.estimate_low ? Number(formData.estimate_low) : null,
        estimate_high: formData.estimate_high ? Number(formData.estimate_high) : null,
        status: formData.status,
      })
      .eq('id', lot.id)

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
          Lot saved successfully!
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-obsidian-100">Item Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Lot Number
            </label>
            <input
              type="number"
              value={formData.lot_number}
              onChange={(e) => setFormData({ ...formData, lot_number: Number(e.target.value) })}
              min="1"
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            />
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
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="sold">Sold</option>
              <option value="unsold">Unsold</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-obsidian-300 mb-2">
            Title
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
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Condition
            </label>
            <input
              type="text"
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-obsidian-100">Pricing</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Starting Bid
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
              <input
                type="number"
                value={formData.starting_bid}
                onChange={(e) => setFormData({ ...formData, starting_bid: Number(e.target.value) })}
                min="1"
                className="w-full pl-8 pr-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Reserve Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
              <input
                type="number"
                value={formData.reserve_price}
                onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })}
                min="0"
                className="w-full pl-8 pr-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Estimate Low
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
              <input
                type="number"
                value={formData.estimate_low}
                onChange={(e) => setFormData({ ...formData, estimate_low: e.target.value })}
                min="0"
                className="w-full pl-8 pr-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Estimate High
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-obsidian-400">$</span>
              <input
                type="number"
                value={formData.estimate_high}
                onChange={(e) => setFormData({ ...formData, estimate_high: e.target.value })}
                min="0"
                className="w-full pl-8 pr-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
              />
            </div>
          </div>
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
