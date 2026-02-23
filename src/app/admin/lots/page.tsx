import { createClient } from '@/lib/supabase/server'
import LotsManager from './LotsManager'

export default async function LotsPage({
  searchParams,
}: {
  searchParams: { auction?: string }
}) {
  const { auction: auctionId } = searchParams
  const supabase = await createClient()

  // Get all lots with bid counts and timing info
  const { data: lots } = await supabase
    .from('lots')
    .select('*, auctions(title, slug, status)')
    .order('lot_number', { ascending: true })
    .limit(1000)

  // Get auction details if filtered
  let auction = null
  if (auctionId) {
    const { data } = await supabase
      .from('auctions')
      .select('id, title, status')
      .eq('id', auctionId)
      .single()
    auction = data
  }

  // Get all auctions for filter dropdown (include status)
  const { data: auctions } = await supabase
    .from('auctions')
    .select('id, title, status')
    .order('created_at', { ascending: false })

  return (
    <LotsManager
      initialLots={lots || []}
      auctions={auctions || []}
      currentAuctionId={auctionId}
      currentAuction={auction}
    />
  )
}
