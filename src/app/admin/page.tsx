import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get counts
  const [
    { count: auctionCount },
    { count: lotCount },
    { count: userCount },
    { count: bidCount }
  ] = await Promise.all([
    supabase.from('auctions').select('*', { count: 'exact', head: true }),
    supabase.from('lots').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bids').select('*', { count: 'exact', head: true }),
  ])

  // Get recent auctions
  const { data: recentAuctions } = await supabase
    .from('auctions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Total Auctions', value: auctionCount || 0, href: '/admin/auctions', color: 'text-dgw-gold' },
    { label: 'Total Lots', value: lotCount || 0, href: '/admin/lots', color: 'text-blue-400' },
    { label: 'Registered Users', value: userCount || 0, href: '/admin/users', color: 'text-green-400' },
    { label: 'Total Bids', value: bidCount || 0, href: '#', color: 'text-purple-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl heading-display text-obsidian-50">Dashboard</h1>
        <p className="text-obsidian-400 mt-1">Overview of your auction platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-6 hover:border-obsidian-700 transition-colors">
            <p className="text-obsidian-400 text-sm">{stat.label}</p>
            <p className={`text-3xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-obsidian-100 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/auctions/new"
              className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-dgw-gold/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-dgw-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-obsidian-100">Create New Auction</p>
                <p className="text-sm text-obsidian-400">Start a new auction event</p>
              </div>
            </Link>

            <Link
              href="/admin/lots/new"
              className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-obsidian-100">Add New Lot</p>
                <p className="text-sm text-obsidian-400">Add items to an auction</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Auctions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-obsidian-100">Recent Auctions</h2>
            <Link href="/admin/auctions" className="text-sm text-dgw-gold hover:underline">
              View all
            </Link>
          </div>
          
          {recentAuctions && recentAuctions.length > 0 ? (
            <div className="space-y-3">
              {recentAuctions.map((auction) => (
                <Link
                  key={auction.id}
                  href={`/admin/auctions/${auction.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-obsidian-100">{auction.title}</p>
                    <p className="text-sm text-obsidian-400">
                      {new Date(auction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`badge ${
                    auction.status === 'live' ? 'badge-live' : 
                    auction.status === 'draft' ? 'badge-gold' : 
                    'bg-obsidian-700 text-obsidian-300'
                  }`}>
                    {auction.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-obsidian-400">
              <p>No auctions yet</p>
              <Link href="/admin/auctions/new" className="text-dgw-gold hover:underline text-sm">
                Create your first auction
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
