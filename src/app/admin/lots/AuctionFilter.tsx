'use client'

import { useRouter } from 'next/navigation'

interface Auction {
  id: string
  title: string
}

export default function AuctionFilter({ 
  auctions, 
  currentAuctionId 
}: { 
  auctions: Auction[]
  currentAuctionId?: string 
}) {
  const router = useRouter()

  return (
    <select
      defaultValue={currentAuctionId || ''}
      onChange={(e) => {
        const value = e.target.value
        router.push(value ? `/admin/lots?auction=${value}` : '/admin/lots')
      }}
      className="px-4 py-2 bg-obsidian-900 border border-obsidian-700 rounded-lg text-obsidian-100 focus:outline-none focus:border-dgw-gold"
    >
      <option value="">All Auctions</option>
      {auctions?.map((a) => (
        <option key={a.id} value={a.id}>{a.title}</option>
      ))}
    </select>
  )
}
