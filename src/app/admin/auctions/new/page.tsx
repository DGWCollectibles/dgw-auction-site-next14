'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewAuctionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    starts_at: '',
    ends_at: '',
    buyers_premium_percent: 15,
    auto_extend_minutes: 2,
    lot_close_interval_seconds: 20,
    terms_conditions: '',
    cover_image: null as File | null,
  })

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, cover_image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData({ ...formData, cover_image: null })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    // Upload cover image if exists
    let coverImageUrl = null
    if (formData.cover_image) {
      const fileExt = formData.cover_image.name.split('.').pop()
      const fileName = `${formData.slug}-${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('auction-images')
        .upload(fileName, formData.cover_image)

      if (uploadError) {
        setError('Failed to upload image: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('auction-images')
        .getPublicUrl(fileName)
      
      coverImageUrl = publicUrl
    }

    const { data, error } = await supabase
      .from('auctions')
      .insert({
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        category: formData.category || null,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
        buyers_premium_percent: formData.buyers_premium_percent,
        auto_extend_minutes: formData.auto_extend_minutes,
        lot_close_interval_seconds: formData.lot_close_interval_seconds,
        terms_conditions: formData.terms_conditions || null,
        cover_image: coverImageUrl,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/admin/auctions/${data.id}`)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/admin/auctions" className="text-obsidian-400 hover:text-obsidian-300 text-sm flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Auctions
        </Link>
        <h1 className="text-3xl heading-display text-obsidian-50">Create Auction</h1>
        <p className="text-obsidian-400 mt-1">Set up a new auction event</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
            {error}
          </div>
        )}

        {/* Cover Image */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Cover Image</h2>
          <p className="text-sm text-obsidian-500">This image displays at the top of the auction page. Recommended size: 1920x600px</p>
          
          {imagePreview ? (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Cover preview" 
                className="w-full h-48 object-cover rounded-lg border border-obsidian-700"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 bg-obsidian-950/80 rounded-full flex items-center justify-center text-obsidian-300 hover:text-white hover:bg-red-500/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-obsidian-700 rounded-lg cursor-pointer hover:border-dgw-gold/50 transition-colors bg-obsidian-900/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-10 h-10 text-obsidian-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mb-2 text-sm text-obsidian-400">
                  <span className="font-semibold text-dgw-gold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-obsidian-500">PNG, JPG, WEBP (max 5MB)</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              Auction Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold"
              placeholder="e.g. Premium Pokémon Singles - January 2025"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-obsidian-300 mb-2">
              URL Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="text-obsidian-500 text-sm">/auctions/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="flex-1 px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold"
                placeholder="premium-pokemon-singles-jan-2025"
              />
            </div>
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
              placeholder="Describe this auction..."
            />
          </div>

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
        </div>

        {/* Schedule */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Schedule</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-obsidian-300 mb-2">
                Start Date & Time *
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
                End Date & Time *
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

        {/* Settings */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-obsidian-100">Bidding Settings</h2>

          <div className="grid grid-cols-3 gap-4">
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
              <p className="text-xs text-obsidian-500 mt-1">Added to hammer price</p>
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
              <p className="text-xs text-obsidian-500 mt-1">On late bids</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-obsidian-300 mb-2">
                Lot Close Interval (sec)
              </label>
              <input
                type="number"
                value={formData.lot_close_interval_seconds}
                onChange={(e) => setFormData({ ...formData, lot_close_interval_seconds: Number(e.target.value) })}
                min="5"
                max="300"
                step="5"
                className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
              />
              <p className="text-xs text-obsidian-500 mt-1">Between lot closes</p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-obsidian-100">Terms & Conditions</h2>
              <p className="text-sm text-obsidian-500">Specific terms for this auction. Displays in a modal on the auction page.</p>
            </div>
          </div>

          <textarea
            value={formData.terms_conditions}
            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
            rows={12}
            className="w-full px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 placeholder:text-obsidian-500 focus:outline-none focus:border-dgw-gold font-mono text-sm"
            placeholder={`Enter terms & conditions for this auction...

Example format:

1. BIDDING AGREEMENT
By placing a bid, you enter into a legally binding contract...

2. BUYER'S PREMIUM
A buyer's premium of X% will be added...

3. PAYMENT TERMS
Payment is due within 48 hours...

4. SHIPPING
All items will be shipped within 5 business days...`}
          />
          <p className="text-xs text-obsidian-500">
            Tip: Use numbered sections (1. SECTION TITLE) for clear organization. Line breaks will be preserved.
          </p>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/auctions" className="btn btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Auction'}
          </button>
        </div>
      </form>
    </div>
  )
}
