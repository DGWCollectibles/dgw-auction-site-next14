import type { Metadata, Viewport } from "next";
import "./globals.css";
import StarField from "@/components/StarField";
import LuxuryAmbient from "@/components/LuxuryAmbient";

export const metadata: Metadata = {
  title: {
    default: "DGW Auctions | Premium Collectibles & Luxury Estates",
    template: "%s | DGW Auctions",
  },
  description: "Bid on authenticated Pokemon cards, luxury timepieces, sports memorabilia, and curated estate collections. DGW Collectibles & Estates - Poughkeepsie, NY.",
  keywords: ["auctions", "pokemon cards", "PSA graded cards", "luxury watches", "collectibles", "estate sales", "sports cards", "online auctions", "DGW Collectibles"],
  authors: [{ name: "DGW Collectibles & Estates" }],
  creator: "DGW Collectibles & Estates",
  metadataBase: new URL("https://dgw.auction"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dgw.auction",
    siteName: "DGW Auctions",
    title: "DGW Auctions | Premium Collectibles & Luxury Estates",
    description: "Bid on authenticated Pokemon cards, luxury timepieces, sports memorabilia, and curated estate collections.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DGW Collectibles & Estates - Premium Auctions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DGW Auctions | Premium Collectibles & Luxury Estates",
    description: "Bid on authenticated Pokemon cards, luxury timepieces, and curated estate collections.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://dgw.auction",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AuctionHouse",
              "name": "DGW Collectibles & Estates",
              "alternateName": "DGW Auctions",
              "url": "https://dgw.auction",
              "description": "Premium auction house specializing in authenticated Pokemon cards, luxury timepieces, sports memorabilia, and curated estate collections.",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Poughkeepsie",
                "addressRegion": "NY",
                "postalCode": "12603",
                "addressCountry": "US"
              },
              "sameAs": [],
              "priceRange": "$$",
              "currenciesAccepted": "USD",
              "paymentAccepted": "Credit Card",
              "areaServed": { "@type": "Country", "name": "United States" },
              "brand": {
                "@type": "Brand",
                "name": "DGW Collectibles & Estates"
              }
            }),
          }}
        />
        <LuxuryAmbient />
        <StarField />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
