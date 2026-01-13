# DGW Auctions - Setup Guide

## 🚀 Quick Start

Your Next.js project is already created. Follow these steps to add the DGW Auctions foundation.

### Step 1: Copy Files

Copy these files to your project (replace existing ones):

```
dgw-auctions/
├── src/
│   ├── app/
│   │   ├── globals.css          ← Replace
│   │   ├── layout.tsx           ← Replace  
│   │   └── page.tsx             ← Replace
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts        ← New
│   │   └── utils.ts             ← New
│   └── types/
│       └── index.ts             ← New
├── public/
│   └── manifest.json            ← New
├── tailwind.config.ts           ← Replace
├── .env.local.example           ← New (rename to .env.local)
└── supabase-schema.sql          ← For Supabase setup
```

### Step 2: Install Dependencies

In your terminal (in the dgw-auctions folder):

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install framer-motion
npm install -D @types/node
```

### Step 3: Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Wait for it to initialize (~2 minutes)
3. Go to **Settings → API** and copy:
   - Project URL
   - anon/public key
4. Create `.env.local` file from the example and paste those values
5. Go to **SQL Editor** in Supabase
6. Paste the contents of `supabase-schema.sql` and click **Run**

### Step 4: Create App Icons

You'll need these icons in `/public/icons/`:
- `icon-32.png` (32x32)
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `apple-icon-180.png` (180x180)

For now, create placeholder files or I can generate SVG icons for you.

### Step 5: Run the App

```bash
npm run dev
```

Open http://localhost:3000 - you should see the DGW Auctions home page!

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (main)/            # Main app pages
│   │   ├── auctions/      # Auction listing & detail
│   │   ├── lots/          # Lot detail & bidding
│   │   └── account/       # User dashboard
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── auction/          # Auction-specific components
│   ├── lot/              # Lot-specific components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configs
│   ├── supabase/         # Supabase client
│   └── utils.ts          # Helper functions
├── hooks/                # Custom React hooks
└── types/                # TypeScript types
```

---

## 🎨 Design System

### Colors
- **Gold**: `#C9A962` - Primary brand color
- **Obsidian**: Dark grays from `#0d0d0e` to `#f7f7f8`

### Fonts
- **Display**: Cormorant Garamond (headings)
- **Body**: DM Sans (text)
- **Mono**: JetBrains Mono (numbers, timers)

### Components
All pre-styled in `globals.css`:
- `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-bid`
- `.card`, `.card-hover`, `.lot-card`
- `.input`, `.label`
- `.badge-gold`, `.badge-live`, `.badge-success`

---

## 🔜 Next Steps

Once you've got the home page running, we'll build:

1. **Authentication** - Sign up, login, phone verification
2. **Auction pages** - Browse, filter, search
3. **Lot detail** - Image gallery, bid history, swipe-to-bid
4. **Real-time bidding** - WebSocket updates
5. **User dashboard** - Bids, watchlist, invoices
6. **Admin panel** - Create auctions, manage lots
7. **Notifications** - SMS via Twilio
8. **Payment** - Stripe integration

Let me know when you're ready to continue!
