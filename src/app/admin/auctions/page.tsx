import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AuctionsPage() {
  const supabase = await createClient()

  const { data: auctions } = await supabase
    .from('auctions')
    .select('*, lots(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl heading-display text-obsidian-50">Auctions</h1>
          <p className="text-obsidian-400 mt-1">Manage your auction events</p>
        </div>
        <Link href="/admin/auctions/new" className="btn btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Auction
        </Link>
      </div>

      {auctions && auctions.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-obsidian-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Auction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Lots
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Starts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Ends
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800">
              {auctions.map((auction) => (
                <tr key={auction.id} className="hover:bg-obsidian-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-obsidian-100">{auction.title}</p>
                      <p className="text-sm text-obsidian-500">{auction.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${
                      auction.status === 'live' ? 'badge-live' : 
                      auction.status === 'draft' ? 'badge-gold' :
                      auction.status === 'ended' ? 'bg-obsidian-700 text-obsidian-300' :
                      'badge-gold'
                    }`}>
                      {auction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-obsidian-300">
                    {auction.lots?.[0]?.count || 0}
                  </td>
                  <td className="px-6 py-4 text-obsidian-300 text-sm">
                    {new Date(auction.starts_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-obsidian-300 text-sm">
                    {new Date(auction.ends_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/auctions/${auction.id}`}
                        className="p-2 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <Link
                        href={`/admin/lots?auction=${auction.id}`}
                        className="p-2 text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-obsidian-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-obsidian-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-obsidian-100 mb-2">No auctions yet</h3>
          <p className="text-obsidian-400 mb-4">Create your first auction to get started</p>
          <Link href="/admin/auctions/new" className="btn btn-primary">
            Create Auction
          </Link>
        </div>
      )}
    </div>
  )
}
