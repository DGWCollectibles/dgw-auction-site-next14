'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function StatusSelector({ auctionId, currentStatus }: { auctionId: string; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return
    
    if (newStatus === 'live' && !confirm('Go live? This will make the auction visible to bidders.')) {
      return
    }
    if (newStatus === 'ended' && !confirm('End this auction? Bidding will close.')) {
      return
    }

    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('auctions')
      .update({ status: newStatus })
      .eq('id', auctionId)

    if (error) {
      alert('Error updating status: ' + error.message)
      setLoading(false)
      return
    }

    setStatus(newStatus)
    setLoading(false)
    router.refresh()
  }

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'text-yellow-400', bg: 'bg-yellow-500/10', desc: 'Hidden from public' },
    { value: 'preview', label: 'Preview', color: 'text-blue-400', bg: 'bg-blue-500/10', desc: 'Visible, no bidding' },
    { value: 'live', label: 'Live', color: 'text-green-400', bg: 'bg-green-500/10', desc: 'Active bidding' },
    { value: 'ended', label: 'Ended', color: 'text-obsidian-400', bg: 'bg-obsidian-500/10', desc: 'Auction closed' },
  ]

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-obsidian-300">Auction Status</label>
      <div className="grid grid-cols-2 gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            disabled={loading}
            className={`p-3 rounded-lg border text-left transition-all ${
              status === option.value
                ? `${option.bg} border-current ${option.color}`
                : 'border-obsidian-700 hover:border-obsidian-600 text-obsidian-400'
            } disabled:opacity-50`}
          >
            <span className={`font-semibold block ${status === option.value ? option.color : ''}`}>
              {option.label}
            </span>
            <span className="text-xs text-obsidian-500">{option.desc}</span>
          </button>
        ))}
      </div>
      {loading && <p className="text-xs text-dgw-gold">Updating...</p>}
    </div>
  )
}

export function DeleteAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this auction? This cannot be undone.')) {
      return
    }

    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('auctions')
      .delete()
      .eq('id', auctionId)

    if (error) {
      alert('Error deleting auction: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/admin/auctions')
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="w-full btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
    >
      {loading ? 'Deleting...' : 'Delete Auction'}
    </button>
  )
}

export function PublishAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handlePublish = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('auctions')
      .update({ status: 'live' })
      .eq('id', auctionId)

    if (error) {
      alert('Error publishing auction: ' + error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <button
      onClick={handlePublish}
      disabled={loading}
      className="w-full btn bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50"
    >
      {loading ? 'Publishing...' : 'Publish Auction'}
    </button>
  )
}

export function EndAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleEnd = async () => {
    if (!confirm('Are you sure you want to end this auction?')) {
      return
    }

    setLoading(true)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('auctions')
      .update({ status: 'ended' })
      .eq('id', auctionId)

    if (error) {
      alert('Error ending auction: ' + error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <button
      onClick={handleEnd}
      disabled={loading}
      className="w-full btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
    >
      {loading ? 'Ending...' : 'End Auction'}
    </button>
  )
}
