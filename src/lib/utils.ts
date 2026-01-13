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

// Bid increment calculation (matches database tiers)
const BID_INCREMENTS = [
  { min: 0, max: 49.99, increment: 1 },
  { min: 50, max: 99.99, increment: 5 },
  { min: 100, max: 249.99, increment: 10 },
  { min: 250, max: 499.99, increment: 25 },
  { min: 500, max: 999.99, increment: 50 },
  { min: 1000, max: 2499.99, increment: 100 },
  { min: 2500, max: 4999.99, increment: 250 },
  { min: 5000, max: 9999.99, increment: 500 },
  { min: 10000, max: 24999.99, increment: 1000 },
  { min: 25000, max: 49999.99, increment: 2500 },
  { min: 50000, max: 99999.99, increment: 5000 },
  { min: 100000, max: Infinity, increment: 10000 },
];

export function getBidIncrement(currentBid: number): number {
  const tier = BID_INCREMENTS.find(
    (t) => currentBid >= t.min && currentBid <= t.max
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
  // Add image optimization params if using Supabase image transformation
  // or integrate with a service like Cloudinary
  return `${url}?width=${width}&quality=${quality}`;
}
