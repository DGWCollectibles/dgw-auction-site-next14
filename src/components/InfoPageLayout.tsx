import Header from "@/components/Header";
import Link from "next/link";

export default function InfoPageLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-obsidian-950">
      <Header />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-obsidian-500 mb-8">
          <Link href="/" className="hover:text-dgw-gold transition-colors">Home</Link>
          <span>/</span>
          <span className="text-obsidian-300">{title}</span>
        </div>

        {/* Header */}
        <div className="mb-12">
          <p className="text-dgw-gold text-xs tracking-[0.3em] uppercase mb-3">{subtitle || "DGW Collectibles & Estates"}</p>
          <h1 className="heading-display text-3xl md:text-4xl text-obsidian-100 mb-4">{title}</h1>
          {lastUpdated && (
            <p className="text-obsidian-500 text-sm">Last updated: {lastUpdated}</p>
          )}
          <div className="w-16 h-px bg-dgw-gold/30 mt-6" />
        </div>

        {/* Content */}
        <div className="prose-dgw">
          {children}
        </div>
      </div>
    </main>
  );
}
