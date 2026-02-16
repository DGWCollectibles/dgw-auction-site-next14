import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://dgw.auction'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/auctions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/results`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/buyer-terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/auth/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Dynamic auction pages
  const { data: auctions } = await supabase
    .from('auctions')
    .select('slug, updated_at, status')
    .in('status', ['live', 'preview', 'ended'])

  const auctionPages: MetadataRoute.Sitemap = (auctions || []).map((auction) => ({
    url: `${SITE_URL}/auctions/${auction.slug}`,
    lastModified: new Date(auction.updated_at || new Date()),
    changeFrequency: auction.status === 'live' ? 'hourly' as const : 'weekly' as const,
    priority: auction.status === 'live' ? 0.9 : 0.6,
  }))

  // Dynamic lot pages (only from live/ended auctions for SEO value)
  const { data: lots } = await supabase
    .from('lots')
    .select('id, updated_at, status')
    .in('status', ['active', 'sold'])
    .limit(500)

  const lotPages: MetadataRoute.Sitemap = (lots || []).map((lot) => ({
    url: `${SITE_URL}/lots/${lot.id}`,
    lastModified: new Date(lot.updated_at || new Date()),
    changeFrequency: lot.status === 'active' ? 'hourly' as const : 'monthly' as const,
    priority: lot.status === 'active' ? 0.8 : 0.4,
  }))

  return [...staticPages, ...auctionPages, ...lotPages]
}
