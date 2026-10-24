# LocalKaam — Hyperlocal Blue-Collar Services Marketplace
> Powered by **Supabase Authentication**, **PostgreSQL Database**, and **Realtime Sync**.

LocalKaam connects Mumbai households with trustworthy blue-collar service professionals (plumbers, electricians, carpenters, painters, cleaners, cooks, and maids) with transparent pricing, direct offer negotiation, and calculated hyperlocal ETAs.

---

## ⚡ Supabase Integration Overview

This project includes complete integration with **Supabase** for:
1. **User Authorization & Authentication (`auth.users` + `profiles`)**:
   - Email/password authentication (Sign In & Sign Up).
   - Role-based authorization (`customer` vs `worker`).
   - Profile management automatically mapped to Supabase users.
   - 1-click Demo quick login for instant testing and evaluation.

2. **PostgreSQL Relational Database (`workers`, `bookings`, `reviews`, `complaints`)**:
   - Complete schema with foreign keys, checks, and defaults.
   - Row Level Security (RLS) policies for secure data access.
   - Database triggers to automatically sync auth users into the `profiles` table.

3. **Supabase Realtime Sync**:
   - Realtime notifications on booking creations, acceptances, and counter-offers.
   - Immediate cross-tab/device live state updates.

4. **Resilient Local & Offline Fallback**:
   - The application automatically detects if Supabase credentials are configured.
   - If not yet configured, it seamlessly falls back to local storage and in-memory caching so the app can always be demoed and explored without errors.

---

## 🚀 Quick Setup & Configuration

### Option A: Set Up via the In-App UI (Fastest)

1. Open `index.html` in your browser (or serve with any static web server like `npx serve` or Python `http.server`).
2. Click the **"⚡ Connect Supabase"** button in the top navigation bar.
3. Enter your:
   - **Supabase Project URL** (e.g., `https://yourproject.supabase.co`)
   - **Supabase Public Anon Key** (e.g., `eyJhbGciOi...`)
4. Click **"Test Connection"** and then **"Save & Connect"**.
5. Click **"📋 Copy SQL Schema"** and execute it in your Supabase Dashboard's SQL Editor (see below).
6. Click **"🌱 Seed 8 Mumbai Workers"** to populate initial professionals!

---

### Option B: Supabase Dashboard Setup (Manual)

#### 1. Create a Supabase Project
1. Log in to [supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings** > **API**, copy your **Project URL** and **`anon` `public` key**.

#### 2. Run the SQL Schema
Open **SQL Editor** > **New Query**, paste the contents of [`supabase_schema.sql`](./supabase_schema.sql), and click **Run**.

The script creates:
- `public.profiles`: Stores full name, phone, role (`customer` | `worker`), and locality.
- `public.workers`: Stores worker profiles, categories, hourly rates, skills, working hours, and coordinates.
- `public.bookings`: Stores bookings, negotiation offer histories, status, and completion times.
- `public.reviews`: Stores verified customer ratings and feedback.
- `public.complaints`: Stores customer dispute logs.
- Automatic profile trigger on new user signups.
- Row Level Security (RLS) policies.
- Publication to `supabase_realtime` for live push updates.
- 8 initial seeded Mumbai service professionals.

---

## 📂 Project Architecture

```
coders_sujal/
├── index.html              # Main HTML entry point (loads Supabase JS CDN)
├── app.js                  # Master application orchestrator & navbar
├── authService.js          # Supabase Auth client & Auth Modal (Sign in / Sign up)
├── supabaseClient.js       # Supabase configuration & client factory
├── supabaseDataService.js  # Supabase PostgreSQL CRUD & Realtime sync
├── supabaseSetupModal.js   # Interactive Supabase connection & schema modal
├── supabase_schema.sql     # Complete PostgreSQL schema, RLS, and triggers
├── storage.js              # Unified storage layer with Supabase background sync
├── customer.js             # Customer discovery, bookings, and reviews UI
├── worker.js               # Worker dashboard, counter-offers, and schedule UI
├── bookings.js             # Booking business logic and offer state machine
├── matching.js             # Hyperlocal distance & ETA calculation engine
├── data.js                 # Seed data (Mumbai localities, categories, professionals)
├── styles.css              # Custom styling, responsive layout, dark/light theme
└── toast.js                # Non-intrusive alert toast notification system
```

---

## 🧪 Local Testing

You can run the application with any static web server:

```powershell
# Using Python
python -m http.server 8000

# OR using Node.js / npx
npx serve .
```

Then visit `http://localhost:8000` in your browser.

---

## 🔒 Security & Best Practices

- **Row Level Security (RLS)** is enabled on all tables.
- **Client-Side Anon Key**: Only public Supabase `anon` keys are used in the frontend; `service_role` keys are never required or exposed.
- **Data Validation**: Strict constraint checks on status fields, ratings (1–5), and booking types.
