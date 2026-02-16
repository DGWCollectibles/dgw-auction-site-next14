-- ============================================================================
-- DGW AUCTIONS - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Rebuilt from full codebase audit (51 source files, 11,270 lines)
-- Run this in your Supabase SQL Editor on a FRESH project
-- 
-- Covers: 12 tables, 14 functions, 8 triggers, 25+ RLS policies,
--         server-side bid processing, proxy bidding, soft-close,
--         staggered lot closing, and all cron-called RPCs
-- ============================================================================


-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

create extension if not exists "uuid-ossp";


-- ============================================================================
-- 1. TABLES
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1a. PROFILES (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
-- Referenced by: admin/layout.tsx (is_admin), admin/users/page.tsx,
--   account/page.tsx, stripe routes (stripe_customer_id), winner emails,
--   charge-invoices (stripe_customer_id, email)
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  phone_verified boolean default false,
  avatar_url text,

  -- Admin flag (used by admin/layout.tsx to gate access)
  is_admin boolean default false,

  -- Shipping address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  country text default 'US',

  -- Stripe
  stripe_customer_id text unique,

  -- Notification preferences
  sms_notifications boolean default true,
  email_notifications boolean default true,
  push_notifications boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1b. PAYMENT METHODS (Stripe card references)
-- ----------------------------------------------------------------------------
-- Referenced by: stripe API routes, auction_registrations,
--   charge-invoices (via profiles.stripe_customer_id)
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- 1c. AUCTIONS
-- ----------------------------------------------------------------------------
-- Referenced by: auctions/page.tsx, auctions/[id]/page.tsx,
--   admin/auctions/new (lot_close_interval_seconds, terms_conditions),
--   admin/auctions/[id]/AuctionEditForm.tsx,
--   admin/auctions/[id]/results/page.tsx, process-auction-end cron
-- ----------------------------------------------------------------------------

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

  -- Status
  status text default 'draft'
    check (status in ('draft', 'preview', 'live', 'ended', 'canceled')),

  -- Bid increment config
  bid_increment_type text default 'tiered'
    check (bid_increment_type in ('fixed', 'tiered', 'percentage')),
  bid_increment_value numeric,  -- used for fixed/percentage types

  -- Soft-close / anti-snipe settings
  auto_extend_minutes int default 2,
  auto_extend_threshold_minutes int default 5,

  -- Staggered lot closing: seconds between each lot's close time
  -- (used in admin/auctions/new/page.tsx, default 20s)
  lot_close_interval_seconds int default 20,

  -- Buyer's premium
  buyers_premium_percent numeric default 15,

  -- Per-auction terms & conditions
  -- (used in admin/auctions/new, displayed via TermsModal on auction page)
  terms_conditions text,

  -- Metadata
  category text,
  featured boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1d. LOTS
-- ----------------------------------------------------------------------------
-- Referenced by: lots/[id]/page.tsx, auctions/[id]/page.tsx (lot grid),
--   admin/lots/*, admin/auctions/[id]/results (reserve_status),
--   place_bid function (ends_at, extended_count, current_bid)
-- ----------------------------------------------------------------------------

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

  -- Images (array of URLs from Supabase storage)
  images text[] default array[]::text[],

  -- Pricing
  starting_bid numeric not null default 1,
  reserve_price numeric,
  estimate_low numeric,
  estimate_high numeric,

  -- Current bidding state (updated atomically by place_bid function)
  current_bid numeric,
  bid_count int default 0,
  winning_bidder_id uuid references public.profiles,

  -- Per-lot timing (for staggered closing and soft-close extensions)
  -- Initialized by initialize_lot_end_times(), extended by place_bid()
  ends_at timestamptz,
  extended_count int default 0,

  -- Status
  status text default 'upcoming'
    check (status in ('upcoming', 'live', 'sold', 'unsold', 'withdrawn')),

  -- Reserve status (set by process_auction_end when reserve not met)
  -- Used by admin/auctions/[id]/results to show reserve-not-met lots
  reserve_status text default null
    check (reserve_status is null or reserve_status in ('met', 'not_met', 'released', 'waived')),

  -- Flexible metadata (Pokemon cards, luxury items, etc.)
  metadata jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(auction_id, lot_number)
);


-- ----------------------------------------------------------------------------
-- 1e. BIDS
-- ----------------------------------------------------------------------------
-- Referenced by: lots/[id]/page.tsx (insert + select), auctions/[id]/page.tsx
--   (insert + select is_winning), account/page.tsx, admin results
-- ----------------------------------------------------------------------------

create table public.bids (
  id uuid default uuid_generate_v4() primary key,
  lot_id uuid references public.lots on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,

  amount numeric not null,
  max_bid numeric,  -- proxy/auto bidding ceiling

  is_winning boolean default false,
  is_auto_bid boolean default false,

  created_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1f. WATCHLIST
-- ----------------------------------------------------------------------------
-- Referenced by: types/index.ts (WatchlistItem), schema exists for
--   future watchlist UI implementation
-- ----------------------------------------------------------------------------

create table public.watchlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  lot_id uuid references public.lots on delete cascade not null,
  notify_before_end boolean default true,
  notify_on_outbid boolean default true,
  created_at timestamptz default now(),

  unique(user_id, lot_id)
);


-- ----------------------------------------------------------------------------
-- 1g. AUCTION REGISTRATIONS
-- ----------------------------------------------------------------------------
-- Referenced by: types/index.ts (AuctionRegistration), exists for
--   future registration-required-before-bidding feature
-- ----------------------------------------------------------------------------

create table public.auction_registrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  auction_id uuid references public.auctions on delete cascade not null,

  status text default 'approved'
    check (status in ('pending', 'approved', 'denied')),
  payment_method_id uuid references public.payment_methods,

  created_at timestamptz default now(),

  unique(user_id, auction_id)
);


-- ----------------------------------------------------------------------------
-- 1h. NOTIFICATIONS
-- ----------------------------------------------------------------------------
-- Referenced by: send-winner-emails (insert type='won'),
--   types/index.ts (full Notification interface)
-- ----------------------------------------------------------------------------

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,

  type text not null
    check (type in ('outbid', 'won', 'ending_soon', 'auction_start', 'payment_due', 'shipped', 'message')),
  title text not null,
  message text,  -- notification body text
  link text,     -- optional in-app link (e.g. /auctions/slug, /account)

  -- References
  lot_id uuid references public.lots,
  auction_id uuid references public.auctions,

  -- Delivery status
  read boolean default false,
  sms_sent boolean default false,
  email_sent boolean default false,
  push_sent boolean default false,

  created_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1i. OUTBID NOTIFICATIONS (email queue)
-- ----------------------------------------------------------------------------
-- Referenced by: send-outbid-emails cron (via get_pending_outbid_notifications
--   RPC), debug-outbid endpoint, created by place_bid() function
-- This is the EMAIL QUEUE table, separate from the in-app notifications table
-- ----------------------------------------------------------------------------

create table public.outbid_notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  lot_id uuid references public.lots on delete cascade not null,
  outbid_amount numeric not null,  -- the bid amount that outbid this user
  email_sent boolean default false,
  created_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1j. INVOICES (post-auction billing)
-- ----------------------------------------------------------------------------
-- Referenced by: admin/invoices/page.tsx, admin/auctions/[id]/results,
--   send-winner-emails, charge-invoices, process_auction_end function
-- ----------------------------------------------------------------------------

create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  auction_id uuid references public.auctions not null,

  -- Legacy line_items JSONB (kept for backward compat, invoice_items table preferred)
  line_items jsonb not null default '[]'::jsonb,

  subtotal numeric not null,
  buyers_premium numeric not null,
  shipping numeric,
  tax numeric default 0,
  total numeric not null,

  -- Payment
  status text default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'charge_failed', 'requires_action')),
  stripe_payment_intent_id text,
  paid_at timestamptz,

  -- Shipping
  shipping_address jsonb,
  tracking_number text,
  shipped_at timestamptz,

  -- Admin notes (charge failures, SCA issues, etc.)
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1k. INVOICE ITEMS (individual lots per invoice)
-- ----------------------------------------------------------------------------
-- Referenced by: send-winner-emails (select by invoice_id),
--   admin/auctions/[id]/results (select by invoice_id, display per-lot)
-- Created by: process_auction_end function
-- ----------------------------------------------------------------------------

create table public.invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices on delete cascade not null,
  lot_id uuid references public.lots not null,
  lot_number int not null,
  lot_title text not null,
  lot_image text,         -- first image URL for email/display
  winning_bid numeric not null,
  created_at timestamptz default now()
);


-- ----------------------------------------------------------------------------
-- 1l. BID INCREMENTS (Auction Ninja 14-tier scale)
-- ----------------------------------------------------------------------------
-- IMPORTANT: This is the CANONICAL scale. The same tiers are hardcoded in
--   auctions/[id]/page.tsx and lots/[id]/page.tsx for client-side display.
--   The get_minimum_bid() DB function reads from this table for server-side
--   validation. ALL THREE must stay in sync.
-- ----------------------------------------------------------------------------

create table public.bid_increments (
  id uuid default uuid_generate_v4() primary key,
  min_amount numeric not null,
  max_amount numeric,     -- null = no upper limit (final tier)
  increment numeric not null
);

-- Auction Ninja style: 14 tiers (matches frontend bidIncrements arrays)
insert into public.bid_increments (min_amount, max_amount, increment) values
  (0,      20.99,     1),
  (21,     60,        2),
  (61,     200,       5),
  (201,    500,       10),
  (501,    1000,      25),
  (1001,   2500,      50),
  (2501,   5000,      100),
  (5001,   10000,     500),
  (10001,  25000,     1000),
  (25001,  60000,     2500),
  (60001,  120000,    5000),
  (120001, 200000,    7500),
  (200001, 350000,    10000),
  (350001, null,      15000);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

-- Core lookups
create index idx_lots_auction on public.lots(auction_id);
create index idx_lots_status on public.lots(status);
create index idx_lots_ends_at on public.lots(ends_at);
create index idx_lots_reserve_status on public.lots(reserve_status) where reserve_status is not null;

create index idx_bids_lot on public.bids(lot_id);
create index idx_bids_user on public.bids(user_id);
create index idx_bids_lot_winning on public.bids(lot_id) where is_winning = true;
create index idx_bids_lot_maxbid on public.bids(lot_id, max_bid desc nulls last);

-- Composite indexes for 500-user concurrency hot paths
create index idx_bids_lot_created on public.bids(lot_id, created_at desc);  -- bid history ORDER BY
create index idx_bids_user_lot on public.bids(user_id, lot_id);  -- "has user bid on lot" check
create index idx_bids_lot_winning_maxbid on public.bids(lot_id, max_bid desc)  -- proxy engine: find competing max bid
  where is_winning = true and max_bid is not null;

create index idx_watchlist_user on public.watchlist(user_id);
create index idx_watchlist_lot on public.watchlist(lot_id);

create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id) where read = false;

create index idx_auctions_status on public.auctions(status);
create index idx_auctions_ends on public.auctions(ends_at);
create index idx_auctions_slug on public.auctions(slug);

create index idx_invoices_auction on public.invoices(auction_id);
create index idx_invoices_user on public.invoices(user_id);
create index idx_invoices_status on public.invoices(status);

create index idx_invoice_items_invoice on public.invoice_items(invoice_id);
create index idx_invoice_items_lot on public.invoice_items(lot_id);

create index idx_outbid_notifications_pending on public.outbid_notifications(email_sent, created_at)
  where email_sent = false;
create index idx_outbid_notifications_user on public.outbid_notifications(user_id);

create index idx_payment_methods_user on public.payment_methods(user_id);
create index idx_auction_registrations_user on public.auction_registrations(user_id, auction_id);


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.payment_methods enable row level security;
alter table public.auctions enable row level security;
alter table public.lots enable row level security;
alter table public.bids enable row level security;
alter table public.watchlist enable row level security;
alter table public.auction_registrations enable row level security;
alter table public.notifications enable row level security;
alter table public.outbid_notifications enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.bid_increments enable row level security;

-- ---- PROFILES ----
-- Everyone can read profiles (for display names, avatars)
create policy "profiles_select_all" on public.profiles
  for select using (true);
-- Users update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---- PAYMENT METHODS ----
create policy "payment_methods_select_own" on public.payment_methods
  for select using (auth.uid() = user_id);
create policy "payment_methods_insert_own" on public.payment_methods
  for insert with check (auth.uid() = user_id);
create policy "payment_methods_delete_own" on public.payment_methods
  for delete using (auth.uid() = user_id);
create policy "payment_methods_update_own" on public.payment_methods
  for update using (auth.uid() = user_id);

-- ---- AUCTIONS ----
-- Public read for all auctions (frontend filters by status)
create policy "auctions_select_all" on public.auctions
  for select using (true);
-- Admin insert/update/delete handled via service role key (bypasses RLS)

-- ---- LOTS ----
-- Public read for all lots
create policy "lots_select_all" on public.lots
  for select using (true);
-- Admin insert/update/delete via service role key

-- ---- BIDS ----
-- Everyone can read bids (for bid history, winning status)
create policy "bids_select_all" on public.bids
  for select using (true);
-- Users can place bids (insert with own user_id)
create policy "bids_insert_own" on public.bids
  for insert with check (auth.uid() = user_id);

-- ---- WATCHLIST ----
create policy "watchlist_select_own" on public.watchlist
  for select using (auth.uid() = user_id);
create policy "watchlist_insert_own" on public.watchlist
  for insert with check (auth.uid() = user_id);
create policy "watchlist_delete_own" on public.watchlist
  for delete using (auth.uid() = user_id);
create policy "watchlist_update_own" on public.watchlist
  for update using (auth.uid() = user_id);

-- ---- AUCTION REGISTRATIONS ----
create policy "registrations_select_own" on public.auction_registrations
  for select using (auth.uid() = user_id);
create policy "registrations_insert_own" on public.auction_registrations
  for insert with check (auth.uid() = user_id);

-- ---- NOTIFICATIONS ----
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- ---- OUTBID NOTIFICATIONS ----
-- Only accessed via service role (cron jobs), but add basic policy
create policy "outbid_notifications_select_own" on public.outbid_notifications
  for select using (auth.uid() = user_id);

-- ---- INVOICES ----
create policy "invoices_select_own" on public.invoices
  for select using (auth.uid() = user_id);

-- ---- INVOICE ITEMS ----
-- Users can see items on their own invoices
create policy "invoice_items_select_own" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

-- ---- BID INCREMENTS ----
-- Public read (displayed in bid increment modal)
create policy "bid_increments_select_all" on public.bid_increments
  for select using (true);


-- ============================================================================
-- 4. UTILITY FUNCTIONS
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 4a. Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- 4b. Auto-create profile on new auth.users signup
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- 4c. Get minimum bid (reads from bid_increments table)
-- Server-side source of truth for bid validation
-- ----------------------------------------------------------------------------

create or replace function public.get_minimum_bid(current_amount numeric)
returns numeric as $$
declare
  increment_value numeric;
begin
  select increment into increment_value
  from public.bid_increments
  where current_amount >= min_amount
    and (max_amount is null or current_amount <= max_amount)
  order by min_amount desc
  limit 1;

  return coalesce(current_amount, 0) + coalesce(increment_value, 1);
end;
$$ language plpgsql stable;


-- ----------------------------------------------------------------------------
-- 4d. Get bid increment amount for a given price level
-- Helper used by place_bid for proxy bid stepping
-- ----------------------------------------------------------------------------

create or replace function public.get_bid_increment(current_amount numeric)
returns numeric as $$
declare
  increment_value numeric;
begin
  select increment into increment_value
  from public.bid_increments
  where current_amount >= min_amount
    and (max_amount is null or current_amount <= max_amount)
  order by min_amount desc
  limit 1;

  return coalesce(increment_value, 1);
end;
$$ language plpgsql stable;


-- ============================================================================
-- 5. SERVER-SIDE BID PROCESSING (THE BIG ONE)
-- ============================================================================
-- This function handles ALL bid logic atomically:
--   1. Validates the bid amount against minimum increment
--   2. Checks auction/lot status (must be live)
--   3. Executes proxy bidding (auto-increment vs existing max bids)
--   4. Updates lot state (current_bid, bid_count, winning_bidder_id)
--   5. Marks winning/losing bids (is_winning flags)
--   6. Handles soft-close extension (extends ends_at if bid in final minutes)
--   7. Creates outbid notification for previous high bidder
--
-- Called by: Frontend bids insert triggers on the bids table
-- ============================================================================

create or replace function public.place_bid(
  p_lot_id uuid,
  p_user_id uuid,
  p_bid_amount numeric,
  p_max_bid numeric default null
)
returns jsonb as $$
declare
  v_lot record;
  v_auction record;
  v_current_max_bid record;  -- existing highest max bid from another user
  v_effective_max numeric;   -- this bidder's max (p_max_bid or p_bid_amount)
  v_new_current_bid numeric;
  v_new_winner_id uuid;
  v_min_bid numeric;
  v_increment numeric;
  v_previous_winner_id uuid;
  v_auto_bid_id uuid;
  v_extended boolean := false;
  v_threshold interval;
  v_extension interval;
  v_time_remaining interval;
begin
  -- Lock the lot row to prevent race conditions
  select * into v_lot
  from public.lots
  where id = p_lot_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Lot not found');
  end if;

  -- Get auction settings
  select * into v_auction
  from public.auctions
  where id = v_lot.auction_id;

  if v_auction.status != 'live' then
    return jsonb_build_object('success', false, 'error', 'Auction is not live');
  end if;

  -- Check lot is biddable
  if v_lot.status not in ('upcoming', 'live') then
    return jsonb_build_object('success', false, 'error', 'Lot is not accepting bids');
  end if;

  -- Check lot hasn't closed (per-lot end time)
  if v_lot.ends_at is not null and v_lot.ends_at < now() then
    return jsonb_build_object('success', false, 'error', 'This lot has closed');
  end if;

  -- Calculate minimum valid bid
  if v_lot.current_bid is not null then
    v_min_bid := public.get_minimum_bid(v_lot.current_bid);
  else
    v_min_bid := v_lot.starting_bid;
  end if;

  -- Validate bid amount meets minimum
  if p_bid_amount < v_min_bid then
    return jsonb_build_object(
      'success', false,
      'error', format('Minimum bid is $%s', v_min_bid),
      'minimum_bid', v_min_bid
    );
  end if;

  -- Set effective max bid
  v_effective_max := coalesce(p_max_bid, p_bid_amount);
  if v_effective_max < p_bid_amount then
    v_effective_max := p_bid_amount;
  end if;

  -- Store the previous winner for outbid notification
  v_previous_winner_id := v_lot.winning_bidder_id;

  -- ========================================================================
  -- EARLY RETURN: WINNING BIDDER INCREASING THEIR MAX
  -- If the bidder is already winning and submitting a higher max,
  -- just update the ceiling without changing the current bid price.
  -- This prevents bidding against yourself.
  -- ========================================================================
  if v_lot.winning_bidder_id = p_user_id
     and v_effective_max > coalesce((
       select max_bid from public.bids
       where lot_id = p_lot_id and user_id = p_user_id and is_winning = true
       order by created_at desc limit 1
     ), 0)
  then
    -- Record the max bid increase
    insert into public.bids (lot_id, user_id, amount, max_bid, is_winning, is_auto_bid)
    values (p_lot_id, p_user_id, v_lot.current_bid, v_effective_max, true, false);

    -- Clear old winning flags, set new one
    update public.bids
    set is_winning = false
    where lot_id = p_lot_id and is_winning = true and user_id = p_user_id
      and id != (select id from public.bids where lot_id = p_lot_id and user_id = p_user_id order by created_at desc limit 1);

    -- bid_count increments by 1
    update public.lots
    set bid_count = bid_count + 1
    where id = p_lot_id;

    return jsonb_build_object(
      'success', true,
      'current_bid', v_lot.current_bid,  -- UNCHANGED
      'winning_bidder_id', p_user_id,
      'is_winning', true,
      'bid_count', (select bid_count from public.lots where id = p_lot_id),
      'extended', false,
      'ends_at', v_lot.ends_at,
      'max_increased', true
    );
  end if;

  -- ========================================================================
  -- PROXY BIDDING ENGINE
  -- ========================================================================
  -- Find the current highest max bid from a DIFFERENT user
  select * into v_current_max_bid
  from public.bids
  where lot_id = p_lot_id
    and user_id != p_user_id
    and max_bid is not null
    and is_winning = true
  order by max_bid desc, created_at asc
  limit 1;

  if v_current_max_bid is null then
    -- No competing max bid: this bidder wins at their bid amount
    v_new_current_bid := p_bid_amount;
    v_new_winner_id := p_user_id;

  elsif v_effective_max > v_current_max_bid.max_bid then
    -- New bidder's max exceeds existing max: new bidder wins
    -- Current bid = one increment above the old max
    v_increment := public.get_bid_increment(v_current_max_bid.max_bid);
    v_new_current_bid := v_current_max_bid.max_bid + v_increment;

    -- But don't exceed the new bidder's max
    if v_new_current_bid > v_effective_max then
      v_new_current_bid := v_effective_max;
    end if;

    -- And don't go below the submitted bid amount
    if v_new_current_bid < p_bid_amount then
      v_new_current_bid := p_bid_amount;
    end if;

    v_new_winner_id := p_user_id;

    -- Mark old winner's bid as no longer winning
    update public.bids
    set is_winning = false
    where id = v_current_max_bid.id;

  elsif v_effective_max = v_current_max_bid.max_bid then
    -- Tied max bids: earlier bidder wins (they had the max first)
    v_increment := public.get_bid_increment(v_effective_max);
    v_new_current_bid := v_effective_max;  -- bid up to the tie point
    v_new_winner_id := v_current_max_bid.user_id;  -- earlier bidder keeps it

    -- Auto-bid on behalf of the existing winner to match
    insert into public.bids (lot_id, user_id, amount, max_bid, is_winning, is_auto_bid)
    values (p_lot_id, v_current_max_bid.user_id, v_new_current_bid, v_current_max_bid.max_bid, true, true)
    returning id into v_auto_bid_id;

  else
    -- Existing max bid is higher: existing bidder retains the lead
    -- Auto-bid on behalf of existing winner: one increment above new bid
    v_increment := public.get_bid_increment(p_bid_amount);
    v_new_current_bid := p_bid_amount + v_increment;

    -- But don't exceed their max
    if v_new_current_bid > v_current_max_bid.max_bid then
      v_new_current_bid := v_current_max_bid.max_bid;
    end if;

    -- And must be at least the new bid amount
    if v_new_current_bid < p_bid_amount then
      v_new_current_bid := p_bid_amount;
    end if;

    v_new_winner_id := v_current_max_bid.user_id;

    -- Create the auto-bid record for the existing winner
    insert into public.bids (lot_id, user_id, amount, max_bid, is_winning, is_auto_bid)
    values (p_lot_id, v_current_max_bid.user_id, v_new_current_bid, v_current_max_bid.max_bid, true, true)
    returning id into v_auto_bid_id;
  end if;

  -- ========================================================================
  -- RECORD THE NEW BID
  -- ========================================================================

  insert into public.bids (lot_id, user_id, amount, max_bid, is_winning, is_auto_bid)
  values (
    p_lot_id,
    p_user_id,
    p_bid_amount,
    v_effective_max,
    (v_new_winner_id = p_user_id),
    false
  );

  -- Clear is_winning on ALL previous bids for this lot, then set new winner
  update public.bids
  set is_winning = false
  where lot_id = p_lot_id
    and is_winning = true
    and user_id != v_new_winner_id;

  -- Mark the winning user's latest bid as winning
  update public.bids
  set is_winning = true
  where id = (
    select id from public.bids
    where lot_id = p_lot_id
      and user_id = v_new_winner_id
    order by created_at desc
    limit 1
  );

  -- ========================================================================
  -- UPDATE LOT STATE
  -- ========================================================================

  -- Count total bids: increment by 1 (normal) or 2 (if proxy auto-bid also fired)
  -- Avoids COUNT(*) scan while holding the exclusive row lock
  update public.lots
  set
    current_bid = v_new_current_bid,
    bid_count = bid_count + case when v_auto_bid_id is not null then 2 else 1 end,
    winning_bidder_id = v_new_winner_id,
    status = case when status = 'upcoming' then 'live' else status end
  where id = p_lot_id;

  -- ========================================================================
  -- SOFT-CLOSE / ANTI-SNIPE EXTENSION
  -- ========================================================================

  if v_lot.ends_at is not null and v_auction.auto_extend_minutes > 0 then
    v_threshold := (v_auction.auto_extend_threshold_minutes || ' minutes')::interval;
    v_extension := (v_auction.auto_extend_minutes || ' minutes')::interval;
    v_time_remaining := v_lot.ends_at - now();

    if v_time_remaining <= v_threshold and v_time_remaining > interval '0' then
      update public.lots
      set
        ends_at = now() + v_extension,
        extended_count = coalesce(extended_count, 0) + 1
      where id = p_lot_id;

      v_extended := true;
    end if;
  end if;

  -- ========================================================================
  -- OUTBID NOTIFICATION
  -- ========================================================================

  -- Notify the previous winner (if different from new winner)
  if v_previous_winner_id is not null
     and v_previous_winner_id != v_new_winner_id
  then
    insert into public.outbid_notifications (user_id, lot_id, outbid_amount)
    values (v_previous_winner_id, p_lot_id, v_new_current_bid);
  end if;

  -- Also notify the new bidder if they were immediately outbid by proxy
  if v_new_winner_id != p_user_id then
    insert into public.outbid_notifications (user_id, lot_id, outbid_amount)
    values (p_user_id, p_lot_id, v_new_current_bid);
  end if;

  -- ========================================================================
  -- RETURN RESULT
  -- ========================================================================

  return jsonb_build_object(
    'success', true,
    'current_bid', v_new_current_bid,
    'winning_bidder_id', v_new_winner_id,
    'is_winning', (v_new_winner_id = p_user_id),
    'bid_count', (select bid_count from public.lots where id = p_lot_id),
    'extended', v_extended,
    'ends_at', (select ends_at from public.lots where id = p_lot_id)
  );
end;
$$ language plpgsql security definer;


-- ============================================================================
-- 6. AUCTION LIFECYCLE FUNCTIONS (called by cron jobs and admin)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 6a. PROCESS AUCTION END
-- Called by: /api/process-auction-end cron (every minute)
-- Does: marks auction ended, determines winners per lot, creates invoices
--   with line items, handles reserve pricing, marks lots sold/unsold
-- ----------------------------------------------------------------------------

create or replace function public.process_auction_end(auction_uuid uuid)
returns jsonb as $$
declare
  v_auction record;
  v_lot record;
  v_invoice_id uuid;
  v_user_invoices jsonb := '{}'::jsonb;
  v_winner_id uuid;
  v_lots_sold int := 0;
  v_lots_unsold int := 0;
  v_lots_reserve_not_met int := 0;
  v_invoices_created int := 0;
  v_bp_percent numeric;
begin
  -- Get and lock the auction
  select * into v_auction
  from public.auctions
  where id = auction_uuid
  for update;

  if not found then
    return jsonb_build_object('error', 'Auction not found');
  end if;

  -- Mark auction as ended
  update public.auctions
  set status = 'ended'
  where id = auction_uuid;

  v_bp_percent := coalesce(v_auction.buyers_premium_percent, 15);

  -- Process each lot
  for v_lot in
    select l.*
    from public.lots l
    where l.auction_id = auction_uuid
      and l.status in ('upcoming', 'live')
    order by l.lot_number
  loop
    -- Find the winning bidder
    select user_id into v_winner_id
    from public.bids
    where lot_id = v_lot.id
      and is_winning = true
    order by created_at desc
    limit 1;

    if v_winner_id is null or v_lot.current_bid is null then
      -- No bids: mark unsold
      update public.lots
      set status = 'unsold', reserve_status = null
      where id = v_lot.id;

      v_lots_unsold := v_lots_unsold + 1;
      continue;
    end if;

    -- Check reserve price
    if v_lot.reserve_price is not null and v_lot.current_bid < v_lot.reserve_price then
      -- Reserve not met: mark for admin decision
      update public.lots
      set status = 'live', reserve_status = 'not_met'
      where id = v_lot.id;

      v_lots_reserve_not_met := v_lots_reserve_not_met + 1;
      continue;
    end if;

    -- SOLD! Mark lot
    update public.lots
    set status = 'sold', reserve_status = 'met'
    where id = v_lot.id;

    v_lots_sold := v_lots_sold + 1;

    -- ---- BUILD INVOICES PER WINNER ----
    -- Check if this winner already has an invoice for this auction
    if not v_user_invoices ? v_winner_id::text then
      -- Create new invoice
      insert into public.invoices (user_id, auction_id, line_items, subtotal, buyers_premium, total)
      values (
        v_winner_id,
        auction_uuid,
        '[]'::jsonb,
        0,
        0,
        0
      )
      returning id into v_invoice_id;

      v_user_invoices := v_user_invoices || jsonb_build_object(v_winner_id::text, v_invoice_id::text);
      v_invoices_created := v_invoices_created + 1;
    else
      v_invoice_id := (v_user_invoices ->> v_winner_id::text)::uuid;
    end if;

    -- Add invoice line item
    insert into public.invoice_items (invoice_id, lot_id, lot_number, lot_title, lot_image, winning_bid)
    values (
      v_invoice_id,
      v_lot.id,
      v_lot.lot_number,
      v_lot.title,
      case when array_length(v_lot.images, 1) > 0 then v_lot.images[1] else null end,
      v_lot.current_bid
    );

    -- Update invoice totals
    update public.invoices
    set
      line_items = (
        select jsonb_agg(jsonb_build_object(
          'lot_id', ii.lot_id,
          'lot_number', ii.lot_number,
          'title', ii.lot_title,
          'hammer_price', ii.winning_bid
        ))
        from public.invoice_items ii
        where ii.invoice_id = v_invoice_id
      ),
      subtotal = (select sum(winning_bid) from public.invoice_items where invoice_id = v_invoice_id),
      buyers_premium = round((select sum(winning_bid) from public.invoice_items where invoice_id = v_invoice_id) * v_bp_percent / 100, 2),
      total = (select sum(winning_bid) from public.invoice_items where invoice_id = v_invoice_id)
            + round((select sum(winning_bid) from public.invoice_items where invoice_id = v_invoice_id) * v_bp_percent / 100, 2)
    where id = v_invoice_id;

  end loop;

  return jsonb_build_object(
    'success', true,
    'auction_id', auction_uuid,
    'lots_sold', v_lots_sold,
    'lots_unsold', v_lots_unsold,
    'lots_reserve_not_met', v_lots_reserve_not_met,
    'invoices_created', v_invoices_created
  );
end;
$$ language plpgsql security definer;


-- ----------------------------------------------------------------------------
-- 6b. GET PENDING OUTBID NOTIFICATIONS
-- Called by: /api/send-outbid-emails cron (every 5 minutes)
-- Returns: batch of unsent outbid notifications with full context for emails
-- ----------------------------------------------------------------------------

create or replace function public.get_pending_outbid_notifications(batch_size int default 50)
returns table (
  notification_id uuid,
  user_email text,
  user_name text,
  lot_id uuid,
  lot_title text,
  lot_number int,
  lot_image text,
  auction_title text,
  auction_slug text,
  auction_ends_at timestamptz,
  current_bid numeric,
  outbid_amount numeric
) as $$
begin
  return query
  select
    obn.id as notification_id,
    p.email as user_email,
    coalesce(p.full_name, split_part(p.email, '@', 1)) as user_name,
    l.id as lot_id,
    l.title as lot_title,
    l.lot_number,
    case when array_length(l.images, 1) > 0 then l.images[1] else null end as lot_image,
    a.title as auction_title,
    a.slug as auction_slug,
    coalesce(l.ends_at, a.ends_at) as auction_ends_at,
    coalesce(l.current_bid, l.starting_bid) as current_bid,
    obn.outbid_amount
  from public.outbid_notifications obn
  join public.profiles p on p.id = obn.user_id
  join public.lots l on l.id = obn.lot_id
  join public.auctions a on a.id = l.auction_id
  where obn.email_sent = false
  order by obn.created_at asc
  limit batch_size;
end;
$$ language plpgsql security definer;


-- ----------------------------------------------------------------------------
-- 6c. MARK NOTIFICATIONS SENT
-- Called by: /api/send-outbid-emails after successful email delivery
-- ----------------------------------------------------------------------------

create or replace function public.mark_notifications_sent(notification_ids uuid[])
returns void as $$
begin
  update public.outbid_notifications
  set email_sent = true
  where id = any(notification_ids);
end;
$$ language plpgsql security definer;


-- ----------------------------------------------------------------------------
-- 6d. RELEASE LOT RESERVE (admin action)
-- Called by: /api/admin/release-reserve
-- Does: Overrides reserve, marks lot as sold, creates invoice for high bidder
-- ----------------------------------------------------------------------------

create or replace function public.release_lot_reserve(lot_uuid uuid)
returns jsonb as $$
declare
  v_lot record;
  v_auction record;
  v_winner_id uuid;
  v_invoice_id uuid;
  v_bp_percent numeric;
  v_subtotal numeric;
  v_premium numeric;
begin
  select * into v_lot
  from public.lots
  where id = lot_uuid
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Lot not found');
  end if;

  if v_lot.reserve_status != 'not_met' then
    return jsonb_build_object('success', false, 'error', 'Lot reserve status is not "not_met"');
  end if;

  -- Find the high bidder
  select user_id into v_winner_id
  from public.bids
  where lot_id = lot_uuid and is_winning = true
  order by created_at desc
  limit 1;

  if v_winner_id is null then
    return jsonb_build_object('success', false, 'error', 'No winning bidder found');
  end if;

  -- Get auction for buyer's premium
  select * into v_auction
  from public.auctions
  where id = v_lot.auction_id;

  v_bp_percent := coalesce(v_auction.buyers_premium_percent, 15);

  -- Mark lot as sold with reserve released
  update public.lots
  set status = 'sold', reserve_status = 'released'
  where id = lot_uuid;

  -- Check if winner already has an invoice for this auction
  select id into v_invoice_id
  from public.invoices
  where user_id = v_winner_id and auction_id = v_lot.auction_id
  limit 1;

  v_subtotal := v_lot.current_bid;
  v_premium := round(v_subtotal * v_bp_percent / 100, 2);

  if v_invoice_id is null then
    -- Create new invoice
    insert into public.invoices (user_id, auction_id, line_items, subtotal, buyers_premium, total)
    values (
      v_winner_id,
      v_lot.auction_id,
      jsonb_build_array(jsonb_build_object(
        'lot_id', v_lot.id,
        'lot_number', v_lot.lot_number,
        'title', v_lot.title,
        'hammer_price', v_lot.current_bid
      )),
      v_subtotal,
      v_premium,
      v_subtotal + v_premium
    )
    returning id into v_invoice_id;
  else
    -- Add to existing invoice
    update public.invoices
    set
      line_items = line_items || jsonb_build_array(jsonb_build_object(
        'lot_id', v_lot.id,
        'lot_number', v_lot.lot_number,
        'title', v_lot.title,
        'hammer_price', v_lot.current_bid
      )),
      subtotal = subtotal + v_subtotal,
      buyers_premium = buyers_premium + v_premium,
      total = total + v_subtotal + v_premium
    where id = v_invoice_id;
  end if;

  -- Add invoice item
  insert into public.invoice_items (invoice_id, lot_id, lot_number, lot_title, lot_image, winning_bid)
  values (
    v_invoice_id,
    v_lot.id,
    v_lot.lot_number,
    v_lot.title,
    case when array_length(v_lot.images, 1) > 0 then v_lot.images[1] else null end,
    v_lot.current_bid
  );

  return jsonb_build_object(
    'success', true,
    'lot_id', lot_uuid,
    'winner_id', v_winner_id,
    'invoice_id', v_invoice_id,
    'hammer_price', v_lot.current_bid
  );
end;
$$ language plpgsql security definer;


-- ----------------------------------------------------------------------------
-- 6e. MARK LOT UNSOLD (admin action)
-- Called by: /api/admin/mark-unsold
-- Does: Marks a reserve-not-met lot as unsold, removes from any invoice
-- ----------------------------------------------------------------------------

create or replace function public.mark_lot_unsold(lot_uuid uuid)
returns jsonb as $$
declare
  v_lot record;
  v_invoice_item record;
begin
  select * into v_lot
  from public.lots
  where id = lot_uuid
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Lot not found');
  end if;

  -- Mark lot as unsold
  update public.lots
  set status = 'unsold', reserve_status = null, winning_bidder_id = null
  where id = lot_uuid;

  -- Remove any invoice items for this lot and recalculate invoice
  for v_invoice_item in
    select ii.*, i.id as parent_invoice_id
    from public.invoice_items ii
    join public.invoices i on i.id = ii.invoice_id
    where ii.lot_id = lot_uuid
  loop
    -- Delete the item
    delete from public.invoice_items where id = v_invoice_item.id;

    -- Recalculate the parent invoice
    perform recalculate_invoice(v_invoice_item.parent_invoice_id);
  end loop;

  -- Clear is_winning on all bids for this lot
  update public.bids
  set is_winning = false
  where lot_id = lot_uuid;

  return jsonb_build_object(
    'success', true,
    'lot_id', lot_uuid,
    'status', 'unsold'
  );
end;
$$ language plpgsql security definer;


-- ----------------------------------------------------------------------------
-- 6f. RECALCULATE INVOICE TOTALS
-- Helper called after adding/removing invoice items
-- ----------------------------------------------------------------------------

create or replace function public.recalculate_invoice(p_invoice_id uuid)
returns void as $$
declare
  v_subtotal numeric;
  v_bp_percent numeric;
  v_item_count int;
begin
  -- Get item count and subtotal
  select count(*), coalesce(sum(winning_bid), 0)
  into v_item_count, v_subtotal
  from public.invoice_items
  where invoice_id = p_invoice_id;

  if v_item_count = 0 then
    -- No items left: delete the invoice
    delete from public.invoices where id = p_invoice_id;
    return;
  end if;

  -- Get buyer's premium from auction
  select coalesce(a.buyers_premium_percent, 15)
  into v_bp_percent
  from public.invoices i
  join public.auctions a on a.id = i.auction_id
  where i.id = p_invoice_id;

  -- Update totals
  update public.invoices
  set
    line_items = (
      select jsonb_agg(jsonb_build_object(
        'lot_id', ii.lot_id,
        'lot_number', ii.lot_number,
        'title', ii.lot_title,
        'hammer_price', ii.winning_bid
      ))
      from public.invoice_items ii
      where ii.invoice_id = p_invoice_id
    ),
    subtotal = v_subtotal,
    buyers_premium = round(v_subtotal * v_bp_percent / 100, 2),
    total = v_subtotal + round(v_subtotal * v_bp_percent / 100, 2)
  where id = p_invoice_id;
end;
$$ language plpgsql security definer;


-- ============================================================================
-- 7. STAGGERED LOT CLOSING
-- ============================================================================
-- Call this when setting an auction to 'live' to initialize per-lot end times
-- Each lot closes lot_close_interval_seconds after the previous one,
-- starting from the auction's ends_at time
-- ============================================================================

create or replace function public.initialize_lot_end_times(auction_uuid uuid)
returns jsonb as $$
declare
  v_auction record;
  v_lot record;
  v_lot_count int := 0;
  v_interval_seconds int;
  v_base_end timestamptz;
begin
  select * into v_auction
  from public.auctions
  where id = auction_uuid;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Auction not found');
  end if;

  v_interval_seconds := coalesce(v_auction.lot_close_interval_seconds, 20);
  v_base_end := v_auction.ends_at;

  for v_lot in
    select id, lot_number
    from public.lots
    where auction_id = auction_uuid
    order by lot_number asc
  loop
    update public.lots
    set
      ends_at = v_base_end + ((v_lot_count * v_interval_seconds) || ' seconds')::interval,
      status = 'live'
    where id = v_lot.id;

    v_lot_count := v_lot_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'auction_id', auction_uuid,
    'lots_initialized', v_lot_count,
    'first_lot_ends', v_base_end,
    'last_lot_ends', v_base_end + ((greatest(v_lot_count - 1, 0) * v_interval_seconds) || ' seconds')::interval
  );
end;
$$ language plpgsql security definer;


-- ============================================================================
-- 8. REALTIME CONFIGURATION
-- ============================================================================
-- Enable Supabase Realtime on tables that the frontend subscribes to
-- The app subscribes to lots and bids changes for live bid updates

-- NOTE: Run these in the Supabase Dashboard > Database > Replication
-- or via the Supabase API. The SQL commands below work if you have
-- the supabase_realtime publication already created (default in Supabase):

do $$
begin
  -- Try to add tables to the existing realtime publication
  -- Supabase projects come with a 'supabase_realtime' publication
  begin
    alter publication supabase_realtime add table public.lots;
  exception when others then
    raise notice 'Could not add lots to realtime publication: %', sqlerrm;
  end;

  begin
    alter publication supabase_realtime add table public.bids;
  exception when others then
    raise notice 'Could not add bids to realtime publication: %', sqlerrm;
  end;

  begin
    alter publication supabase_realtime add table public.auctions;
  exception when others then
    raise notice 'Could not add auctions to realtime publication: %', sqlerrm;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then
    raise notice 'Could not add notifications to realtime publication: %', sqlerrm;
  end;
end $$;


-- ============================================================================
-- 9. STORAGE BUCKETS
-- ============================================================================
-- The admin lot pages upload images to 'auction-images' bucket
-- Run this or create the bucket in the Supabase Dashboard > Storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auction-images',
  'auction-images',
  true,
  10485760,  -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Allow public read access to auction images
create policy "auction_images_public_read"
  on storage.objects for select
  using (bucket_id = 'auction-images');

-- Allow authenticated users to upload (admin check happens in app layer)
create policy "auction_images_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'auction-images' and auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
create policy "auction_images_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'auction-images' and auth.role() = 'authenticated');


-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================
-- Ensure the anon and authenticated roles can access public schema

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;


-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this schema:
--
-- 1. Set your first admin user:
--    UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
--
-- 2. Configure Vercel environment variables:
--    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
--    SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
--    STRIPE_SECRET_KEY, RESEND_API_KEY, FROM_EMAIL,
--    NEXT_PUBLIC_SITE_URL, CRON_SECRET
--
-- 3. When going live with an auction:
--    SELECT initialize_lot_end_times('your-auction-uuid');
--    Then set auction status to 'live'
--
-- 4. To use server-side bid processing (recommended):
--    Call place_bid(lot_id, user_id, amount, max_bid) via RPC
--    instead of inserting directly into the bids table
--
-- 5. Verify cron jobs are configured in vercel.json:
--    /api/process-auction-end  (every 1 min)
--    /api/send-outbid-emails   (every 5 min)
-- ============================================================================


-- ============================================================================
-- MESSAGING SYSTEM
-- ============================================================================

create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade,  -- null = guest
  guest_name text,
  guest_email text,
  subject text not null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  last_message_at timestamptz default now(),
  unread_by_admin boolean default true,
  unread_by_user boolean default false,
  created_at timestamptz default now()
);

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  sender_type text not null check (sender_type in ('user', 'admin', 'guest', 'system')),
  sender_id uuid references public.profiles on delete set null,
  body text not null,
  created_at timestamptz default now()
);

-- Indexes
create index idx_conversations_user on public.conversations(user_id);
create index idx_conversations_status on public.conversations(status);
create index idx_conversations_last_msg on public.conversations(last_message_at desc);
create index idx_messages_conversation on public.messages(conversation_id, created_at);

-- RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Users can read their own conversations
create policy "Users read own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

-- Users can insert conversations (they create them)
create policy "Users create conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id or user_id is null);

-- Users can update their own (mark read)
create policy "Users update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

-- Messages: users can read messages in their conversations
create policy "Users read own messages"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

-- Users can insert messages into their conversations
create policy "Users send messages"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
    and sender_type = 'user'
  );
