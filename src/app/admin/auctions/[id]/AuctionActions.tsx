'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function StatusSelector({ auctionId, currentStatus }: { auctionId: string; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)
  const [goLiveResult, setGoLiveResult] = useState<any>(null)
  const [goLiveError, setGoLiveError] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return
    
    // Going LIVE uses the dedicated go-live API (initializes lot timing + sends emails)
    if (newStatus === 'live') {
      if (!confirm(
        'Go live?\n\n' +
        'This will:\n' +
        '  1. Initialize staggered lot closing times\n' +
        '  2. Set the auction to LIVE\n' +
        '  3. Email all registered users\n' +
        '  4. Create in-app notifications\n\n' +
        'Make sure all lots are finalized before proceeding.'
      )) {
        return
      }

      setLoading(true)
      setGoLiveResult(null)
      setGoLiveError(null)

      try {
        const res = await fetch('/api/admin/go-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auction_id: auctionId }),
        })

        const data = await res.json()

        if (!res.ok) {
          setGoLiveError(data.error || 'Failed to go live')
          setLoading(false)
          return
        }

        setStatus('live')
        setGoLiveResult(data)
        setLoading(false)
        router.refresh()
      } catch (err: any) {
        setGoLiveError(err.message || 'Network error')
        setLoading(false)
      }
      return
    }

    if (newStatus === 'ended' && !confirm('End this auction? Bidding will close immediately.')) {
      return
    }

    setLoading(true)
    setGoLiveResult(null)
    setGoLiveError(null)

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
      {loading && (
        <div className="flex items-center gap-2 text-xs text-dgw-gold">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {status !== 'live' ? 'Going live... initializing lots and sending emails' : 'Updating...'}
        </div>
      )}

      {/* Go-live error */}
      {goLiveError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <p className="font-semibold mb-1">Failed to go live</p>
          <p className="text-red-400/80">{goLiveError}</p>
        </div>
      )}

      {/* Go-live success summary */}
      {goLiveResult && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm space-y-1">
          <p className="font-semibold text-green-400">Auction is LIVE</p>
          <p className="text-green-400/80">
            {goLiveResult.lots_initialized} lots initialized ({goLiveResult.staggered_interval}s intervals)
          </p>
          <p className="text-green-400/80">
            {goLiveResult.emails_sent} notification emails sent
            {goLiveResult.emails_failed > 0 && ` (${goLiveResult.emails_failed} failed)`}
          </p>
        </div>
      )}
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
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    if (!confirm('Go live? This will initialize lot timing, set the auction live, and email all users.')) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/admin/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auction_id: auctionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to go live')
        setLoading(false)
        return
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePublish}
        disabled={loading}
        className="w-full btn bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-50"
      >
        {loading ? 'Going Live...' : 'Publish Auction'}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}

export function EndAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleEnd = async () => {
    if (!confirm(
      'End this auction now?\n\n' +
      'This will:\n' +
      '  1. Close all bidding immediately\n' +
      '  2. Determine winners for each lot\n' +
      '  3. Generate invoices for all winners\n' +
      '  4. Check reserve prices\n\n' +
      'This cannot be undone.'
    )) {
      return
    }

    setLoading(true)
    setResult(null)

    // First set auction as ended
    const supabase = createClient()
    
    const { error: statusError } = await supabase
      .from('auctions')
      .update({ status: 'ended' })
      .eq('id', auctionId)

    if (statusError) {
      alert('Error ending auction: ' + statusError.message)
      setLoading(false)
      return
    }

    // Then trigger auction end processing (invoice generation, winner determination)
    try {
      const res = await fetch('/api/process-auction-end', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
        },
      })
      
      // Refresh regardless of processing result
      setLoading(false)
      router.refresh()
    } catch (err) {
      // Auction is already ended, processing will happen via cron
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleEnd}
      disabled={loading}
      className="w-full btn bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50"
    >
      {loading ? 'Ending & Processing...' : 'End Auction'}
    </button>
  )
}
