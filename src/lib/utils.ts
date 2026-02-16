// Currency formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

// Time formatting
export function formatTimeRemaining(endsAt: string | Date): string {
  const now = new Date();
  const end = new Date(endsAt);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 5) return `${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

// ============================================================================
// BID INCREMENTS (Auction Ninja 14-tier scale)
// ============================================================================
// IMPORTANT: This MUST stay in sync with:
//   1. supabase-schema.sql  (bid_increments table insert data)
//   2. src/app/auctions/[id]/page.tsx  (bidIncrements const)
//   3. src/app/lots/[id]/page.tsx      (bidIncrements const)
// All four locations use the same 14-tier Auction Ninja scale.
// ============================================================================

const BID_INCREMENTS = [
  { min: 0, max: 21, increment: 1 },
  { min: 21, max: 60, increment: 2 },
  { min: 61, max: 200, increment: 5 },
  { min: 201, max: 500, increment: 10 },
  { min: 501, max: 1000, increment: 25 },
  { min: 1001, max: 2500, increment: 50 },
  { min: 2501, max: 5000, increment: 100 },
  { min: 5001, max: 10000, increment: 500 },
  { min: 10001, max: 25000, increment: 1000 },
  { min: 25001, max: 60000, increment: 2500 },
  { min: 60001, max: 120000, increment: 5000 },
  { min: 120001, max: 200000, increment: 7500 },
  { min: 200001, max: 350000, increment: 10000 },
  { min: 350001, max: Infinity, increment: 15000 },
];

export function getBidIncrement(currentBid: number): number {
  const tier = BID_INCREMENTS.find(
    (t) => currentBid >= t.min && (t.max === Infinity || currentBid < t.max)
  );
  return tier?.increment ?? 1;
}

export function getMinimumBid(currentBid: number | null): number {
  if (!currentBid) return 1;
  return currentBid + getBidIncrement(currentBid);
}

export function getQuickBidOptions(currentBid: number | null): number[] {
  const minBid = getMinimumBid(currentBid);
  const increment = getBidIncrement(minBid);
  
  return [
    minBid,
    minBid + increment,
    minBid + increment * 2,
    minBid + increment * 5,
  ];
}

// String utilities
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}

// Validation
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  // US phone format
  return /^\+?1?\d{10,14}$/.test(phone.replace(/[\s\-()]/g, ""));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Class name utility
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Local storage with type safety
export function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Image URL helpers (for Supabase storage)
export function getStorageUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function getOptimizedImageUrl(
  url: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  const { width = 800, quality = 80 } = options;
  return `${url}?width=${width}&quality=${quality}`;
}
