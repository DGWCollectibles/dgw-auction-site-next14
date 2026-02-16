'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ParsedLot {
  lot_number: number
  title: string
  description: string
  starting_bid: number
  reserve_price: number | null
  estimate_low: number | null
  estimate_high: number | null
  category: string
  condition: string
  error?: string
}

interface Auction {
  id: string
  title: string
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const rows = lines.slice(1).map(line => {
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    row.push(current.trim())
    return row
  })
  return { headers, rows }
}

const EXPECTED_HEADERS = ['lot_number', 'title', 'description', 'starting_bid', 'reserve_price', 'estimate_low', 'estimate_high', 'category', 'condition']

export default function ImportLotsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionId, setAuctionId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<ParsedLot[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  useEffect(() => {
    const fetchAuctions = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('auctions')
        .select('id, title')
        .in('status', ['draft', 'preview'])
        .order('created_at', { ascending: false })
      if (data) setAuctions(data)
    }
    fetchAuctions()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      parseCSVData(text)
    }
    reader.readAsText(file)
  }

  const parseCSVData = (text: string) => {
    const { headers, rows } = parseCSV(text)
    const errors: string[] = []

    // Validate headers
    const missing = EXPECTED_HEADERS.filter(h => !headers.includes(h) && h !== 'description' && h !== 'reserve_price' && h !== 'estimate_low' && h !== 'estimate_high' && h !== 'category' && h !== 'condition')
    if (missing.length > 0) {
      errors.push(`Missing required columns: ${missing.join(', ')}`)
    }

    if (!headers.includes('lot_number')) errors.push('Missing lot_number column')
    if (!headers.includes('title')) errors.push('Missing title column')

    if (errors.length > 0) {
      setParseErrors(errors)
      setParsed([])
      return
    }

    const lots: ParsedLot[] = rows.map((row, i) => {
      const get = (col: string) => {
        const idx = headers.indexOf(col)
        return idx >= 0 ? row[idx]?.trim() || '' : ''
      }

      const lotNum = parseInt(get('lot_number'))
      const title = get('title')
      const startingBid = parseFloat(get('starting_bid')) || 1
      const reserveStr = get('reserve_price')
      const estLowStr = get('estimate_low')
      const estHighStr = get('estimate_high')

      const lot: ParsedLot = {
        lot_number: isNaN(lotNum) ? i + 1 : lotNum,
        title: title,
        description: get('description'),
        starting_bid: startingBid,
        reserve_price: reserveStr ? parseFloat(reserveStr) || null : null,
        estimate_low: estLowStr ? parseFloat(estLowStr) || null : null,
        estimate_high: estHighStr ? parseFloat(estHighStr) || null : null,
        category: get('category'),
        condition: get('condition'),
      }

      if (!lot.title) lot.error = 'Missing title'
      if (lot.starting_bid <= 0) lot.error = 'Invalid starting bid'

      return lot
    })

    setParseErrors([])
    setParsed(lots)
  }

  const handleImport = async () => {
    if (!auctionId || parsed.length === 0) return
    setImporting(true)
    setResult(null)

    const supabase = createClient()
    let success = 0
    let failed = 0

    // Insert in batches of 20
    const BATCH_SIZE = 20
    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      const batch = parsed.slice(i, i + BATCH_SIZE).filter(l => !l.error)
      
      const inserts = batch.map(lot => ({
        auction_id: auctionId,
        lot_number: lot.lot_number,
        title: lot.title,
        description: lot.description || null,
        starting_bid: lot.starting_bid,
        reserve_price: lot.reserve_price,
        estimate_low: lot.estimate_low,
        estimate_high: lot.estimate_high,
        category: lot.category || null,
        condition: lot.condition || null,
        images: [],
        status: 'upcoming',
      }))

      const { data, error } = await supabase
        .from('lots')
        .insert(inserts)
        .select('id')

      if (error) {
        failed += batch.length
      } else {
        success += data?.length || 0
      }
    }

    setResult({ success, failed: failed + parsed.filter(l => !!l.error).length })
    setImporting(false)
  }

  const validCount = parsed.filter(l => !l.error).length
  const errorCount = parsed.filter(l => !!l.error).length

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <Link href="/admin/lots" className="text-obsidian-400 hover:text-obsidian-300 text-sm flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Lots
        </Link>
        <h1 className="text-3xl heading-display text-obsidian-50">Bulk Import Lots</h1>
        <p className="text-obsidian-400 mt-1">Upload a CSV to create multiple lots at once</p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select Auction */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-obsidian-100 mb-4">1. Select Auction</h2>
          <select
            value={auctionId}
            onChange={e => setAuctionId(e.target.value)}
            className="w-full max-w-md px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
          >
            <option value="">Choose auction...</option>
            {auctions.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          {auctions.length === 0 && (
            <p className="text-obsidian-500 text-sm mt-2">No draft/preview auctions available. Create one first.</p>
          )}
        </div>

        {/* Step 2: Upload CSV */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-obsidian-100 mb-4">2. Upload CSV</h2>
          
          <div className="mb-4 p-4 bg-obsidian-800/50 rounded-lg">
            <p className="text-obsidian-300 text-sm mb-2">Required columns: <code className="text-dgw-gold">lot_number</code>, <code className="text-dgw-gold">title</code>, <code className="text-dgw-gold">starting_bid</code></p>
            <p className="text-obsidian-400 text-xs">Optional: description, reserve_price, estimate_low, estimate_high, category, condition</p>
            <p className="text-obsidian-500 text-xs mt-2">Images can be added after import via the lot edit page.</p>
          </div>

          <label className="block w-full max-w-md p-6 border-2 border-dashed border-obsidian-600 hover:border-obsidian-500 rounded-xl cursor-pointer text-center transition-colors">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <svg className="w-8 h-8 text-obsidian-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-obsidian-400 text-sm">Choose CSV file or drag and drop</span>
          </label>

          {parseErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              {parseErrors.map((err, i) => (
                <p key={i} className="text-red-400 text-sm">{err}</p>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Preview */}
        {parsed.length > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-obsidian-100">3. Preview ({parsed.length} lots)</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-400">{validCount} valid</span>
                {errorCount > 0 && <span className="text-red-400">{errorCount} errors</span>}
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-obsidian-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">#</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">Title</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">Start</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">Reserve</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">Est</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">Cat</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-800">
                  {parsed.map((lot, i) => (
                    <tr key={i} className={lot.error ? 'bg-red-500/5' : ''}>
                      <td className="px-3 py-2 text-obsidian-300 font-mono">{lot.lot_number}</td>
                      <td className="px-3 py-2 text-obsidian-200 max-w-xs truncate">{lot.title}</td>
                      <td className="px-3 py-2 text-dgw-gold font-mono">${lot.starting_bid}</td>
                      <td className="px-3 py-2 text-obsidian-400 font-mono">{lot.reserve_price ? `$${lot.reserve_price}` : '-'}</td>
                      <td className="px-3 py-2 text-obsidian-400 text-xs">
                        {lot.estimate_low || lot.estimate_high ? `$${lot.estimate_low || '?'}-$${lot.estimate_high || '?'}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-obsidian-400">{lot.category || '-'}</td>
                      <td className="px-3 py-2">
                        {lot.error ? (
                          <span className="text-red-400 text-xs">{lot.error}</span>
                        ) : (
                          <span className="text-green-400 text-xs">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import Button */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-obsidian-500 text-sm">
                {validCount} lot{validCount !== 1 ? 's' : ''} will be imported
                {errorCount > 0 && `, ${errorCount} skipped due to errors`}
              </p>
              <button
                onClick={handleImport}
                disabled={!auctionId || validCount === 0 || importing}
                className="btn btn-primary disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${validCount} Lots`}
              </button>
            </div>

            {result && (
              <div className={`mt-4 p-4 rounded-lg ${result.failed > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                <p className={result.failed > 0 ? 'text-yellow-400' : 'text-green-400'}>
                  Imported {result.success} lot{result.success !== 1 ? 's' : ''} successfully.
                  {result.failed > 0 && ` ${result.failed} failed.`}
                </p>
                <Link href={`/admin/lots?auction=${auctionId}`} className="text-dgw-gold text-sm hover:underline mt-2 inline-block">
                  View lots in this auction
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Template Download */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-obsidian-300 mb-2">Need a template?</h3>
          <button
            onClick={() => {
              const template = 'lot_number,title,description,starting_bid,reserve_price,estimate_low,estimate_high,category,condition\n1,PSA 10 Charizard Base Set,1st Edition Shadowless,1,,5000,10000,pokemon,PSA 10 Gem Mint\n2,Rolex Submariner Date,Ref 126610LN 2023 box and papers,100,5000,8000,12000,watches,Excellent'
              const blob = new Blob([template], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'dgw-lot-import-template.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="text-dgw-gold text-sm hover:underline"
          >
            Download CSV template
          </button>
        </div>
      </div>
    </div>
  )
}
