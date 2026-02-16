'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ShippingInvoice {
  id: string
  user_id: string
  auction_id: string
  subtotal: number
  buyers_premium: number
  shipping: number | null
  total: number
  status: string
  tracking_number: string | null
  shipped_at: string | null
  shipping_address: any
  created_at: string
  paid_at: string | null
  profile: { full_name: string | null; email: string; display_name: string | null }
  auction: { title: string }
  item_count: number
}

type TabFilter = 'to_ship' | 'shipped' | 'all'

const ORIGIN_ZIP = '12603'

// DGW Shipping rules
function calculateShipping(invoiceTotal: number, distanceMiles: number, itemCount: number): {
  carrier: string; method: string; estimatedCost: string; notes: string;
} {
  if (invoiceTotal < 200) {
    return {
      carrier: 'USPS',
      method: 'Ground Advantage',
      estimatedCost: itemCount <= 6 ? '$5-8' : '$10-15',
      notes: invoiceTotal >= 100 ? 'Insurance required' : '',
    }
  }
  if (invoiceTotal < 5000) {
    const useFlatRate = distanceMiles > 600 && itemCount <= 6
    return {
      carrier: 'USPS',
      method: useFlatRate ? 'Priority Mail (Small Flat Rate)' : 'Priority Mail',
      estimatedCost: useFlatRate ? '$10.40' : '$12-20',
      notes: `Insurance required. ${distanceMiles > 1500 ? 'Over 1500mi - Priority required.' : ''}`,
    }
  }
  if (invoiceTotal < 10000) {
    return {
      carrier: 'UPS',
      method: 'Next Day Air Saver',
      estimatedCost: '$30-60',
      notes: 'Insurance required. Signature confirmation.',
    }
  }
  return {
    carrier: 'UPS',
    method: 'Next Day Air',
    estimatedCost: '$45-80',
    notes: 'Private insurance required. Signature confirmation. Adult signature recommended.',
  }
}

// DGW Packaging rules
function getPackaging(itemCount: number, invoiceTotal: number, distanceMiles: number): string {
  if (itemCount <= 6) {
    if (invoiceTotal >= 200 && distanceMiles > 600) return 'Small Flat Rate Envelope'
    return '7x4 Gold Bubble Mailer (#000)'
  }
  return '6x4x4 Box'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export default function ShippingPage() {
  const [invoices, setInvoices] = useState<ShippingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabFilter>('to_ship')
  const [shipModalId, setShipModalId] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [carrierInput, setCarrierInput] = useState('usps')
  const [shippingCostInput, setShippingCostInput] = useState('')
  const [shipping, setShipping] = useState(false)
  const [shipResult, setShipResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*, profiles(full_name, email, display_name), auctions(title)')
      .in('status', ['paid', 'pending'])
      .order('paid_at', { ascending: true, nullsFirst: false })

    if (invoiceData) {
      // Get item counts
      const enriched: ShippingInvoice[] = []
      for (const inv of invoiceData) {
        const { count } = await supabase
          .from('invoice_items')
          .select('*', { count: 'exact', head: true })
          .eq('invoice_id', inv.id)

        enriched.push({
          ...inv,
          profile: inv.profiles as any,
          auction: inv.auctions as any,
          item_count: count || 0,
        })
      }
      setInvoices(enriched)
    }
    setLoading(false)
  }

  const handleShip = async () => {
    if (!shipModalId || !trackingInput.trim()) return
    setShipping(true)
    setShipResult(null)

    try {
      const res = await fetch('/api/admin/ship-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: shipModalId,
          tracking_number: trackingInput.trim(),
          carrier: carrierInput,
          shipping_cost: shippingCostInput ? Number(shippingCostInput) : undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setShipResult({ success: true, message: `Shipped! Email ${data.email_sent ? 'sent' : 'not sent'}.` })
        // Update local state
        setInvoices(prev => prev.map(inv =>
          inv.id === shipModalId
            ? { ...inv, tracking_number: trackingInput.trim(), shipped_at: new Date().toISOString() }
            : inv
        ))
        setTimeout(() => {
          setShipModalId(null)
          setTrackingInput('')
          setCarrierInput('usps')
          setShippingCostInput('')
          setShipResult(null)
        }, 2000)
      } else {
        setShipResult({ success: false, message: data.error || 'Failed to ship' })
      }
    } catch (err: any) {
      setShipResult({ success: false, message: err.message })
    }

    setShipping(false)
  }

  const filtered = invoices.filter(inv => {
    if (tab === 'to_ship') return inv.status === 'paid' && !inv.shipped_at
    if (tab === 'shipped') return !!inv.shipped_at
    return true
  })

  const toShipCount = invoices.filter(inv => inv.status === 'paid' && !inv.shipped_at).length
  const shippedCount = invoices.filter(inv => !!inv.shipped_at).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl heading-display text-obsidian-50">Shipping</h1>
        <p className="text-obsidian-400 mt-1">Manage order fulfillment and tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">To Ship</p>
          <p className="text-2xl font-bold text-dgw-gold mt-1">{toShipCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Shipped</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{shippedCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-obsidian-400 text-sm">Total Invoices</p>
          <p className="text-2xl font-bold text-obsidian-100 mt-1">{invoices.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'to_ship' as TabFilter, label: 'To Ship', count: toShipCount },
          { key: 'shipped' as TabFilter, label: 'Shipped', count: shippedCount },
          { key: 'all' as TabFilter, label: 'All', count: invoices.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-dgw-gold/10 text-dgw-gold border border-dgw-gold/30'
                : 'text-obsidian-400 hover:text-obsidian-200 border border-obsidian-800'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="w-8 h-8 border-2 border-dgw-gold/30 border-t-dgw-gold rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-obsidian-400">
            {tab === 'to_ship' ? 'All caught up! No orders to ship.' : 'No invoices found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const address = inv.shipping_address
            const shippingCalc = calculateShipping(inv.total, 500, inv.item_count)
            const packaging = getPackaging(inv.item_count, inv.total, 500)

            return (
              <div key={inv.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Customer + items */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-obsidian-100 font-semibold">
                        {inv.profile?.display_name || inv.profile?.full_name || inv.profile?.email}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        inv.shipped_at ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        inv.status === 'paid' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {inv.shipped_at ? 'Shipped' : inv.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>

                    <p className="text-obsidian-500 text-xs mb-1">{inv.auction?.title}</p>
                    <p className="text-obsidian-400 text-sm">
                      {inv.item_count} item{inv.item_count !== 1 ? 's' : ''} &middot; {formatCurrency(inv.total)}
                    </p>

                    {/* Address */}
                    {address && (
                      <p className="text-obsidian-500 text-xs mt-2">
                        {address.address_1}{address.address_2 ? `, ${address.address_2}` : ''}, {address.city}, {address.state} {address.zip}
                      </p>
                    )}

                    {/* Tracking (if shipped) */}
                    {inv.tracking_number && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-green-400 text-xs">Tracking:</span>
                        <code className="text-obsidian-200 text-xs bg-obsidian-800 px-2 py-1 rounded">
                          {inv.tracking_number}
                        </code>
                        {inv.shipped_at && (
                          <span className="text-obsidian-600 text-xs">
                            {new Date(inv.shipped_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Shipping calculator + action */}
                  <div className="text-right shrink-0 space-y-2">
                    {!inv.shipped_at && inv.status === 'paid' && (
                      <>
                        <div className="text-xs text-obsidian-500 space-y-0.5">
                          <p><span className="text-obsidian-400">Ship via:</span> {shippingCalc.carrier} {shippingCalc.method}</p>
                          <p><span className="text-obsidian-400">Est cost:</span> {shippingCalc.estimatedCost}</p>
                          <p><span className="text-obsidian-400">Pack:</span> {packaging}</p>
                          {shippingCalc.notes && <p className="text-dgw-gold/60">{shippingCalc.notes}</p>}
                        </div>
                        <button
                          onClick={() => { setShipModalId(inv.id); setTrackingInput(''); setShippingCostInput(''); }}
                          className="btn btn-primary text-xs px-4 py-2"
                        >
                          Mark Shipped
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Ship Modal */}
      {shipModalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShipModalId(null)}>
          <div className="bg-obsidian-900 border border-obsidian-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-obsidian-100 mb-4">Enter Shipping Details</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-obsidian-400 mb-1">Carrier</label>
                <select
                  value={carrierInput}
                  onChange={e => setCarrierInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-obsidian-800 border border-obsidian-700 rounded-lg text-obsidian-100 focus:outline-none focus:border-dgw-gold"
                >
                  <option value="usps">USPS</option>
                  <option value="ups">UPS</option>
                  <option value="fedex">FedEx</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-obsidian-400 mb-1">Tracking Number *</label>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2.5 bg-obsidian-800 border border-obsidian-700 rounded-lg text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-obsidian-400 mb-1">Shipping Cost (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-500">$</span>
                  <input
                    type="number"
                    value={shippingCostInput}
                    onChange={e => setShippingCostInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2.5 bg-obsidian-800 border border-obsidian-700 rounded-lg text-obsidian-100 placeholder:text-obsidian-600 focus:outline-none focus:border-dgw-gold"
                  />
                </div>
              </div>

              {shipResult && (
                <p className={`text-sm ${shipResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {shipResult.message}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShipModalId(null)}
                  className="flex-1 py-2.5 border border-obsidian-700 text-obsidian-300 rounded-lg hover:border-obsidian-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShip}
                  disabled={!trackingInput.trim() || shipping}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-obsidian-950 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #A68B4B 0%, #C9A962 50%, #D4BC7D 100%)' }}
                >
                  {shipping ? 'Shipping...' : 'Confirm & Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
