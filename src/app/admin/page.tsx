import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatCompact(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`
  return formatCurrency(amount)
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Parallel fetch all data
  const [
    { count: auctionCount },
    { count: lotCount },
    { count: userCount },
    { count: bidCount },
    { count: liveAuctionCount },
    { data: soldLots },
    { count: endedLotCount },
    { data: paidInvoices },
    { data: pendingInvoices },
    { count: toShipCount },
    { data: recentBids },
    { data: recentUsers },
    { data: topLots },
    { data: recentAuctions },
  ] = await Promise.all([
    supabase.from('auctions').select('*', { count: 'exact', head: true }),
    supabase.from('lots').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('bids').select('*', { count: 'exact', head: true }),
    supabase.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('lots').select('current_bid').eq('status', 'sold'),
    supabase.from('lots').select('*', { count: 'exact', head: true }).in('status', ['sold', 'unsold']),
    supabase.from('invoices').select('total, subtotal, buyers_premium').eq('status', 'paid'),
    supabase.from('invoices').select('total').eq('status', 'pending'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid').is('shipped_at', null),
    supabase.from('bids').select('id, amount, created_at, profiles(display_name, full_name), lots(title, lot_number)').order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('lots').select('id, title, lot_number, current_bid, bid_count, images, auctions(title)').eq('status', 'sold').order('current_bid', { ascending: false }).limit(5),
    supabase.from('auctions').select('id, title, slug, status, ends_at').order('created_at', { ascending: false }).limit(5),
  ])

  // Calculate metrics
  const gmv = (soldLots || []).reduce((sum, l) => sum + (l.current_bid || 0), 0)
  const totalRevenue = (paidInvoices || []).reduce((sum, i) => sum + (i.total || 0), 0)
  const totalPremium = (paidInvoices || []).reduce((sum, i) => sum + (i.buyers_premium || 0), 0)
  const pendingRevenue = (pendingInvoices || []).reduce((sum, i) => sum + (i.total || 0), 0)
  const soldCount = soldLots?.length || 0
  const totalEndedLots = endedLotCount || 0
  const sellThrough = totalEndedLots > 0 ? Math.round((soldCount / totalEndedLots) * 100) : 0
  const avgHammer = soldCount > 0 ? gmv / soldCount : 0
  const shipCount = toShipCount || 0

  // Unread messages count (needs admin client to bypass RLS)
  const adminDb = createAdminClient()
  const { count: unreadMessageCount } = await adminDb
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('unread_by_admin', true)
    .eq('status', 'open')
  const msgCount = unreadMessageCount || 0

  const statCards = [
    { label: 'Gross Merchandise Volume', value: formatCompact(gmv), sub: `${soldCount} lots sold`, color: 'text-dgw-gold', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Revenue', value: formatCompact(totalRevenue), sub: `${formatCurrency(totalPremium)} in premiums`, color: 'text-green-400', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { label: 'Sell-Through Rate', value: `${sellThrough}%`, sub: `${soldCount}/${totalEndedLots} ended lots`, color: 'text-blue-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Avg Hammer Price', value: formatCurrency(avgHammer), sub: `across ${soldCount} sold lots`, color: 'text-purple-400', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  ]

  const quickStats = [
    { label: 'Live Auctions', value: liveAuctionCount || 0, href: '/admin/auctions', color: 'text-red-400' },
    { label: 'Total Auctions', value: auctionCount || 0, href: '/admin/auctions', color: 'text-dgw-gold' },
    { label: 'Total Lots', value: lotCount || 0, href: '/admin/lots', color: 'text-blue-400' },
    { label: 'Users', value: userCount || 0, href: '/admin/users', color: 'text-green-400' },
    { label: 'Total Bids', value: bidCount || 0, href: '#', color: 'text-purple-400' },
    { label: 'To Ship', value: shipCount, href: '/admin/shipping', color: shipCount > 0 ? 'text-orange-400' : 'text-obsidian-400' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl heading-display text-obsidian-50">Dashboard</h1>
          <p className="text-obsidian-400 mt-1">DGW Collectibles &amp; Estates overview</p>
        </div>
        <Link href="/admin/auctions/new" className="btn btn-primary text-sm">
          + New Auction
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-obsidian-500 text-xs tracking-wider uppercase">{stat.label}</p>
              <svg className="w-5 h-5 text-obsidian-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
              </svg>
            </div>
            <p className={`text-2xl font-bold ${stat.color} font-mono`}>{stat.value}</p>
            <p className="text-obsidian-500 text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {pendingRevenue > 0 && (
        <div className="card p-4 mb-4 border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-yellow-400 text-sm font-medium">
                {formatCurrency(pendingRevenue)} in pending invoices ({pendingInvoices?.length || 0})
              </p>
            </div>
          </div>
          <Link href="/admin/invoices" className="text-yellow-400 text-sm hover:underline shrink-0">View</Link>
        </div>
      )}

      {shipCount > 0 && (
        <div className="card p-4 mb-8 border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-blue-400 text-sm font-medium">
              {shipCount} order{shipCount !== 1 ? 's' : ''} ready to ship
            </p>
          </div>
          <Link href="/admin/shipping" className="text-blue-400 text-sm hover:underline shrink-0">Ship</Link>
        </div>
      )}

      {msgCount > 0 && (
        <div className="card p-4 mb-8 border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-purple-400 text-sm font-medium">
              {msgCount} unread message{msgCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/admin/messages" className="text-purple-400 text-sm hover:underline shrink-0">View</Link>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
        {quickStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-3 text-center hover:border-obsidian-600 transition-colors">
            <p className={`text-xl font-bold ${stat.color} font-mono`}>{stat.value}</p>
            <p className="text-obsidian-500 text-[10px] tracking-wider uppercase mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Lots */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-obsidian-100 mb-4">Top Sold Lots</h2>
          {topLots && topLots.length > 0 ? (
            <div className="space-y-3">
              {topLots.map((lot: any, i: number) => (
                <Link key={lot.id} href={`/admin/lots/${lot.id}`} className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-obsidian-800/50 transition-colors">
                  <span className="text-obsidian-600 text-sm font-mono w-5 shrink-0">#{i + 1}</span>
                  <div className="w-10 h-10 rounded bg-obsidian-800 overflow-hidden shrink-0">
                    {lot.images?.[0] ? (
                      <img src={lot.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-obsidian-600 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-obsidian-200 text-sm truncate">Lot {lot.lot_number}: {lot.title}</p>
                    <p className="text-obsidian-500 text-xs">{(lot.auctions as any)?.title} &middot; {lot.bid_count} bids</p>
                  </div>
                  <p className="text-dgw-gold font-mono font-semibold text-sm shrink-0">{formatCurrency(lot.current_bid || 0)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-obsidian-500 text-sm">No sold lots yet</p>
          )}
        </div>

        {/* Recent Bids */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-obsidian-100 mb-4">Recent Bids</h2>
          {recentBids && recentBids.length > 0 ? (
            <div className="space-y-3">
              {recentBids.map((bid: any) => {
                const profile = bid.profiles as any
                const lot = bid.lots as any
                const bidderName = profile?.display_name || profile?.full_name || 'Bidder'
                return (
                  <div key={bid.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="text-obsidian-200 text-sm">
                        <span className="text-obsidian-400">{bidderName}</span> bid on Lot {lot?.lot_number}
                      </p>
                      <p className="text-obsidian-500 text-xs truncate">{lot?.title}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-dgw-gold font-mono text-sm">{formatCurrency(bid.amount)}</p>
                      <p className="text-obsidian-600 text-[10px]">
                        {new Date(bid.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-obsidian-500 text-sm">No bids yet</p>
          )}
        </div>

        {/* Recent Auctions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-obsidian-100">Recent Auctions</h2>
            <Link href="/admin/auctions" className="text-dgw-gold text-xs hover:underline">View all</Link>
          </div>
          {recentAuctions && recentAuctions.length > 0 ? (
            <div className="space-y-2">
              {recentAuctions.map((auction: any) => (
                <Link key={auction.id} href={`/admin/auctions/${auction.id}`} className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-obsidian-800/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-obsidian-200 text-sm truncate">{auction.title}</p>
                    <p className="text-obsidian-500 text-xs">
                      Ends {new Date(auction.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
                    auction.status === 'live' ? 'bg-green-500/10 text-green-400' :
                    auction.status === 'draft' ? 'bg-yellow-500/10 text-yellow-400' :
                    auction.status === 'ended' ? 'bg-obsidian-700 text-obsidian-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {auction.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-obsidian-500 text-sm">No auctions yet</p>
          )}
        </div>

        {/* Recent Signups */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-obsidian-100">Recent Signups</h2>
            <Link href="/admin/users" className="text-dgw-gold text-xs hover:underline">View all</Link>
          </div>
          {recentUsers && recentUsers.length > 0 ? (
            <div className="space-y-2">
              {recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="text-obsidian-200 text-sm">{user.full_name || user.email}</p>
                    {user.full_name && <p className="text-obsidian-500 text-xs">{user.email}</p>}
                  </div>
                  <p className="text-obsidian-600 text-xs shrink-0">
                    {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-obsidian-500 text-sm">No users yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
