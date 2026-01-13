import type { Metadata, Viewport } from "next";
import "./globals.css";
import StarField from "@/components/StarField";
import LuxuryAmbient from "@/components/LuxuryAmbient";

export const metadata: Metadata = {
  title: "DGW Auctions | Premium Collectibles & Luxury Items",
  description: "Discover rare Pokémon cards, luxury timepieces, and curated collectibles. Bid with confidence on authenticated items from DGW Collectibles.",
  keywords: ["auctions", "pokemon cards", "luxury watches", "collectibles", "PSA graded"],
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
        <LuxuryAmbient />
        <StarField />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
