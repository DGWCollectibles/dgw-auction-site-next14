'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Auction {
  id: string
  title: string
}

export default function NewLotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedAuction = searchParams.get('auction')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    auction_id: preselectedAuction || '',
    lot_number: 1,
    title: '',
    description: '',
    category: '',
    condition: '',
    starting_bid: 1,
    reserve_price: '',
    estimate_low: '',
    estimate_high: '',
  })

  useEffect(() => {
    const fetchAuctions = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('auctions')
        .select('id, title')
        .order('created_at', { ascending: false })
      
      if (data) setAuctions(data)
    }
    fetchAuctions()
  }, [])

  // Get next lot number when auction changes
  useEffect(() => {
    const fetchNextLotNumber = async () => {
      if (!formData.auction_id) return
      
      const supabase = createClient()
      const { data } = await supabase
        .from('lots')
        .select('lot_number')
        .eq('auction_id', formData.auction_id)
        .order('lot_number', { ascending: false })
        .limit(1)
      
      const nextNumber = data && data.length > 0 ? data[0].lot_number + 1 : 1
      setFormData(prev => ({ ...prev, lot_number: nextNumber }))
    }
    fetchNextLotNumber()
  }, [formData.auction_id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    const supabase = createClient()
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `lots/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('auction-images')
        .upload(filePath, file)

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(filePath)

      newImages.push(publicUrl)
    }

    setImages([...images, ...newImages])
    setUploading(false)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!formData.auction_id) {
      setError('Please select an auction')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from('lots')
      .insert({
        auction_id: formData.auction_id,
        lot_number: formData.lot_number,
        title: formData.title,
        description: formData.description || null,
        category: formData.category || null,
        condition: formData.condition || null,
        starting_bid: formData.starting_bid,
        reserve_price: formData.reserve_price ? Number(formData.reserve_price) : null,
        estimate_low: formData.estimate_low ? Number(formData.estimate_low) : null,
        estimate_high: formData.estimate_high ? Number(formData.estimate_high) : null,
        images: images,
        status: 'upcoming',
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/admin/lots/${data.id}`)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/admin/lots" className="text-obsidian-400 hover:text-obsidian-300 text-sm flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Lots
        </Link>
        <h1 className="text-3xl heading-display text-obsidian-50">Add New Lot</h1>
        <p className="text-obsidian-400 mt-1">Add an item to an auction</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
            {error}
          </div>
        )}

        {/* Auction Selection */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Auction</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-obsidian-300 mb-2">
                Select Auction *
              </label>
              <select
                value={formData.auction_id}
                onChange={(e) => setFormData({ ...formData, auction_id: e.target.value })}
                className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
                required
              >
                <option value="">Choose auction...</option>
                {auctions.map((auction) => (
                  <option key={auction.id} value={auction.id}>{auction.title}</option>
                ))}
              </select>
            </div>

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
          </div>
        </div>

        {/* Images */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Images</h2>

          <div className="grid grid-cols-4 gap-4">
            {images.map((url, index) => (
              <div key={index} className="relative aspect-square bg-obsidian-800 rounded-lg overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 text-xs bg-dgw-gold text-obsidian-950 px-2 py-1 rounded">
                    Primary
                  </span>
                )}
              </div>
            ))}

            <label className="aspect-square bg-obsidian-800 rounded-lg border-2 border-dashed border-obsidian-600 hover:border-obsidian-500 cursor-pointer flex flex-col items-center justify-center transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="text-obsidian-400">Uploading...</div>
              ) : (
                <>
                  <svg className="w-8 h-8 text-obsidian-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm text-obsidian-400">Add Images</span>
                </>
              )}
            </label>
          </div>
          <p className="text-xs text-obsidian-500">First image will be the primary image. Drag to reorder (coming soon).</p>
        </div>

        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Item Details</h2>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold"
              placeholder="e.g. PSA 10 Charizard 1st Edition Base Set"
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
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold resize-none"
              placeholder="Describe the item in detail..."
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
                className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold"
                placeholder="e.g. PSA 10 Gem Mint"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Pricing</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-obsidian-300 mb-2">
                Starting Bid *
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
                  placeholder="Optional"
                />
              </div>
              <p className="text-xs text-obsidian-500 mt-1">Minimum price to sell</p>
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
                  placeholder="Optional"
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
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/lots" className="btn btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Lot'}
          </button>
        </div>
      </form>
    </div>
  )
}
