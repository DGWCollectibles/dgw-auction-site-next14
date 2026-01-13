// DGW Auctions - Type Definitions

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  
  // Shipping
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  
  // Stripe
  stripe_customer_id: string | null;
  
  // Preferences
  sms_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean;
  created_at: string;
}

export type AuctionStatus = 'draft' | 'preview' | 'live' | 'ended' | 'canceled';

export interface Auction {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  
  preview_starts_at: string | null;
  starts_at: string;
  ends_at: string;
  
  status: AuctionStatus;
  bid_increment_type: 'fixed' | 'tiered' | 'percentage';
  bid_increment_value: number | null;
  auto_extend_minutes: number;
  auto_extend_threshold_minutes: number;
  
  buyers_premium_percent: number;
  
  category: string | null;
  featured: boolean;
  
  created_at: string;
  updated_at: string;
  
  // Computed / joined
  lot_count?: number;
  total_bids?: number;
}

export type LotStatus = 'upcoming' | 'live' | 'sold' | 'unsold' | 'withdrawn';

export interface Lot {
  id: string;
  auction_id: string;
  lot_number: number;
  
  title: string;
  description: string | null;
  category: string | null;
  condition: string | null;
  provenance: string | null;
  
  images: string[];
  
  starting_bid: number;
  reserve_price: number | null;
  estimate_low: number | null;
  estimate_high: number | null;
  
  current_bid: number | null;
  bid_count: number;
  winning_bidder_id: string | null;
  
  ends_at: string | null;
  extended_count: number;
  
  status: LotStatus;
  
  // Flexible metadata for Pokemon cards, luxury items, etc.
  metadata: PokemonCardMetadata | LuxuryItemMetadata | Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
  
  // Joined
  auction?: Auction;
  winning_bidder?: Profile;
}

// Pokemon card specific metadata
export interface PokemonCardMetadata {
  type: 'pokemon_card';
  card_name: string;
  set_name: string;
  set_number: string;
  rarity: string;
  grade?: string;
  grading_company?: 'PSA' | 'BGS' | 'CGC' | 'raw';
  cert_number?: string;
  language?: string;
  edition?: '1st Edition' | 'Unlimited' | 'Shadowless';
}

// Luxury item metadata
export interface LuxuryItemMetadata {
  type: 'luxury';
  brand: string;
  model?: string;
  year?: number;
  serial_number?: string;
  materials?: string[];
  dimensions?: string;
  authentication?: string;
}

export interface Bid {
  id: string;
  lot_id: string;
  user_id: string;
  
  amount: number;
  max_bid: number | null;
  
  is_winning: boolean;
  is_auto_bid: boolean;
  
  created_at: string;
  
  // Joined
  user?: Profile;
  lot?: Lot;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  lot_id: string;
  notify_before_end: boolean;
  notify_on_outbid: boolean;
  created_at: string;
  
  // Joined
  lot?: Lot;
}

export interface AuctionRegistration {
  id: string;
  user_id: string;
  auction_id: string;
  status: 'pending' | 'approved' | 'denied';
  payment_method_id: string | null;
  created_at: string;
}

export type NotificationType = 
  | 'outbid' 
  | 'won' 
  | 'ending_soon' 
  | 'auction_start' 
  | 'payment_due' 
  | 'shipped';

export interface Notification {
  id: string;
  user_id: string;
  
  type: NotificationType;
  title: string;
  body: string | null;
  
  lot_id: string | null;
  auction_id: string | null;
  
  read: boolean;
  sms_sent: boolean;
  email_sent: boolean;
  push_sent: boolean;
  
  created_at: string;
  
  // Joined
  lot?: Lot;
  auction?: Auction;
}

export interface InvoiceLineItem {
  lot_id: string;
  lot_number: number;
  title: string;
  hammer_price: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  auction_id: string;
  
  line_items: InvoiceLineItem[];
  
  subtotal: number;
  buyers_premium: number;
  shipping: number | null;
  tax: number;
  total: number;
  
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  
  shipping_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  tracking_number: string | null;
  shipped_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface BidIncrement {
  id: string;
  min_amount: number;
  max_amount: number | null;
  increment: number;
}

// Real-time event types
export type RealtimeEvent = 
  | { type: 'NEW_BID'; lot_id: string; bid: Bid }
  | { type: 'LOT_EXTENDED'; lot_id: string; new_end_time: string }
  | { type: 'LOT_ENDED'; lot_id: string; status: LotStatus }
  | { type: 'AUCTION_STATUS'; auction_id: string; status: AuctionStatus };
