'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES
// ============================================================================
interface Auction {
  id: string
  title: string
  status: string
}

interface ColumnMapping {
  sourceCol: string
  targetField: string // our DB field name or 'skip'
}

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
  images: string[]
  metadata: Record<string, string>
  error?: string
}

// Target fields the user can map to
const TARGET_FIELDS = [
  { key: 'skip', label: 'Skip (do not import)' },
  { key: 'lot_number', label: 'Lot Number' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'starting_bid', label: 'Starting Bid' },
  { key: 'reserve_price', label: 'Reserve Price' },
  { key: 'estimate_low', label: 'Low Estimate' },
  { key: 'estimate_high', label: 'High Estimate' },
  { key: 'category', label: 'Category' },
  { key: 'condition', label: 'Condition / Grade' },
  { key: 'image', label: 'Image URL' },
  { key: 'metadata', label: 'Metadata (extra field)' },
]

// Fuzzy matching patterns for auto-detection
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  lot_number: [/^lot[_\s-]?(number|num|no|#|id)/i, /^#$/i, /^lot$/i, /^number$/i],
  title: [/^title$/i, /^name$/i, /^lot[_\s-]?title/i, /^item[_\s-]?name/i, /^description[_\s-]?1/i],
  description: [/^desc/i, /^detail/i, /^notes?$/i, /^lot[_\s-]?desc/i, /^description[_\s-]?2/i],
  starting_bid: [/^start/i, /^open/i, /^min/i, /^bid/i, /^price$/i],
  reserve_price: [/^reserve/i, /^hidden/i],
  estimate_low: [/^(low|min)[_\s-]?est/i, /^est[_\s-]?(low|min)/i, /^estimate[_\s-]?low/i],
  estimate_high: [/^(high|max)[_\s-]?est/i, /^est[_\s-]?(high|max)/i, /^estimate[_\s-]?high/i],
  category: [/^cat/i, /^type$/i, /^genre$/i],
  condition: [/^cond/i, /^grade$/i, /^quality$/i, /^cert/i],
  image: [/^image/i, /^img/i, /^photo/i, /^pic/i, /^url/i, /^thumbnail/i],
}

function detectColumnMapping(header: string): string {
  const normalized = header.trim()
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) return field
    }
  }
  return 'skip'
}

// ============================================================================
// CSV PARSER (handles quoted fields, newlines in quotes)
// ============================================================================
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    row.push(current.trim())
    return row
  }

  const headers = parseRow(lines[0]).map(h => h.replace(/^["']|["']$/g, ''))
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => parseRow(l))

  return { headers, rows }
}

// ============================================================================
// XLSX PARSER (dynamic import)
// ============================================================================
async function parseXLSX(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })

  if (data.length === 0) return { headers: [], rows: [] }

  const headers = (data[0] || []).map(h => String(h || '').trim())
  const rows = data.slice(1)
    .filter((row: any) => row.some((cell: any) => cell != null && String(cell).trim() !== ''))
    .map((row: any) => row.map((cell: any) => String(cell ?? '').trim()))

  return { headers, rows }
}


// ============================================================================
// MAIN IMPORT PAGE
// ============================================================================
export default function ImportLotsPage() {
  // Step tracking
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')

  // Auction selection
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionId, setAuctionId] = useState('')

  // File data
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])

  // Column mapping
  const [mappings, setMappings] = useState<ColumnMapping[]>([])

  // Options
  const [autoNumber, setAutoNumber] = useState(true)
  const [startNumber, setStartNumber] = useState(1)

  // Preview
  const [parsedLots, setParsedLots] = useState<ParsedLot[]>([])

  // Import
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchAuctions = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('auctions')
        .select('id, title, status')
        .in('status', ['draft', 'preview', 'live'])
        .order('created_at', { ascending: false })
      if (data) setAuctions(data)
    }
    fetchAuctions()
  }, [])

  // ========================================================================
  // FILE HANDLING
  // ========================================================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    let parsed: { headers: string[]; rows: string[][] }

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      parsed = await parseXLSX(file)
    } else {
      const text = await file.text()
      parsed = parseCSV(text)
    }

    if (parsed.headers.length === 0) return

    setHeaders(parsed.headers)
    setRows(parsed.rows)

    // Auto-detect column mappings
    const autoMappings: ColumnMapping[] = parsed.headers.map(h => ({
      sourceCol: h,
      targetField: detectColumnMapping(h),
    }))

    setMappings(autoMappings)
    setStep('map')
  }

  // ========================================================================
  // MAPPING
  // ========================================================================
  const updateMapping = (index: number, targetField: string) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, targetField } : m))
  }

  const hasTitleMapping = mappings.some(m => m.targetField === 'title')

  const proceedToPreview = () => {
    if (!hasTitleMapping) return

    // Build parsed lots from mappings
    const lots: ParsedLot[] = rows.map((row, rowIdx) => {
      const get = (field: string): string => {
        const colIdx = mappings.findIndex(m => m.targetField === field)
        return colIdx >= 0 ? (row[colIdx] || '').trim() : ''
      }

      const getAll = (field: string): string[] => {
        return mappings
          .map((m, i) => m.targetField === field ? (row[i] || '').trim() : '')
          .filter(v => v !== '')
      }

      const images = getAll('image').filter(url =>
        url.startsWith('http') || url.startsWith('//')
      )

      // Collect metadata fields
      const metadata: Record<string, string> = {}
      mappings.forEach((m, i) => {
        if (m.targetField === 'metadata' && row[i]?.trim()) {
          metadata[m.sourceCol] = row[i].trim()
        }
      })

      const lotNumStr = get('lot_number')
      const lotNum = autoNumber ? startNumber + rowIdx : (parseInt(lotNumStr) || rowIdx + 1)

      const startBidStr = get('starting_bid').replace(/[$,]/g, '')
      const reserveStr = get('reserve_price').replace(/[$,]/g, '')
      const estLowStr = get('estimate_low').replace(/[$,]/g, '')
      const estHighStr = get('estimate_high').replace(/[$,]/g, '')

      const lot: ParsedLot = {
        lot_number: lotNum,
        title: get('title'),
        description: get('description'),
        starting_bid: parseFloat(startBidStr) || 1,
        reserve_price: reserveStr ? parseFloat(reserveStr) || null : null,
        estimate_low: estLowStr ? parseFloat(estLowStr) || null : null,
        estimate_high: estHighStr ? parseFloat(estHighStr) || null : null,
        category: get('category'),
        condition: get('condition'),
        images,
        metadata,
      }

      if (!lot.title) lot.error = 'Missing title'

      return lot
    })

    setParsedLots(lots)
    setStep('preview')
  }

  // ========================================================================
  // IMPORT
  // ========================================================================
  const handleImport = async () => {
    if (!auctionId || parsedLots.length === 0) return
    setImporting(true)
    setImportProgress(0)
    setImportResult(null)

    const supabase = createClient()
    const validLots = parsedLots.filter(l => !l.error)
    let success = 0
    let failed = 0

    const BATCH_SIZE = 25
    for (let i = 0; i < validLots.length; i += BATCH_SIZE) {
      const batch = validLots.slice(i, i + BATCH_SIZE)

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
        images: lot.images,
        metadata: Object.keys(lot.metadata).length > 0 ? lot.metadata : {},
        status: 'upcoming',
      }))

      const { data, error } = await supabase.from('lots').insert(inserts).select('id')

      if (error) {
        failed += batch.length
        console.error('Import batch error:', error)
      } else {
        success += data?.length || 0
      }

      setImportProgress(Math.round(((i + batch.length) / validLots.length) * 100))
    }

    setImportResult({ success, failed: failed + parsedLots.filter(l => !!l.error).length })
    setImporting(false)
    setStep('done')
  }

  const validCount = parsedLots.filter(l => !l.error).length
  const errorCount = parsedLots.filter(l => !!l.error).length

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <Link href="/admin/lots" className="text-obsidian-400 hover:text-obsidian-300 text-sm flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Lots
        </Link>
        <h1 className="text-3xl heading-display text-obsidian-50">Smart Import</h1>
        <p className="text-obsidian-400 mt-1">CSV or Excel with automatic column detection</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 mb-8">
        {['upload', 'map', 'preview', 'done'].map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step === s ? 'bg-dgw-gold text-obsidian-950' :
              ['upload', 'map', 'preview', 'done'].indexOf(step) > i ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-obsidian-800 text-obsidian-500'
            }`}>
              {['upload', 'map', 'preview', 'done'].indexOf(step) > i ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-sm ${step === s ? 'text-obsidian-100 font-medium' : 'text-obsidian-500'}`}>
              {s === 'upload' ? 'Upload' : s === 'map' ? 'Map Columns' : s === 'preview' ? 'Preview' : 'Done'}
            </span>
            {i < 3 && <div className="w-8 h-px bg-obsidian-700" />}
          </div>
        ))}
      </div>

      {/* ================================================================ */}
      {/* STEP 1: SELECT AUCTION + UPLOAD */}
      {/* ================================================================ */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-obsidian-100 mb-4">Select Auction</h2>
            <select
              value={auctionId}
              onChange={e => setAuctionId(e.target.value)}
              className="w-full max-w-md px-4 py-3 bg-obsidian-900 border border-obsidian-700 rounded-xl text-obsidian-100 focus:outline-none focus:border-dgw-gold"
            >
              <option value="">Choose auction...</option>
              {auctions.map(a => (
                <option key={a.id} value={a.id}>
                  {a.title} {a.status === 'live' ? '(LIVE)' : `(${a.status})`}
                </option>
              ))}
            </select>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-obsidian-100 mb-4">Upload File</h2>
            <p className="text-obsidian-400 text-sm mb-4">
              CSV or Excel (.xlsx). We will auto-detect your columns and let you map them.
              Supports image URL columns, LiveAuctioneers exports, and custom spreadsheets.
            </p>

            <label className={`block w-full p-8 border-2 border-dashed rounded-xl cursor-pointer text-center transition-colors ${
              auctionId ? 'border-obsidian-600 hover:border-dgw-gold/50' : 'border-obsidian-800 opacity-50 cursor-not-allowed'
            }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={!auctionId}
              />
              <svg className="w-10 h-10 text-obsidian-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-obsidian-400">
                {auctionId ? 'Choose CSV or Excel file' : 'Select an auction first'}
              </span>
              <p className="text-xs text-obsidian-600 mt-2">
                Supports: .csv, .xlsx, .xls, .tsv
              </p>
            </label>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 2: COLUMN MAPPING */}
      {/* ================================================================ */}
      {step === 'map' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-obsidian-100">Map Columns</h2>
                <p className="text-obsidian-400 text-sm mt-1">
                  {fileName} - {rows.length} rows, {headers.length} columns detected
                </p>
              </div>
              <button
                onClick={() => { setStep('upload'); setHeaders([]); setRows([]); setMappings([]) }}
                className="btn btn-ghost text-sm"
              >
                Upload different file
              </button>
            </div>

            {!hasTitleMapping && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
                You must map at least one column to "Title"
              </div>
            )}

            <div className="space-y-2">
              {mappings.map((mapping, i) => {
                const sampleValues = rows.slice(0, 3).map(r => r[i] || '').filter(v => v)
                const isImage = mapping.targetField === 'image'
                const isMapped = mapping.targetField !== 'skip'

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      isMapped ? 'bg-obsidian-800/50' : 'bg-obsidian-900/30'
                    }`}
                  >
                    {/* Source column name */}
                    <div className="w-48 shrink-0">
                      <span className={`font-mono text-sm ${isMapped ? 'text-obsidian-200' : 'text-obsidian-500'}`}>
                        {mapping.sourceCol}
                      </span>
                      {sampleValues.length > 0 && (
                        <p className="text-xs text-obsidian-600 mt-0.5 truncate max-w-[12rem]" title={sampleValues[0]}>
                          e.g. {sampleValues[0]}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <svg className={`w-5 h-5 shrink-0 ${isMapped ? 'text-dgw-gold' : 'text-obsidian-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>

                    {/* Target field selector */}
                    <select
                      value={mapping.targetField}
                      onChange={e => updateMapping(i, e.target.value)}
                      className={`flex-1 px-3 py-2 bg-obsidian-900 border rounded-lg text-sm focus:outline-none focus:border-dgw-gold ${
                        isMapped ? 'border-dgw-gold/30 text-obsidian-100' : 'border-obsidian-700 text-obsidian-500'
                      }`}
                    >
                      {TARGET_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>

                    {/* Status indicator */}
                    <div className="w-6 shrink-0">
                      {isMapped && (
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Numbering options */}
          <div className="card p-6">
            <h3 className="font-semibold text-obsidian-100 mb-3">Lot Numbering</h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNumber}
                  onChange={e => setAutoNumber(e.target.checked)}
                  className="w-4 h-4 accent-dgw-gold"
                />
                <span className="text-sm text-obsidian-300">Auto-number lots sequentially</span>
              </label>
              {autoNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-obsidian-400">Starting at:</span>
                  <input
                    type="number"
                    value={startNumber}
                    onChange={e => setStartNumber(parseInt(e.target.value) || 1)}
                    min={1}
                    className="w-20 px-3 py-1.5 bg-obsidian-900 border border-obsidian-700 rounded text-obsidian-100 text-sm focus:outline-none focus:border-dgw-gold"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Proceed button */}
          <div className="flex justify-end gap-3">
            <button onClick={() => setStep('upload')} className="btn btn-ghost">Back</button>
            <button
              onClick={proceedToPreview}
              disabled={!hasTitleMapping}
              className="btn btn-primary disabled:opacity-50"
            >
              Preview {rows.length} Lots
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 3: PREVIEW */}
      {/* ================================================================ */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-obsidian-100">Preview Import</h2>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-green-400">{validCount} valid</span>
                  {errorCount > 0 && <span className="text-red-400">{errorCount} errors (will be skipped)</span>}
                  {parsedLots.filter(l => l.images.length > 0).length > 0 && (
                    <span className="text-blue-400">
                      {parsedLots.filter(l => l.images.length > 0).length} with images
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setStep('map')} className="btn btn-ghost text-sm">Back to mapping</button>
            </div>

            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto border border-obsidian-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-obsidian-800 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">#</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Image</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium min-w-[200px]">Title</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Start</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Reserve</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Est</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Cat</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Cond</th>
                    <th className="px-3 py-2 text-left text-xs text-obsidian-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-800/50">
                  {parsedLots.map((lot, i) => (
                    <tr key={i} className={`${lot.error ? 'bg-red-500/5' : 'hover:bg-obsidian-800/30'} transition-colors`}>
                      <td className="px-3 py-2 text-obsidian-300 font-mono text-xs">{lot.lot_number}</td>
                      <td className="px-3 py-2">
                        {lot.images.length > 0 ? (
                          <div className="w-10 h-10 bg-obsidian-800 rounded overflow-hidden">
                            <img
                              src={lot.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
                        ) : (
                          <span className="text-obsidian-700 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-obsidian-200 max-w-xs">
                        <span className="line-clamp-2">{lot.title || <span className="text-red-400 italic">Missing</span>}</span>
                      </td>
                      <td className="px-3 py-2 text-dgw-gold font-mono text-xs">${lot.starting_bid}</td>
                      <td className="px-3 py-2 text-obsidian-400 font-mono text-xs">
                        {lot.reserve_price ? `$${lot.reserve_price.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-obsidian-400 text-xs">
                        {lot.estimate_low || lot.estimate_high
                          ? `$${lot.estimate_low || '?'}-$${lot.estimate_high || '?'}`
                          : '-'}
                      </td>
                      <td className="px-3 py-2 text-obsidian-400 text-xs">{lot.category || '-'}</td>
                      <td className="px-3 py-2 text-obsidian-400 text-xs">{lot.condition || '-'}</td>
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
          </div>

          {/* Import button */}
          <div className="flex items-center justify-between">
            <p className="text-obsidian-500 text-sm">
              {validCount} lot{validCount !== 1 ? 's' : ''} will be imported to{' '}
              <span className="text-obsidian-300">{auctions.find(a => a.id === auctionId)?.title}</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep('map')} className="btn btn-ghost">Back</button>
              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="btn btn-primary disabled:opacity-50"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing {importProgress}%
                  </span>
                ) : (
                  `Import ${validCount} Lots`
                )}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {importing && (
            <div className="h-2 bg-obsidian-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-dgw-gold rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 4: DONE */}
      {/* ================================================================ */}
      {step === 'done' && importResult && (
        <div className="card p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            importResult.failed > 0
              ? 'bg-yellow-500/20 border border-yellow-500/30'
              : 'bg-green-500/20 border border-green-500/30'
          }`}>
            <svg className={`w-10 h-10 ${importResult.failed > 0 ? 'text-yellow-400' : 'text-green-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="heading-display text-2xl mb-3">
            {importResult.failed > 0 ? 'Import Complete (with warnings)' : 'Import Successful!'}
          </h2>

          <p className="text-obsidian-300 text-lg mb-2">
            {importResult.success} lot{importResult.success !== 1 ? 's' : ''} imported
          </p>

          {importResult.failed > 0 && (
            <p className="text-yellow-400 text-sm mb-6">{importResult.failed} skipped due to errors</p>
          )}

          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href={`/admin/lots?auction=${auctionId}`} className="btn btn-primary">
              View Lots
            </Link>
            <button
              onClick={() => {
                setStep('upload')
                setHeaders([])
                setRows([])
                setMappings([])
                setParsedLots([])
                setImportResult(null)
                setFileName('')
              }}
              className="btn btn-ghost"
            >
              Import More
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TEMPLATE DOWNLOAD (visible on upload step) */}
      {/* ================================================================ */}
      {step === 'upload' && (
        <div className="card p-6 mt-6">
          <h3 className="text-sm font-semibold text-obsidian-300 mb-2">Need a template?</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const template = 'lot_number,title,description,starting_bid,reserve_price,estimate_low,estimate_high,category,condition,image_1,image_2\n1,PSA 10 Charizard Base Set,1st Edition Shadowless,1,,5000,10000,pokemon,PSA 10 Gem Mint,https://example.com/img1.jpg,https://example.com/img2.jpg\n2,Rolex Submariner Date,Ref 126610LN 2023 box and papers,100,5000,8000,12000,watches,Excellent,https://example.com/rolex.jpg,'
                const blob = new Blob([template], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'dgw-import-template.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="text-dgw-gold text-sm hover:underline"
            >
              Download CSV template
            </button>
            <span className="text-obsidian-600 text-xs">Includes image URL columns</span>
          </div>
        </div>
      )}
    </div>
  )
}
