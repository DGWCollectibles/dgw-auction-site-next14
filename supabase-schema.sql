-- DGW Auctions Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- User profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  phone_verified boolean default false,
  avatar_url text,
  
  -- Shipping address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  country text default 'US',
  
  -- Stripe
  stripe_customer_id text unique,
  
  -- Preferences
  sms_notifications boolean default true,
  email_notifications boolean default true,
  push_notifications boolean default true,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved payment methods (reference only, actual cards in Stripe)
create table public.payment_methods (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  stripe_payment_method_id text unique not null,
  card_brand text,
  card_last4 text,
  card_exp_month int,
  card_exp_year int,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- AUCTIONS & LOTS
-- ============================================

-- Auction events
create table public.auctions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text,
  cover_image text,
  
  -- Timing
  preview_starts_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  
  -- Settings
  status text default 'draft' check (status in ('draft', 'preview', 'live', 'ended', 'canceled')),
  bid_increment_type text default 'tiered' check (bid_increment_type in ('fixed', 'tiered', 'percentage')),
  bid_increment_value numeric, -- used for fixed/percentage
  auto_extend_minutes int default 2,
  auto_extend_threshold_minutes int default 5,
  
  -- Buyer's premium
  buyers_premium_percent numeric default 15,
  
  -- Metadata
  category text,
  featured boolean default false,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual lots within an auction
create table public.lots (
  id uuid default uuid_generate_v4() primary key,
  auction_id uuid references public.auctions on delete cascade not null,
  lot_number int not null,
  
  -- Details
  title text not null,
  description text,
  category text,
  condition text,
  provenance text,
  
  -- Images (array of URLs)
  images text[] default array[]::text[],
  
  -- Pricing
  starting_bid numeric not null default 1,
  reserve_price numeric,
  estimate_low numeric,
  estimate_high numeric,
  
  -- Current state
  current_bid numeric,
  bid_count int default 0,
  winning_bidder_id uuid references public.profiles,
  
  -- Timing (can override auction end time)
  ends_at timestamptz,
  extended_count int default 0,
  
  -- Status
  status text default 'upcoming' check (status in ('upcoming', 'live', 'sold', 'unsold', 'withdrawn')),
  
  -- Metadata for Pokemon cards, luxury items, etc.
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(auction_id, lot_number)
);

-- ============================================
-- BIDDING
-- ============================================

-- All bids
create table public.bids (
  id uuid default uuid_generate_v4() primary key,
  lot_id uuid references public.lots on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  
  amount numeric not null,
  max_bid numeric, -- for proxy/auto bidding
  
  is_winning boolean default false,
  is_auto_bid boolean default false,
  
  created_at timestamptz default now()
);

-- Watchlist / saved lots
create table public.watchlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  lot_id uuid references public.lots on delete cascade not null,
  notify_before_end boolean default true,
  notify_on_outbid boolean default true,
  created_at timestamptz default now(),
  
  unique(user_id, lot_id)
);

-- Auction registrations (required before bidding)
create table public.auction_registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  auction_id uuid references public.auctions on delete cascade not null,
  
  status text default 'approved' check (status in ('pending', 'approved', 'denied')),
  payment_method_id uuid references public.payment_methods,
  
  created_at timestamptz default now(),
  
  unique(user_id, auction_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  
  type text not null check (type in ('outbid', 'won', 'ending_soon', 'auction_start', 'payment_due', 'shipped')),
  title text not null,
  body text,
  
  -- Reference
  lot_id uuid references public.lots,
  auction_id uuid references public.auctions,
  
  -- Delivery status
  read boolean default false,
  sms_sent boolean default false,
  email_sent boolean default false,
  push_sent boolean default false,
  
  created_at timestamptz default now()
);

-- ============================================
-- ORDERS & PAYMENTS (post-auction)
-- ============================================

create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  auction_id uuid references public.auctions not null,
  
  -- Line items stored as JSONB
  line_items jsonb not null default '[]'::jsonb,
  
  subtotal numeric not null,
  buyers_premium numeric not null,
  shipping numeric,
  tax numeric default 0,
  total numeric not null,
  
  -- Payment
  status text default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  paid_at timestamptz,
  
  -- Shipping
  shipping_address jsonb,
  tracking_number text,
  shipped_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_lots_auction on public.lots(auction_id);
create index idx_lots_status on public.lots(status);
create index idx_bids_lot on public.bids(lot_id);
create index idx_bids_user on public.bids(user_id);
create index idx_watchlist_user on public.watchlist(user_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_auctions_status on public.auctions(status);
create index idx_auctions_ends on public.auctions(ends_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.payment_methods enable row level security;
alter table public.bids enable row level security;
alter table public.watchlist enable row level security;
alter table public.auction_registrations enable row level security;
alter table public.notifications enable row level security;
alter table public.invoices enable row level security;

-- Profiles: users can read all, update own
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Payment methods: users can only see/manage their own
create policy "Users can view own payment methods" on public.payment_methods
  for select using (auth.uid() = user_id);
create policy "Users can insert own payment methods" on public.payment_methods
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own payment methods" on public.payment_methods
  for delete using (auth.uid() = user_id);

-- Bids: everyone can see, users can insert own
create policy "Bids are viewable by everyone" on public.bids
  for select using (true);
create policy "Users can place bids" on public.bids
  for insert with check (auth.uid() = user_id);

-- Watchlist: users can only see/manage their own
create policy "Users can view own watchlist" on public.watchlist
  for select using (auth.uid() = user_id);
create policy "Users can manage own watchlist" on public.watchlist
  for all using (auth.uid() = user_id);

-- Auctions & Lots: public read
alter table public.auctions enable row level security;
alter table public.lots enable row level security;
create policy "Auctions are viewable by everyone" on public.auctions
  for select using (true);
create policy "Lots are viewable by everyone" on public.lots
  for select using (true);

-- Notifications: users can only see their own
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

-- Invoices: users can only see their own
create policy "Users can view own invoices" on public.invoices
  for select using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger on_auctions_updated
  before update on public.auctions
  for each row execute function public.handle_updated_at();

create trigger on_lots_updated
  before update on public.lots
  for each row execute function public.handle_updated_at();

create trigger on_invoices_updated
  before update on public.invoices
  for each row execute function public.handle_updated_at();

-- Create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- BID INCREMENT TIERS (standard auction increments)
-- ============================================

create table public.bid_increments (
  id uuid default uuid_generate_v4() primary key,
  min_amount numeric not null,
  max_amount numeric,
  increment numeric not null
);

insert into public.bid_increments (min_amount, max_amount, increment) values
  (0, 49.99, 1),
  (50, 99.99, 5),
  (100, 249.99, 10),
  (250, 499.99, 25),
  (500, 999.99, 50),
  (1000, 2499.99, 100),
  (2500, 4999.99, 250),
  (5000, 9999.99, 500),
  (10000, 24999.99, 1000),
  (25000, 49999.99, 2500),
  (50000, 99999.99, 5000),
  (100000, null, 10000);

-- Function to get next minimum bid
create or replace function public.get_minimum_bid(current_amount numeric)
returns numeric as $$
declare
  increment_value numeric;
begin
  select increment into increment_value
  from public.bid_increments
  where current_amount >= min_amount
    and (max_amount is null or current_amount <= max_amount)
  limit 1;
  
  return coalesce(current_amount, 0) + coalesce(increment_value, 1);
end;
$$ language plpgsql;
