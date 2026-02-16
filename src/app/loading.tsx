export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Header skeleton */}
      <div className="h-16 border-b border-[#1a1a1e]">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="w-16 h-6 bg-[#1a1a1e] rounded animate-pulse" />
          <div className="flex gap-6">
            <div className="w-16 h-4 bg-[#1a1a1e] rounded animate-pulse" />
            <div className="w-16 h-4 bg-[#1a1a1e] rounded animate-pulse" />
            <div className="w-16 h-4 bg-[#1a1a1e] rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-6 pt-12">
        {/* Title area */}
        <div className="flex items-center justify-center mb-12">
          <div className="text-center">
            <div className="w-24 h-3 bg-[#1a1a1e] rounded mx-auto mb-4 animate-pulse" />
            <div className="w-48 h-8 bg-[#1a1a1e] rounded mx-auto mb-3 animate-pulse" />
            <div className="w-64 h-4 bg-[#1a1a1e] rounded mx-auto animate-pulse" />
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="border border-[#1a1a1e] bg-[#0d0d0f]"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="aspect-square bg-[#141416] animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="w-3/4 h-4 bg-[#1a1a1e] rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-[#1a1a1e] rounded animate-pulse" />
                <div className="flex justify-between">
                  <div className="w-20 h-5 bg-[#1a1a1e] rounded animate-pulse" />
                  <div className="w-16 h-5 bg-[#1a1a1e] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
