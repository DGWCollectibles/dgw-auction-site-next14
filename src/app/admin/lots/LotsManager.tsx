'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  bid_count?: number
  ends_at?: string | null
  extended_count?: number
  auctions?: { title: string; slug: string; status: string }
}

interface Auction {
  id: string
  title: string
  status: string
}

interface Props {
  initialLots: Lot[]
  auctions: Auction[]
  currentAuctionId?: string
  currentAuction?: { id: string; title: string; status: string } | null
}

// ============================================================================
// INLINE EDIT CELL
// ============================================================================
function InlineEdit({
  value,
  field,
  lotId,
  type = 'text',
  onSave,
}: {
  value: string | number
  field: string
  lotId: string
  type?: 'text' | 'number' | 'currency'
  onSave: (lotId: string, field: string, value: string | number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setEditValue(String(value))
  }, [value, editing])

  const handleSave = () => {
    setEditing(false)
    const finalValue = type === 'number' || type === 'currency'
      ? parseFloat(editValue) || 0
      : editValue.trim()
    if (finalValue !== value) {
      onSave(lotId, field, finalValue)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true) }}
        className="text-left w-full hover:bg-obsidian-800/50 px-1 -mx-1 rounded transition-colors group/edit"
        title="Click to edit"
      >
        <span className="group-hover/edit:text-dgw-gold transition-colors">
          {type === 'currency' ? `$${Number(value).toLocaleString()}` : value}
        </span>
        <svg className="w-3 h-3 text-obsidian-600 group-hover/edit:text-dgw-gold inline ml-1 opacity-0 group-hover/edit:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type={type === 'currency' || type === 'number' ? 'number' : 'text'}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') { setEditing(false); setEditValue(String(value)) }
      }}
      onClick={(e) => e.stopPropagation()}
      step={type === 'currency' ? '1' : undefined}
      min={type === 'currency' || type === 'number' ? '0' : undefined}
      className="w-full px-2 py-0.5 bg-obsidian-800 border border-dgw-gold/50 rounded text-obsidian-100 text-sm focus:outline-none focus:border-dgw-gold"
    />
  )
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function LotsManager({ initialLots, auctions, currentAuctionId, currentAuction }: Props) {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>(initialLots)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [filterAuctionId, setFilterAuctionId] = useState(currentAuctionId || '')
  const [cloning, setCloning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastSelectedRef = useRef<string | null>(null)

  // Drag state
  const [dragActive, setDragActive] = useState(false)
  const [dragIds, setDragIds] = useState<string[]>([])
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1)
  const dragStartIndex = useRef<number>(-1)
  const gridRef = useRef<HTMLDivElement>(null)
  const lotRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  // Sort and filter
  const sortedLots = [...lots].sort((a, b) => a.lot_number - b.lot_number)
  const filteredLots = filterAuctionId
    ? sortedLots.filter(lot => lot.auction_id === filterAuctionId)
    : sortedLots

  const selectedAuction = auctions.find(a => a.id === filterAuctionId)
  const isLiveAuction = selectedAuction?.status === 'live' || currentAuction?.status === 'live'

  // ========================================================================
  // SELECTION
  // ========================================================================
  const handleSelect = (lotId: string, e: React.MouseEvent) => {
    if (dragActive) return
    // Don't select when clicking inline edit or actions
    const target = e.target as HTMLElement
    if (target.closest('input') || target.closest('a') || target.closest('[data-drag-handle]')) return

    const newSet = new Set(selectedIds)

    if (e.shiftKey && lastSelectedRef.current) {
      const lastIdx = filteredLots.findIndex(l => l.id === lastSelectedRef.current)
      const curIdx = filteredLots.findIndex(l => l.id === lotId)
      const [start, end] = [Math.min(lastIdx, curIdx), Math.max(lastIdx, curIdx)]
      for (let i = start; i <= end; i++) newSet.add(filteredLots[i].id)
    } else if (e.metaKey || e.ctrlKey) {
      if (newSet.has(lotId)) newSet.delete(lotId)
      else newSet.add(lotId)
    } else {
      if (newSet.size === 1 && newSet.has(lotId)) {
        newSet.clear()
      } else {
        newSet.clear()
        newSet.add(lotId)
      }
    }

    lastSelectedRef.current = lotId
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredLots.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredLots.map(l => l.id)))
  }

  // ========================================================================
  // DRAG AND DROP (HTML5 with touch fallback)
  // ========================================================================
  const handleDragStart = (e: React.DragEvent, lotId: string) => {
    const ids = selectedIds.has(lotId) ? Array.from(selectedIds) : [lotId]
    const startIdx = filteredLots.findIndex(l => l.id === lotId)

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lotId)

    // Use a tiny timeout so the browser captures the drag image before we style it
    setTimeout(() => {
      setDragActive(true)
      setDragIds(ids)
      dragStartIndex.current = startIdx
    }, 0)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(-1)
    setDragActive(false)

    if (dragIds.length === 0 || dragStartIndex.current === targetIndex) {
      setDragIds([])
      return
    }

    // Perform reorder
    const newLots = [...filteredLots]
    const dragged = dragIds.map(id => newLots.find(l => l.id === id)!).filter(Boolean)
    const remaining = newLots.filter(l => !dragIds.includes(l.id))
    const adjustedIndex = Math.min(targetIndex, remaining.length)
    remaining.splice(adjustedIndex, 0, ...dragged)

    const reordered = remaining.map((lot, i) => ({ ...lot, lot_number: i + 1 }))

    setLots(prev => {
      const auctionId = filterAuctionId || dragged[0]?.auction_id
      const otherLots = prev.filter(l => l.auction_id !== auctionId)
      return [...otherLots, ...reordered]
    })
    setDragIds([])

    await saveBatchOrder(reordered)
  }

  const handleDragEnd = () => {
    setDragActive(false)
    setDragIds([])
    setDragOverIndex(-1)
  }

  // Touch drag support
  const touchState = useRef<{ id: string; startY: number; active: boolean }>({ id: '', startY: 0, active: false })

  const handleTouchStart = (lotId: string, e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-drag-handle]')) return

    touchState.current = {
      id: lotId,
      startY: e.touches[0].clientY,
      active: false,
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current.id) return
    const dy = Math.abs(e.touches[0].clientY - touchState.current.startY)

    if (dy > 10 && !touchState.current.active) {
      touchState.current.active = true
      const ids = selectedIds.has(touchState.current.id) ? Array.from(selectedIds) : [touchState.current.id]
      setDragActive(true)
      setDragIds(ids)
      dragStartIndex.current = filteredLots.findIndex(l => l.id === touchState.current.id)
    }

    if (!touchState.current.active) return
    e.preventDefault()

    // Find element under touch
    const touch = e.touches[0]
    for (const [id, el] of lotRefsMap.current.entries()) {
      const rect = el.getBoundingClientRect()
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom &&
          touch.clientX >= rect.left && touch.clientX <= rect.right) {
        const idx = filteredLots.findIndex(l => l.id === id)
        if (idx !== -1) setDragOverIndex(idx)
        break
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!touchState.current.active) {
      touchState.current = { id: '', startY: 0, active: false }
      return
    }

    const targetIndex = dragOverIndex
    touchState.current = { id: '', startY: 0, active: false }
    setDragActive(false)
    setDragOverIndex(-1)

    if (dragIds.length === 0 || dragStartIndex.current === targetIndex || targetIndex === -1) {
      setDragIds([])
      return
    }

    const newLots = [...filteredLots]
    const dragged = dragIds.map(id => newLots.find(l => l.id === id)!).filter(Boolean)
    const remaining = newLots.filter(l => !dragIds.includes(l.id))
    const adjustedIndex = Math.min(targetIndex, remaining.length)
    remaining.splice(adjustedIndex, 0, ...dragged)

    const reordered = remaining.map((lot, i) => ({ ...lot, lot_number: i + 1 }))

    setLots(prev => {
      const auctionId = filterAuctionId || dragged[0]?.auction_id
      const otherLots = prev.filter(l => l.auction_id !== auctionId)
      return [...otherLots, ...reordered]
    })
    setDragIds([])

    await saveBatchOrder(reordered)
  }

  // ========================================================================
  // SAVE ORDER (batch RPC)
  // ========================================================================
  const saveBatchOrder = async (reorderedLots: Lot[]) => {
    const auctionId = filterAuctionId || reorderedLots[0]?.auction_id
    if (!auctionId) return

    setSaving(true)
    setSaveMessage('')

    const supabase = createClient()

    const lotOrder = reorderedLots.map(l => ({ id: l.id, lot_number: l.lot_number }))

    const { data, error } = await supabase.rpc('batch_reorder_lots', {
      p_auction_id: auctionId,
      p_lot_order: lotOrder,
    })

    if (error) {
      console.error('Reorder failed:', error)
      setSaveMessage('Failed to save order')
    } else if (data?.ends_recalculated > 0) {
      setSaveMessage(`Reordered. ${data.ends_recalculated} end times recalculated.`)
    } else {
      setSaveMessage('Order saved')
    }

    setSaving(false)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  // ========================================================================
  // INLINE EDIT SAVE
  // ========================================================================
  const handleInlineEdit = async (lotId: string, field: string, value: string | number) => {
    const supabase = createClient()
    const { error } = await supabase.from('lots').update({ [field]: value }).eq('id', lotId)
    if (!error) {
      setLots(prev => prev.map(l => l.id === lotId ? { ...l, [field]: value } : l))
      setSaveMessage(`Updated ${field}`)
      setTimeout(() => setSaveMessage(''), 2000)
    }
  }

  // ========================================================================
  // BULK DELETE
  // ========================================================================
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    if (!confirm(`Delete ${count} lot${count > 1 ? 's' : ''}? This cannot be undone.`)) return

    const lotsWithBids = filteredLots.filter(l => selectedIds.has(l.id) && (l.bid_count || 0) > 0)
    if (lotsWithBids.length > 0) {
      if (!confirm(`${lotsWithBids.length} of these lots have bids. Deleting them will remove all bid history. Continue?`)) return
    }

    setDeleting('bulk')
    const supabase = createClient()
    const ids = Array.from(selectedIds)

    const { error } = await supabase.from('lots').delete().in('id', ids)
    if (!error) {
      setLots(prev => prev.filter(l => !ids.includes(l.id)))
      setSelectedIds(new Set())
      setSaveMessage(`Deleted ${count} lot${count > 1 ? 's' : ''}`)
    }

    setDeleting(null)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  // ========================================================================
  // CLONE
  // ========================================================================
  const handleClone = async (lot: Lot) => {
    setCloning(lot.id)
    const supabase = createClient()
    const maxNum = Math.max(...lots.filter(l => l.auction_id === lot.auction_id).map(l => l.lot_number), 0)

    const { data } = await supabase
      .from('lots')
      .insert({
        auction_id: lot.auction_id,
        lot_number: maxNum + 1,
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
      .select('*, auctions(title, slug, status)')
      .single()

    if (data) setLots(prev => [...prev, data])
    setCloning(null)
  }

  // ========================================================================
  // FILTER
  // ========================================================================
  const handleFilterChange = (auctionId: string) => {
    setFilterAuctionId(auctionId)
    setSelectedIds(new Set())
    router.push(auctionId ? `/admin/lots?auction=${auctionId}` : '/admin/lots')
  }

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div
      className="p-8"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl heading-display text-obsidian-50">
            {currentAuction ? `Lots: ${currentAuction.title}` : 'All Lots'}
          </h1>
          <p className="text-obsidian-400 mt-1 flex items-center gap-3">
            {saving ? (
              <span className="text-dgw-gold flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : saveMessage ? (
              <span className="text-green-400">{saveMessage}</span>
            ) : (
              <span>Drag to reorder{isLiveAuction ? ' (end times auto-recalculate)' : ''}</span>
            )}
            {isLiveAuction && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded border border-red-500/30 animate-pulse">
                LIVE
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/lots/import" className="btn btn-ghost">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Link>
          <Link
            href={filterAuctionId ? `/admin/lots/new?auction=${filterAuctionId}` : '/admin/lots/new'}
            className="btn btn-primary"
          >
            + New Lot
          </Link>
        </div>
      </div>

      {/* FILTER + SELECTION BAR */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <select
            value={filterAuctionId}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-4 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-obsidian-100 focus:outline-none focus:border-dgw-gold text-sm"
          >
            <option value="">All Auctions</option>
            {auctions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} {a.status === 'live' ? '(LIVE)' : a.status === 'ended' ? '(Ended)' : ''}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-3 text-sm">
            <button onClick={selectAll} className="text-obsidian-400 hover:text-obsidian-200 transition-colors">
              {selectedIds.size === filteredLots.length && filteredLots.length > 0 ? 'Deselect all' : 'Select all'}
            </button>

            {selectedIds.size > 0 && (
              <>
                <span className="text-obsidian-600">|</span>
                <span className="text-dgw-gold font-medium">{selectedIds.size} selected</span>
                <span className="text-obsidian-600">|</span>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleting === 'bulk'}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  {deleting === 'bulk' ? 'Deleting...' : 'Delete selected'}
                </button>
              </>
            )}

            <span className="text-obsidian-600">|</span>
            <span className="text-obsidian-500">{filteredLots.length} lots</span>
          </div>
        </div>
      </div>

      {/* LOTS GRID */}
      {filteredLots.length > 0 ? (
        <div
          ref={gridRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
        >
          {filteredLots.map((lot, index) => {
            const isSelected = selectedIds.has(lot.id)
            const isBeingDragged = dragActive && dragIds.includes(lot.id)
            const isDropTarget = dragActive && index === dragOverIndex && !dragIds.includes(lot.id)
            const hasBids = (lot.bid_count || 0) > 0

            return (
              <div
                key={lot.id}
                ref={(el) => {
                  if (el) lotRefsMap.current.set(lot.id, el)
                  else lotRefsMap.current.delete(lot.id)
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, lot.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={() => setDragOverIndex(-1)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(lot.id, e)}
                onClick={(e) => handleSelect(lot.id, e)}
                className={`
                  relative rounded-lg overflow-hidden transition-all duration-150 select-none
                  ${isSelected ? 'ring-2 ring-dgw-gold ring-offset-1 ring-offset-obsidian-950' : ''}
                  ${isBeingDragged ? 'opacity-30 scale-95' : ''}
                  ${isDropTarget ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-obsidian-950 scale-[1.03]' : ''}
                  ${!dragActive ? 'hover:ring-1 hover:ring-obsidian-600' : ''}
                `}
                style={{
                  background: 'linear-gradient(180deg, #141417 0%, #0d0d0f 100%)',
                  border: isSelected
                    ? '1px solid rgba(201, 169, 98, 0.4)'
                    : isDropTarget
                    ? '1px solid rgba(96, 165, 250, 0.5)'
                    : '1px solid rgba(39, 39, 44, 0.8)',
                }}
              >
                {/* Drop indicator line */}
                {isDropTarget && (
                  <div className="absolute inset-0 z-30 pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400 rounded-t" />
                  </div>
                )}

                {/* Drag Handle */}
                <div
                  data-drag-handle
                  className="absolute top-2 left-2 z-20 p-1.5 bg-obsidian-900/90 rounded cursor-grab active:cursor-grabbing hover:bg-obsidian-800 transition-colors"
                  title="Drag to reorder"
                >
                  <svg className="w-4 h-4 text-obsidian-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                  </svg>
                </div>

                {/* Selection checkbox */}
                <div className="absolute top-2 right-2 z-20">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                    ${isSelected ? 'bg-dgw-gold border-dgw-gold' : 'border-obsidian-600 bg-obsidian-900/80 hover:border-obsidian-400'}`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-obsidian-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Image */}
                <div className="aspect-square bg-obsidian-800 relative">
                  {lot.images && lot.images.length > 0 ? (
                    <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-obsidian-700">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 bg-obsidian-900/90 text-dgw-gold text-xs font-bold rounded">#{lot.lot_number}</span>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <span className={`px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider rounded ${
                      lot.status === 'live' ? 'bg-red-500/90 text-white' :
                      lot.status === 'sold' ? 'bg-green-500/90 text-white' :
                      lot.status === 'unsold' ? 'bg-obsidian-700 text-obsidian-300' :
                      'bg-obsidian-900/90 text-obsidian-300'
                    }`}>
                      {lot.status}
                    </span>
                  </div>
                  {hasBids && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-2 py-0.5 bg-blue-500/90 text-white text-[0.6rem] font-bold rounded">
                        {lot.bid_count} bid{(lot.bid_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {lot.images && lot.images.length > 1 && (
                    <div className="absolute top-10 left-2 z-10">
                      <span className="px-1.5 py-0.5 bg-obsidian-900/80 text-obsidian-300 text-[0.55rem] rounded">
                        {lot.images.length} imgs
                      </span>
                    </div>
                  )}
                </div>

                {/* Content - Inline Editable */}
                <div className="p-3 space-y-1.5">
                  <div className="text-sm font-medium text-obsidian-100 line-clamp-2 min-h-[2.5rem]">
                    <InlineEdit value={lot.title} field="title" lotId={lot.id} onSave={handleInlineEdit} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-obsidian-500">Start</span>
                    <span className="text-dgw-gold">
                      <InlineEdit value={lot.starting_bid} field="starting_bid" lotId={lot.id} type="currency" onSave={handleInlineEdit} />
                    </span>
                  </div>
                  {lot.reserve_price != null && lot.reserve_price > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-obsidian-500">Reserve</span>
                      <span className="text-orange-400">
                        <InlineEdit value={lot.reserve_price} field="reserve_price" lotId={lot.id} type="currency" onSave={handleInlineEdit} />
                      </span>
                    </div>
                  )}
                  {lot.current_bid != null && lot.current_bid > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-obsidian-500">Current</span>
                      <span className="text-green-400 font-medium">${lot.current_bid.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1.5 border-t border-obsidian-800/50">
                    <Link
                      href={`/admin/lots/${lot.id}`}
                      className="text-[0.65rem] text-obsidian-400 hover:text-dgw-gold transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Full edit
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClone(lot) }}
                      disabled={cloning === lot.id}
                      className="text-[0.65rem] text-obsidian-400 hover:text-dgw-gold transition-colors disabled:opacity-50"
                    >
                      {cloning === lot.id ? '...' : 'Clone'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
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
            {currentAuction ? 'Import or add lots to this auction' : 'Select an auction or create lots'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/admin/lots/import" className="btn btn-ghost">Import CSV/Excel</Link>
            <Link href={filterAuctionId ? `/admin/lots/new?auction=${filterAuctionId}` : '/admin/lots/new'} className="btn btn-primary">Add Lot</Link>
          </div>
        </div>
      )}

      {filteredLots.length > 0 && (
        <div className="mt-4 text-center text-xs text-obsidian-600">
          Click to select. Shift+click for range. {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl'}+click to toggle. Drag the grip to reorder.
        </div>
      )}
    </div>
  )
}
