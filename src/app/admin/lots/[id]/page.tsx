import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LotEditForm from './LotEditForm'
import { DeleteLotButton } from './LotActions'

export default async function LotDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supabase = await createClient()

  const { data: lot, error } = await supabase
    .from('lots')
    .select('*, auctions(id, title, slug)')
    .eq('id', id)
    .single()

  if (error || !lot) {
    notFound()
  }

  // Get bid count
  const { count: bidCount } = await supabase
    .from('bids')
    .select('*', { count: 'exact', head: true })
    .eq('lot_id', id)

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/lots" className="text-obsidian-400 hover:text-obsidian-300 text-sm flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Lots
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="badge bg-obsidian-800 text-obsidian-300">Lot {lot.lot_number}</span>
              <span className={`badge ${
                lot.status === 'live' ? 'badge-live' :
                lot.status === 'sold' ? 'badge-success' :
                'bg-obsidian-700 text-obsidian-300'
              }`}>
                {lot.status}
              </span>
            </div>
            <h1 className="text-3xl heading-display text-obsidian-50">{lot.title}</h1>
            <p className="text-obsidian-400 mt-1">
              In: <Link href={`/admin/auctions/${(lot.auctions as { id: string })?.id}`} className="text-dgw-gold hover:underline">
                {(lot.auctions as { title: string })?.title}
              </Link>
            </p>
          </div>
          <Link
            href={`/lots/${lot.id}`}
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Starting Bid</p>
          <p className="text-lg font-semibold text-obsidian-100 mt-1">
            ${lot.starting_bid?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Current Bid</p>
          <p className="text-lg font-semibold text-dgw-gold mt-1">
            ${lot.current_bid?.toLocaleString() || '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Bids</p>
          <p className="text-lg font-semibold text-obsidian-100 mt-1">{bidCount || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Reserve</p>
          <p className="text-lg font-semibold text-obsidian-100 mt-1">
            {lot.reserve_price ? `$${lot.reserve_price.toLocaleString()}` : 'None'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <LotEditForm lot={lot} />
        </div>

        <div className="space-y-6">
          {/* Images Preview */}
          <div className="card p-6">
            <h3 className="font-semibold text-obsidian-100 mb-4">Images</h3>
            {lot.images && lot.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {lot.images.map((url: string, index: number) => (
                  <div key={index} className="aspect-square bg-obsidian-800 rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-obsidian-500 text-sm">No images uploaded</p>
            )}
          </div>

          {/* Danger Zone */}
          <div className="card p-6 border-red-500/20">
            <h3 className="font-semibold text-red-400 mb-4">Danger Zone</h3>
            <DeleteLotButton lotId={lot.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
