import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AuctionEditForm from './AuctionEditForm'
import { DeleteAuctionButton, StatusSelector } from './AuctionActions'

export default async function AuctionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supabase = await createClient()

  const { data: auction, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !auction) {
    notFound()
  }

  // Get lot count
  const { count: lotCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('auction_id', id)

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/auctions" className="text-obsidian-400 hover:text-obsidian-300 text-sm flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Auctions
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl heading-display text-obsidian-50">{auction.title}</h1>
            <p className="text-obsidian-400 mt-1">Manage auction details and lots</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/lots/new?auction=${auction.id}`}
              className="btn btn-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Lot
            </Link>
            <Link
              href={`/auctions/${auction.slug}`}
              target="_blank"
              className="btn btn-ghost"
            >
              View Live
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Status</p>
          <p className={`text-lg font-semibold mt-1 ${
            auction.status === 'live' ? 'text-red-400' :
            auction.status === 'draft' ? 'text-yellow-400' :
            'text-obsidian-300'
          }`}>
            {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Total Lots</p>
          <p className="text-lg font-semibold text-dgw-gold mt-1">{lotCount || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Starts</p>
          <p className="text-lg font-semibold text-obsidian-100 mt-1">
            {new Date(auction.starts_at).toLocaleDateString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Ends</p>
          <p className="text-lg font-semibold text-obsidian-100 mt-1">
            {new Date(auction.ends_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <AuctionEditForm auction={auction} />
        </div>
        
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="font-semibold text-obsidian-100 mb-4">Status</h3>
            <StatusSelector auctionId={auction.id} currentStatus={auction.status} />
            <div className="mt-6 pt-4 border-t border-obsidian-700">
              <Link
                href={`/admin/lots?auction=${auction.id}`}
                className="w-full btn btn-secondary flex items-center justify-center"
              >
                Manage Lots ({lotCount || 0})
              </Link>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-red-500/20">
            <h3 className="font-semibold text-red-400 mb-4">Danger Zone</h3>
            <DeleteAuctionButton auctionId={auction.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
