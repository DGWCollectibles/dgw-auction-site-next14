'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Lot {
  id: string
  auction_id: string
  lot_number: number
  title: string
  description: string | null
  category: string | null
  condition: string | null
  starting_bid: number
  current_bid: number | null
  reserve_price: number | null
  estimate_low: number | null
  estimate_high: number | null
  images: string[]
  status: string
  auctions?: { title: string; slug: string }
}

interface Auction {
  id: string
  title: string
}

interface Props {
  initialLots: Lot[]
  auctions: Auction[]
  currentAuctionId?: string
  currentAuction?: { id: string; title: string } | null
}

export default function LotsManager({ initialLots, auctions, currentAuctionId, currentAuction }: Props) {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>(initialLots)
  const [draggedLot, setDraggedLot] = useState<Lot | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showBatchUpload, setShowBatchUpload] = useState(false)
  const [batchData, setBatchData] = useState('')
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [cloning, setCloning] = useState<string | null>(null)
  const [filterAuctionId, setFilterAuctionId] = useState(currentAuctionId || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sort lots by lot_number
  const sortedLots = [...lots].sort((a, b) => a.lot_number - b.lot_number)

  const handleDragStart = (e: React.DragEvent, lot: Lot) => {
    setDraggedLot(lot)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lot.id)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedLot) return

    const draggedIndex = sortedLots.findIndex(l => l.id === draggedLot.id)
    if (draggedIndex === targetIndex) {
      setDraggedLot(null)
      return
    }

    // Reorder lots
    const newLots = [...sortedLots]
    newLots.splice(draggedIndex, 1)
    newLots.splice(targetIndex, 0, draggedLot)

    // Update lot numbers
    const updatedLots = newLots.map((lot, index) => ({
      ...lot,
      lot_number: index + 1
    }))

    setLots(updatedLots)
    setDraggedLot(null)

    // Save to database
    await saveOrder(updatedLots)
  }

  const saveOrder = async (updatedLots: Lot[]) => {
    setSaving(true)
    const supabase = createClient()

    try {
      // Update each lot's lot_number
      for (const lot of updatedLots) {
        await supabase
          .from('lots')
          .update({ lot_number: lot.lot_number })
          .eq('id', lot.id)
      }
    } catch (err) {
      console.error('Failed to save order:', err)
    }

    setSaving(false)
  }

  const handleClone = async (lot: Lot) => {
    setCloning(lot.id)
    const supabase = createClient()

    // Get the next lot number
    const maxLotNumber = Math.max(...lots.map(l => l.lot_number), 0)

    const { data, error } = await supabase
      .from('lots')
      .insert({
        auction_id: lot.auction_id,
        lot_number: maxLotNumber + 1,
        title: `${lot.title} (Copy)`,
        description: lot.description,
        category: lot.category,
        condition: lot.condition,
        starting_bid: lot.starting_bid,
        reserve_price: lot.reserve_price,
        estimate_low: lot.estimate_low,
        estimate_high: lot.estimate_high,
        images: lot.images,
        status: 'upcoming',
      })
      .select('*, auctions(title, slug)')
      .single()

    if (data) {
      setLots([...lots, data])
    }

    setCloning(null)
  }

  const handleBatchUpload = async () => {
    if (!filterAuctionId) {
      setBatchError('Please select an auction first')
      return
    }

    setBatchUploading(true)
    setBatchError(null)

    try {
      // Parse CSV/TSV data
      const lines = batchData.trim().split('\n')
      const supabase = createClient()

      // Get current max lot number
      const maxLotNumber = Math.max(...lots.map(l => l.lot_number), 0)
      let lotNumber = maxLotNumber + 1

      const newLots: Lot[] = []

      for (const line of lines) {
        // Support both CSV and TSV
        const parts = line.includes('\t') ? line.split('\t') : line.split(',')
        
        // Expected format: title, starting_bid, [description], [category], [condition]
        const [title, startingBid, description, category, condition] = parts.map(p => p.trim())

        if (!title) continue

        const { data, error } = await supabase
          .from('lots')
          .insert({
            auction_id: filterAuctionId,
            lot_number: lotNumber,
            title: title.replace(/^["']|["']$/g, ''), // Remove quotes
            description: description?.replace(/^["']|["']$/g, '') || null,
            category: category?.replace(/^["']|["']$/g, '') || null,
            condition: condition?.replace(/^["']|["']$/g, '') || null,
            starting_bid: parseInt(startingBid) || 1,
            images: [],
            status: 'upcoming',
          })
          .select('*, auctions(title, slug)')
          .single()

        if (error) {
          setBatchError(`Error on line ${lotNumber - maxLotNumber}: ${error.message}`)
          break
        }

        if (data) {
          newLots.push(data)
          lotNumber++
        }
      }

      setLots([...lots, ...newLots])
      setBatchData('')
      setShowBatchUpload(false)
    } catch (err: any) {
      setBatchError(err.message)
    }

    setBatchUploading(false)
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      // Skip header row if it looks like a header
      const lines = text.split('\n')
      const firstLine = lines[0].toLowerCase()
      if (firstLine.includes('title') || firstLine.includes('name')) {
        setBatchData(lines.slice(1).join('\n'))
      } else {
        setBatchData(text)
      }
    }
    reader.readAsText(file)
  }

  const handleFilterChange = (auctionId: string) => {
    setFilterAuctionId(auctionId)
    if (auctionId) {
      router.push(`/admin/lots?auction=${auctionId}`)
    } else {
      router.push('/admin/lots')
    }
  }

  const filteredLots = filterAuctionId 
    ? sortedLots.filter(lot => lot.auction_id === filterAuctionId)
    : sortedLots

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl heading-display text-obsidian-50">
            {currentAuction ? `Lots: ${currentAuction.title}` : 'All Lots'}
          </h1>
          <p className="text-obsidian-400 mt-1">
            {saving ? 'Saving order...' : 'Drag to reorder • Click to edit'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchUpload(true)}
            className="btn btn-ghost"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Batch Upload
          </button>
          <Link
            href={filterAuctionId ? `/admin/lots/new?auction=${filterAuctionId}` : '/admin/lots/new'}
            className="btn btn-primary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Lot
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm text-obsidian-400">Filter by auction:</label>
          <select
            value={filterAuctionId}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-4 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-obsidian-100 focus:outline-none focus:border-dgw-gold"
          >
            <option value="">All Auctions</option>
            {auctions.map((auction) => (
              <option key={auction.id} value={auction.id}>{auction.title}</option>
            ))}
          </select>
          {filterAuctionId && (
            <button 
              onClick={() => handleFilterChange('')}
              className="text-sm text-dgw-gold hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian-950/90 backdrop-blur-sm" onClick={() => setShowBatchUpload(false)} />
          
          <div className="relative w-full max-w-2xl bg-obsidian-900 border border-obsidian-700 rounded-xl overflow-hidden">
            <div className="border-b border-obsidian-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-obsidian-100">Batch Upload Lots</h2>
              <button onClick={() => setShowBatchUpload(false)} className="text-obsidian-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!filterAuctionId && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
                  ⚠️ Please select an auction first using the filter above
                </div>
              )}

              {batchError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {batchError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-obsidian-300 mb-2">
                  Upload CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleCSVUpload}
                  className="w-full px-4 py-3 bg-obsidian-800 border border-obsidian-600 rounded-lg text-obsidian-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dgw-gold file:text-obsidian-950 file:font-medium file:cursor-pointer"
                />
              </div>

              <div className="text-center text-obsidian-500 text-sm">— or paste data below —</div>

              <div>
                <label className="block text-sm font-medium text-obsidian-300 mb-2">
                  Paste CSV/TSV Data
                </label>
                <textarea
                  value={batchData}
                  onChange={(e) => setBatchData(e.target.value)}
                  rows={8}
                  placeholder={`Title, Starting Bid, Description, Category, Condition
PSA 10 Charizard Base Set, 5000, The holy grail, pokemon, PSA 10
BGS 9.5 Pikachu Illustrator, 10000, Ultra rare promo, pokemon, BGS 9.5`}
                  className="w-full px-4 py-3 bg-obsidian-800 border border-obsidian-600 rounded-lg text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold font-mono text-sm resize-none"
                />
                <p className="text-xs text-obsidian-500 mt-2">
                  Format: Title, Starting Bid, Description (optional), Category (optional), Condition (optional)
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowBatchUpload(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={handleBatchUpload}
                  disabled={!batchData.trim() || !filterAuctionId || batchUploading}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {batchUploading ? 'Uploading...' : 'Upload Lots'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lots Grid */}
      {filteredLots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLots.map((lot, index) => (
            <div
              key={lot.id}
              draggable
              onDragStart={(e) => handleDragStart(e, lot)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`card overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                draggedLot?.id === lot.id ? 'opacity-50 scale-95' : ''
              } ${
                dragOverIndex === index ? 'ring-2 ring-dgw-gold ring-offset-2 ring-offset-obsidian-950' : ''
              }`}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 left-2 z-10 p-1 bg-obsidian-900/90 rounded cursor-grab">
                <svg className="w-4 h-4 text-obsidian-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                </svg>
              </div>

              {/* Clone Button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleClone(lot)
                }}
                disabled={cloning === lot.id}
                className="absolute top-2 right-2 z-10 p-2 bg-obsidian-900/90 rounded hover:bg-obsidian-800 transition-colors"
                title="Clone lot"
              >
                {cloning === lot.id ? (
                  <svg className="w-4 h-4 text-dgw-gold animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-obsidian-400 hover:text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              <Link href={`/admin/lots/${lot.id}`}>
                <div className="aspect-square bg-obsidian-800 relative">
                  {lot.images && lot.images.length > 0 ? (
                    <img
                      src={lot.images[0]}
                      alt={lot.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-obsidian-600">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <span className="badge bg-obsidian-900/90 text-dgw-gold font-bold">
                      #{lot.lot_number}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <span className={`badge text-xs ${
                      lot.status === 'live' ? 'badge-live' :
                      lot.status === 'sold' ? 'badge-success' :
                      'bg-obsidian-900/90 text-obsidian-300'
                    }`}>
                      {lot.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-obsidian-100 line-clamp-2 mb-2">{lot.title}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-obsidian-400">Starting bid</span>
                    <span className="text-dgw-gold font-medium">
                      ${lot.starting_bid?.toLocaleString() || '0'}
                    </span>
                  </div>
                  {lot.current_bid && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-obsidian-400">Current bid</span>
                      <span className="text-green-400 font-medium">
                        ${lot.current_bid.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {!filterAuctionId && lot.auctions && (
                    <p className="text-xs text-obsidian-500 mt-2 truncate">
                      {lot.auctions.title}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-obsidian-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-obsidian-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-obsidian-100 mb-2">No lots yet</h3>
          <p className="text-obsidian-400 mb-4">
            {currentAuction ? 'Add lots to this auction' : 'Create your first lot'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowBatchUpload(true)}
              className="btn btn-ghost"
            >
              Batch Upload
            </button>
            <Link
              href={filterAuctionId ? `/admin/lots/new?auction=${filterAuctionId}` : '/admin/lots/new'}
              className="btn btn-primary"
            >
              Add Lot
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
